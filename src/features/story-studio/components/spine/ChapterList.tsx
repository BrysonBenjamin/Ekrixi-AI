import React from 'react';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  PenTool,
  Activity,
  Wand2,
  RotateCw,
  Check,
  Edit3,
  Maximize2,
  ScrollText,
} from 'lucide-react';
import { NexusObject, StoryType, isLink, StoryNote } from '../../../../types';
import { StudioBlock } from '../../types';
import { ManifestoForge } from '../manifesto/ManifestoForge';

interface ChapterListProps {
  items: NexusObject[];
  zoomedChapterId: string | null;
  onSetZoomedChapterId: (id: string | null) => void;
  onSetZoomedSceneId: (id: string | null) => void;
  onUpdate: (items: NexusObject[]) => void;
  isChapterBlueprintMode: boolean;
  onSetChapterBlueprintMode: (val: boolean) => void;
  blocks: StudioBlock[];
  onUpdateBlocks: (newBlocks: StudioBlock[]) => void;
  handleSynthesizeScenesForChapter: (chapterId: string) => void;
  registry: Record<string, NexusObject>;
  handleAddScene: (chapterId: string) => void;
  currentList: NexusObject[];
  handleMoveBeat: (id: string, direction: 'up' | 'down') => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  handleUpdateBeat: (id: string, updates: Partial<NexusObject>) => void;
  handleAutoFillMetadata: (id: string) => void;
  isAutoFilling: boolean;
  autoFillPrompt: string;
  setAutoFillPrompt: (val: string) => void;
  handleDeleteBeat: (id: string) => void;
  handleNeuralFill: (id: string) => void;
  isFillingId: string | null;
  zoomedNode: StoryNote | null;
  isSaving?: boolean;
  isSeeding?: boolean;
  onSetSeeding?: (val: boolean) => void;
}

const TensionIndicator = ({ value }: { value: number }) => (
  <div className="flex items-center gap-2">
    <div className="flex h-1 gap-0.5">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={`w-3 rounded-full transition-all ${i < value / 20 ? 'bg-nexus-ruby opacity-100 shadow-[0_0_8px_rgba(225,29,72,0.8)]' : 'bg-nexus-800 opacity-30'}`}
        />
      ))}
    </div>
  </div>
);

export const ChapterList: React.FC<ChapterListProps> = ({
  items,
  zoomedChapterId,
  onSetZoomedChapterId,
  onSetZoomedSceneId,
  onUpdate: _onUpdate,
  isChapterBlueprintMode,
  onSetChapterBlueprintMode,
  blocks,
  onUpdateBlocks,
  handleSynthesizeScenesForChapter,
  registry,
  handleAddScene,
  currentList,
  handleMoveBeat,
  editingId,
  setEditingId,
  handleUpdateBeat,
  handleAutoFillMetadata,
  isAutoFilling,
  autoFillPrompt,
  setAutoFillPrompt,
  handleDeleteBeat,
  handleNeuralFill,
  isFillingId,
  zoomedNode,
  isSaving,
  isSeeding,
  onSetSeeding,
}) => {
  // If we're zoomed in, we might be showing the ManifestForge for the chapter
  // Or we might be showing the list of scenes.

  // Note: The original code imported ManifestoForge from SAME DIRECTORY.
  // We need to import it from ../manifesto/ManifestoForge if we moved it.
  // For now, assuming parent component handles the import and we structure this strictly as the list viewer.

  // Wait, the `ManifestoForge` usage IS inside the condition `zoomedChapterId && isChapterBlueprintMode`.
  // So we need to import it here.

  return (
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
                onUpdateBlocks([]);
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
            blocks={blocks}
            onUpdateBlocks={onUpdateBlocks}
            registry={registry}
            accentColor="nexus-arcane"
            synthesisLabel="Synthesize Chapter Scenes"
            onRunSynthesis={() => handleSynthesizeScenesForChapter(zoomedChapterId)}
            canSynthesize={blocks.some((b) => b.type === 'THESIS')}
            onCommitUnit={(unit: NexusObject) => {
              window.dispatchEvent(new CustomEvent('nexus-commit-batch', { detail: [unit] }));
            }}
            context="CHAPTER"
            isSaving={isSaving}
            isSeeding={isSeeding}
            onSetSeeding={onSetSeeding}
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
        currentList.map((ch, idx) => (
          <div
            key={ch.id}
            className="group relative flex gap-8 animate-in slide-in-from-left-4 duration-500"
          >
            <div className="flex flex-col items-center shrink-0">
              <div
                className={`w-14 h-14 rounded-2xl bg-nexus-900 border border-nexus-800 flex items-center justify-center font-black text-lg transition-all ${zoomedChapterId ? 'text-nexus-arcane group-hover:border-nexus-arcane' : 'text-nexus-ruby group-hover:border-nexus-ruby'}`}
              >
                {(ch as StoryNote).sequence_index}
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
                      value={(ch as StoryNote).title}
                      onChange={(e) => handleUpdateBeat(ch.id, { title: e.target.value })}
                      className="w-full bg-nexus-950 border border-nexus-800 rounded-xl px-4 py-3 text-lg font-display font-bold uppercase outline-none focus:border-nexus-ruby text-nexus-text"
                      placeholder="Title..."
                    />
                    <textarea
                      value={(ch as StoryNote).gist}
                      onChange={(e) => handleUpdateBeat(ch.id, { gist: e.target.value })}
                      className="w-full min-h-[120px] bg-nexus-950 border border-nexus-800 rounded-xl px-4 py-3 text-sm font-serif italic outline-none focus:border-nexus-ruby resize-y text-nexus-text"
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
                      {(ch as StoryNote).title}
                    </h3>
                    <div className="flex items-center gap-2 shrink-0">
                      <TensionIndicator value={(ch as StoryNote).tension_level || 50} />
                      <button
                        onClick={() => handleNeuralFill(ch.id)}
                        disabled={isFillingId === ch.id}
                        className="p-2 text-nexus-essence hover:brightness-125 transition-all disabled:opacity-30"
                        title="Prose Generation"
                      >
                        <Wand2 size={18} className={isFillingId === ch.id ? 'animate-spin' : ''} />
                      </button>
                      <button
                        onClick={() => setEditingId(ch.id)}
                        className="p-2 text-nexus-muted hover:text-nexus-ruby transition-colors"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button
                        onClick={() =>
                          zoomedChapterId ? onSetZoomedSceneId(ch.id) : onSetZoomedChapterId(ch.id)
                        }
                        className={`p-2 px-4 ${zoomedChapterId ? 'bg-nexus-arcane/10 text-nexus-arcane border-nexus-arcane/20 hover:bg-nexus-arcane' : 'bg-nexus-ruby/10 text-nexus-ruby border-nexus-ruby/20 hover:bg-nexus-ruby'} hover:text-white rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-2 border`}
                      >
                        <Maximize2 size={12} /> Focus Search
                      </button>
                    </div>
                  </div>
                  <p className="text-[15px] text-nexus-muted font-serif italic leading-relaxed mb-6">
                    "{(ch as StoryNote).gist}"
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
                              (i as StoryNote).story_type === StoryType.SCENE &&
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
                              {(sc as StoryNote).title}
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
  );
};
