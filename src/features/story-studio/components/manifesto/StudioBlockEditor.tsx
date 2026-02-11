import React, { useState } from 'react';
import {
  Activity,
  RotateCw,
  Sparkles,
  ChevronDown,
  Database,
  Zap,
  Info,
  Target,
  FileSearch,
  Tag,
  AtSign,
  Save,
  Fingerprint,
} from 'lucide-react';
import { StudioBlock } from '../../types';
import { LITERARY_ARCHETYPES } from './archetypes/data';
import { StudioSpineAgent } from '../StudioSpineAgent';
import { NexusObject, NexusType, NexusCategory, SimpleNote } from '../../../../types';
import { generateId } from '../../../../utils/ids';
import {
  getCategoryIconSvg,
  getCategoryColor,
} from '../../../refinery/components/visualizer/NodeTemplates';

const StudioBlockEditor: React.FC<{
  block: StudioBlock;
  onUpdate: (d: Partial<StudioBlock['data']>) => void;
  onInput: (id: string, f: string, v: string, p: number) => void;
  registry: Record<string, NexusObject>;
  allBlocks: StudioBlock[];
  onCommit?: (u: NexusObject) => void;
  onShowTheory?: (id: string) => void;
  activeColorClass: string;
}> = ({
  block,
  onUpdate,
  onInput,
  registry,
  allBlocks,
  onCommit,
  onShowTheory,
  activeColorClass,
}) => {
  const [isSearching, setIsSearching] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDropText = (e: React.DragEvent, field: string) => {
    e.preventDefault();
    setIsDragOver(false);
    const title = e.dataTransfer.getData('application/nexus-scry-title');
    if (title) {
      const current = block.data[field] || '';
      const next = current + (current ? ' ' : '') + `[[${title}]]`;
      onUpdate({ [field]: next });
    }
  };

  const handleDropTarget = (e: React.DragEvent, field: string) => {
    e.preventDefault();
    setIsDragOver(false);
    const id = e.dataTransfer.getData('application/nexus-scry-id');
    if (id) {
      onUpdate({ [field]: id });
    }
  };

  const commonTextProps = (field: string) => ({
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(true);
    },
    onDragLeave: () => setIsDragOver(false),
    onDrop: (e: React.DragEvent) => handleDropText(e, field),
    className: `w-full bg-nexus-950 border rounded-2xl p-6 text-sm font-serif italic text-nexus-text outline-none resize-none transition-all ${isDragOver ? 'border-nexus-accent ring-4 ring-nexus-accent/10' : 'border-nexus-800'}`,
  });

  switch (block.type) {
    case 'THESIS': {
      return (
        <div className="space-y-4">
          <textarea
            {...commonTextProps('text')}
            value={block.data.text}
            onChange={(e) =>
              onInput(block.id, 'text', e.target.value, e.target.selectionStart || 0)
            }
            onSelect={(e) => {
              const el = e.currentTarget;
              onInput(block.id, 'text', el.value, el.selectionStart || 0);
            }}
            placeholder="State the core objective... (Drag lore here to link)"
            className={`${commonTextProps('text').className} h-32 shadow-inner`}
          />
          <div className="flex justify-end">
            <button
              onClick={() => {
                if (!onCommit) return;
                const now = new Date().toISOString();
                const note: SimpleNote = {
                  id: generateId(),
                  _type: NexusType.SIMPLE_NOTE,
                  title: 'Narrative Thesis',
                  gist: block.data.text || 'Core narrative direction.',
                  prose_content: block.data.text || '',
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
                onCommit(note);
                alert('Thesis reified as Author Note.');
              }}
              disabled={!block.data.text}
              className={`px-5 py-2.5 bg-${activeColorClass}/10 border border-${activeColorClass}/30 text-${activeColorClass} rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-${activeColorClass} hover:text-white transition-all flex items-center gap-2 disabled:opacity-30`}
            >
              <Save size={14} /> Reify to Author's Note
            </button>
          </div>
        </div>
      );
    }

    case 'LITERARY_APPROACH': {
      const currentArch = LITERARY_ARCHETYPES.find((a) => a.id === block.data.archetype);
      return (
        <div className="space-y-10 animate-in fade-in duration-500">
          <div
            className={`flex gap-8 items-start p-10 bg-nexus-950 border border-nexus-800 rounded-[40px] group/hero transition-all hover:border-${activeColorClass}/40 relative overflow-hidden`}
          >
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none group-hover/hero:opacity-10 transition-opacity">
              {currentArch && <currentArch.icon size={180} />}
            </div>

            <button
              onClick={() => onShowTheory?.(block.data.archetype)}
              className={`w-32 h-32 rounded-[32px] bg-${activeColorClass}/10 border border-${activeColorClass}/20 flex items-center justify-center shrink-0 shadow-lg group-hover/hero:scale-105 transition-all hover:bg-${activeColorClass}/20 relative group/icon`}
              title="Open Theory Oracle"
            >
              {currentArch && (
                <currentArch.icon
                  size={64}
                  className={`text-${activeColorClass} group-hover/icon:scale-110 transition-transform`}
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-nexus-900/40 opacity-0 group-hover/icon:opacity-100 transition-opacity rounded-[32px]">
                <Info size={24} className="text-white" />
              </div>
            </button>

            <div className="flex-1 min-w-0 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span
                  className={`text-[10px] font-display font-black text-${activeColorClass} uppercase tracking-[0.4em]`}
                >
                  Active Narrative Protocol
                </span>
                <div
                  className={`flex items-center gap-2 px-3 py-1 bg-${activeColorClass}/10 border border-${activeColorClass}/30 rounded-full text-[9px] font-black text-${activeColorClass} uppercase tracking-widest animate-pulse`}
                >
                  <Activity size={12} /> {currentArch?.type}
                </div>
              </div>
              <h3 className="text-3xl font-display font-black text-nexus-text uppercase tracking-tight mb-2">
                {currentArch?.label}
              </h3>
              <p className="text-base text-nexus-muted italic font-serif leading-relaxed mb-4 max-w-lg">
                "{currentArch?.desc}"
              </p>
              <div className="p-4 bg-nexus-900/50 border border-nexus-800 rounded-2xl flex items-center gap-3">
                <Sparkles size={16} className={`text-${activeColorClass}`} />
                <span className="text-xs text-nexus-text font-medium italic">
                  "{currentArch?.hook}"
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.3em] ml-2">
              Protocol Selection Matrix
            </label>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 px-2 -mx-2">
              {LITERARY_ARCHETYPES.map((arch) => (
                <button
                  key={arch.id}
                  onClick={() => onUpdate({ archetype: arch.id })}
                  className={`
                                        flex flex-col items-start gap-4 p-6 rounded-[32px] border transition-all shrink-0 w-64 group/pill
                                        ${
                                          block.data.archetype === arch.id
                                            ? `bg-${activeColorClass}/10 border-${activeColorClass} shadow-xl shadow-${activeColorClass}/10 ring-1 ring-${activeColorClass}`
                                            : `bg-nexus-950 border border-nexus-800 hover:border-${activeColorClass}/50 hover:bg-nexus-900/50`
                                        }
                                    `}
                >
                  <div
                    className={`p-3 rounded-2xl border transition-all ${block.data.archetype === arch.id ? `bg-${activeColorClass} text-white border-${activeColorClass}` : `bg-nexus-900 border border-nexus-800 text-nexus-muted group-hover/pill:text-${activeColorClass}`}`}
                  >
                    <arch.icon size={20} />
                  </div>
                  <div>
                    <div
                      className={`text-sm font-display font-black uppercase tracking-widest mb-1 ${block.data.archetype === arch.id ? 'text-nexus-text' : `text-nexus-muted group-hover/pill:text-nexus-text`}`}
                    >
                      {arch.label}
                    </div>
                    <p className="text-[10px] text-nexus-muted font-serif italic leading-snug line-clamp-2">
                      "{arch.desc}"
                    </p>
                  </div>
                  {block.data.archetype === arch.id && (
                    <div className="mt-auto pt-2 flex items-center gap-2">
                      <div
                        className={`w-1.5 h-1.5 rounded-full bg-${activeColorClass} animate-pulse`}
                      />
                      <span
                        className={`text-[8px] font-black text-${activeColorClass} uppercase tracking-widest`}
                      >
                        Selected
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[9px] font-display font-black text-nexus-muted uppercase tracking-[0.3em] ml-2">
              Logical Adaptation Rationale
            </label>
            <textarea
              {...commonTextProps('rationale')}
              value={block.data.rationale}
              onChange={(e) =>
                onInput(block.id, 'rationale', e.target.value, e.target.selectionStart || 0)
              }
              onSelect={(e) => {
                const el = e.currentTarget;
                onInput(block.id, 'rationale', el.value, el.selectionStart || 0);
              }}
              placeholder="Why does this structure serve your blueprint? (Drag lore here to link)"
              className={`${commonTextProps('rationale').className} h-28 shadow-inner`}
            />
            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  if (!onCommit) return;
                  const now = new Date().toISOString();
                  const note: SimpleNote = {
                    id: generateId(),
                    _type: NexusType.SIMPLE_NOTE,
                    title: `Strategy: ${currentArch?.label || 'Custom'}`,
                    gist: block.data.rationale || 'Literary approach directive.',
                    prose_content: block.data.rationale || '',
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
                  onCommit(note);
                  alert('Literary strategy reified as Author Note.');
                }}
                disabled={!block.data.rationale}
                className={`px-5 py-2.5 bg-${activeColorClass}/10 border border-${activeColorClass}/30 text-${activeColorClass} rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-${activeColorClass} hover:text-white transition-all flex items-center gap-2 disabled:opacity-30`}
              >
                <Save size={14} /> Reify to Author's Note
              </button>
            </div>
          </div>
        </div>
      );
    }

    case 'DELTA': {
      const sub = block.data.subjectId ? registry[block.data.subjectId] : null;
      return (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDropTarget(e, 'subjectId')}
          className={`space-y-4 rounded-[32px] transition-all p-2 -m-2 ${isDragOver ? 'bg-nexus-accent/5 ring-2 ring-nexus-accent/20' : ''}`}
          onDragEnter={() => setIsDragOver(true)}
          onDragLeave={() => setIsDragOver(false)}
        >
          <div className="flex items-center justify-between px-2">
            <label className="text-[8px] font-black uppercase text-nexus-muted tracking-[0.3em]">
              Subject of Mutation
            </label>
            {sub ? (
              <div className="flex items-center gap-2 px-3 py-1 bg-nexus-accent/10 border border-nexus-accent/20 rounded-full text-[10px] font-bold text-nexus-accent uppercase animate-in slide-in-from-right-2">
                <Target size={12} /> {(sub as SimpleNote).title}
              </div>
            ) : (
              <span className="text-[8px] text-nexus-muted italic font-mono uppercase opacity-40">
                Drag Lore Unit Here to Assign Subject
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <textarea
              {...commonTextProps('start')}
              value={block.data.start}
              onChange={(e) =>
                onInput(block.id, 'start', e.target.value, e.target.selectionStart || 0)
              }
              onSelect={(e) => {
                const el = e.currentTarget;
                onInput(block.id, 'start', el.value, el.selectionStart || 0);
              }}
              placeholder="Alpha state... (Drag lore here to link)"
              className={`${commonTextProps('start').className} h-24`}
            />
            <textarea
              {...commonTextProps('end')}
              value={block.data.end}
              onChange={(e) =>
                onInput(block.id, 'end', e.target.value, e.target.selectionStart || 0)
              }
              onSelect={(e) => {
                const el = e.currentTarget;
                onInput(block.id, 'end', el.value, el.selectionStart || 0);
              }}
              placeholder="Omega state... (Drag lore here to link)"
              className={`${commonTextProps('end').className} h-24`}
            />
          </div>
        </div>
      );
    }

    case 'LATENT_UNIT': {
      const runSearch = async () => {
        setIsSearching(true);
        try {
          const result = await StudioSpineAgent.autofillLatentUnit(
            block.data.title,
            block.data.draftPrompt,
            allBlocks,
            registry,
          );
          onUpdate({
            category: result.category,
            gist: result.gist,
            aliases: result.aliases,
            tags: result.tags,
            thematicWeight: result.thematicWeight,
          });
        } catch (e) {
          console.error(e);
        } finally {
          setIsSearching(false);
        }
      };

      const commitToRegistry = () => {
        if (!block.data.title || !onCommit) return;
        const now = new Date().toISOString();
        const unit: NexusObject = {
          id: generateId(),
          _type: NexusType.SIMPLE_NOTE,
          title: block.data.title,
          gist: block.data.gist,
          category_id: block.data.category,
          aliases: block.data.aliases,
          tags: block.data.tags,
          prose_content: `# ${block.data.title}\n\n${block.data.thematicWeight}`,
          internal_weight: 1.0,
          total_subtree_mass: 0,
          created_at: now,
          last_modified: now,
          link_ids: [],
          is_ghost: false,
        };
        onCommit(unit);
        alert(`${block.data.title} reified into Project Registry.`);
      };

      return (
        <div className="space-y-8 animate-in fade-in zoom-in-95">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-nexus-muted tracking-widest ml-1">
                Title Designation
              </label>
              <input
                value={block.data.title}
                onChange={(e) => onUpdate({ title: e.target.value })}
                placeholder="New Unit Title..."
                className="w-full bg-nexus-950 border border-nexus-800 rounded-2xl px-6 py-4 text-sm font-bold text-nexus-text focus:border-nexus-essence outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-nexus-muted tracking-widest ml-1">
                Logic Category
              </label>
              <div className="relative">
                <select
                  value={block.data.category}
                  onChange={(e) => onUpdate({ category: e.target.value })}
                  className="w-full bg-nexus-950 border border-nexus-800 rounded-2xl px-6 py-4 text-xs font-black uppercase text-nexus-text appearance-none outline-none focus:border-nexus-essence"
                >
                  {Object.values(NexusCategory).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-nexus-muted pointer-events-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <label className="text-[9px] font-black uppercase text-nexus-muted tracking-widest">
                Neural Expansion Protocol
              </label>
              <span className="text-[8px] font-mono text-nexus-essence uppercase">
                Unit_Drafting_v3.2
              </span>
            </div>
            <div className="flex gap-3">
              <input
                value={block.data.draftPrompt}
                onChange={(e) =>
                  onInput(block.id, 'draftPrompt', e.target.value, e.target.selectionStart || 0)
                }
                onSelect={(e) => {
                  const el = e.currentTarget;
                  onInput(block.id, 'draftPrompt', el.value, el.selectionStart || 0);
                }}
                onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDropText(e, 'draftPrompt')}
                placeholder="Describe the role... (Drag lore to reference)"
                className="flex-1 bg-nexus-950 border border-nexus-800 rounded-2xl px-6 py-3 text-xs outline-none focus:border-nexus-essence"
              />
              <button
                onClick={runSearch}
                disabled={isSearching || !block.data.title}
                className="px-6 py-3 bg-nexus-essence text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:brightness-110 active:scale-95 flex items-center gap-3 disabled:opacity-50"
              >
                {isSearching ? (
                  <RotateCw size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} />
                )}
                Draft Unit
              </button>
            </div>
          </div>

          <div className="bg-nexus-950/50 border border-nexus-800 rounded-[32px] p-6 space-y-6 shadow-inner">
            <div className="space-y-2">
              <label className="text-[8px] font-black uppercase text-nexus-muted tracking-[0.3em] ml-1">
                Manifest Gist
              </label>
              <textarea
                {...commonTextProps('gist')}
                value={block.data.gist}
                onChange={(e) =>
                  onInput(block.id, 'gist', e.target.value, e.target.selectionStart || 0)
                }
                onSelect={(e) => {
                  const el = e.currentTarget;
                  onInput(block.id, 'gist', el.value, el.selectionStart || 0);
                }}
                placeholder="Suggested abstract... (Drag lore here to link)"
                className={`${commonTextProps('gist').className} h-20`}
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[8px] font-black uppercase text-nexus-muted tracking-[0.3em] ml-1 flex items-center gap-2">
                  <AtSign size={10} /> Designations
                </label>
                <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-nexus-900 border border-nexus-800 rounded-xl">
                  {block.data.aliases?.map((a: string) => (
                    <span
                      key={a}
                      className="px-2 py-1 bg-nexus-essence/10 border border-nexus-essence/30 rounded text-[9px] font-bold text-nexus-essence"
                    >
                      {a}
                    </span>
                  ))}
                  {!block.data.aliases?.length && (
                    <span className="text-[8px] text-nexus-muted/40 italic">
                      Waiting for search...
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[8px] font-black uppercase text-nexus-muted tracking-[0.3em] ml-1 flex items-center gap-2">
                  <Tag size={10} /> Semantic Tags
                </label>
                <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-nexus-900 border border-nexus-800 rounded-xl">
                  {block.data.tags?.map((t: string) => (
                    <span
                      key={t}
                      className="px-2 py-1 bg-nexus-950 border border-nexus-800 rounded text-[9px] font-bold text-nexus-muted"
                    >
                      #{t}
                    </span>
                  ))}
                  {!block.data.tags?.length && (
                    <span className="text-[8px] text-nexus-muted/40 italic">
                      Waiting for search...
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[8px] font-black uppercase text-nexus-muted tracking-[0.3em] ml-1 flex items-center gap-2">
                <Fingerprint size={10} /> Thematic Inheritance
              </label>
              <div className="p-4 bg-nexus-900 border border-nexus-800 rounded-xl text-[10px] text-nexus-muted font-serif italic leading-relaxed italic">
                {block.data.thematicWeight || 'Neural weights not yet established.'}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={commitToRegistry}
              disabled={!block.data.gist}
              className="px-8 py-3 bg-nexus-essence/10 border border-nexus-essence/30 text-nexus-essence rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-nexus-essence hover:text-white transition-all flex items-center gap-3 shadow-lg disabled:opacity-30"
            >
              <Save size={16} /> Reify to Project Registry
            </button>
          </div>
        </div>
      );
    }

    case 'IMPORT_NODE': {
      const imported = block.data.nodeId ? registry[block.data.nodeId] : null;
      return (
        <div className="space-y-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => handleDropTarget(e, 'nodeId')}
            className={`p-8 bg-nexus-950 border rounded-[32px] group/hub relative overflow-hidden transition-all ${isDragOver ? 'border-nexus-accent ring-4 ring-nexus-accent/10' : 'border-nexus-800 hover:border-nexus-essence/40'}`}
          >
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover/hub:opacity-10 transition-opacity">
              <Database size={100} />
            </div>

            {imported ? (
              <div className="flex items-center gap-8 relative z-10 animate-in fade-in slide-in-from-left-4 duration-500">
                <div className="w-20 h-20 rounded-[28px] bg-nexus-essence/10 border border-nexus-essence/30 flex items-center justify-center shrink-0 shadow-lg">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: getCategoryIconSvg(
                        (imported as SimpleNote).category_id,
                        getCategoryColor((imported as SimpleNote).category_id),
                      ),
                    }}
                    className="scale-[2.5]"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-display font-black text-nexus-essence uppercase tracking-[0.4em]">
                      Synchronized Memory Unit
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onUpdate({ useAuthorNote: !block.data.useAuthorNote })}
                        className={`px-3 py-1 rounded-full text-[8px] font-black uppercase transition-all shadow-sm ${block.data.useAuthorNote ? 'bg-amber-500 text-black border-amber-500' : 'bg-nexus-800 text-nexus-muted hover:text-white'}`}
                      >
                        {block.data.useAuthorNote ? 'PROTOCOL MODE' : 'REF MODE'}
                      </button>
                    </div>
                  </div>
                  <h3 className="text-2xl font-display font-black text-nexus-text uppercase tracking-tight">
                    {(imported as SimpleNote).title}
                  </h3>
                  <p className="text-sm text-nexus-muted italic font-serif line-clamp-1 mt-1">
                    "{(imported as SimpleNote).gist}"
                  </p>
                </div>
                <button
                  onClick={() => onUpdate({ nodeId: null })}
                  className="p-3 text-nexus-muted hover:text-red-500 bg-nexus-900 border border-nexus-800 rounded-2xl transition-all"
                >
                  <RotateCw size={18} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-6 relative z-10">
                <div
                  className={`p-4 rounded-full border transition-all ${isDragOver ? 'bg-nexus-accent/10 border-nexus-accent text-nexus-accent' : 'bg-nexus-950 border-nexus-800 text-nexus-muted'}`}
                >
                  <FileSearch size={32} className={isDragOver ? 'animate-bounce' : 'opacity-20'} />
                </div>
                <div className="max-w-xs">
                  <h4 className="text-sm font-black uppercase text-nexus-muted tracking-widest mb-1">
                    {isDragOver ? 'Release to Synchronize' : 'Awaiting Memory Search'}
                  </h4>
                  <p className="text-[10px] text-nexus-muted font-serif italic">
                    Drag lore here or use the Search Registry button above to link an existing
                    concept.
                  </p>
                </div>
              </div>
            )}
          </div>

          {imported && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <label className="text-[8px] font-black uppercase text-nexus-muted tracking-[0.3em] ml-2">
                Contextual Significance
              </label>
              <textarea
                {...commonTextProps('significance')}
                value={block.data.significance}
                onChange={(e) =>
                  onInput(block.id, 'significance', e.target.value, e.target.selectionStart || 0)
                }
                onSelect={(e) => {
                  const el = e.currentTarget;
                  onInput(block.id, 'significance', el.value, el.selectionStart || 0);
                }}
                placeholder="Document resonance... (Drag lore here to link)"
                className={`${commonTextProps('significance').className} h-24`}
              />
            </div>
          )}
        </div>
      );
    }

    case 'ORACLE_PROMPT': {
      const commitToNote = () => {
        if (!onCommit) return;
        const now = new Date().toISOString();
        const note: SimpleNote = {
          id: generateId(),
          _type: NexusType.SIMPLE_NOTE,
          title: 'Oracle Directive',
          gist: block.data.text || 'Blueprint instruction.',
          prose_content: block.data.text || '',
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
        onCommit(note);
        alert('Oracle instruction reified as Author Note.');
      };

      return (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap size={10} className="text-nexus-arcane" />
              <span className="text-[8px] font-black uppercase text-nexus-muted tracking-widest">
                Tactical Override Prompt
              </span>
            </div>
            <textarea
              {...commonTextProps('text')}
              value={block.data.text}
              onChange={(e) =>
                onInput(block.id, 'text', e.target.value, e.target.selectionStart || 0)
              }
              onSelect={(e) => {
                const el = e.currentTarget;
                onInput(block.id, 'text', el.value, el.selectionStart || 0);
              }}
              placeholder="Instruct the Architect... (Drag lore here to link)"
              className={`${commonTextProps('text').className} font-mono h-32 shadow-inner`}
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={commitToNote}
              disabled={!block.data.text}
              className="px-5 py-2.5 bg-nexus-arcane/10 border border-nexus-arcane/30 text-nexus-arcane rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-nexus-arcane hover:text-white transition-all flex items-center gap-2 disabled:opacity-30"
            >
              <Save size={14} /> Reify to Author's Note
            </button>
          </div>
        </div>
      );
    }

    case 'CONTEXT': {
      return (
        <textarea
          {...commonTextProps('fact')}
          value={block.data.fact}
          onChange={(e) => onInput(block.id, 'fact', e.target.value, e.target.selectionStart || 0)}
          onSelect={(e) => {
            const el = e.currentTarget;
            onInput(block.id, 'fact', el.value, el.selectionStart || 0);
          }}
          placeholder="Narrative facts & thematic weights... (Drag lore here to link)"
          className={`${commonTextProps('fact').className} h-24 shadow-inner`}
        />
      );
    }

    default:
      return null;
  }
};

export default StudioBlockEditor;
