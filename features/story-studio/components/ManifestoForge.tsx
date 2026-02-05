import React, { useState, useMemo, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
    Plus, Trash2, ChevronUp, ChevronDown, Database, Search, 
    Type, Layers, Link2, Scale, Split, PenTool, Zap, X, Sparkles,
    Info, BookOpen, Target, Activity, ArrowRight, ArrowLeft, Check,
    MessageSquare, UserPlus, FileSearch, ShieldCheck, Tag, AtSign,
    Save, RotateCw, Fingerprint, Box, AlertCircle, PlusCircle, LayoutTemplate,
    Compass, Trophy, Clock, Milestone, Send, CircleDot, Snowflake, TrendingUp,
    List, GitMerge, FastForward, History, Archive, Repeat,
    Eye, Flame, Sword, Crown, MapPin, Users
} from 'lucide-react';
// Fix: Import StudioBlock, BlockType from types
import { StudioBlock, BlockType } from '../types';
import { NexusObject, NexusCategory, isLink, isContainer, NexusType, HierarchyType } from '../../../types';
import { generateId } from '../../../utils/ids';
import { StudioSpineAgent } from './StudioSpineAgent';
import { getCategoryIconSvg, getCategoryColor } from '../../refinery/components/visualizer/NodeTemplates';
import { getSeedStoryManifesto } from '../../playground/fixtures/story_manifesto_fixture';

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
    context?: 'GLOBAL' | 'CHAPTER';
}

export const LITERARY_ARCHETYPES = [
    { 
        id: 'THREE_ACT', 
        label: 'Three-Act Structure', 
        type: 'Linear', 
        icon: Milestone,
        desc: 'Traditional Setup, Confrontation, and Resolution.',
        hook: 'The gold standard for commercial fiction and screenplays.',
        slides: [
            { 
                title: "The Status Quo & Inciting Incident", 
                content: "Act I establishes the normal world before a disruptive event—the Inciting Incident—propels the protagonist out of their comfort zone into the main conflict.", 
                icon: Zap, 
                visual: 'THREE_ACT_1' 
            },
            { 
                title: "The Midpoint Reversal", 
                content: "Act II is the confrontation. At the Midpoint, the protagonist shifts from reacting to the conflict to taking proactive control, often following a major revelation or high-stakes shift.", 
                icon: Scale, 
                visual: 'THREE_ACT_2' 
            },
            { 
                title: "Climax & Resolution", 
                content: "Act III brings the tension to a peak. The protagonist faces their greatest challenge, resulting in a final resolution that establishes a new, transformed Status Quo.", 
                icon: Flame, 
                visual: 'THREE_ACT_3' 
            }
        ]
    },
    { 
        id: 'HERO_JOURNEY', 
        label: "Hero's Journey", 
        type: 'Linear', 
        icon: Compass,
        desc: 'The monomyth arc of departure, initiation, and return.',
        hook: 'Best for mythic adventures and internal character growth.',
        slides: [
            { 
                title: "Crossing the Threshold", 
                content: "The hero leaves the Ordinary World for the Special World. This transition marks the point of no return where the rules of reality change.", 
                icon: Target, 
                visual: 'HERO_1' 
            },
            { 
                title: "The Ordeal & Abyss", 
                content: "Deep within the Special World, the hero faces their shadow self or greatest fear. They must undergo a symbolic death and rebirth to gain the power needed to win.", 
                icon: ShieldCheck, 
                visual: 'HERO_2' 
            },
            { 
                title: "The Master of Two Worlds", 
                content: "The hero returns with the 'Boon', having integrated the lessons of the journey. They now possess the wisdom to navigate both their old life and the new reality.", 
                icon: Repeat, 
                visual: 'HERO_3' 
            }
        ]
    },
    { 
        id: 'SAVE_CAT', 
        label: 'Save the Cat!', 
        type: 'Linear', 
        icon: Trophy,
        desc: '15 beats optimized for pacing and engagement.',
        hook: 'Ensures high audience resonance via specific emotional beats.',
        slides: [
            { title: "The 15 Beats", content: "A specific sequence from 'Opening Image' to 'Final Image' designed for commercial success.", icon: List, visual: 'CAT_1' }
        ]
    },
    { 
        id: 'SNOWFLAKE', 
        label: 'Snowflake Method', 
        type: 'Expansionist', 
        icon: Snowflake,
        desc: 'Fractal growth starting from a single sentence.',
        hook: 'Perfect for deep architects who build complexity through iteration.',
        slides: [
            { title: "Iterative Design", content: "Start with one sentence, then one paragraph, then character bios, expanding fractal-style.", icon: Snowflake, visual: 'SNOW_1' }
        ]
    },
    { 
        id: 'PARALLEL', 
        label: 'Parallel Timelines', 
        type: 'Nonlinear', 
        icon: GitMerge,
        desc: 'Two or more concurrent arcs running in separate eras.',
        hook: 'Creates deep thematic irony and reveals causality over time.',
        slides: [
            { title: "Thematic Mirroring", content: "Events in the past directly reflect or influence the present arc.", icon: Repeat, visual: 'PARALLEL_1' }
        ]
    },
    { 
        id: 'BRAIDED', 
        label: 'Braided Narrative', 
        type: 'Nonlinear', 
        icon: GitMerge,
        desc: 'Multiple POV strands interweaving until a single nexus.',
        hook: 'Ideal for large ensemble casts and global-scale events.',
        slides: [
            { title: "Converging Paths", content: "Separate stories that seem unrelated until they collide in a final act.", icon: GitMerge, visual: 'BRAID_1' }
        ]
    },
    { 
        id: 'REVERSE', 
        label: 'Reverse Chronology', 
        type: 'Nonlinear', 
        icon: History,
        desc: 'Narrative starts at the end and moves to the beginning.',
        hook: 'Swaps "What happens?" for "How did this happen?".',
        slides: [
            { title: "Causal Retracing", content: "Moving backward through time to find the original spark of conflict.", icon: History, visual: 'REVERSE_1' }
        ]
    },
    { 
        id: 'RASHOMON', 
        label: 'Rashomon Effect', 
        type: 'Nonlinear', 
        icon: Target,
        desc: 'One core event seen through multiple subjective lenses.',
        hook: 'Explores the fallibility of memory and truth.',
        slides: [
            { title: "Subjective Truth", content: "The same event told differently by characters with conflicting biases.", icon: Eye, visual: 'RASH_1' }
        ]
    },
    { 
        id: 'EPISTOLARY', 
        label: 'Epistolary / Fragmented', 
        type: 'Non-Traditional', 
        icon: Archive,
        desc: 'Story told via documents, logs, and found fragments.',
        hook: 'High immersion through "found footage" logic.',
        slides: [
            { title: "Fragmented Reality", content: "Constructing truth from letters, emails, and logs.", icon: Archive, visual: 'EPISTLE_1' }
        ]
    },
    { 
        id: 'TRAGEDY', 
        label: 'Greek Tragedy', 
        type: 'Classical', 
        icon: Crown,
        desc: 'The fall of a high-status protagonist due to a fatal flaw.',
        hook: 'Powerfully explores hubris, fate, and irreversible loss.',
        slides: [
            { title: "The Fatal Flaw", content: "Hamartia leads to a tragic reversal of fortune.", icon: Crown, visual: 'TRAGEDY_1' }
        ]
    },
];

