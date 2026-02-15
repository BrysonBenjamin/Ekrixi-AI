import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  Sparkles,
  BookOpen,
  LayoutTemplate,
  PlusCircle,
  Type,
  Layers,
  Scale,
  UserPlus,
  FileSearch,
  MessageSquare,
  Split,
  PenTool,
  ArrowRight,
  RotateCw,
} from 'lucide-react';

// Components
import { StoryInput as StoryInputComponent } from '../shared/StoryInput';

// Fix: Import StudioBlock, BlockType from types
import { StudioBlock, BlockType } from '../../types';
import { NexusObject, isLink, SimpleNote } from '../../../../types';
import { generateId } from '../../../../utils/ids';
import { StudioSpineAgent } from '../StudioSpineAgent';
import StudioBlockEditor from './StudioBlockEditor';
import { TheoryGuideModal } from './TheoryGuideModal';

interface ManifestoForgeProps {
  blocks: StudioBlock[];
  onUpdateBlocks: (blocks: StudioBlock[]) => void;
  registry: Record<string, NexusObject>;
  title: string;
  subtitle: string;
  accentColor?: string;
  onRunSynthesis: () => void;
  synthesisLabel: string;
  canSynthesize: boolean;
  hasSpine?: boolean;
  onJumpToSpine?: () => void;
  onCommitUnit?: (unit: NexusObject) => void;
  onSeedTemplate?: (blocks: StudioBlock[]) => void;
  context?: 'GLOBAL' | 'CHAPTER' | 'SCENE';
  isSaving?: boolean;
  isSeeding?: boolean;
  onSetSeeding?: (val: boolean) => void;
}

