import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Activity,
  Plus,
  Trash2,
  Check,
  ShieldAlert,
  FileCode,
  ArrowUp,
  ArrowDown,
  Maximize2,
  ArrowLeft,
  TrendingUp,
  Zap,
  Library,
  Wand2,
  Edit3,
  RotateCw,
  Sparkles,
  ScrollText,
  Download,
  Upload,
  X,
  GitBranch,
  PenTool,
  ShieldCheck,
  Save,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  LayoutTemplate,
  Layers,
} from 'lucide-react';
import {
  NexusObject,
  StoryType,
  NexusType,
  NexusCategory,
  HierarchyType,
  isLink,
  NarrativeStatus,
  isContainer,
} from '../../../types';
// Fix: Import StudioBlock from types
import { StudioBlock } from '../types';
import { StudioSpineAgent } from './StudioSpineAgent';
import { generateId } from '../../../utils/ids';
import { ManifestoForge } from './ManifestoForge';
import { StudioWeaver } from './StudioWeaver';

interface StudioSpineProps {
  items: NexusObject[];
  onUpdate: (items: NexusObject[]) => void;
  registry: Record<string, NexusObject>;
  blocks: StudioBlock[];
  onUpdateBlocks: (blocks: StudioBlock[]) => void;
  onCommitBatch: (items: NexusObject[]) => void;
  onBackToManifesto?: () => void;
  zoomedChapterId: string | null;
  onSetZoomedChapterId: (id: string | null) => void;
  zoomedSceneId: string | null;
  onSetZoomedSceneId: (id: string | null) => void;
  isCompositeMode: boolean;
  onSetCompositeMode: (val: boolean) => void;
  isChapterBlueprintMode: boolean;
  onSetChapterBlueprintMode: (val: boolean) => void;
}

