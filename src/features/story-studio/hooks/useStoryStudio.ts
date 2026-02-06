import { useState, useCallback, useMemo, useEffect } from 'react';
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
} from '../../../types';
import { StudioBlock, StudioStage } from '../types';
import { generateId } from '../../../utils/ids';

export const useStoryStudio = (
  registry: Record<string, NexusObject>,
  onCommitBatch: (items: NexusObject[]) => void,
) => {
  const [stage, setStage] = useState<StudioStage>('BLUEPRINT');
  const [blocks, setBlocks] = useState<StudioBlock[]>([]);
  const [studioItems, setStudioItems] = useState<NexusObject[]>([]);

  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [zoomedChapterId, setZoomedChapterId] = useState<string | null>(null);
  const [zoomedSceneId, setZoomedSceneId] = useState<string | null>(null);
  const [isCompositeMode, setIsCompositeMode] = useState(false);
  const [isChapterBlueprintMode, setIsChapterBlueprintMode] = useState(false);

  const activeBook = useMemo(
    () => (activeBookId ? (registry[activeBookId] as StoryNote) : null),
    [activeBookId, registry],
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
            if (peer && (peer as any).is_author_note) {
              itemsToLoad.set(item.id, item);
              itemsToLoad.set(peer.id, peer);
            }
          }
        }
      });

      setStudioItems(Array.from(itemsToLoad.values()));
      setStage('SPINE');
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
          story_type: StoryType.BOOK,
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
      const bookIdx = finalItems.findIndex((i) => (i as any).story_type === StoryType.BOOK);
      if (bookIdx !== -1) {
        finalItems[bookIdx] = { ...finalItems[bookIdx], manifesto_data: blocks } as any;
      }
      onCommitBatch(finalItems);
    }
  }, [stage, activeBookId, blocks, studioItems, registry, onCommitBatch, handleCreateNewBook]);

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
  };
};
