import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  NexusObject,
  NexusType,
  NexusCategory,
  StoryType,
  StoryNote,
  ContainmentType,
  DefaultLayout,
  NarrativeStatus,
  isLink,
  isContainer,
  SimpleNote,
} from '../../../types';
import { StudioBlock, StudioStage } from '../types';
import { generateId } from '../../../utils/ids';
import { useSessionStore } from '../../../store/useSessionStore';
import { DataService } from '../../../core/services/DataService';

export const useStoryStudio = (
  registry: Record<string, NexusObject>,
  onCommitBatch: (items: NexusObject[]) => void,
  _onDeleteBatch: (ids: string[]) => void,
) => {
  const [stage, _setStage] = useState<StudioStage>('BLUEPRINT');
  const [blocks, setBlocks] = useState<StudioBlock[]>([]);
  const [studioItems, setStudioItems] = useState<NexusObject[]>([]);

  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [zoomedChapterId, _setZoomedChapterId] = useState<string | null>(null);
  const [zoomedSceneId, _setZoomedSceneId] = useState<string | null>(null);
  const [isCompositeMode, setIsCompositeMode] = useState(false);
  const [isChapterBlueprintMode, _setIsChapterBlueprintMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [focusedBlocksId, setFocusedBlocksId] = useState<string | null>(null);
  const blockSaveTimeout = useRef<NodeJS.Timeout | null>(null);
  const itemsSaveTimeout = useRef<NodeJS.Timeout | null>(null);
  const blocksRef = useRef(blocks);
  const studioItemsRef = useRef(studioItems);

  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  useEffect(() => {
    studioItemsRef.current = studioItems;
  }, [studioItems]);

  const saveBlocks = useCallback(
    async (targetId: string | null, data: StudioBlock[], commitToRegistry = false) => {
      if (!targetId || data.length === 0) return;
      const activeUniverseId = useSessionStore.getState().activeUniverseId;
      if (!activeUniverseId) return;

      setIsSaving(true);
      try {
        // 1. Save to sub-collection (The more granular data)
        await DataService.saveManifestoBlocks(activeUniverseId, targetId, data);

        // 2. If requested (or for main book), sync to main registry object
        if (commitToRegistry || targetId === activeBookId) {
          const item = registry[targetId] as StoryNote;
          if (item) {
            onCommitBatch([
              {
                ...item,
                manifesto_data: data,
                last_modified: new Date().toISOString(),
              },
            ]);
          }
        }

        setLastSaved(
          new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
        );
      } catch (err) {
        console.error('[StoryStudio] Save failed:', err);
      } finally {
        setIsSaving(false);
      }
    },
    [activeBookId, registry, onCommitBatch],
  );

  const activeBook = useMemo(
    () => (activeBookId ? (registry[activeBookId] as StoryNote) : null),
    [activeBookId, registry],
  );

  const handleFocusBlocks = useCallback(
    async (id: string | null) => {
      const activeUniverseId = useSessionStore.getState().activeUniverseId;
      if (!activeUniverseId) return;

      if (focusedBlocksId && focusedBlocksId !== id) {
        saveBlocks(focusedBlocksId, blocksRef.current, true);
      }

      setFocusedBlocksId(id);
      if (id) {
        const item = registry[id] as StoryNote;
        // Load from registry as initial/fallback data
        if (item?.manifesto_data && item.manifesto_data.length > 0) {
          setBlocks(item.manifesto_data);
        } else {
          setBlocks([]);
        }

        // Try to load from database (more up-to-date)
        const dbBlocks = await DataService.getManifestoBlocks(activeUniverseId, id);
        if (dbBlocks && dbBlocks.length > 0) {
          setBlocks(dbBlocks);
        }
        // If dbBlocks is empty but we had registry data, keep the registry data
      } else {
        setBlocks([]);
      }
    },
    [focusedBlocksId, registry, saveBlocks],
  );

  const calculateTargetFocus = useCallback(
    (
      s: StudioStage,
      zsId: string | null,
      zcId: string | null,
      isChapterMode: boolean,
      bookId: string | null,
    ) => {
      if (s === 'BLUEPRINT') return bookId;
      if (zsId) return zsId;
      if (zcId && isChapterMode) return zcId;
      return bookId;
    },
    [],
  );

  const setStage = useCallback(
    (s: StudioStage) => {
      _setStage(s);
      const target = calculateTargetFocus(
        s,
        zoomedSceneId,
        zoomedChapterId,
        isChapterBlueprintMode,
        activeBookId,
      );

      // Always reload blocks when switching to BLUEPRINT to ensure we show the latest data
      if (s === 'BLUEPRINT' || target !== focusedBlocksId) {
        handleFocusBlocks(target);
      }
    },
    [
      _setStage,
      calculateTargetFocus,
      zoomedSceneId,
      zoomedChapterId,
      isChapterBlueprintMode,
      activeBookId,
      focusedBlocksId,
      handleFocusBlocks,
    ],
  );

  const setZoomedChapterId = useCallback(
    (id: string | null) => {
      _setZoomedChapterId(id);
      const target = calculateTargetFocus(
        stage,
        zoomedSceneId,
        id,
        isChapterBlueprintMode,
        activeBookId,
      );
      if (target !== focusedBlocksId) handleFocusBlocks(target);
    },
    [
      _setZoomedChapterId,
      calculateTargetFocus,
      stage,
      zoomedSceneId,
      isChapterBlueprintMode,
      activeBookId,
      focusedBlocksId,
      handleFocusBlocks,
    ],
  );

  const setZoomedSceneId = useCallback(
    (id: string | null) => {
      _setZoomedSceneId(id);
      const target = calculateTargetFocus(
        stage,
        id,
        zoomedChapterId,
        isChapterBlueprintMode,
        activeBookId,
      );
      if (target !== focusedBlocksId) handleFocusBlocks(target);
    },
    [
      _setZoomedSceneId,
      calculateTargetFocus,
      stage,
      zoomedChapterId,
      isChapterBlueprintMode,
      activeBookId,
      focusedBlocksId,
      handleFocusBlocks,
    ],
  );

  const setIsChapterBlueprintMode = useCallback(
    (val: boolean) => {
      _setIsChapterBlueprintMode(val);
      const target = calculateTargetFocus(stage, zoomedSceneId, zoomedChapterId, val, activeBookId);
      if (target !== focusedBlocksId) handleFocusBlocks(target);
    },
    [
      _setIsChapterBlueprintMode,
      calculateTargetFocus,
      stage,
      zoomedSceneId,
      zoomedChapterId,
      activeBookId,
      focusedBlocksId,
      handleFocusBlocks,
    ],
  );
  const handleLoadBook = useCallback(
    (bookId: string) => {
      const book = registry[bookId] as StoryNote;
      if (!book) return;

      setActiveBookId(bookId);
      setZoomedChapterId(null);
      setZoomedSceneId(null);
      setIsCompositeMode(false);
      setIsChapterBlueprintMode(false);
      setBlocks(book.manifesto_data || []);

      const itemsToLoad = new Map<string, NexusObject>();
      itemsToLoad.set(book.id, book);
      const allRegistryItems = Object.values(registry) as NexusObject[];

      const findChildren = (parentId: string) => {
        allRegistryItems.forEach((item) => {
          if (
            isLink(item) &&
            item.source_id === parentId &&
            item._type === NexusType.HIERARCHICAL_LINK
          ) {
            itemsToLoad.set(item.id, item);
            const child = registry[item.target_id];
            if (child && !itemsToLoad.has(child.id)) {
              itemsToLoad.set(child.id, child);
              if (isContainer(child)) findChildren(child.id);
            }
          }
        });
      };

      findChildren(bookId);

      // Load associated Author Notes
      const activeNodeIds = Array.from(itemsToLoad.values())
        .filter((i) => !isLink(i))
        .map((i) => i.id);
      allRegistryItems.forEach((item) => {
        if (isLink(item)) {
          const isSourceActive = activeNodeIds.includes(item.source_id);
          const isTargetActive = activeNodeIds.includes(item.target_id);
          if (isSourceActive || isTargetActive) {
            const peerId = isSourceActive ? item.target_id : item.source_id;
            const peer = registry[peerId];
            if (peer && (peer as SimpleNote).is_author_note) {
              itemsToLoad.set(item.id, item);
              itemsToLoad.set(peer.id, peer);
            }
          }
        }
      });

      setStudioItems(Array.from(itemsToLoad.values()));
      setStage('SPINE');

      // Async load manifesto blocks from subcollection
      const activeUniverseId = useSessionStore.getState().activeUniverseId;
      if (activeUniverseId) {
        DataService.getManifestoBlocks(activeUniverseId, bookId).then((dbBlocks) => {
          if (dbBlocks && dbBlocks.length > 0) {
            setBlocks(dbBlocks);
          }
        });
      }
    },
    [registry],
  );

  const handleCreateNewBook = useCallback(
    (initialBlocks?: StudioBlock[]) => {
      setActiveBookId(null);
      setBlocks(initialBlocks || []);
      setStudioItems([]);
      setStage('BLUEPRINT');

      if (initialBlocks && initialBlocks.length > 0) {
        const now = new Date().toISOString();
        const id = generateId();
        const newBook: StoryNote = {
          id,
          _type: NexusType.STORY_NOTE,
          story_type: StoryType.MANUSCRIPT,
          title: 'New Manuscript',
          gist: 'Drafting in progress...',
          prose_content: '',
          category_id: NexusCategory.STORY,
          is_ghost: false,
          containment_type: ContainmentType.MANUSCRIPT,
          is_collapsed: false,
          default_layout: DefaultLayout.TREE,
          children_ids: [],
          sequence_index: 0,
          tension_level: 0,
          status: NarrativeStatus.VOID,
          internal_weight: 1.0,
          total_subtree_mass: 0,
          created_at: now,
          last_modified: now,
          link_ids: [],
          aliases: [],
          tags: ['draft'],
          manifesto_data: initialBlocks,
        };
        onCommitBatch([newBook]);
        setActiveBookId(id);
        setFocusedBlocksId(id);
      }
    },
    [onCommitBatch],
  );
  const handleSave = useCallback(() => {
    const saveId = focusedBlocksId || activeBookId;
    if (!saveId) return;

    if (stage === 'BLUEPRINT' && !activeBookId) {
      handleCreateNewBook(blocks);
    } else {
      // Use consolidated save logic which handles both sub-collection and registry commit
      saveBlocks(saveId, blocks, true);
    }
  }, [stage, activeBookId, focusedBlocksId, blocks, handleCreateNewBook, saveBlocks]);

  // Periodic auto-save (doesn't reset on typing)
  useEffect(() => {
    const saveId = focusedBlocksId || activeBookId;
    if (!saveId) return;

    const interval = setInterval(() => {
      saveBlocks(saveId, blocksRef.current);
    }, 10000); // 10s for periodic to avoid too much noise

    return () => clearInterval(interval);
  }, [activeBookId, focusedBlocksId, saveBlocks]);

  // Debounced auto-save (triggers 2s after typing stops)
  // Debounced save is now handled in handleUpdateBlocks to ensure distinct trigger events and immediate ref updates

  // Auto-save for studioItems (scene prose, chapter content) - 2s debounce
  useEffect(() => {
    if (stage !== 'SPINE') return; // Only auto-save items in SPINE stage
    if (studioItems.length === 0) return;

    if (itemsSaveTimeout.current) clearTimeout(itemsSaveTimeout.current);

    itemsSaveTimeout.current = setTimeout(() => {
      // Save all studio items to registry
      onCommitBatch(studioItemsRef.current);
      setLastSaved(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      );
    }, 2000);

    return () => {
      if (itemsSaveTimeout.current) clearTimeout(itemsSaveTimeout.current);
    };
  }, [studioItems, stage, onCommitBatch]);

  // Save on exit / visibility change
  useEffect(() => {
    const handleExit = () => {
      // Save blocks if any exist
      const saveId = focusedBlocksId || activeBookId;
      if (saveId && blocksRef.current.length > 0) {
        saveBlocks(saveId, blocksRef.current, true);
      }

      // Save studio items (scenes/chapters) if in SPINE stage
      if (stage === 'SPINE' && studioItemsRef.current.length > 0) {
        onCommitBatch(studioItemsRef.current);
      }
    };

    window.addEventListener('beforeunload', handleExit);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleExit();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleExit);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeBookId, focusedBlocksId, saveBlocks, stage, onCommitBatch]);

  const handleUpdateBlocks = useCallback(
    (newBlocks: StudioBlock[]) => {
      setBlocks(newBlocks);
      blocksRef.current = newBlocks; // Immediate ref update for safety

      const saveId = focusedBlocksId || activeBookId;
      if (!saveId) return;

      if (newBlocks.length !== blocks.length) {
        // Immediate save on structural change (add/remove block)
        if (blockSaveTimeout.current) clearTimeout(blockSaveTimeout.current);
        saveBlocks(saveId, newBlocks, true);
      } else {
        // Debounced save for content edits
        if (blockSaveTimeout.current) clearTimeout(blockSaveTimeout.current);
        blockSaveTimeout.current = setTimeout(() => {
          saveBlocks(saveId, newBlocks, true);
        }, 2000);
      }
    },
    [blocks.length, focusedBlocksId, activeBookId, saveBlocks],
  );

  const handleDeleteBook = useCallback(
    async (bookId: string) => {
      const activeUniverseId = useSessionStore.getState().activeUniverseId;
      if (!activeUniverseId) return;

      if (window.confirm('Are you sure you want to delete this manuscript and all its contents?')) {
        try {
          await DataService.deleteManuscript(activeUniverseId, bookId);
          if (activeBookId === bookId) {
            setActiveBookId(null);
            setBlocks([]);
            setStudioItems([]);
            setStage('BLUEPRINT');
          }
        } catch (err) {
          console.error('[StoryStudio] Failed to delete manuscript:', err);
        }
      }
    },
    [activeBookId],
  );

  return {
    stage,
    setStage,
    blocks,
    setBlocks,
    studioItems,
    setStudioItems,
    activeBookId,
    setActiveBookId,
    zoomedChapterId,
    setZoomedChapterId,
    zoomedSceneId,
    setZoomedSceneId,
    isCompositeMode,
    setIsCompositeMode,
    isChapterBlueprintMode,
    setIsChapterBlueprintMode,
    activeBook,
    handleLoadBook,
    handleCreateNewBook,
    handleSave,
    handleDeleteBook,
    isSaving,
    lastSaved,
    focusedBlocksId,
    handleFocusBlocks,
    onUpdateBlocks: handleUpdateBlocks,
  };
};