export const ManifestoForge: React.FC<ManifestoForgeProps> = ({ 
    blocks, onUpdateBlocks, registry, title, subtitle, accentColor = 'nexus-ruby', 
    onRunSynthesis, synthesisLabel, canSynthesize, hasSpine, onJumpToSpine, onCommitUnit, onSeedTemplate,
    context = 'GLOBAL'
}) => {
    const [showBlockPicker, setShowBlockPicker] = useState(false);
    const [activeSearchBlockId, setActiveSearchBlockId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [theoryGuideId, setTheoryGuideId] = useState<string | null>(null);
    const [atMenu, setAtMenu] = useState<{ blockId: string; field: string; query: string; pos: number } | null>(null);
    const [aiSeedInput, setAiSeedInput] = useState('');
    const [isSeedingAi, setIsSeedingAi] = useState(false);

    const suggestions = useMemo(() => {
        const query = (atMenu ? atMenu.query : searchQuery).toLowerCase();
        if (!query && !atMenu) return [];
        return (Object.values(registry) as NexusObject[])
            .filter(n => !isLink(n) && (n as any).title?.toLowerCase().includes(query))
            .slice(0, 10);
    }, [registry, searchQuery, atMenu]);

    const addBlock = (type: BlockType) => {
        const newBlock: StudioBlock = {
            id: generateId(),
            type,
            data: type === 'DELTA' ? { start: '', end: '', subjectId: null } :
                  type === 'LATENT_UNIT' ? { title: '', category: NexusCategory.CHARACTER, gist: '', aliases: [], tags: [], thematicWeight: '', draftPrompt: '' } :
                  type === 'CONTEXT' ? { fact: '', theme: '', weight: 3, importedIds: [] } :
                  type === 'THESIS' ? { text: '', importedIds: [] } :
                  type === 'IMPORT_NODE' ? { nodeId: null, significance: '', useAuthorNote: false } :
                  type === 'ORACLE_PROMPT' ? { text: '' } :
                  type === 'LITERARY_APPROACH' ? { archetype: 'THREE_ACT', rationale: '' } :
                  { text: '' }
        };
        onUpdateBlocks([...blocks, newBlock]);
        setShowBlockPicker(false);
    };

    const handleAiBlueprintRequest = async () => {
        if (!aiSeedInput.trim()) return;
        setIsSeedingAi(true);
        try {
            const resultBlocks = await StudioSpineAgent.synthesizeManifestoBlocks(aiSeedInput);
            onUpdateBlocks(resultBlocks);
            setAiSeedInput('');
        } catch (err) {
            console.error(err);
        } finally {
            setIsSeedingAi(false);
        }
    };

    const updateBlockData = (id: string, newData: any) => {
        onUpdateBlocks(blocks.map(b => b.id === id ? { ...b, data: { ...b.data, ...newData } } : b));
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
        const block = blocks.find(b => b.id === atMenu.blockId);
        if (!block) return;
        const text = block.data[atMenu.field] || '';
        const before = text.slice(0, atMenu.pos);
        const after = text.slice(atMenu.pos);
        const lastAt = before.lastIndexOf('@');
        const newText = before.slice(0, lastAt) + `[[${title}]]` + after;
        updateBlockData(atMenu.blockId, { [atMenu.field]: newText });
        setAtMenu(null);
    };

    const moveBlock = (id: string, direction: 'up' | 'down') => {
        const idx = blocks.findIndex(b => b.id === id);
        if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === blocks.length - 1)) return;
        const newBlocks = [...blocks];
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        [newBlocks[idx], newBlocks[swapIdx]] = [newBlocks[swapIdx], newBlocks[idx]];
        onUpdateBlocks(newBlocks);
    };

    const isGlobal = context === 'GLOBAL';
    const activeColorHex = isGlobal ? 'var(--nexus-ruby)' : 'var(--arcane-color)';
    const activeColorClass = isGlobal ? 'nexus-ruby' : 'nexus-arcane';

    return (
        <div className={`space-y-12 animate-in fade-in duration-700 relative pb-40 h-full flex flex-col`}>
            <div className={`flex items-start ${blocks.length === 0 ? 'justify-end' : 'justify-between'} shrink-0`}>
                {blocks.length > 0 && (
                    <div className="animate-in slide-in-from-left duration-500">
                        <h2 className="text-3xl font-display font-black text-nexus-text uppercase tracking-tight">{title.replace('Manifesto', 'Blueprint')}</h2>
                        <p className="text-[10px] font-mono text-nexus-muted uppercase tracking-widest">{subtitle}</p>
                    </div>
                )}
                <div className="flex gap-4">
                  {hasSpine && onJumpToSpine && (
                      <button 
                        onClick={onJumpToSpine}
                        className="flex items-center gap-3 px-6 py-2.5 bg-nexus-900 border border-nexus-800 text-nexus-text rounded-full text-[10px] font-black uppercase tracking-widest hover:border-nexus-accent shadow-xl transition-all"
                      >
                        <Activity size={16} /> Open Narrative Spine
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
                    <div className={`flex-1 flex flex-col items-center justify-center text-center space-y-10 bg-nexus-900/20 border border-dashed border-nexus-800 rounded-[64px] animate-in fade-in zoom-in-95 duration-700 relative overflow-hidden p-10`}>
                        <div className={`absolute inset-0 bg-${activeColorClass}/5 opacity-40 blur-[100px] pointer-events-none`} />
                        <div className="space-y-4 relative z-10">
                            <div className={`p-5 rounded-full bg-${activeColorClass}/10 border border-${activeColorClass}/30 inline-flex text-${activeColorClass} mb-4`}>
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
                                    <input 
                                        value={aiSeedInput}
                                        onChange={(e) => setAiSeedInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAiBlueprintRequest()}
                                        placeholder={isGlobal ? "Describe your story idea to manifest blocks..." : "Describe this chapter's sequence to manifest logic..."}
                                        className={`w-full bg-nexus-950 border border-nexus-800 rounded-[32px] px-8 py-5 text-nexus-text outline-none focus:border-${activeColorClass} transition-all shadow-2xl font-serif italic pr-20`}
                                    />
                                    <button 
                                        onClick={handleAiBlueprintRequest}
                                        disabled={!aiSeedInput.trim() || isSeedingAi}
                                        className={`absolute right-3 top-1/2 -translate-y-1/2 p-4 bg-${activeColorClass} text-white rounded-[24px] shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50`}
                                    >
                                        {isSeedingAi ? <RotateCw className="animate-spin" size={20}/> : <Sparkles size={20} />}
                                    </button>
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
                                    <span className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.4em]">Protocol Templates</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4">
                                    {isGlobal ? (
                                        <>
                                            <TemplateCard 
                                                title="The Memory Thief"
                                                framework="SAVE THE CAT"
                                                desc="High-fidelity beats for a memory-based mystery economy. Focuses on the internal guilt of the archivist."
                                                colorClass="nexus-ruby"
                                                onClick={() => onSeedTemplate?.(getSeedStoryManifesto())}
                                            />
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
                        <div key={block.id} className={`group relative bg-nexus-900 border border-nexus-800 rounded-[32px] p-8 shadow-xl transition-all hover:border-${activeColorClass}/30`}>
                            <div className="absolute -left-12 top-8 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                <button onClick={() => moveBlock(block.id, 'up')} className="p-1.5 bg-nexus-900 border border-nexus-800 rounded-lg text-nexus-muted hover:text-nexus-accent"><ChevronUp size={14}/></button>
                                <button onClick={() => moveBlock(block.id, 'down')} className="p-1.5 bg-nexus-900 border border-nexus-800 rounded-lg text-nexus-muted hover:text-nexus-accent"><ChevronDown size={14}/></button>
                                <button onClick={() => onUpdateBlocks(blocks.filter(b => b.id !== block.id))} className="p-1.5 bg-nexus-900 border border-nexus-800 rounded-lg text-nexus-muted hover:text-red-500 mt-2"><Trash2 size={14}/></button>
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
                                        onClick={() => setActiveSearchBlockId(activeSearchBlockId === block.id ? null : block.id)}
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
                <div className="fixed z-[300] w-64 bg-nexus-900 border border-nexus-700 rounded-[24px] shadow-2xl overflow-hidden backdrop-blur-xl animate-in zoom-in-95"
                     style={{ left: '50%', transform: 'translateX(-50%)', bottom: '100px' }}>
                    <div className={`px-5 py-3 border-b border-nexus-800 bg-nexus-950/40 text-[9px] font-black text-${activeColorClass} uppercase tracking-widest`}>Neural Search</div>
                    <div className="max-h-48 overflow-y-auto no-scrollbar p-1 space-y-0.5">
                        {suggestions.map((node: any) => (
                            <button key={node.id} onClick={() => insertMention(node.title)} className={`w-full flex items-center gap-3 p-3 hover:bg-${activeColorClass} hover:text-white transition-all text-left group rounded-xl`}>
                                <div className="w-6 h-6 rounded bg-nexus-950 border border-nexus-800 flex items-center justify-center text-[8px] font-black group-hover:bg-white/20">{node.category_id?.charAt(0)}</div>
                                <div className="text-[10px] font-bold truncate">{node.title}</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {activeSearchBlockId && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-nexus-950/40 backdrop-blur-sm">
                    <div className="bg-nexus-900 border border-nexus-700 rounded-[32px] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95">
                        <div className="flex items-center justify-between mb-6">
                            <span className={`text-[10px] font-black uppercase text-${activeColorClass} tracking-widest`}>Registry Search</span>
                            <button onClick={() => setActiveSearchBlockId(null)}><X size={18}/></button>
                        </div>
                        <input 
                            autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full bg-nexus-950 border border-nexus-800 rounded-2xl px-6 py-4 text-sm outline-none focus:border-${activeColorClass} mb-4`}
                            placeholder="Find world unit..."
                        />
                        <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
                            {suggestions.map((n: any) => (
                                <button 
                                    key={n.id} 
                                    onClick={() => {
                                        const block = blocks.find(b => b.id === activeSearchBlockId);
                                        if (block?.type === 'THESIS' || block?.type === 'CONTEXT') {
                                            updateBlockData(activeSearchBlockId, { importedIds: [...(block.data.importedIds || []), n.id] });
                                        } else if (block?.type === 'DELTA') {
                                            updateBlockData(activeSearchBlockId, { subjectId: n.id });
                                        } else if (block?.type === 'IMPORT_NODE') {
                                            updateBlockData(activeSearchBlockId, { nodeId: n.id });
                                        }
                                        setActiveSearchBlockId(null);
                                        setSearchQuery('');
                                    }}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl bg-nexus-950/50 border border-nexus-800 hover:border-${activeColorClass} transition-all text-left`}
                                >
                                    <div className="w-8 h-8 rounded-lg bg-nexus-900 flex items-center justify-center text-[10px] font-black">{n.category_id?.charAt(0)}</div>
                                    <div className="text-xs font-bold">{n.title}</div>
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

            {theoryGuideId && <TheoryGuideModal archetypeId={theoryGuideId} activeColorClass={activeColorClass} onClose={() => setTheoryGuideId(null)} />}

            {showBlockPicker && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-nexus-950/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="absolute inset-0" onClick={() => setShowBlockPicker(false)} />
                    <div className="relative w-full max-w-2xl bg-nexus-900 border border-nexus-800 rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <BlockPickerItem icon={Type} label="Thesis" desc="Narrative direction." activeColorClass={activeColorClass} onClick={() => addBlock('THESIS')} />
                            <BlockPickerItem icon={Layers} label="Approach" desc="Theory archetype." activeColorClass={activeColorClass} onClick={() => addBlock('LITERARY_APPROACH')} />
                            <BlockPickerItem icon={Scale} label="Arc Delta" desc="Unit state mutation." activeColorClass={activeColorClass} onClick={() => addBlock('DELTA')} />
                            <BlockPickerItem icon={UserPlus} label="Latent Unit" desc="Define new memory." activeColorClass={activeColorClass} onClick={() => addBlock('LATENT_UNIT')} />
                            <BlockPickerItem icon={FileSearch} label="Import Node" desc="Existing memory." activeColorClass={activeColorClass} onClick={() => addBlock('IMPORT_NODE')} />
                            <BlockPickerItem icon={MessageSquare} label="Oracle Task" desc="Direct LLM prompt." activeColorClass={activeColorClass} onClick={() => addBlock('ORACLE_PROMPT')} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const TemplateCard = ({ title, framework, desc, onClick, colorClass = "nexus-ruby" }: any) => (
    <button 
        onClick={onClick}
        className={`p-8 bg-nexus-900 border border-nexus-800 rounded-[40px] hover:border-${colorClass} transition-all group text-left space-y-6 shadow-xl w-full min-h-[180px] flex flex-col justify-center`}
    >
        <div className="flex items-center justify-between">
            <span className={`px-4 py-1.5 bg-${colorClass}/10 border border-${colorClass}/30 rounded-full text-[9px] font-black text-${colorClass} uppercase tracking-widest`}>{framework}</span>
            <ArrowRight size={18} className={`text-nexus-muted group-hover:text-${colorClass} transition-transform group-hover:translate-x-2`} />
        </div>
        <div>
            <h4 className="text-xl font-display font-black text-nexus-text uppercase mb-2 tracking-tight">{title}</h4>
            <p className="text-[11px] text-nexus-muted italic font-serif leading-relaxed line-clamp-2">"{desc}"</p>
        </div>
    </button>
);

const BlockIcon = ({ type, activeColorClass }: { type: BlockType, activeColorClass: string }) => {
    switch (type) {
        case 'THESIS': return <Type size={18} className={`text-${activeColorClass}`} />;
        case 'LITERARY_APPROACH': return <Layers size={18} className={`text-${activeColorClass}`} />;
        case 'DELTA': return <Scale size={18} className="text-nexus-accent" />;
        case 'LATENT_UNIT': return <UserPlus size={18} className="text-nexus-essence" />;
        case 'IMPORT_NODE': return <FileSearch size={18} className="text-nexus-essence" />;
        case 'ORACLE_PROMPT': return <MessageSquare size={18} className="text-nexus-arcane" />;
        case 'CONTEXT': return <Split size={18} className="text-nexus-muted" />;
        default: return <PenTool size={18} className="text-nexus-muted" />;
    }
};

const BlockPickerItem = ({ icon: Icon, label, desc, onClick, activeColorClass }: any) => (
    <button onClick={onClick} className={`p-6 rounded-3xl bg-nexus-950/40 border border-nexus-800 hover:border-${activeColorClass} hover:bg-${activeColorClass}/5 text-left transition-all group`}>
        <Icon size={20} className={`text-nexus-muted group-hover:text-${activeColorClass} mb-4`} />
        <h4 className="text-xs font-black uppercase text-nexus-text mb-1">{label}</h4>
        <p className="text-[10px] text-nexus-muted font-serif italic">{desc}</p>
    </button>
);

const StudioBlockEditor: React.FC<{
    block: StudioBlock;
    onUpdate: (d: any) => void;
    onInput: (id: string, f: string, v: string, p: number) => void;
    registry: Record<string, NexusObject>;
    allBlocks: StudioBlock[];
    onCommit?: (u: NexusObject) => void;
    onShowTheory?: (id: string) => void;
    activeColorClass: string;
}> = ({ block, onUpdate, onInput, registry, allBlocks, onCommit, onShowTheory, activeColorClass }) => {
    const [isSearching, setIsSearching] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDropText = (e: React.DragEvent, field: string) => {
        e.preventDefault();
        setIsDragOver(false);
        const title = e.dataTransfer.getData("application/nexus-scry-title");
        if (title) {
            const current = block.data[field] || '';
            const next = current + (current ? ' ' : '') + `[[${title}]]`;
            onUpdate({ [field]: next });
        }
    };

    const handleDropTarget = (e: React.DragEvent, field: string) => {
        e.preventDefault();
        setIsDragOver(false);
        const id = e.dataTransfer.getData("application/nexus-scry-id");
        if (id) {
            onUpdate({ [field]: id });
        }
    };

    const commonTextProps = (field: string) => ({
        onDragOver: (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); },
        onDragLeave: () => setIsDragOver(false),
        onDrop: (e: React.DragEvent) => handleDropText(e, field),
        className: `w-full bg-nexus-950 border rounded-2xl p-6 text-sm font-serif italic text-nexus-text outline-none resize-none transition-all ${isDragOver ? 'border-nexus-accent ring-4 ring-nexus-accent/10' : 'border-nexus-800'}`
    });

    switch (block.type) {
        case 'THESIS':
            return (
                <textarea 
                    {...commonTextProps('text')}
                    value={block.data.text} 
                    onChange={(e) => onInput(block.id, 'text', e.target.value, e.target.selectionStart || 0)} 
                    onSelect={(e) => onInput(block.id, 'text', (e.target as any).value, (e.target as any).selectionStart || 0)}
                    placeholder="State the core objective... (Drag lore here to link)" 
                    className={`${commonTextProps('text').className} h-32 shadow-inner`}
                />
            );
        
        case 'LITERARY_APPROACH':
            const currentArch = LITERARY_ARCHETYPES.find(a => a.id === block.data.archetype);
            return (
                <div className="space-y-10 animate-in fade-in duration-500">
                    <div className={`flex gap-8 items-start p-10 bg-nexus-950 border border-nexus-800 rounded-[40px] group/hero transition-all hover:border-${activeColorClass}/40 relative overflow-hidden`}>
                         <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none group-hover/hero:opacity-10 transition-opacity">
                             {currentArch && <currentArch.icon size={180} />}
                         </div>
                         
                         <button 
                            onClick={() => onShowTheory?.(block.data.archetype)}
                            className={`w-32 h-32 rounded-[32px] bg-${activeColorClass}/10 border border-${activeColorClass}/20 flex items-center justify-center shrink-0 shadow-lg group-hover/hero:scale-105 transition-all hover:bg-${activeColorClass}/20 relative group/icon`}
                            title="Open Theory Oracle"
                         >
                             {currentArch && <currentArch.icon size={64} className={`text-${activeColorClass} group-hover/icon:scale-110 transition-transform`} />}
                             <div className="absolute inset-0 flex items-center justify-center bg-nexus-900/40 opacity-0 group-hover/icon:opacity-100 transition-opacity rounded-[32px]">
                                <Info size={24} className="text-white" />
                             </div>
                         </button>
                         
                         <div className="flex-1 min-w-0 relative z-10">
                             <div className="flex items-center justify-between mb-4">
                                <span className={`text-[10px] font-display font-black text-${activeColorClass} uppercase tracking-[0.4em]`}>Active Narrative Protocol</span>
                                <div className={`flex items-center gap-2 px-3 py-1 bg-${activeColorClass}/10 border border-${activeColorClass}/30 rounded-full text-[9px] font-black text-${activeColorClass} uppercase tracking-widest animate-pulse`}>
                                    <Activity size={12} /> {currentArch?.type}
                                </div>
                             </div>
                             <h3 className="text-3xl font-display font-black text-nexus-text uppercase tracking-tight mb-2">{currentArch?.label}</h3>
                             <p className="text-base text-nexus-muted italic font-serif leading-relaxed mb-4 max-w-lg">"{currentArch?.desc}"</p>
                             <div className="p-4 bg-nexus-900/50 border border-nexus-800 rounded-2xl flex items-center gap-3">
                                <Sparkles size={16} className={`text-${activeColorClass}`} />
                                <span className="text-xs text-nexus-text font-medium italic">"{currentArch?.hook}"</span>
                             </div>
                         </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.3em] ml-2">Protocol Selection Matrix</label>
                        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 px-2 -mx-2">
                            {LITERARY_ARCHETYPES.map(arch => (
                                <button 
                                    key={arch.id}
                                    onClick={() => onUpdate({ archetype: arch.id })}
                                    className={`
                                        flex flex-col items-start gap-4 p-6 rounded-[32px] border transition-all shrink-0 w-64 group/pill
                                        ${block.data.archetype === arch.id 
                                            ? `bg-${activeColorClass}/10 border-${activeColorClass} shadow-xl shadow-${activeColorClass}/10 ring-1 ring-${activeColorClass}` 
                                            : `bg-nexus-950 border border-nexus-800 hover:border-${activeColorClass}/50 hover:bg-nexus-900/50`}
                                    `}
                                >
                                    <div className={`p-3 rounded-2xl border transition-all ${block.data.archetype === arch.id ? `bg-${activeColorClass} text-white border-${activeColorClass}` : `bg-nexus-900 border border-nexus-800 text-nexus-muted group-hover/pill:text-${activeColorClass}`}`}>
                                        <arch.icon size={20} />
                                    </div>
                                    <div>
                                        <div className={`text-sm font-display font-black uppercase tracking-widest mb-1 ${block.data.archetype === arch.id ? 'text-nexus-text' : `text-nexus-muted group-hover/pill:text-nexus-text`}`}>{arch.label}</div>
                                        <p className="text-[10px] text-nexus-muted font-serif italic leading-snug line-clamp-2">"{arch.desc}"</p>
                                    </div>
                                    {block.data.archetype === arch.id && (
                                        <div className="mt-auto pt-2 flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full bg-${activeColorClass} animate-pulse`} />
                                            <span className={`text-[8px] font-black text-${activeColorClass} uppercase tracking-widest`}>Selected</span>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[9px] font-display font-black text-nexus-muted uppercase tracking-[0.3em] ml-2">Logical Adaptation Rationale</label>
                        <textarea 
                            {...commonTextProps('rationale')}
                            value={block.data.rationale} 
                            onChange={(e) => onInput(block.id, 'rationale', e.target.value, e.target.selectionStart || 0)} 
                            onSelect={(e) => onInput(block.id, 'rationale', (e.target as any).value, (e.target as any).selectionStart || 0)}
                            placeholder="Why does this structure serve your blueprint? (Drag lore here to link)" 
                            className={`${commonTextProps('rationale').className} h-28 shadow-inner`}
                        />
                    </div>
                </div>
            );

        case 'DELTA':
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
                        <label className="text-[8px] font-black uppercase text-nexus-muted tracking-[0.3em]">Subject of Mutation</label>
                        {sub ? (
                             <div className="flex items-center gap-2 px-3 py-1 bg-nexus-accent/10 border border-nexus-accent/20 rounded-full text-[10px] font-bold text-nexus-accent uppercase animate-in slide-in-from-right-2">
                                <Target size={12} /> {(sub as any).title}
                             </div>
                        ) : (
                             <span className="text-[8px] text-nexus-muted italic font-mono uppercase opacity-40">Drag Lore Unit Here to Assign Subject</span>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <textarea 
                            {...commonTextProps('start')}
                            value={block.data.start} 
                            onChange={(e) => onInput(block.id, 'start', e.target.value, e.target.selectionStart || 0)} 
                            onSelect={(e) => onInput(block.id, 'start', (e.target as any).value, (e.target as any).selectionStart || 0)}
                            placeholder="Alpha state... (Drag lore here to link)" 
                            className={`${commonTextProps('start').className} h-24`}
                        />
                        <textarea 
                            {...commonTextProps('end')}
                            value={block.data.end} 
                            onChange={(e) => onInput(block.id, 'end', e.target.value, e.target.selectionStart || 0)} 
                            onSelect={(e) => onInput(block.id, 'end', (e.target as any).value, (e.target as any).selectionStart || 0)}
                            placeholder="Omega state... (Drag lore here to link)" 
                            className={`${commonTextProps('end').className} h-24`}
                        />
                    </div>
                </div>
            );

        case 'LATENT_UNIT':
            const runSearch = async () => {
                setIsSearching(true);
                try {
                    const result = await StudioSpineAgent.autofillLatentUnit(block.data.title, block.data.draftPrompt, allBlocks, registry);
                    onUpdate({ 
                        category: result.category, 
                        gist: result.gist, 
                        aliases: result.aliases, 
                        tags: result.tags, 
                        thematicWeight: result.thematicWeight 
                    });
                } catch (e) { console.error(e); } finally { setIsSearching(false); }
            };

            const commitToRegistry = () => {
                if (!block.data.title || !onCommit) return;
                const now = new Date().toISOString();
                const unit: any = {
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
                    link_ids: []
                };
                onCommit(unit);
                alert(`${block.data.title} reified into Project Registry.`);
            };

            return (
                <div className="space-y-8 animate-in fade-in zoom-in-95">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                             <label className="text-[9px] font-black uppercase text-nexus-muted tracking-widest ml-1">Title Designation</label>
                             <input value={block.data.title} onChange={(e) => onUpdate({ title: e.target.value })} placeholder="New Unit Title..." className="w-full bg-nexus-950 border border-nexus-800 rounded-2xl px-6 py-4 text-sm font-bold text-nexus-text focus:border-nexus-essence outline-none transition-all" />
                        </div>
                        <div className="space-y-2">
                             <label className="text-[9px] font-black uppercase text-nexus-muted tracking-widest ml-1">Logic Category</label>
                             <div className="relative">
                                <select value={block.data.category} onChange={(e) => onUpdate({ category: e.target.value })} className="w-full bg-nexus-950 border border-nexus-800 rounded-2xl px-6 py-4 text-xs font-black uppercase text-nexus-text appearance-none outline-none focus:border-nexus-essence">
                                    {Object.values(NexusCategory).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-nexus-muted pointer-events-none" />
                             </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <label className="text-[9px] font-black uppercase text-nexus-muted tracking-widest">Neural Expansion Protocol</label>
                            <span className="text-[8px] font-mono text-nexus-essence uppercase">Unit_Drafting_v3.2</span>
                        </div>
                        <div className="flex gap-3">
                            <input 
                                value={block.data.draftPrompt} 
                                onChange={(e) => onInput(block.id, 'draftPrompt', e.target.value, e.target.selectionStart || 0)} 
                                onSelect={(e) => onInput(block.id, 'draftPrompt', (e.target as any).value, (e.target as any).selectionStart || 0)}
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
                                {isSearching ? <RotateCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                Draft Unit
                            </button>
                        </div>
                    </div>

                    <div className="bg-nexus-950/50 border border-nexus-800 rounded-[32px] p-6 space-y-6 shadow-inner">
                         <div className="space-y-2">
                             <label className="text-[8px] font-black uppercase text-nexus-muted tracking-[0.3em] ml-1">Manifest Gist</label>
                             <textarea 
                                {...commonTextProps('gist')}
                                value={block.data.gist} 
                                onChange={(e) => onInput(block.id, 'gist', e.target.value, e.target.selectionStart || 0)} 
                                onSelect={(e) => onInput(block.id, 'gist', (e.target as any).value, (e.target as any).selectionStart || 0)}
                                placeholder="Suggested abstract... (Drag lore here to link)" 
                                className={`${commonTextProps('gist').className} h-20`}
                             />
                         </div>
                         <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[8px] font-black uppercase text-nexus-muted tracking-[0.3em] ml-1 flex items-center gap-2"><AtSign size={10} /> Designations</label>
                                <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-nexus-900 border border-nexus-800 rounded-xl">
                                    {block.data.aliases?.map((a: string) => (
                                        <span key={a} className="px-2 py-1 bg-nexus-essence/10 border border-nexus-essence/30 rounded text-[9px] font-bold text-nexus-essence">{a}</span>
                                    ))}
                                    {!block.data.aliases?.length && <span className="text-[8px] text-nexus-muted/40 italic">Waiting for search...</span>}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[8px] font-black uppercase text-nexus-muted tracking-[0.3em] ml-1 flex items-center gap-2"><Tag size={10} /> Semantic Tags</label>
                                <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-nexus-900 border border-nexus-800 rounded-xl">
                                    {block.data.tags?.map((t: string) => (
                                        <span key={t} className="px-2 py-1 bg-nexus-950 border border-nexus-800 rounded text-[9px] font-bold text-nexus-muted">#{t}</span>
                                    ))}
                                    {!block.data.tags?.length && <span className="text-[8px] text-nexus-muted/40 italic">Waiting for search...</span>}
                                </div>
                            </div>
                         </div>
                         <div className="space-y-2">
                             <label className="text-[8px] font-black uppercase text-nexus-muted tracking-[0.3em] ml-1 flex items-center gap-2"><Fingerprint size={10} /> Thematic Inheritance</label>
                             <div className="p-4 bg-nexus-900 border border-nexus-800 rounded-xl text-[10px] text-nexus-muted font-serif italic leading-relaxed italic">
                                 {block.data.thematicWeight || "Neural weights not yet established."}
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

        case 'IMPORT_NODE':
            const imported = block.data.nodeId ? registry[block.data.nodeId] : null;
            return (
                <div className="space-y-6">
                    <div 
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
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
                                      <div dangerouslySetInnerHTML={{ __html: getCategoryIconSvg((imported as any).category_id, getCategoryColor((imported as any).category_id)) }} className="scale-[2.5]" />
                                 </div>
                                 <div className="flex-1 min-w-0">
                                     <div className="flex items-center justify-between mb-2">
                                         <span className="text-[9px] font-display font-black text-nexus-essence uppercase tracking-[0.4em]">Synchronized Memory Unit</span>
                                         <div className="flex gap-2">
                                             <button onClick={() => onUpdate({ useAuthorNote: !block.data.useAuthorNote })} className={`px-3 py-1 rounded-full text-[8px] font-black uppercase transition-all shadow-sm ${block.data.useAuthorNote ? 'bg-amber-500 text-black border-amber-500' : 'bg-nexus-800 text-nexus-muted hover:text-white'}`}>
                                                 {block.data.useAuthorNote ? 'PROTOCOL MODE' : 'REF MODE'}
                                             </button>
                                         </div>
                                     </div>
                                     <h3 className="text-2xl font-display font-black text-nexus-text uppercase tracking-tight">{(imported as any).title}</h3>
                                     <p className="text-sm text-nexus-muted italic font-serif line-clamp-1 mt-1">"{(imported as any).gist}"</p>
                                 </div>
                                 <button onClick={() => onUpdate({ nodeId: null })} className="p-3 text-nexus-muted hover:text-red-500 bg-nexus-900 border border-nexus-800 rounded-2xl transition-all">
                                     <RotateCw size={18} />
                                 </button>
                             </div>
                         ) : (
                             <div className="flex flex-col items-center justify-center py-10 text-center gap-6 relative z-10">
                                 <div className={`p-4 rounded-full border transition-all ${isDragOver ? 'bg-nexus-accent/10 border-nexus-accent text-nexus-accent' : 'bg-nexus-950 border-nexus-800 text-nexus-muted'}`}>
                                     <FileSearch size={32} className={isDragOver ? 'animate-bounce' : 'opacity-20'} />
                                 </div>
                                 <div className="max-w-xs">
                                     <h4 className="text-sm font-black uppercase text-nexus-muted tracking-widest mb-1">{isDragOver ? 'Release to Synchronize' : 'Awaiting Memory Search'}</h4>
                                     <p className="text-[10px] text-nexus-muted font-serif italic">Drag lore here or use the Search Registry button above to link an existing concept.</p>
                                 </div>
                             </div>
                         )}
                    </div>
                    
                    {imported && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <label className="text-[8px] font-black uppercase text-nexus-muted tracking-[0.3em] ml-2">Contextual Significance</label>
                            <textarea 
                                {...commonTextProps('significance')}
                                value={block.data.significance} 
                                onChange={(e) => onInput(block.id, 'significance', e.target.value, e.target.selectionStart || 0)} 
                                onSelect={(e) => onInput(block.id, 'significance', (e.target as any).value, (e.target as any).selectionStart || 0)}
                                placeholder="Document resonance... (Drag lore here to link)" 
                                className={`${commonTextProps('significance').className} h-24`}
                            />
                        </div>
                    )}
                </div>
            );

        case 'ORACLE_PROMPT':
            return (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Zap size={10} className="text-nexus-arcane" />
                        <span className="text-[8px] font-black uppercase text-nexus-muted tracking-widest">Tactical Override Prompt</span>
                    </div>
                    <textarea 
                        {...commonTextProps('text')}
                        value={block.data.text} 
                        onChange={(e) => onInput(block.id, 'text', e.target.value, e.target.selectionStart || 0)} 
                        onSelect={(e) => onInput(block.id, 'text', (e.target as any).value, (e.target as any).selectionStart || 0)}
                        placeholder="Instruct the Architect... (Drag lore here to link)" 
                        className={`${commonTextProps('text').className} font-mono h-32 shadow-inner`}
                    />
                </div>
            );

        case 'CONTEXT':
            return (
                <textarea 
                    {...commonTextProps('fact')}
                    value={block.data.fact} 
                    onChange={(e) => onInput(block.id, 'fact', e.target.value, e.target.selectionStart || 0)} 
                    onSelect={(e) => onInput(block.id, 'fact', (e.target as any).value, (e.target as any).selectionStart || 0)}
                    placeholder="Narrative facts & thematic weights... (Drag lore here to link)" 
                    className={`${commonTextProps('fact').className} h-24 shadow-inner`}
                />
            );
        
        default: return null;
    }
};

const SlideVisualizer = ({ type }: { type: string }) => {
    switch (type) {
        case 'THREE_ACT_1':
            return (
                <svg width="320" height="160" viewBox="0 0 320 160" className="animate-in fade-in duration-1000">
                    <line x1="20" y1="130" x2="300" y2="130" stroke="var(--bg-800)" strokeWidth="4" strokeLinecap="round" />
                    <rect x="20" y="110" width="80" height="40" rx="8" fill="var(--nexus-ruby)" opacity="0.1" />
                    <text x="30" y="100" fill="var(--nexus-ruby)" fontSize="10" className="font-mono font-bold">ACT I</text>
                    <path d="M 20 130 Q 100 130 140 60" fill="none" stroke="var(--nexus-ruby)" strokeWidth="4" strokeDasharray="300" strokeDashoffset="300" className="animate-[dash_2s_ease-out_forwards]" />
                    <circle cx="140" cy="60" r="8" fill="var(--nexus-ruby)" className="animate-pulse shadow-lg" />
                    <style>{`@keyframes dash { to { stroke-dashoffset: 0; } }`}</style>
                </svg>
            );
        case 'THREE_ACT_2':
            return (
                <svg width="320" height="160" viewBox="0 0 320 160" className="animate-in fade-in duration-1000">
                    <line x1="20" y1="80" x2="300" y2="80" stroke="var(--bg-800)" strokeWidth="4" strokeLinecap="round" opacity="0.3" />
                    <path d="M 160 20 L 160 140" stroke="var(--nexus-ruby)" strokeWidth="2" strokeDasharray="5,5" />
                    <circle cx="160" cy="80" r="12" fill="var(--nexus-ruby)" className="animate-pulse" />
                    <path d="M 20 100 L 160 80 L 300 40" fill="none" stroke="var(--nexus-ruby)" strokeWidth="5" />
                    <text x="145" y="15" fill="var(--nexus-ruby)" fontSize="10" className="font-mono font-bold">MIDPOINT</text>
                </svg>
            );
        case 'THREE_ACT_3':
            return (
                <svg width="320" height="160" viewBox="0 0 320 160" className="animate-in fade-in duration-1000">
                    <path d="M 20 130 L 220 30" fill="none" stroke="var(--nexus-ruby)" strokeWidth="6" opacity="0.2" />
                    <path d="M 20 130 L 220 30" fill="none" stroke="var(--nexus-ruby)" strokeWidth="6" strokeDasharray="500" strokeDashoffset="500" className="animate-[dash_1s_ease-out_forwards]" />
                    <path d="M 220 30 L 300 30" fill="none" stroke="var(--nexus-ruby)" strokeWidth="6" strokeDasharray="100" strokeDashoffset="100" className="animate-[dash_0.5s_ease-out_1s_forwards]" />
                    <circle cx="220" cy="30" r="14" fill="var(--nexus-ruby)" filter="url(#glow)">
                         <animate attributeName="r" values="14;18;14" dur="1s" repeatCount="indefinite" />
                    </circle>
                    <text x="240" y="20" fill="var(--nexus-ruby)" fontSize="12" className="font-display font-black">CLIMAX</text>
                </svg>
            );
        case 'HERO_1':
            return (
                <svg width="320" height="160" viewBox="0 0 320 160" className="animate-in fade-in duration-1000">
                    <rect x="0" y="0" width="160" height="160" fill="var(--bg-800)" opacity="0.2" />
                    <text x="30" y="30" fill="var(--nexus-muted)" fontSize="10" className="font-mono uppercase">Ordinary World</text>
                    <text x="180" y="30" fill="var(--nexus-accent)" fontSize="10" className="font-mono uppercase">Special World</text>
                    <line x1="160" y1="20" x2="160" y2="140" stroke="var(--nexus-accent)" strokeWidth="2" strokeDasharray="10,5" />
                    <circle cx="60" cy="80" r="12" fill="var(--nexus-accent)">
                        <animate attributeName="cx" values="60;260" dur="4s" repeatCount="indefinite" />
                    </circle>
                </svg>
            );
        case 'HERO_2':
            return (
                <svg width="320" height="160" viewBox="0 0 320 160" className="animate-in fade-in duration-1000">
                    <circle cx="160" cy="80" r="50" fill="none" stroke="var(--nexus-accent)" strokeWidth="2" strokeDasharray="5,10" className="animate-spin-slow" />
                    <circle cx="160" cy="80" r="30" fill="var(--nexus-accent)" opacity="0.2" />
                    <path d="M 130 80 Q 160 40 190 80 Q 160 120 130 80" fill="none" stroke="white" strokeWidth="2" className="animate-pulse" />
                    <text x="135" y="145" fill="var(--nexus-accent)" fontSize="10" className="font-display font-black uppercase tracking-widest">THE ABYSS</text>
                </svg>
            );
        case 'HERO_3':
            return (
                <svg width="320" height="160" viewBox="0 0 320 160" className="animate-in fade-in duration-1000">
                    <circle cx="160" cy="80" r="15" fill="var(--nexus-accent)" filter="url(#glow)">
                        <animate attributeName="r" values="15;40;15" dur="3s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.8;0.2;0.8" dur="3s" repeatCount="indefinite" />
                    </circle>
                    <path d="M 160 20 L 160 140 M 100 80 L 220 80" stroke="white" strokeWidth="1" opacity="0.3" />
                    <text x="125" y="150" fill="var(--nexus-accent)" fontSize="11" className="font-display font-black uppercase tracking-[0.2em]">INTEGRATION</text>
                </svg>
            );
        case 'TRAGEDY_1':
            return (
                <svg width="240" height="120" viewBox="0 0 240 120" className="animate-in fade-in duration-1000">
                    <rect x="100" y="20" width="40" height="80" fill="none" stroke="var(--nexus-ruby)" strokeWidth="3" />
                    <path d="M 90 20 L 150 20" stroke="var(--nexus-ruby)" strokeWidth="5" />
                    <path d="M 110 50 L 130 70" stroke="white" strokeWidth="2" opacity="0.5" className="animate-pulse" />
                </svg>
            );
        case 'RASH_1':
            return (
                <svg width="240" height="120" viewBox="0 0 240 120" className="animate-in fade-in duration-1000">
                    <circle cx="120" cy="60" r="10" fill="var(--accent-color)" />
                    <path d="M 40 20 Q 120 60 40 100" fill="none" stroke="var(--arcane-color)" strokeWidth="2" opacity="0.6" />
                    <path d="M 200 20 Q 120 60 200 100" fill="none" stroke="var(--nexus-ruby)" strokeWidth="2" opacity="0.6" />
                </svg>
            );
        default:
            return <Activity size={80} className="text-nexus-muted opacity-20 animate-pulse" />;
    }
};

const TheoryGuideModal = ({ archetypeId, onClose, activeColorClass }: { archetypeId: string, onClose: () => void, activeColorClass: string }) => {
    const archetype = useMemo(() => LITERARY_ARCHETYPES.find(a => a.id === archetypeId), [archetypeId]);
    const [slideIdx, setSlideIdx] = useState(0);

    if (!archetype) return null;

    const currentSlide = archetype.slides[slideIdx];
    const SlideIcon = currentSlide.icon;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-nexus-950/60 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="absolute inset-0" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-nexus-900 border border-nexus-800 rounded-[48px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-10 flex flex-col h-[550px]">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 bg-${activeColorClass}/10 rounded-2xl border border-${activeColorClass}/30 text-${activeColorClass}`}>
                                <BookOpen size={24} />
                            </div>
                            <div>
                                <h3 className="text-sm font-display font-black text-nexus-text uppercase tracking-widest">{archetype.label}</h3>
                                <p className="text-[9px] font-mono text-nexus-muted uppercase tracking-[0.2em] mt-0.5">Theory Oracle v3.0</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-nexus-muted hover:text-white transition-colors"><X size={20}/></button>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 animate-in slide-in-from-right-4 duration-300" key={slideIdx}>
                         <div className="p-8 rounded-[40px] bg-nexus-950/40 border border-nexus-800 flex items-center justify-center w-full min-h-[160px] shadow-inner">
                             <SlideVisualizer type={currentSlide.visual || ''} />
                         </div>
                         <div className="space-y-4">
                            <div className="flex items-center justify-center gap-3">
                                <div className={`p-1.5 rounded-lg bg-${activeColorClass}/20 text-${activeColorClass}`}>
                                    <SlideIcon size={16} />
                                </div>
                                <h4 className="text-xl font-display font-black text-nexus-text uppercase tracking-tight">{currentSlide.title}</h4>
                            </div>
                            <p className="text-sm text-nexus-muted font-serif italic leading-relaxed max-w-sm mx-auto">
                                "{currentSlide.content}"
                            </p>
                         </div>
                    </div>

                    <div className="mt-8 flex items-center justify-between">
                         <div className="flex gap-2">
                             {archetype.slides.map((_, i) => (
                                 <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === slideIdx ? `w-8 bg-${activeColorClass} shadow-[0_0_8px_rgba(225,29,72,0.5)]` : 'w-2 bg-nexus-800'}`} />
                             ))}
                         </div>
                         <div className="flex gap-3">
                            <button 
                                disabled={slideIdx === 0} 
                                onClick={() => setSlideIdx(prev => prev - 1)}
                                className="p-4 rounded-2xl bg-nexus-950 border border-nexus-800 text-nexus-muted hover:text-white disabled:opacity-20 transition-all active:scale-95 shadow-sm"
                            >
                                <ArrowLeft size={18} />
                            </button>
                            <button 
                                onClick={() => slideIdx === archetype.slides.length - 1 ? onClose() : setSlideIdx(prev => prev + 1)}
                                className={`p-4 rounded-2xl bg-${activeColorClass} text-white shadow-xl shadow-${activeColorClass}/20 transition-all hover:brightness-110 active:scale-95`}
                            >
                                {slideIdx === archetype.slides.length - 1 ? <Check size={18} /> : <ArrowRight size={18} />}
                            </button>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
