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
  const [focusedBlocksId, setFocusedBlocksId] = useState<string | null>(null);
  const blockSaveTimeout = useRef<NodeJS.Timeout | null>(null);
  const blocksRef = useRef(blocks);

  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  const saveBlocks = useCallback(async (targetId: string | null, data: StudioBlock[]) => {
    if (!targetId || data.length === 0) return;
    const activeUniverseId = useSessionStore.getState().activeUniverseId;
    if (!activeUniverseId) return;

    setIsSaving(true);
    try {
      await DataService.saveManifestoBlocks(activeUniverseId, targetId, data);
    } catch (err) {
      console.error('[StoryStudio] Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  }, []);

  const activeBook = useMemo(
    () => (activeBookId ? (registry[activeBookId] as StoryNote) : null),
    [activeBookId, registry],
  );

  const handleFocusBlocks = useCallback(
    async (id: string | null) => {
      const activeUniverseId = useSessionStore.getState().activeUniverseId;
      if (!activeUniverseId) return;

      if (focusedBlocksId && focusedBlocksId !== id) {
        saveBlocks(focusedBlocksId, blocksRef.current);
      }

      setFocusedBlocksId(id);
      if (id) {
        const item = registry[id] as StoryNote;
        if (item?.manifesto_data) {
          setBlocks(item.manifesto_data);
        } else {
          setBlocks([]);
        }

        const dbBlocks = await DataService.getManifestoBlocks(activeUniverseId, id);
        if (dbBlocks && dbBlocks.length > 0) {
          setBlocks(dbBlocks);
        }
      } else {
        setBlocks([]);
      }
    },
    [focusedBlocksId, registry],
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
      if (target !== focusedBlocksId) handleFocusBlocks(target);
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
    if (stage === 'BLUEPRINT') {
      if (!activeBookId) {
        handleCreateNewBook(blocks);
      } else {
        const book = registry[activeBookId] as StoryNote;
        if (book) {
          onCommitBatch([
            { ...book, manifesto_data: blocks, last_modified: new Date().toISOString() },
          ]);
        }
      }
    } else {
      const finalItems = [...studioItems];
      const bookIdx = finalItems.findIndex(
        (i) => (i as StoryNote).story_type === StoryType.MANUSCRIPT,
      );
      if (bookIdx !== -1) {
        finalItems[bookIdx] = { ...finalItems[bookIdx], manifesto_data: blocks } as StoryNote;
      }
      onCommitBatch(finalItems);
    }

    // Persist blocks to subcollection
    const saveId = focusedBlocksId || activeBookId;
    if (saveId) {
      saveBlocks(saveId, blocks);
    }
  }, [
    stage,
    activeBookId,
    focusedBlocksId,
    blocks,
    studioItems,
    registry,
    onCommitBatch,
    handleCreateNewBook,
    saveBlocks,
  ]);

  // Periodic and Debounced auto-save
  useEffect(() => {
    const saveId = focusedBlocksId || activeBookId;
    if (!saveId) return;

    // Periodic Save (Every 5s)
    const interval = setInterval(() => {
      saveBlocks(saveId, blocksRef.current);
    }, 5000);

    // Debounced Save (1s after stop)
    if (blockSaveTimeout.current) clearTimeout(blockSaveTimeout.current);
    blockSaveTimeout.current = setTimeout(() => {
      saveBlocks(saveId, blocksRef.current);
    }, 1000);

    return () => {
      clearInterval(interval);
      if (blockSaveTimeout.current) clearTimeout(blockSaveTimeout.current);
    };
  }, [blocks, activeBookId, focusedBlocksId, saveBlocks]);

  const handleUpdateBlocks = useCallback(
    (newBlocks: StudioBlock[]) => {
      setBlocks(newBlocks);
      const saveId = focusedBlocksId || activeBookId;
      if (saveId && newBlocks.length > blocks.length) {
        // Immediate save on create
        saveBlocks(saveId, newBlocks);
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
    focusedBlocksId,
    handleFocusBlocks,
    onUpdateBlocks: handleUpdateBlocks,
  };
};
