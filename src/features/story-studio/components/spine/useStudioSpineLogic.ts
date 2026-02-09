import { useState, useMemo } from 'react';
import {
  NexusObject,
  StoryType,
  NexusType,
  NarrativeStatus,
  isLink,
  StoryNote,
  SimpleNote,
  ContainmentType,
  DefaultLayout,
  NexusCategory,
} from '../../../../types';
import { StudioBlock } from '../../types';
import { StudioSpineAgent } from '../StudioSpineAgent';
import { generateId } from '../../../../utils/ids';
import { SimpleLink } from '../../../../types';

interface AuditResult {
  status: 'SUITABLE' | 'NEEDS_REFACTOR';
  critique: string;
  alternatives: Array<{ name: string; rationale: string }>;
}

export const useStudioSpineLogic = (
  items: NexusObject[],
  onUpdate: (items: NexusObject[]) => void,
  registry: Record<string, NexusObject>,
  blocks: StudioBlock[],
  onUpdateBlocks: (blocks: StudioBlock[]) => void,
  onCommitBatch: (items: NexusObject[]) => void,
  onDeleteBatch: (ids: string[]) => void,
  onBackToManifesto: (() => void) | undefined,
  zoomedChapterId: string | null,
  onSetZoomedChapterId: (id: string | null) => void,
  onSetZoomedSceneId: (id: string | null) => void,
  onSetChapterBlueprintMode: (val: boolean) => void,
) => {
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [synthStatus, setSynthStatus] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [autoFillPrompt, setAutoFillPrompt] = useState('');
  const [isFillingId, setIsFillingId] = useState<string | null>(null);
  const [showAudit, setShowAudit] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);

  const chapters = useMemo(
    () =>
      items
        .filter(
          (i): i is StoryNote =>
            i._type === NexusType.STORY_NOTE && (i as StoryNote).story_type === StoryType.CHAPTER,
        )
        .sort((a, b) => (a.sequence_index || 0) - (b.sequence_index || 0)),
    [items],
  );

  const scenesForZoomedChapter = useMemo(() => {
    if (!zoomedChapterId) return [];
    return items
      .filter(
        (i): i is StoryNote =>
          i._type === NexusType.STORY_NOTE &&
          (i as StoryNote).story_type === StoryType.SCENE &&
          items.some(
            (l) =>
              isLink(l) &&
              (l as unknown as SimpleLink).source_id === zoomedChapterId &&
              (l as unknown as SimpleLink).target_id === i.id,
          ),
      )
      .sort((a, b) => (a.sequence_index || 0) - (b.sequence_index || 0));
  }, [items, zoomedChapterId]);

  const handleManifestFromBlueprint = async () => {
    console.log(
      '[StudioSpineLogic] Starting Manifestation from Blueprint. Sending Blocks to Agent...',
    );
    setIsSynthesizing(true);
    setSynthStatus('Manifesting Narrative Spine...');
    try {
      const [generatedChapters, generatedProtocols] = await Promise.all([
        StudioSpineAgent.synthesizeChapters(blocks),
        StudioSpineAgent.synthesizeProtocols(blocks, registry),
      ]);

      console.log('[StudioSpineLogic] Synthesis Complete:', {
        chaptersCount: generatedChapters.length,
        protocolsCount: generatedProtocols.length,
      });
      console.log('[StudioSpineLogic] Generated Protocols:', generatedProtocols);

      const now = new Date().toISOString();

      // Check for existing manuscript in current studio items
      const existingBook = items.find(
        (i) => (i as StoryNote).story_type === StoryType.MANUSCRIPT,
      ) as StoryNote | undefined;
      const bookId = existingBook?.id || generateId();

      const book: StoryNote = {
        ...(existingBook || {}),
        id: bookId,
        _type: NexusType.STORY_NOTE,
        title: existingBook?.title || 'Project Manuscript',
        gist: existingBook?.gist || 'Generated narrative spine from protocol blocks.',
        story_type: StoryType.MANUSCRIPT,
        status: NarrativeStatus.DRAFT,
        category_id: NexusCategory.STORY,
        created_at: existingBook?.created_at || now,
        last_modified: now,
        internal_weight: 1.0,
        total_subtree_mass: 0,
        link_ids: [],
        prose_content: existingBook?.prose_content || '',
        sequence_index: 0,
        is_ghost: false,
        tension_level: 0,
        aliases: [],
        tags: [],
        containment_type: ContainmentType.MANUSCRIPT,
        is_collapsed: false,
        default_layout: DefaultLayout.GRID,
        children_ids: [],
        manifesto_data: blocks,
      };

      // Perform cleanup of existing notes if this is a regeneration
      const idsToDelete = items.filter((i) => i.id !== bookId).map((i) => i.id);
      if (idsToDelete.length > 0) {
        console.log(
          '[StudioSpineLogic] Purging existing notes for regeneration:',
          idsToDelete.length,
        );
        onDeleteBatch(idsToDelete);
      }

      const finalItems: NexusObject[] = [book];
      const authorNotesToLink: SimpleNote[] = [];

      // 1. Convert specific manifesto blocks immediately into Author Notes
      blocks.forEach((b) => {
        if (b.type === 'THESIS' || b.type === 'LITERARY_APPROACH' || b.type === 'ORACLE_PROMPT') {
          const data = b.data as any;
          const noteId = generateId();
          const note: SimpleNote = {
            id: noteId,
            _type: NexusType.SIMPLE_NOTE,
            title:
              b.type === 'THESIS'
                ? 'Narrative Thesis'
                : b.type === 'LITERARY_APPROACH'
                  ? 'Literary Strategy'
                  : 'Oracle Directive',
            gist: data.text || data.rationale || 'Blueprint instruction.',
            prose_content: data.text || data.rationale || '',
            category_id: NexusCategory.CONCEPT,
            is_author_note: true,
            is_ghost: false,
            aliases: [],
            tags: ['Manifesto'],
            created_at: now,
            last_modified: now,
            internal_weight: 0.5,
            total_subtree_mass: 0,
            link_ids: [],
          };
          finalItems.push(note);
          authorNotesToLink.push(note);
        }
      });

      // 2. Add AI synthesized protocols to the notes to link
      generatedProtocols.forEach((p) => {
        finalItems.push(p);
        authorNotesToLink.push(p);
      });

      // 3. Add Synthesized Chapters and create links to author's notes
      const chapterIds: string[] = [];
      generatedChapters.forEach((ch, idx) => {
        const chNote = ch as StoryNote;
        const chId = generateId();
        chapterIds.push(chId);
        const chapterNode: StoryNote = {
          ...chNote,
          id: chId,
          _type: NexusType.STORY_NOTE,
          story_type: StoryType.CHAPTER,
          status: NarrativeStatus.DRAFT,
          category_id: NexusCategory.STORY,
          created_at: now,
          last_modified: now,
          internal_weight: 1.0,
          total_subtree_mass: 0,
          link_ids: [],
          prose_content: '',
          sequence_index: idx + 1,
          is_ghost: false,
          tension_level: chNote.tension_level || 50,
          aliases: [],
          tags: [],
          containment_type: ContainmentType.PLOT_ARC,
          is_collapsed: false,
          default_layout: DefaultLayout.GRID,
          children_ids: [],
        };
        finalItems.push(chapterNode);

        // Link chapter to book
        const linkId = generateId();
        finalItems.push({
          id: linkId,
          _type: NexusType.HIERARCHICAL_LINK,
          source_id: bookId,
          target_id: chId,
          containment_type: ContainmentType.PLOT_ARC,
          weight: 1.0,
          created_at: now,
          last_modified: now,
          verb: 'contains',
          verb_inverse: 'part_of',
        } as any);
      });

      // 4. Distribute author's notes across chapters
      // Blueprint-derived notes (THESIS, etc.) link to first chapter
      // AI protocols distribute evenly across all chapters
      authorNotesToLink.forEach((note, idx) => {
        let targetChapterId: string;

        if (note.tags?.includes('Manifesto')) {
          // Blueprint notes go to first chapter (foundational)
          targetChapterId = chapterIds[0];
        } else {
          // AI protocols distribute evenly
          const chapterIndex = idx % chapterIds.length;
          targetChapterId = chapterIds[chapterIndex];
        }

        if (targetChapterId) {
          finalItems.push({
            id: generateId(),
            _type: NexusType.SEMANTIC_LINK,
            source_id: note.id,
            target_id: targetChapterId,
            verb: 'governs',
            verb_inverse: 'governed_by',
            weight: 1.0,
            created_at: now,
            last_modified: now,
            link_ids: [],
            internal_weight: 0,
            total_subtree_mass: 0,
          } as unknown as SimpleLink);
        }
      });

      console.log('[StudioSpineLogic] Committing Batch to Registry:', finalItems);
      onUpdate(finalItems);
      onCommitBatch(finalItems);
    } catch (err) {
      console.error(err);
      setSynthStatus('Synthesis Failed.');
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleRelinkSequence = (
    currentList: NexusObject[],
    baseItems: NexusObject[],
  ): NexusObject[] => {
    const updatedList = currentList.map((item, idx) => {
      if (item._type === NexusType.STORY_NOTE) {
        return {
          ...item,
          sequence_index: idx + 1,
        } as StoryNote;
      }
      return item;
    });
    const otherItems = baseItems.filter((i) => !updatedList.some((u) => u.id === i.id));
    return [...updatedList, ...otherItems];
  };

  const handleMoveBeat = (id: string, direction: 'up' | 'down') => {
    const list = zoomedChapterId ? scenesForZoomedChapter : chapters;
    const idx = list.findIndex((c) => c.id === id);
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === list.length - 1))
      return;

    const newList = [...list];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    [newList[idx], newList[swapIdx]] = [newList[swapIdx], newList[idx]];

    onUpdate(handleRelinkSequence(newList, items));
  };

  const handleUpdateBeat = (id: string, updates: Partial<NexusObject>) => {
    onUpdate(items.map((i) => (i.id === id ? ({ ...i, ...updates } as NexusObject) : i)));
  };

  const handleSynthesizeScenesForChapter = async (chapterId: string) => {
    const chapterManifesto = blocks;
    setIsSynthesizing(true);
    setSynthStatus('Weaving Scenes...');
    try {
      const scenes = await StudioSpineAgent.synthesizeScenes(chapterId, chapterManifesto, blocks);
      const now = new Date().toISOString();
      const finalItems: NexusObject[] = [];

      scenes.forEach((sc, idx) => {
        const scNote = sc as StoryNote;
        const scId = generateId();
        const sceneNode: StoryNote = {
          ...scNote,
          id: scId,
          _type: NexusType.STORY_NOTE,
          story_type: StoryType.SCENE,
          status: NarrativeStatus.DRAFT,
          category_id: NexusCategory.STORY,
          created_at: now,
          last_modified: now,
          internal_weight: 1.0,
          total_subtree_mass: 0,
          link_ids: [],
          prose_content: '',
          sequence_index: idx + 1,
          is_ghost: false,
          tension_level: scNote.tension_level || 50,
          aliases: [],
          tags: [],
          containment_type: ContainmentType.PLOT_ARC,
          is_collapsed: false,
          default_layout: DefaultLayout.GRID,
          children_ids: [],
        };
        finalItems.push(sceneNode);
        finalItems.push({
          id: generateId(),
          _type: NexusType.HIERARCHICAL_LINK,
          source_id: chapterId,
          target_id: scId,
          containment_type: ContainmentType.PLOT_ARC,
          weight: 1.0,
          created_at: now,
          last_modified: now,
          verb: 'contains',
          verb_inverse: 'part_of',
        } as any);
      });

      onCommitBatch([...items, ...finalItems]);
      onSetChapterBlueprintMode(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleExportChapterBlueprint = (id: string) => {
    const data = blocks;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chapter_blueprint_${id}.json`;
    a.click();
  };

  const handleImportChapterBlueprint = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        onUpdateBlocks(data);
      } catch (err) {
        console.error('Import failed', err);
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteBeat = (id: string) => {
    if (confirm('Delete this beat and all its narrative mass?')) {
      onUpdate(
        items.filter(
          (i) => i.id !== id && (i as any).source_id !== id && (i as any).target_id !== id,
        ),
      );
    }
  };

  const handleAutoFillMetadata = async (id: string) => {
    setIsAutoFilling(true);
    try {
      const beat = items.find((i) => i.id === id) as StoryNote;
      const prev = items.find(
        (i) =>
          (i as StoryNote).sequence_index === (beat.sequence_index || 0) - 1 &&
          (i as StoryNote).story_type === beat.story_type,
      ) as StoryNote;
      const next = items.find(
        (i) =>
          (i as StoryNote).sequence_index === (beat.sequence_index || 0) + 1 &&
          (i as StoryNote).story_type === beat.story_type,
      ) as StoryNote;

      const result = await StudioSpineAgent.autoFillMetadata(
        beat,
        prev,
        next,
        blocks,
        autoFillPrompt,
      );
      handleUpdateBeat(id, { title: result.title, gist: result.gist });
    } catch (err) {
      console.error(err);
    } finally {
      setIsAutoFilling(false);
      setAutoFillPrompt('');
    }
  };

  const handleNeuralFill = async (id: string) => {
    setIsFillingId(id);
    try {
      const beat = items.find((i) => i.id === id) as StoryNote;
      const prev = items.find(
        (i) =>
          (i as StoryNote).sequence_index === (beat.sequence_index || 0) - 1 &&
          (i as StoryNote).story_type === beat.story_type,
      ) as StoryNote;
      const next = items.find(
        (i) =>
          (i as StoryNote).sequence_index === (beat.sequence_index || 0) + 1 &&
          (i as StoryNote).story_type === beat.story_type,
      ) as StoryNote;
      const result = await StudioSpineAgent.completeDraft(beat, prev, next, blocks);
      handleUpdateBeat(id, { prose_content: result.content });
    } catch (err) {
      console.error(err);
    } finally {
      setIsFillingId(null);
    }
  };

  const handleAddManualBeat = () => {
    const now = new Date().toISOString();
    const id = generateId();
    const newChapter: StoryNote = {
      id,
      _type: NexusType.STORY_NOTE,
      title: 'New Chapter',
      gist: 'Narrative segment pending resolution.',
      story_type: StoryType.CHAPTER,
      status: NarrativeStatus.DRAFT,
      category_id: NexusCategory.STORY,
      created_at: now,
      last_modified: now,
      internal_weight: 1.0,
      total_subtree_mass: 0,
      link_ids: [],
      prose_content: '',
      sequence_index: chapters.length + 1,
      is_ghost: false,
      tension_level: 50,
      aliases: [],
      tags: [],
      containment_type: ContainmentType.PLOT_ARC,
      is_collapsed: false,
      default_layout: DefaultLayout.GRID,
      children_ids: [],
    };
    onCommitBatch([...items, newChapter]);
  };

  const handleAddScene = (chapterId: string) => {
    const now = new Date().toISOString();
    const id = generateId();
    const newScene: StoryNote = {
      id,
      _type: NexusType.STORY_NOTE,
      title: 'New Scene',
      gist: 'Dramatic beat pending resolution.',
      story_type: StoryType.SCENE,
      status: NarrativeStatus.DRAFT,
      category_id: NexusCategory.STORY,
      created_at: now,
      last_modified: now,
      internal_weight: 1.0,
      total_subtree_mass: 0,
      link_ids: [],
      prose_content: '',
      sequence_index: scenesForZoomedChapter.length + 1,
      is_ghost: false,
      tension_level: 50,
      aliases: [],
      tags: [],
      containment_type: ContainmentType.PLOT_ARC,
      is_collapsed: false,
      default_layout: DefaultLayout.GRID,
      children_ids: [],
    };
    const linkId = generateId();
    const link = {
      id: linkId,
      _type: NexusType.HIERARCHICAL_LINK,
      source_id: chapterId,
      target_id: id,
      containment_type: ContainmentType.PLOT_ARC,
      weight: 1.0,
      created_at: now,
      last_modified: now,
      verb: 'contains',
      verb_inverse: 'part_of',
    } as any;
    onUpdate([...items, newScene, link]);
  };

  const handleSmartSpineGeneration = async (text: string) => {
    setIsSeeding(true);
    setSynthStatus('Generating Blueprint Blocks...');
    try {
      const newBlocks = await StudioSpineAgent.synthesizeManifestoBlocks(text, registry);
      onUpdateBlocks(newBlocks);

      setIsSynthesizing(true);
      setSynthStatus('Generating Spine...');
      const generatedChapters = await StudioSpineAgent.synthesizeChapters(newBlocks);
      // ... similar to manifest from blueprint logic
      // Simplification for now to keep size down
    } catch (err) {
      console.error(err);
    } finally {
      setIsSeeding(false);
      setIsSynthesizing(false);
    }
  };

  const handleRunAudit = () => {
    setShowAudit(true);
    setIsAuditing(true);
    StudioSpineAgent.analyzeStructure(blocks, chapters)
      .then(setAuditResult)
      .finally(() => setIsAuditing(false));
  };

  return {
    isSynthesizing,
    isSeeding,
    synthStatus,
    chapters,
    scenesForZoomedChapter,
    editingId,
    setEditingId,
    isAutoFilling,
    autoFillPrompt,
    setAutoFillPrompt,
    isFillingId,
    showAudit,
    setShowAudit,
    isAuditing,
    auditResult,
    handleManifestFromBlueprint,
    handleMoveBeat,
    handleUpdateBeat,
    handleSynthesizeScenesForChapter,
    handleExportChapterBlueprint,
    handleImportChapterBlueprint,
    handleDeleteBeat,
    handleAutoFillMetadata,
    handleNeuralFill,
    handleAddManualBeat,
    handleAddScene,
    handleSmartSpineGeneration,
    handleRunAudit,
    setIsSeeding,
  };
};