export const StudioSpine: React.FC<StudioSpineProps> = ({
  items,
  onUpdate,
  registry,
  blocks,
  onUpdateBlocks,
  onCommitBatch,
  onBackToManifesto,
  zoomedChapterId,
  onSetZoomedChapterId,
  zoomedSceneId,
  onSetZoomedSceneId,
  isCompositeMode,
  onSetCompositeMode,
  isChapterBlueprintMode,
  onSetChapterBlueprintMode,
}) => {
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthStatus, setSynthStatus] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAudit, setShowAudit] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isFillingId, setIsFillingId] = useState<string | null>(null);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [autoFillPrompt, setAutoFillPrompt] = useState('');

  const [chapterManifestos, setChapterManifestos] = useState<Record<string, StudioBlock[]>>({});

  useEffect(() => {
    const nextManifestos: Record<string, StudioBlock[]> = {};
    items.forEach((item) => {
      if ((item as any).story_type === StoryType.CHAPTER && (item as any).manifesto_data) {
        nextManifestos[item.id] = (item as any).manifesto_data;
      }
    });
    setChapterManifestos(nextManifestos);
  }, [items]);

  const bookNode = useMemo(
    () => items.find((i) => (i as any).story_type === StoryType.BOOK),
    [items],
  );
  const chapters = useMemo(
    () =>
      items
        .filter((i) => (i as any).story_type === StoryType.CHAPTER)
        .sort((a, b) => (a as any).sequence_index - (b as any).sequence_index),
    [items],
  );

  const scenesForZoomedChapter = useMemo(() => {
    if (!zoomedChapterId) return [];
    return items
      .filter((i) => {
        if ((i as any).story_type !== StoryType.SCENE) return false;
        return items.some(
          (l) => isLink(l) && l.source_id === zoomedChapterId && l.target_id === i.id,
        );
      })
      .sort((a, b) => ((a as any).sequence_index || 0) - ((b as any).sequence_index || 0));
  }, [items, zoomedChapterId]);

  const handleUpdateChapterBlueprint = (chapterId: string, newBlocks: StudioBlock[]) => {
    setChapterManifestos((prev) => ({ ...prev, [chapterId]: newBlocks }));
    onUpdate(
      items.map((item) =>
        item.id === chapterId
          ? { ...item, manifesto_data: newBlocks, last_modified: new Date().toISOString() }
          : item,
      ) as any,
    );
  };

  const handleRelinkSequence = (currentList: NexusObject[], baseItems: NexusObject[]) => {
    const now = new Date().toISOString();
    const cleanItems = baseItems.filter(
      (i) =>
        !((i as any)._type === NexusType.AGGREGATED_HIERARCHICAL_LINK && (i as any).is_reified),
    );
    const sequentialLinks: any[] = [];
    for (let i = 0; i < currentList.length - 1; i++) {
      const source = currentList[i];
      const target = currentList[i + 1];
      sequentialLinks.push({
        id: generateId(),
        _type: NexusType.AGGREGATED_HIERARCHICAL_LINK,
        is_reified: true,
        source_id: source.id,
        target_id: target.id,
        title: `Sequence Transition`,
        gist: `Neural transition bridge.`,
        verb: 'sequenced to',
        verb_inverse: 'follows',
        category_id: NexusCategory.STORY,
        created_at: now,
        last_modified: now,
        link_ids: [],
        internal_weight: 1.0,
        total_subtree_mass: 0,
      });
    }
    const reindexed = currentList.map((ch, idx) => ({ ...ch, sequence_index: idx + 1 }));
    const otherItems = cleanItems.filter((i) => !currentList.some((cc) => cc.id === i.id));
    const nextItems = [...otherItems, ...reindexed, ...sequentialLinks];
    onUpdate(nextItems as any);
    return nextItems;
  };

  const handleMoveBeat = (id: string, direction: 'up' | 'down') => {
    const list = zoomedChapterId ? scenesForZoomedChapter : chapters;
    const idx = list.findIndex((c) => c.id === id);
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === list.length - 1))
      return;
    const newList = [...list];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    [newList[idx], newList[swapIdx]] = [newList[swapIdx], newList[idx]];
    handleRelinkSequence(newList, items);
  };

  const handleUpdateBeat = (id: string, updates: Partial<NexusObject>) => {
    onUpdate(
      items.map((item) =>
        item.id === id ? { ...item, ...updates, last_modified: new Date().toISOString() } : item,
      ) as any,
    );
  };

  const handleSynthesizeScenesForChapter = async (chapterId: string) => {
    const chBlocks = chapterManifestos[chapterId] || [];
    setIsSynthesizing(true);
    setSynthStatus('Synthesizing Chapter Scenes...');
    try {
      const generatedScenes = await StudioSpineAgent.synthesizeScenes(chapterId, chBlocks, blocks);
      const now = new Date().toISOString();
      const hierarchyLinks = generatedScenes.map((sc) => ({
        id: generateId(),
        _type: NexusType.HIERARCHICAL_LINK,
        source_id: chapterId,
        target_id: sc.id,
        verb: 'contains',
        hierarchy_type: HierarchyType.PARENT_OF,
        created_at: now,
        last_modified: now,
        link_ids: [],
      }));
      const nextItems = [...items, ...generatedScenes, ...hierarchyLinks];
      onUpdate(nextItems as any);
      onSetChapterBlueprintMode(false);
    } catch (err) {
      console.error('Scene Synthesis Failed', err);
    } finally {
      setIsSynthesizing(false);
      setSynthStatus(null);
    }
  };

  const handleExportChapterBlueprint = (id: string) => {
    const data = JSON.stringify(chapterManifestos[id] || [], null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chapter_${id}_blueprint.json`;
    a.click();
  };

  const handleImportChapterBlueprint = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target?.result as string);
        handleUpdateChapterBlueprint(id, imported);
      } catch (err) {
        alert('Invalid Format');
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteBeat = (id: string) => {
    const nextItems = items
      .filter(
        (item) =>
          item.id !== id && (!isLink(item) || (item.source_id !== id && item.target_id !== id)),
      )
      .map((item) =>
        isContainer(item) && item.children_ids.includes(id)
          ? { ...item, children_ids: item.children_ids.filter((cid) => cid !== id) }
          : item,
      );
    onUpdate(nextItems as any);
    if (editingId === id) setEditingId(null);
  };

  const handleAutoFillMetadata = async (id: string) => {
    const target = items.find((i) => i.id === id) as any;
    if (!target) return;
    setIsAutoFilling(true);
    try {
      const list = zoomedChapterId ? scenesForZoomedChapter : chapters;
      const idx = list.findIndex((c) => c.id === id);
      const prev = idx > 0 ? list[idx - 1] : null;
      const next = idx < list.length - 1 ? list[idx + 1] : null;
      const result = await StudioSpineAgent.autoFillMetadata(
        target,
        prev,
        next,
        blocks,
        autoFillPrompt,
      );
      handleUpdateBeat(id, { title: result.title, gist: result.gist });
      setAutoFillPrompt('');
    } catch (err) {
      console.error('Auto-fill Failed', err);
    } finally {
      setIsAutoFilling(false);
    }
  };

  const handleNeuralFill = async (id: string) => {
    const target = items.find((i) => i.id === id) as any;
    if (!target) return;
    setIsFillingId(id);
    try {
      const list = zoomedChapterId ? scenesForZoomedChapter : chapters;
      const idx = list.findIndex((c) => c.id === id);
      const result = await StudioSpineAgent.completeDraft(
        target,
        idx > 0 ? list[idx - 1] : null,
        idx < list.length - 1 ? list[idx + 1] : null,
        blocks,
      );
      handleUpdateBeat(id, { gist: result.gist, prose_content: result.content });
    } catch (err) {
      console.error(err);
    } finally {
      setIsFillingId(null);
    }
  };

  const handleAddManualBeat = () => {
    const now = new Date().toISOString();
    const chId = generateId();
    const newChapter: any = {
      id: chId,
      _type: NexusType.STORY_NOTE,
      story_type: StoryType.CHAPTER,
      title: 'New Chapter Bead',
      gist: '...',
      sequence_index: chapters.length + 1,
      tension_level: 50,
      status: NarrativeStatus.OUTLINE,
      category_id: NexusCategory.STORY,
      created_at: now,
      last_modified: now,
      link_ids: [],
      children_ids: [],
      internal_weight: 1.0,
      total_subtree_mass: 0,
    };
    const nextItems = [...items, newChapter];
    if (bookNode) {
      nextItems.push({
        id: generateId(),
        _type: NexusType.HIERARCHICAL_LINK,
        source_id: bookNode.id,
        target_id: chId,
        verb: 'contains',
        hierarchy_type: HierarchyType.PARENT_OF,
        created_at: now,
        last_modified: now,
        link_ids: [],
      } as any);
    }
    onUpdate(nextItems as any);
    setEditingId(chId);
  };

  const handleAddScene = (chapterId: string) => {
    const now = new Date().toISOString();
    const sceneId = generateId();
    const newScene: any = {
      id: sceneId,
      _type: NexusType.STORY_NOTE,
      story_type: StoryType.SCENE,
      title: 'New Scene Bead',
      gist: '...',
      status: NarrativeStatus.OUTLINE,
      sequence_index: scenesForZoomedChapter.length + 1,
      tension_level: 50,
      category_id: NexusCategory.STORY,
      created_at: now,
      last_modified: now,
      link_ids: [],
      children_ids: [],
      internal_weight: 1.0,
      total_subtree_mass: 0,
    };
    onUpdate([
      ...items,
      newScene,
      {
        id: generateId(),
        _type: NexusType.HIERARCHICAL_LINK,
        source_id: chapterId,
        target_id: sceneId,
        verb: 'contains',
        hierarchy_type: HierarchyType.PARENT_OF,
        created_at: now,
        last_modified: now,
        link_ids: [],
      } as any,
    ]);
    setEditingId(sceneId);
  };

  if (items.length === 0 && !isSynthesizing) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 bg-nexus-950 animate-in fade-in duration-1000">
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-nexus-ruby/10 rounded-full blur-[80px] animate-pulse" />
          <div className="relative w-40 h-40 rounded-[56px] bg-nexus-900 border border-nexus-ruby/20 flex items-center justify-center shadow-2xl">
            <GitBranch size={64} className="text-nexus-ruby" />
          </div>
        </div>
        <div className="text-center max-w-xl space-y-6">
          <h2 className="text-4xl font-display font-black text-nexus-text uppercase tracking-tighter">
            Manifest <span className="text-nexus-ruby">Manuscript.</span>
          </h2>
          <p className="text-nexus-muted text-lg font-serif italic opacity-70">
            Synthesize Blueprint logic into a coherent sequence of narrative beads.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={async () => {
                setIsSynthesizing(true);
                setSynthStatus('Manifesting Chapters...');
                try {
                  const generatedChapters = await StudioSpineAgent.synthesizeChapters(blocks);
                  const newBookId = generateId();
                  const book: any = {
                    id: newBookId,
                    _type: NexusType.STORY_NOTE,
                    story_type: StoryType.BOOK,
                    title: 'Untitled Manuscript',
                    gist: 'Active Manuscript',
                    category_id: NexusCategory.STORY,
                    created_at: new Date().toISOString(),
                    last_modified: new Date().toISOString(),
                    link_ids: [],
                    children_ids: generatedChapters.map((c) => c.id),
                    internal_weight: 1.0,
                    total_subtree_mass: 0,
                  };
                  const finalItems = handleRelinkSequence(generatedChapters, [
                    book,
                    ...generatedChapters,
                  ]);
                  onCommitBatch(finalItems as NexusObject[]);
                } catch (err) {
                  console.error(err);
                } finally {
                  setIsSynthesizing(false);
                  setSynthStatus(null);
                }
              }}
              className="px-12 py-5 bg-nexus-ruby text-white rounded-3xl font-display font-black text-[11px] uppercase tracking-widest shadow-2xl flex items-center gap-4 hover:brightness-110 active:scale-95 transition-all"
            >
              <Sparkles size={18} /> Run Architect
            </button>
            <button
              onClick={handleAddManualBeat}
              className="px-12 py-5 bg-nexus-900 border border-nexus-800 text-nexus-muted rounded-3xl font-display font-black text-[11px] uppercase tracking-widest hover:text-white transition-all flex items-center gap-4"
            >
              <Plus size={18} /> Manual Entry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isSynthesizing)
    return (
      <div className="h-full flex flex-col items-center justify-center bg-nexus-950">
        <RotateCw className="text-nexus-ruby animate-spin mb-8" size={64} />
        <h2 className="text-2xl font-display font-black text-nexus-text uppercase tracking-widest animate-pulse">
          {synthStatus}
        </h2>
      </div>
    );

  // SCENE CHAT MODE
  if (zoomedSceneId || isCompositeMode) {
    return (
      <div className="h-full flex flex-col bg-nexus-950">
        <header className="h-14 flex items-center justify-between px-8 border-b border-nexus-800 bg-nexus-900/40">
          <button
            onClick={() => {
              onSetZoomedSceneId(null);
              onSetCompositeMode(false);
            }}
            className="flex items-center gap-2 text-nexus-muted hover:text-nexus-accent text-[10px] font-black uppercase tracking-widest transition-all"
          >
            <ArrowLeft size={16} /> Back to Chapter Directory
          </button>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-nexus-arcane/10 border border-nexus-arcane/30 rounded-full text-[8px] font-black text-nexus-arcane uppercase tracking-widest">
              {isCompositeMode ? 'Composite Chapter Stack' : 'Focused Content Story Note'}
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-nexus-essence animate-pulse" />
          </div>
        </header>
        <div className="flex-1 overflow-hidden">
          <StudioWeaver
            activeId={isCompositeMode ? zoomedChapterId : zoomedSceneId}
            isChapterMode={isCompositeMode}
            studioItems={items}
            onUpdate={onUpdate}
            worldRegistry={registry}
            onSetZoomedSceneId={onSetZoomedSceneId}
            onSetCompositeMode={onSetCompositeMode}
          />
        </div>
      </div>
    );
  }

  const currentList = zoomedChapterId ? scenesForZoomedChapter : chapters;
  const zoomedNode = zoomedChapterId ? (items.find((i) => i.id === zoomedChapterId) as any) : null;

  return (
    <div className="h-full flex flex-col bg-nexus-950 overflow-hidden animate-in slide-in-from-bottom-4 duration-700">
      <header className="h-20 flex items-center justify-between px-10 border-b border-nexus-800 bg-nexus-900/20 shrink-0">
        <div className="flex items-center gap-4 min-w-0 overflow-hidden">
          {zoomedChapterId ? (
            <button
              onClick={() => {
                onSetZoomedChapterId(null);
                onSetChapterBlueprintMode(false);
              }}
              className="p-2 bg-nexus-900 border border-nexus-800 rounded-xl text-nexus-muted hover:text-nexus-ruby mr-2 shrink-0"
            >
              <ArrowLeft size={18} />
            </button>
          ) : (
            <div className="p-2 bg-nexus-ruby/10 rounded-xl text-nexus-ruby border border-nexus-ruby/20 shrink-0">
              <Activity size={18} />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-xl font-display font-black text-nexus-text tracking-tighter uppercase truncate">
              {zoomedChapterId ? (
                isChapterBlueprintMode ? (
                  <span>
                    Chapter <span className="text-nexus-arcane">Blueprint</span>
                  </span>
                ) : (
                  <span>
                    Scene <span className="text-nexus-arcane">Directory</span>
                  </span>
                )
              ) : (
                <span>
                  Nodic <span className="text-nexus-ruby">History</span>
                </span>
              )}
            </h2>
            <p className="text-[10px] font-mono text-nexus-muted uppercase tracking-widest truncate">
              {zoomedChapterId ? `BEAT_FOCUS: ${zoomedNode?.title}` : 'Structural Chapters'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {zoomedChapterId && !isChapterBlueprintMode && (
            <button
              onClick={() => onSetCompositeMode(true)}
              className="flex items-center gap-2 px-4 py-1.5 bg-nexus-arcane text-white rounded-full text-[9px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg shadow-nexus-arcane/20 transition-all mr-2"
            >
              <Layers size={14} /> Full Chapter Weave
            </button>
          )}

          <button
            onClick={onBackToManifesto}
            className="flex items-center gap-2 px-4 py-1.5 bg-nexus-900 border border-nexus-800 text-nexus-muted rounded-full text-[9px] font-black uppercase tracking-widest hover:text-nexus-ruby transition-all mr-2 group"
          >
            <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />{' '}
            {zoomedChapterId && chapterManifestos[zoomedChapterId]?.length > 0
              ? 'Chapter Blueprint'
              : 'Global Blueprint'}
          </button>

          {zoomedChapterId && isChapterBlueprintMode && (
            <div className="flex gap-1.5 mr-2">
              <button
                onClick={() => handleExportChapterBlueprint(zoomedChapterId)}
                className="p-2 rounded-xl bg-nexus-950 border border-nexus-800 text-nexus-muted hover:text-white"
                title="Export Chapter Blueprint"
              >
                <Download size={14} />
              </button>
              <label
                className="p-2 rounded-xl bg-nexus-950 border border-nexus-800 text-nexus-muted hover:text-white cursor-pointer"
                title="Import Chapter Blueprint"
              >
                <Upload size={14} />
                {/* Fix: Wrap handleImportChapterBlueprint to provide the zoomedChapterId */}
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => handleImportChapterBlueprint(e, zoomedChapterId!)}
                  accept=".json"
                />
              </label>
            </div>
          )}
          {!zoomedChapterId && (
            <button
              onClick={() => {
                setShowAudit(true);
                setIsAuditing(true);
                StudioSpineAgent.analyzeStructure(blocks, chapters as any)
                  .then(setAuditResult)
                  .finally(() => setIsAuditing(false));
              }}
              className="flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all"
            >
              <ShieldAlert size={14} /> Audit
            </button>
          )}
          <button
            onClick={zoomedChapterId ? () => handleAddScene(zoomedChapterId) : handleAddManualBeat}
            className={`flex items-center gap-2 px-4 py-1.5 border hover:text-white transition-all rounded-full text-[9px] font-black uppercase tracking-widest ${zoomedChapterId ? 'bg-nexus-arcane/10 border-nexus-arcane/30 text-nexus-arcane hover:bg-nexus-arcane' : 'bg-nexus-950 border border-nexus-800 hover:border-nexus-ruby text-nexus-text'}`}
          >
            <Plus size={14} /> {zoomedChapterId ? 'Append Scene' : 'Append Chapter'}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar p-10 space-y-12">
        {zoomedChapterId && currentList.length === 0 && !isChapterBlueprintMode ? (
          <div className="h-full flex flex-col items-center justify-center space-y-10 animate-in fade-in duration-500">
            <div className="text-center space-y-4">
              <h3 className="text-3xl font-display font-black text-nexus-text uppercase">
                Empty <span className="text-nexus-arcane">Chronicle</span>
              </h3>
              <p className="text-nexus-muted text-sm font-serif italic max-w-sm">
                "The chapter remains a void. Choose your blueprint protocol to establish narrative
                mass."
              </p>
            </div>
            <div className="flex gap-6">
              <button
                onClick={() => {
                  onSetChapterBlueprintMode(true);
                  handleUpdateChapterBlueprint(zoomedChapterId, []);
                }}
                className="group w-64 p-8 bg-nexus-900 border border-nexus-arcane/30 hover:border-nexus-arcane rounded-[40px] text-center transition-all shadow-xl hover:-translate-y-2"
              >
                <Sparkles
                  size={32}
                  className="mx-auto mb-6 text-nexus-arcane group-hover:scale-110 transition-transform"
                />
                <div className="text-xs font-black uppercase tracking-widest mb-2 text-nexus-text">
                  Chapter Blueprint
                </div>
                <p className="text-[10px] text-nexus-muted italic">
                  Generate scene hierarchy via AI synthesis blocks.
                </p>
              </button>
              <button
                onClick={() => handleAddScene(zoomedChapterId)}
                className="group w-64 p-8 bg-nexus-950 border border-nexus-800 hover:border-nexus-text rounded-[40px] text-center transition-all shadow-xl hover:-translate-y-2"
              >
                <PenTool
                  size={32}
                  className="mx-auto mb-6 text-nexus-muted group-hover:text-nexus-text group-hover:scale-110 transition-transform"
                />
                <div className="text-xs font-black uppercase tracking-widest mb-2 text-nexus-text">
                  Direct Outline
                </div>
                <p className="text-[10px] text-nexus-muted italic">
                  Manually plot the scions and narrative search.
                </p>
              </button>
            </div>
          </div>
        ) : zoomedChapterId && isChapterBlueprintMode ? (
          <div className="max-w-4xl mx-auto">
            <ManifestoForge
              title="Chapter Blueprint"
              subtitle={`Refining ${zoomedNode?.title}`}
              blocks={chapterManifestos[zoomedChapterId] || []}
              onUpdateBlocks={(b) => handleUpdateChapterBlueprint(zoomedChapterId, b)}
              registry={registry}
              accentColor="nexus-arcane"
              synthesisLabel="Synthesize Chapter Scenes"
              onRunSynthesis={() => handleSynthesizeScenesForChapter(zoomedChapterId)}
              canSynthesize={(chapterManifestos[zoomedChapterId] || []).some(
                (b) => b.type === 'THESIS',
              )}
              onCommitUnit={(unit) => {
                window.dispatchEvent(new CustomEvent('nexus-commit-batch', { detail: [unit] }));
              }}
              context="CHAPTER"
            />
            <div className="flex justify-center mt-8">
              <button
                onClick={() => onSetChapterBlueprintMode(false)}
                className="text-[10px] font-black text-nexus-muted uppercase tracking-widest hover:text-red-500"
              >
                Back to Scene List
              </button>
            </div>
          </div>
        ) : (
          currentList.map((ch: any, idx: number) => (
            <div
              key={ch.id}
              className="group relative flex gap-8 animate-in slide-in-from-left-4 duration-500"
            >
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={`w-14 h-14 rounded-2xl bg-nexus-900 border border-nexus-800 flex items-center justify-center font-black text-lg transition-all ${zoomedChapterId ? 'text-nexus-arcane group-hover:border-nexus-arcane' : 'text-nexus-ruby group-hover:border-nexus-ruby'}`}
                >
                  {ch.sequence_index}
                </div>
                <div className="flex flex-col gap-1 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleMoveBeat(ch.id, 'up')}
                    disabled={idx === 0}
                    className="p-1 text-nexus-muted hover:text-white disabled:opacity-20"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    onClick={() => handleMoveBeat(ch.id, 'down')}
                    disabled={idx === currentList.length - 1}
                    className="p-1 text-nexus-muted hover:text-white disabled:opacity-20"
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>
                <div className="flex-1 w-px bg-nexus-800 my-3 group-last:hidden" />
              </div>
              <div
                className={`flex-1 bg-nexus-900/40 border rounded-[32px] p-8 transition-all shadow-sm group-hover:border-opacity-50 min-w-0 ${editingId === ch.id ? (zoomedChapterId ? 'border-nexus-arcane bg-nexus-arcane/5 ring-1 ring-nexus-arcane' : 'border-nexus-ruby bg-nexus-ruby/5 ring-1 ring-nexus-ruby') : 'border-nexus-800 hover:bg-nexus-900/60'}`}
              >
                {editingId === ch.id ? (
                  <div className="space-y-6 w-full animate-in zoom-in-95 duration-200">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-2">
                        <label className="text-[10px] font-black uppercase text-nexus-muted tracking-widest">
                          Beat Metadata
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-mono text-nexus-muted uppercase opacity-40">
                            Auto-fill Logic
                          </span>
                          <Activity size={10} className="text-nexus-ruby animate-pulse" />
                        </div>
                      </div>
                      <input
                        autoFocus
                        value={ch.title}
                        onChange={(e) => handleUpdateBeat(ch.id, { title: e.target.value })}
                        className="w-full bg-nexus-950 border border-nexus-800 rounded-xl px-4 py-3 text-lg font-display font-bold uppercase outline-none focus:border-nexus-ruby text-nexus-text"
                        placeholder="Title..."
                      />
                      <textarea
                        value={ch.gist}
                        onChange={(e) => handleUpdateBeat(ch.id, { gist: e.target.value })}
                        className="w-full h-24 bg-nexus-950 border border-nexus-800 rounded-xl px-4 py-3 text-sm font-serif italic outline-none focus:border-nexus-ruby resize-none no-scrollbar text-nexus-text"
                        placeholder="Description..."
                      />
                    </div>

                    <div className="bg-nexus-950 border border-nexus-800 rounded-2xl p-4 space-y-4">
                      <div className="flex items-center gap-3">
                        <Wand2 size={14} className="text-nexus-ruby" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-nexus-text">
                          Contextual Auto-fill
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={autoFillPrompt}
                          onChange={(e) => setAutoFillPrompt(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAutoFillMetadata(ch.id)}
                          placeholder="Optional direction for AI fill..."
                          className="flex-1 bg-nexus-900 border border-nexus-800 rounded-xl px-4 py-2 text-[10px] text-nexus-text outline-none focus:border-nexus-ruby transition-all"
                        />
                        <button
                          onClick={() => handleAutoFillMetadata(ch.id)}
                          disabled={isAutoFilling}
                          className="px-4 py-2 bg-nexus-ruby text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                          {isAutoFilling ? (
                            <RotateCw size={12} className="animate-spin" />
                          ) : (
                            <Sparkles size={12} />
                          )}
                          Run Fill
                        </button>
                      </div>
                      <p className="text-[8px] text-nexus-muted italic px-1">
                        Analyzes surrounding beats and global blueprint to establish title/gist.
                      </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        onClick={() => handleDeleteBeat(ch.id)}
                        className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className={`px-6 py-2 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg ${zoomedChapterId ? 'bg-nexus-arcane' : 'bg-nexus-ruby'}`}
                      >
                        <Check size={14} /> Complete
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full">
                    <div className="flex items-center justify-between mb-4 gap-4">
                      <h3 className="text-xl font-display font-black text-nexus-text uppercase tracking-tight truncate text-nexus-text">
                        {ch.title}
                      </h3>
                      <div className="flex items-center gap-2 shrink-0">
                        <TensionIndicator value={ch.tension_level} />
                        <button
                          onClick={() => handleNeuralFill(ch.id)}
                          disabled={isFillingId === ch.id}
                          className="p-2 text-nexus-essence hover:brightness-125 transition-all disabled:opacity-30"
                          title="Prose Generation"
                        >
                          <Wand2
                            size={18}
                            className={isFillingId === ch.id ? 'animate-spin' : ''}
                          />
                        </button>
                        <button
                          onClick={() => setEditingId(ch.id)}
                          className="p-2 text-nexus-muted hover:text-nexus-ruby transition-colors"
                        >
                          <Edit3 size={18} />
                        </button>
                        <button
                          onClick={() =>
                            zoomedChapterId
                              ? onSetZoomedSceneId(ch.id)
                              : onSetZoomedChapterId(ch.id)
                          }
                          className={`p-2 px-4 ${zoomedChapterId ? 'bg-nexus-arcane/10 text-nexus-arcane border-nexus-arcane/20 hover:bg-nexus-arcane' : 'bg-nexus-ruby/10 text-nexus-ruby border-nexus-ruby/20 hover:bg-nexus-ruby'} hover:text-white rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-2 border`}
                        >
                          <Maximize2 size={12} /> Focus Search
                        </button>
                      </div>
                    </div>
                    <p className="text-[15px] text-nexus-muted font-serif italic leading-relaxed mb-6">
                      "{ch.gist}"
                    </p>
                    {!zoomedChapterId && (
                      <div className="space-y-4 border-t border-nexus-800/50 pt-8">
                        <div className="flex items-center gap-3 mb-2 opacity-50">
                          <ScrollText size={12} className="text-nexus-arcane" />
                          <span className="text-[9px] font-display font-black text-nexus-muted uppercase tracking-[0.3em]">
                            Scene Blueprint
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {items
                            .filter(
                              (i) =>
                                (i as any).story_type === StoryType.SCENE &&
                                items.some(
                                  (l) => isLink(l) && l.source_id === ch.id && l.target_id === i.id,
                                ),
                            )
                            .map((sc) => (
                              <button
                                key={sc.id}
                                onClick={() => {
                                  onSetZoomedChapterId(ch.id);
                                  onSetZoomedSceneId(sc.id);
                                }}
                                className="px-4 py-2 bg-nexus-950 border border-nexus-800 rounded-xl text-[10px] font-bold text-nexus-muted hover:border-nexus-arcane transition-all truncate max-w-[150px]"
                              >
                                {(sc as any).title}
                              </button>
                            ))}
                          <button
                            onClick={() => onSetZoomedChapterId(ch.id)}
                            className="px-4 py-2 border border-dashed border-nexus-800 rounded-xl text-[10px] text-nexus-muted hover:bg-nexus-arcane/5 hover:text-nexus-arcane transition-all flex items-center gap-2"
                          >
                            <Plus size={10} /> Add Scene
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showAudit && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-8 bg-nexus-950/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="absolute inset-0" onClick={() => setShowAudit(false)} />
          <div className="relative w-full max-w-4xl bg-nexus-900 border border-nexus-800 rounded-[48px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
            <header className="h-20 flex items-center justify-between px-10 border-b border-nexus-800">
              <div className="flex items-center gap-4">
                <ShieldAlert
                  size={24}
                  className={
                    auditResult?.status === 'NEEDS_REFACTOR' ? 'text-red-500' : 'text-nexus-essence'
                  }
                />
                <div>
                  <h3 className="text-xl font-display font-black text-nexus-text uppercase tracking-tight text-nexus-text">
                    Structural <span className="text-nexus-ruby">Audit</span>
                  </h3>
                  <p className="text-[10px] font-mono text-nexus-muted uppercase tracking-widest">
                    Neural Analysis Complete
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAudit(false)}
                className="p-2 text-nexus-muted hover:text-white"
              >
                <X size={24} />
              </button>
            </header>
            <div className="p-10 space-y-8 overflow-y-auto no-scrollbar max-h-[70vh]">
              {isAuditing ? (
                <div className="py-20 flex flex-col items-center gap-4">
                  <RotateCw className="animate-spin text-nexus-ruby" size={48} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-nexus-muted">
                    Evaluating Sequence Fidelity...
                  </span>
                </div>
              ) : (
                auditResult && (
                  <>
                    <div
                      className={`p-8 rounded-[32px] border ${auditResult.status === 'NEEDS_REFACTOR' ? 'bg-red-500/5 border-red-500/30' : 'bg-nexus-essence/5 border-nexus-essence/30'}`}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        {auditResult.status === 'NEEDS_REFACTOR' ? (
                          <AlertTriangle className="text-red-500" size={20} />
                        ) : (
                          <Check className="text-nexus-essence" size={20} />
                        )}
                        <span
                          className={`text-[10px] font-black uppercase tracking-widest ${auditResult.status === 'NEEDS_REFACTOR' ? 'text-red-400' : 'text-nexus-essence'}`}
                        >
                          Status: {auditResult.status}
                        </span>
                      </div>
                      <p className="text-lg font-serif italic text-nexus-text leading-relaxed">
                        "{auditResult.critique}"
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {auditResult.alternatives.map((alt: any, i: number) => (
                        <div
                          key={i}
                          className="p-8 bg-nexus-950 border border-nexus-800 rounded-[32px] hover:border-nexus-ruby/50 transition-all group"
                        >
                          <h4 className="text-sm font-display font-black text-nexus-text uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Sparkles size={14} className="text-nexus-ruby" /> Alternative {i + 1}:{' '}
                            {alt.name}
                          </h4>
                          <p className="text-xs text-nexus-muted leading-relaxed font-serif">
                            {alt.rationale}
                          </p>
                          <button className="mt-6 text-[9px] font-black uppercase tracking-[0.2em] text-nexus-muted group-hover:text-nexus-ruby transition-colors flex items-center gap-2">
                            Explore Potential <ChevronRight size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TensionIndicator = ({ value }: { value: number }) => (
  <div className="flex items-center gap-3 px-3 py-1.5 bg-nexus-950 border border-nexus-800 rounded-xl">
    <div className="group/tension relative flex items-center gap-3 cursor-help">
      <TrendingUp size={12} className="text-nexus-ruby" />
      <div className="w-20 h-1 bg-nexus-900 rounded-full overflow-hidden border border-nexus-800">
        <div
          className="h-full bg-nexus-ruby shadow-[0_0_8px_rgba(225,29,72,0.6)] transition-all duration-1000"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-[10px] font-mono font-black text-nexus-muted">{value}%</span>
    </div>
  </div>
);