export const ManifestoForge: React.FC<ManifestoForgeProps> = ({
  blocks,
  onUpdateBlocks,
  registry,
  title,
  subtitle,
  onRunSynthesis,
  synthesisLabel,
  canSynthesize,
  hasSpine,
  onJumpToSpine,
  onCommitUnit,
  onSeedTemplate,
  context = 'GLOBAL',
  isSaving,
  isSeeding: externalSeeding,
  onSetSeeding: onSetExternalSeeding,
}) => {
  const [showBlockPicker, setShowBlockPicker] = useState(false);
  const [activeSearchBlockId, setActiveSearchBlockId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [theoryGuideId, setTheoryGuideId] = useState<string | null>(null);
  const [atMenu, setAtMenu] = useState<{
    blockId: string;
    field: string;
    query: string;
    pos: number;
  } | null>(null);
  const [isSeedingAi, setIsSeedingAi] = useState(false);

  const isActuallySeeding = externalSeeding ?? isSeedingAi;
  const setActualSeeding = (val: boolean) => {
    if (onSetExternalSeeding) {
      onSetExternalSeeding(val);
    } else {
      setIsSeedingAi(val);
    }
  };

  const suggestions = useMemo(() => {
    const query = (atMenu ? atMenu.query : searchQuery).toLowerCase();
    if (!query && !atMenu) return [];
    return (Object.values(registry) as NexusObject[])
      .filter((n) => !isLink(n) && (n as { title?: string }).title?.toLowerCase().includes(query))
      .slice(0, 10);
  }, [registry, searchQuery, atMenu]);

  const addBlock = (type: BlockType) => {
    const newBlock: StudioBlock = {
      id: generateId(),
      type,
      data:
        type === 'DELTA'
          ? { start: '', end: '', subjectId: null }
          : type === 'LATENT_UNIT'
            ? {
                title: '',
                category: 'CHARACTER',
                gist: '',
                aliases: [],
                tags: [],
                thematicWeight: '',
                draftPrompt: '',
              }
            : type === 'CONTEXT'
              ? { fact: '', theme: '', weight: 3, importedIds: [] }
              : type === 'THESIS'
                ? { text: '', importedIds: [] }
                : type === 'IMPORT_NODE'
                  ? { nodeId: null, significance: '', useAuthorNote: false }
                  : type === 'ORACLE_PROMPT'
                    ? { text: '' }
                    : type === 'LITERARY_APPROACH'
                      ? { archetype: 'THREE_ACT', rationale: '' }
                      : { text: '' },
    };
    onUpdateBlocks([...blocks, newBlock]);
    setShowBlockPicker(false);
  };

  const handleAiBlueprintRequest = async (text: string) => {
    if (!text.trim()) return;
    setActualSeeding(true);
    try {
      const resultBlocks = await StudioSpineAgent.synthesizeManifestoBlocks(text, registry);
      onUpdateBlocks(resultBlocks);
    } catch (err) {
      console.error(err);
    } finally {
      setActualSeeding(false);
    }
  };

  const updateBlockData = (id: string, newData: Partial<StudioBlock['data']>) => {
    onUpdateBlocks(
      blocks.map((b) => (b.id === id ? { ...b, data: { ...b.data, ...newData } } : b)),
    );
  };

  const handleTextareaInput = (blockId: string, field: string, value: string, pos: number) => {
    updateBlockData(blockId, { [field]: value });
    const beforeCursor = value.slice(0, pos);
    const lastAt = beforeCursor.lastIndexOf('@');
    if (lastAt !== -1 && !beforeCursor.slice(lastAt).includes(' ')) {
      setAtMenu({ blockId, field, query: beforeCursor.slice(lastAt + 1), pos });
    } else {
      setAtMenu(null);
    }
  };

  const insertMention = (title: string) => {
    if (!atMenu) return;
    const block = blocks.find((b) => b.id === atMenu.blockId);
    if (!block) return;
    const text = (block.data[atMenu.field] as string) || '';
    const before = text.slice(0, atMenu.pos);
    const after = text.slice(atMenu.pos);
    const lastAt = before.lastIndexOf('@');
    const newText = before.slice(0, lastAt) + `[[${title}]]` + after;
    updateBlockData(atMenu.blockId, { [atMenu.field]: newText });
    setAtMenu(null);
  };

  const moveBlock = (id: string, direction: 'up' | 'down') => {
    const idx = blocks.findIndex((b) => b.id === id);
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === blocks.length - 1))
      return;
    const newBlocks = [...blocks];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    [newBlocks[idx], newBlocks[swapIdx]] = [newBlocks[swapIdx], newBlocks[idx]];
    onUpdateBlocks(newBlocks);
  };

  const isGlobal = context === 'GLOBAL';
  const activeColorClass = isGlobal
    ? 'nexus-ruby'
    : context === 'CHAPTER'
      ? 'nexus-arcane'
      : 'indigo-500';

  return (
    <div
      className={`space-y-12 animate-in fade-in duration-700 relative pb-40 h-full flex flex-col`}
    >
      <div
        className={`flex items-start ${blocks.length === 0 ? 'justify-end' : 'justify-between'} shrink-0`}
      >
        {blocks.length > 0 && (
          <div className="animate-in slide-in-from-left duration-500">
            <h2 className="text-3xl font-display font-black text-nexus-text uppercase tracking-tight">
              {title.replace('Manifesto', 'Blueprint')}
            </h2>
            <p className="text-[10px] font-mono text-nexus-muted uppercase tracking-widest flex items-center gap-2">
              {subtitle}
              {isSaving && (
                <span className="flex items-center gap-1.5 text-nexus-ruby animate-pulse ml-2">
                  <RotateCw size={10} className="animate-spin" />
                  Syncing Protocol...
                </span>
              )}
            </p>
          </div>
        )}
        <div className="flex gap-4">
          {hasSpine && onJumpToSpine && (
            <button
              onClick={onJumpToSpine}
              className="flex items-center gap-3 px-6 py-2.5 bg-nexus-900 border border-nexus-800 text-nexus-text rounded-full text-[10px] font-black uppercase tracking-widest hover:border-nexus-accent shadow-xl transition-all"
            >
              <PenTool size={16} /> Open Narrative Spine
            </button>
          )}
          {blocks.length > 0 && (
            <button
              onClick={() => setShowBlockPicker(true)}
              className={`flex items-center gap-3 px-6 py-2.5 bg-nexus-900 border border-nexus-800 rounded-full text-[10px] font-black uppercase tracking-widest hover:border-${activeColorClass} transition-all`}
            >
              <Plus size={16} /> Add Protocol Block
            </button>
          )}
        </div>
      </div>

      {blocks.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center gap-10">
          <div
            className={`flex-1 flex flex-col items-center justify-center text-center space-y-10 bg-nexus-900/20 border border-dashed border-nexus-800 rounded-[64px] animate-in fade-in zoom-in-95 duration-700 relative overflow-hidden p-10`}
          >
            <div
              className={`absolute inset-0 bg-${activeColorClass}/5 opacity-40 blur-[100px] pointer-events-none`}
            />
            <div className="space-y-4 relative z-10">
              <div
                className={`p-5 rounded-full bg-${activeColorClass}/10 border border-${activeColorClass}/30 inline-flex text-${activeColorClass} mb-4`}
              >
                <LayoutTemplate size={48} />
              </div>
              <h3 className="text-3xl font-display font-black text-nexus-text uppercase tracking-tight">
                {isGlobal ? 'Empty Blueprint' : 'Chapter Mini-Blueprint'}
              </h3>
              <p className="text-sm text-nexus-muted font-serif italic max-w-sm mx-auto leading-relaxed">
                {isGlobal
                  ? '"The narrative void awaits its core protocols. Initialize the forge via manual units, AI synthesis, or structural templates."'
                  : '"Refine the specific causal logic for this chapter segment. Bridge global blueprint into granular narrative mass."'}
              </p>
            </div>

            <div className="w-full max-w-4xl px-4 relative z-10 space-y-10">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative group flex-1">
                  <StoryInputComponent
                    isLoading={isActuallySeeding}
                    onSend={handleAiBlueprintRequest}
                    registry={registry}
                    placeholder={
                      isGlobal
                        ? 'Describe your story idea to manifest blocks... (Use @ for context)'
                        : "Describe this chapter's sequence to manifest logic..."
                    }
                  />
                </div>
                <button
                  onClick={() => setShowBlockPicker(true)}
                  className={`px-8 py-5 bg-nexus-900 border border-nexus-800 rounded-[32px] text-[10px] font-black uppercase tracking-widest hover:border-${activeColorClass} transition-all flex items-center justify-center gap-3 shadow-xl`}
                >
                  <PlusCircle size={20} className={`text-${activeColorClass}`} />
                  Add Protocol Block
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-3 ml-2 opacity-50 justify-center">
                  <BookOpen size={16} />
                  <span className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.4em]">
                    Protocol Templates
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4">
                  {isGlobal ? (
                    <>
                      <TemplateCard
                        title="Resonance Shift"
                        framework="HERO'S JOURNEY"
                        desc="A character mutation delta using monomyth structural phases across three parallel timelines."
                        colorClass="nexus-ruby"
                        onClick={() => addBlock('LITERARY_APPROACH')}
                      />
                    </>
                  ) : (
                    <>
                      <TemplateCard
                        title="Inciting Beat"
                        framework="THREE ACT"
                        desc="Establish the disruption of the status quo and the protagonist's initial resistance to the call."
                        colorClass="nexus-arcane"
                        onClick={() => addBlock('LITERARY_APPROACH')}
                      />
                      <TemplateCard
                        title="The Reversal"
                        framework="SAVE THE CAT"
                        desc="A high-tension midpoint shift where the internal stakes of the archivist become externally manifest."
                        colorClass="nexus-arcane"
                        onClick={() => addBlock('LITERARY_APPROACH')}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 pb-20">
          {blocks.map((block) => (
            <div
              key={block.id}
              className={`group relative bg-nexus-900 border border-nexus-800 rounded-[32px] p-8 shadow-xl transition-all hover:border-${activeColorClass}/30`}
            >
              <div className="absolute -left-12 top-8 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button
                  onClick={() => moveBlock(block.id, 'up')}
                  className="p-1.5 bg-nexus-900 border border-nexus-800 rounded-lg text-nexus-muted hover:text-nexus-accent"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  onClick={() => moveBlock(block.id, 'down')}
                  className="p-1.5 bg-nexus-900 border border-nexus-800 rounded-lg text-nexus-muted hover:text-nexus-accent"
                >
                  <ChevronDown size={14} />
                </button>
                <button
                  onClick={() => onUpdateBlocks(blocks.filter((b) => b.id !== block.id))}
                  className="p-1.5 bg-nexus-900 border border-nexus-800 rounded-lg text-nexus-muted hover:text-red-500 mt-2"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="p-2.5 bg-nexus-950 border border-nexus-800 rounded-xl">
                  <BlockIcon type={block.type} activeColorClass={activeColorClass} />
                </div>
                <h4 className="text-[9px] font-display font-black text-nexus-muted uppercase tracking-[0.3em] flex-1">
                  {block.type.replace('_', ' ')}
                </h4>
                {['THESIS', 'CONTEXT', 'DELTA', 'IMPORT_NODE'].includes(block.type) && (
                  <button
                    onClick={() =>
                      setActiveSearchBlockId(activeSearchBlockId === block.id ? null : block.id)
                    }
                    className={`px-3 py-1.5 rounded-lg bg-nexus-950 border border-nexus-800 text-[8px] font-black uppercase tracking-widest text-nexus-muted hover:text-${activeColorClass} transition-all`}
                  >
                    Search Registry
                  </button>
                )}
              </div>

              <StudioBlockEditor
                block={block}
                onUpdate={(newData) => updateBlockData(block.id, newData)}
                onInput={handleTextareaInput}
                registry={registry}
                allBlocks={blocks}
                onCommit={onCommitUnit}
                onShowTheory={setTheoryGuideId}
                activeColorClass={activeColorClass}
              />
            </div>
          ))}
        </div>
      )}

      {atMenu && suggestions.length > 0 && (
        <div
          className="fixed z-[300] w-64 bg-nexus-900 border border-nexus-700 rounded-[24px] shadow-2xl overflow-hidden backdrop-blur-xl animate-in zoom-in-95"
          style={{ left: '50%', transform: 'translateX(-50%)', bottom: '100px' }}
        >
          <div
            className={`px-5 py-3 border-b border-nexus-800 bg-nexus-950/40 text-[9px] font-black text-${activeColorClass} uppercase tracking-widest`}
          >
            Neural Search
          </div>
          <div className="max-h-48 overflow-y-auto no-scrollbar p-1 space-y-0.5">
            {suggestions.map((node) => (
              <button
                key={node.id}
                onClick={() => insertMention((node as SimpleNote).title)}
                className={`w-full flex items-center gap-3 p-3 hover:bg-${activeColorClass} hover:text-white transition-all text-left group rounded-xl`}
              >
                <div className="w-6 h-6 rounded bg-nexus-950 border border-nexus-800 flex items-center justify-center text-[8px] font-black group-hover:bg-white/20">
                  {(node as SimpleNote).category_id?.charAt(0)}
                </div>
                <div className="text-[10px] font-bold truncate">{(node as SimpleNote).title}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeSearchBlockId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-nexus-950/40 backdrop-blur-sm">
          <div className="bg-nexus-900 border border-nexus-700 rounded-[32px] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-6">
              <span
                className={`text-[10px] font-black uppercase text-${activeColorClass} tracking-widest`}
              >
                Registry Search
              </span>
              <button onClick={() => setActiveSearchBlockId(null)}>
                <X size={18} />
              </button>
            </div>
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full bg-nexus-950 border border-nexus-800 rounded-2xl px-6 py-4 text-sm outline-none focus:border-${activeColorClass} mb-4`}
              placeholder="Find world unit..."
            />
            <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
              {suggestions.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    const block = blocks.find((b) => b.id === activeSearchBlockId);
                    if (block) {
                      if (block.type === 'THESIS' || block.type === 'CONTEXT') {
                        updateBlockData(activeSearchBlockId, {
                          importedIds: [...((block.data.importedIds as string[]) || []), n.id],
                        });
                      } else if (block.type === 'DELTA') {
                        updateBlockData(activeSearchBlockId, { subjectId: n.id });
                      } else if (block.type === 'IMPORT_NODE') {
                        updateBlockData(activeSearchBlockId, { nodeId: n.id });
                      }
                    }
                    setActiveSearchBlockId(null);
                    setSearchQuery('');
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl bg-nexus-950/50 border border-nexus-800 hover:border-${activeColorClass} transition-all text-left`}
                >
                  <div className="w-8 h-8 rounded-lg bg-nexus-900 flex items-center justify-center text-[10px] font-black">
                    {(n as SimpleNote).category_id?.charAt(0)}
                  </div>
                  <div className="text-xs font-bold">{(n as SimpleNote).title}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {blocks.length > 0 && (
        <div className="flex flex-col items-center gap-6 pt-10">
          <button
            disabled={!canSynthesize}
            onClick={onRunSynthesis}
            className={`px-12 py-5 rounded-[28px] font-display font-black text-xs uppercase tracking-[0.4em] transition-all flex items-center gap-4 ${canSynthesize ? `bg-${activeColorClass} text-white shadow-2xl hover:scale-105 active:scale-95` : 'bg-nexus-800 text-nexus-muted border border-nexus-700 opacity-40'}`}
          >
            <Sparkles size={18} /> {synthesisLabel}
          </button>
        </div>
      )}

      {theoryGuideId && (
        <TheoryGuideModal
          archetypeId={theoryGuideId}
          activeColorClass={activeColorClass}
          onClose={() => setTheoryGuideId(null)}
        />
      )}

      {showBlockPicker && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-nexus-950/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="absolute inset-0" onClick={() => setShowBlockPicker(false)} />
          <div className="relative w-full max-w-2xl bg-nexus-900 border border-nexus-800 rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <BlockPickerItem
                icon={Type}
                label="Thesis"
                desc="Narrative direction."
                activeColorClass={activeColorClass}
                onClick={() => addBlock('THESIS')}
              />
              <BlockPickerItem
                icon={Layers}
                label="Approach"
                desc="Theory archetype."
                activeColorClass={activeColorClass}
                onClick={() => addBlock('LITERARY_APPROACH')}
              />
              <BlockPickerItem
                icon={Scale}
                label="Arc Delta"
                desc="Unit state mutation."
                activeColorClass={activeColorClass}
                onClick={() => addBlock('DELTA')}
              />
              <BlockPickerItem
                icon={UserPlus}
                label="Latent Unit"
                desc="Define new memory."
                activeColorClass={activeColorClass}
                onClick={() => addBlock('LATENT_UNIT')}
              />
              <BlockPickerItem
                icon={FileSearch}
                label="Import Node"
                desc="Existing memory."
                activeColorClass={activeColorClass}
                onClick={() => addBlock('IMPORT_NODE')}
              />
              <BlockPickerItem
                icon={MessageSquare}
                label="Oracle Task"
                desc="Direct LLM prompt."
                activeColorClass={activeColorClass}
                onClick={() => addBlock('ORACLE_PROMPT')}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TemplateCard = ({
  title,
  framework,
  desc,
  onClick,
  colorClass = 'nexus-ruby',
}: {
  title: string;
  framework: string;
  desc: string;
  onClick: () => void;
  colorClass?: string;
}) => (
  <button
    onClick={onClick}
    className={`p-8 bg-nexus-900 border border-nexus-800 rounded-[40px] hover:border-${colorClass} transition-all group text-left space-y-6 shadow-xl w-full min-h-[180px] flex flex-col justify-center`}
  >
    <div className="flex items-center justify-between">
      <span
        className={`px-4 py-1.5 bg-${colorClass}/10 border border-${colorClass}/30 rounded-full text-[9px] font-black text-${colorClass} uppercase tracking-widest`}
      >
        {framework}
      </span>
      <ArrowRight
        size={18}
        className={`text-nexus-muted group-hover:text-${colorClass} transition-transform group-hover:translate-x-2`}
      />
    </div>
    <div>
      <h4 className="text-xl font-display font-black text-nexus-text uppercase mb-2 tracking-tight">
        {title}
      </h4>
      <p className="text-[11px] text-nexus-muted italic font-serif leading-relaxed line-clamp-2">
        "{desc}"
      </p>
    </div>
  </button>
);

const BlockIcon = ({ type, activeColorClass }: { type: BlockType; activeColorClass: string }) => {
  switch (type) {
    case 'THESIS':
      return <Type size={18} className={`text-${activeColorClass}`} />;
    case 'LITERARY_APPROACH':
      return <Layers size={18} className={`text-${activeColorClass}`} />;
    case 'DELTA':
      return <Scale size={18} className="text-nexus-accent" />;
    case 'LATENT_UNIT':
      return <UserPlus size={18} className="text-nexus-essence" />;
    case 'IMPORT_NODE':
      return <FileSearch size={18} className="text-nexus-essence" />;
    case 'ORACLE_PROMPT':
      return <MessageSquare size={18} className="text-nexus-arcane" />;
    case 'CONTEXT':
      return <Split size={18} className="text-nexus-muted" />;
    default:
      return <PenTool size={18} className="text-nexus-muted" />;
  }
};

const BlockPickerItem = ({
  icon: Icon,
  label,
  desc,
  onClick,
  activeColorClass,
}: {
  icon: React.ComponentType<{ size: number; className: string }>;
  label: string;
  desc: string;
  onClick: () => void;
  activeColorClass: string;
}) => (
  <button
    onClick={onClick}
    className={`p-6 bg-nexus-950 border border-nexus-800 rounded-3xl hover:border-${activeColorClass} hover:bg-nexus-900 transition-all flex flex-col items-center text-center gap-4 group h-full`}
  >
    <div
      className={`p-4 rounded-2xl bg-nexus-900 border border-nexus-800 text-nexus-muted group-hover:text-${activeColorClass} group-hover:bg-${activeColorClass}/10 transition-all`}
    >
      <Icon size={24} className="" />
    </div>
    <div>
      <h4 className="text-[10px] font-black uppercase text-nexus-text tracking-widest mb-1">
        {label}
      </h4>
      <p className="text-[9px] text-nexus-muted font-serif italic">{desc}</p>
    </div>
  </button>
);
