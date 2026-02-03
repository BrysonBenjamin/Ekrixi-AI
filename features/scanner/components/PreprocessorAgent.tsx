
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
    Zap, Sparkles, Plus, X, List, ChevronRight, 
    AtSign, Edit3, Target, MousePointer2, Wand2,
    Database, Hash, ArrowRight, UserCircle2, Trash2,
    RotateCw, Link, Info, Repeat, MousePointerSquareDashed,
    Check, MousePointerClick
} from 'lucide-react';
import { EntitySeed } from '../ScannerFeature';
import { NexusCategory } from '../../../types';
import { generateId } from '../../../utils/ids';

interface PreprocessorAgentProps {
    text: string;
    onFinalize: (seeds: EntitySeed[]) => void;
    onCancel: () => void;
}

export const PreprocessorAgent: React.FC<PreprocessorAgentProps> = ({ text, onFinalize, onCancel }) => {
    const [seeds, setSeeds] = useState<EntitySeed[]>([]);
    const [activeSeedId, setActiveSeedId] = useState<string | null>(null);
    const [highlights, setHighlights] = useState<Array<{ text: string, type: string }>>([]);
    const [isAkaMode, setIsAkaMode] = useState(false);
    const [isExpanding, setIsExpanding] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [manualAliasInput, setManualAliasInput] = useState('');

    const workbenchRef = useRef<HTMLDivElement>(null);

    // Initial detection pass
    useEffect(() => {
        const detectInitial = async () => {
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const response = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    config: {
                        systemInstruction: "Identify unique entities in text. Return JSON list of strings only.",
                        responseMimeType: 'application/json'
                    },
                    contents: [{ parts: [{ text: text.slice(0, 8000) }] }]
                });
                try {
                    const entities = JSON.parse(response.text || "[]");
                    if (Array.isArray(entities)) {
                        setHighlights(entities.map((e: string) => ({ text: String(e), type: 'CANDIDATE' })));
                    }
                } catch (e) {
                    console.error("Malformed entities JSON", e);
                }
            } catch (err) {
                console.error("Initial detection failed", err);
            } finally {
                setIsLoading(false);
            }
        };
        detectInitial();
    }, [text]);

    const activeSeed = useMemo(() => seeds.find(s => s.id === activeSeedId), [seeds, activeSeedId]);

    const handleTextClick = (entityText: string) => {
        if (isAkaMode && activeSeedId) {
            setSeeds(prev => prev.map(s => 
                s.id === activeSeedId 
                    ? { ...s, aliases: Array.from(new Set([...s.aliases, entityText])) } 
                    : s
            ));
            return;
        }

        const existing = seeds.find(s => s.title.toLowerCase() === entityText.toLowerCase());
        if (existing) {
            setActiveSeedId(existing.id);
        } else {
            const newSeed: EntitySeed = {
                id: generateId(),
                title: entityText,
                aliases: [],
                gist: '',
                category: NexusCategory.CONCEPT,
                isManual: true,
                isAuthorNote: false,
                suggestedChildren: []
            };
            setSeeds(prev => [...prev, newSeed]);
            setActiveSeedId(newSeed.id);
        }
    };

    const handleManualSelection = () => {
        const selection = window.getSelection()?.toString().trim();
        if (selection) {
            if (activeSeedId) {
                // Add as alias to active
                setSeeds(prev => prev.map(s => 
                    s.id === activeSeedId 
                        ? { ...s, aliases: Array.from(new Set([...s.aliases, selection])) } 
                        : s
                ));
            } else {
                // Create new anchor
                const newSeed: EntitySeed = {
                    id: generateId(),
                    title: selection,
                    aliases: [],
                    gist: '',
                    category: NexusCategory.CONCEPT,
                    isManual: true,
                    isAuthorNote: false,
                    suggestedChildren: []
                };
                setSeeds(prev => [...prev, newSeed]);
                setActiveSeedId(newSeed.id);
            }
            window.getSelection()?.removeAllRanges();
        }
    };

    const deleteSeed = (id: string) => {
        setSeeds(prev => prev.filter(s => s.id !== id));
        if (activeSeedId === id) setActiveSeedId(null);
    };

    const promoteAlias = (seedId: string, alias: string) => {
        setSeeds(prev => prev.map(s => {
            if (s.id !== seedId) return s;
            const oldTitle = s.title;
            return {
                ...s,
                title: alias,
                aliases: Array.from(new Set([...s.aliases.filter(a => a !== alias), oldTitle]))
            };
        }));
    };

    const addManualAlias = () => {
        if (!activeSeedId || !manualAliasInput.trim()) return;
        setSeeds(prev => prev.map(s => 
            s.id === activeSeedId 
                ? { ...s, aliases: Array.from(new Set([...s.aliases, manualAliasInput.trim()])) } 
                : s
        ));
        setManualAliasInput('');
    };

    const handleExpansion = async (seedId: string) => {
        const target = seeds.find(s => s.id === seedId);
        if (!target) return;
        setIsExpanding(seedId);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                config: {
                    systemInstruction: `Suggest organizational sub-containers for "${target.title}". 
                    - FOCUS ON CONTAINERS: Large subfolders for hierarchy.
                    - MANDATORY: Include one 'Author's Note' (isAuthorNote: true).
                    - Return JSON list of {title, category, gist, isAuthorNote}.`,
                    responseMimeType: 'application/json'
                },
                contents: [{ parts: [{ text: `Original Context Fragment: ${text.slice(0, 5000)}` }] }]
            });
            try {
                const suggestions = JSON.parse(response.text || "[]");
                if (Array.isArray(suggestions)) {
                    const sanitized = suggestions.map((s: any) => ({
                        ...s,
                        category: s.category || NexusCategory.CONCEPT,
                        isAuthorNote: !!s.isAuthorNote
                    }));
                    setSeeds(prev => prev.map(s => s.id === seedId ? { ...s, suggestedChildren: sanitized } : s));
                }
            } catch (e) {
                console.error("Malformed expansion suggestions JSON", e);
            }
        } catch (err) {
            console.error("Expansion failed", err);
        } finally {
            setIsExpanding(null);
        }
    };

    const updateSeed = (id: string, updates: Partial<EntitySeed>) => {
        setSeeds(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const removeSuggestion = (seedId: string, index: number) => {
        setSeeds(prev => prev.map(s => {
            if (s.id !== seedId) return s;
            const next = [...s.suggestedChildren];
            next.splice(index, 1);
            return { ...s, suggestedChildren: next };
        }));
    };

    const renderTextWithHighlights = () => {
        const sortedHighlights = [...highlights].sort((a, b) => b.text.length - a.text.length);
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;

        const regexString = sortedHighlights.length > 0 
            ? `(${sortedHighlights.map(h => h.text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})`
            : null;

        if (!regexString) return [text];

        const regex = new RegExp(regexString, 'gi');
        const matches = [...text.matchAll(regex)];

        matches.forEach((match, i) => {
            const index = match.index!;
            const matchText = match[0];
            parts.push(text.slice(lastIndex, index));
            const isSeeded = seeds.some(s => s.title.toLowerCase() === matchText.toLowerCase());
            const isAliasOfActive = activeSeed?.aliases.some(a => a.toLowerCase() === matchText.toLowerCase());

            parts.push(
                <span 
                    key={i}
                    onClick={() => handleTextClick(matchText)}
                    className={`
                        cursor-pointer transition-all px-1.5 py-0.5 rounded font-bold border-b-2
                        ${isAliasOfActive 
                            ? 'bg-nexus-arcane/20 border-nexus-arcane text-nexus-text shadow-[0_0_10px_var(--arcane-color)]' 
                            : isSeeded 
                                ? 'bg-nexus-accent/20 border-nexus-accent text-nexus-text shadow-[0_0_10px_var(--glow-color)]' 
                                : 'border-nexus-700/50 text-nexus-text/80 hover:bg-nexus-800/40'}
                        ${isAkaMode ? 'ring-2 ring-nexus-arcane ring-offset-2 ring-offset-nexus-950 scale-105' : ''}
                    `}
                >
                    {matchText}
                </span>
            );
            lastIndex = index + matchText.length;
        });
        parts.push(text.slice(lastIndex));
        return parts;
    };

    return (
        <div className="flex h-full w-full overflow-hidden bg-nexus-950 animate-in fade-in duration-500">
            {/* Left Column: The Manifest */}
            <div className="flex-1 overflow-y-auto no-scrollbar border-r border-nexus-800 p-8 md:p-12 relative">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-3 opacity-60">
                            <List size={16} className="text-nexus-accent" />
                            <span className="text-[10px] font-display font-black uppercase tracking-[0.4em] text-nexus-muted">The Manifest // Extraction Focus</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={handleManualSelection}
                                className="flex items-center gap-2 px-4 py-2 bg-nexus-900 border border-nexus-800 hover:border-nexus-accent rounded-xl text-nexus-muted hover:text-nexus-accent transition-all group shadow-sm active:scale-95"
                                title="Bind highlighted text as alias or anchor"
                            >
                                <MousePointerSquareDashed size={16} className="group-hover:rotate-12 transition-transform" />
                                <span className="text-[10px] font-display font-black uppercase tracking-widest">Bind Selection</span>
                            </button>
                            {isAkaMode && (
                                <div className="flex items-center gap-2 px-3 py-1 bg-nexus-arcane/10 border border-nexus-arcane/30 rounded-full animate-pulse">
                                    <AtSign size={10} className="text-nexus-arcane" />
                                    <span className="text-[9px] font-display font-black text-nexus-arcane uppercase tracking-widest">Select Aliases in Text</span>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className={`prose max-w-none text-xl leading-[1.8] font-serif text-nexus-text select-text whitespace-pre-wrap transition-all ${isAkaMode ? 'cursor-crosshair' : ''}`}>
                        {isLoading ? (
                            <div className="animate-pulse flex flex-col gap-6">
                                <div className="h-6 bg-nexus-800 rounded w-full"></div>
                                <div className="h-6 bg-nexus-800 rounded w-5/6"></div>
                                <div className="h-6 bg-nexus-800 rounded w-full"></div>
                            </div>
                        ) : renderTextWithHighlights()}
                    </div>
                </div>
            </div>

            {/* Right Column: The Workbench */}
            <aside className="w-[500px] bg-nexus-900 border-l border-nexus-800 flex flex-col relative shrink-0 shadow-[ -10px_0_30px_var(--shadow-color)]">
                <header className="h-16 border-b border-nexus-800 flex items-center px-6 justify-between shrink-0 bg-nexus-900/80 backdrop-blur-xl z-20">
                    <div className="flex items-center gap-2">
                        <Wand2 size={16} className="text-nexus-accent" />
                        <span className="text-[11px] font-display font-black uppercase tracking-widest text-nexus-muted">Concept Forge</span>
                    </div>
                    <div className="flex items-center gap-2">
                         <span className="text-[10px] font-mono text-nexus-accent bg-nexus-accent/5 px-3 py-1 rounded-full border border-nexus-accent/20 font-bold uppercase tracking-tighter">
                            {seeds.length} Anchors Active
                         </span>
                    </div>
                </header>

                <div ref={workbenchRef} className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8 relative">
                    {activeSeed ? (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                            {/* Parent Anchor Card */}
                            <div className={`bg-nexus-800/40 border rounded-[32px] p-8 shadow-xl relative overflow-hidden group transition-all duration-500 ${activeSeed.isAuthorNote ? 'border-amber-500/40 bg-amber-500/5' : 'border-nexus-700'}`}>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-3 rounded-2xl border transition-all ${activeSeed.isAuthorNote ? 'bg-amber-500/10 border-amber-500/30' : 'bg-nexus-accent/10 border-nexus-accent/30'}`}>
                                            {activeSeed.isAuthorNote ? <UserCircle2 size={20} className="text-amber-500" /> : <Target size={20} className="text-nexus-accent" />}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-display font-black text-nexus-text uppercase tracking-wider">{activeSeed.isAuthorNote ? "Meta Anchor" : "Primary Anchor"}</h3>
                                            <p className="text-[9px] text-nexus-muted font-mono uppercase tracking-widest">SEED_ID: {activeSeed.id.slice(0,8)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => deleteSeed(activeSeed.id)} 
                                            className="p-2 text-nexus-muted hover:text-red-500 transition-colors bg-nexus-900 border border-nexus-800 rounded-xl"
                                            title="Delete Anchor"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                        <button onClick={() => setActiveSeedId(null)} className="p-2 text-nexus-muted hover:text-nexus-text transition-colors bg-nexus-900 border border-nexus-800 rounded-xl">
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-display font-black text-nexus-muted uppercase tracking-widest ml-1">Title</label>
                                        <input 
                                            value={activeSeed.title}
                                            onChange={(e) => updateSeed(activeSeed.id, { title: e.target.value })}
                                            className="w-full bg-nexus-950 border border-nexus-700 rounded-xl px-4 py-3 text-sm font-bold text-nexus-text focus:border-nexus-accent outline-none shadow-sm transition-colors"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-display font-black text-nexus-muted uppercase tracking-widest ml-1">Type</label>
                                            <div className="relative">
                                                <select 
                                                    value={activeSeed.category}
                                                    onChange={(e) => updateSeed(activeSeed.id, { category: e.target.value as NexusCategory })}
                                                    className="w-full bg-nexus-950 border border-nexus-700 rounded-xl px-4 py-3 text-[10px] font-black uppercase text-nexus-text focus:border-nexus-accent outline-none appearance-none cursor-pointer tracking-widest"
                                                >
                                                    {Object.values(NexusCategory).map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                                <ChevronRight size={12} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-nexus-muted pointer-events-none" />
                                            </div>
                                        </div>
                                        <div className="flex items-end pb-0">
                                             <button 
                                                onClick={() => updateSeed(activeSeed.id, { isAuthorNote: !activeSeed.isAuthorNote })}
                                                className={`w-full py-3 rounded-xl border transition-all text-[9px] font-black uppercase tracking-widest h-[46px] ${activeSeed.isAuthorNote ? 'bg-amber-500 text-black border-amber-500' : 'text-nexus-muted border-nexus-700 hover:text-nexus-text hover:bg-nexus-800'}`}
                                            >
                                                {activeSeed.isAuthorNote ? 'Author Mode Active' : 'Enable Meta Mode'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between ml-1">
                                            <label className="text-[9px] font-display font-black text-nexus-muted uppercase tracking-widest">Aliases (AKA)</label>
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => setIsAkaMode(!isAkaMode)}
                                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-[9px] font-black uppercase transition-all shadow-sm ${isAkaMode ? 'bg-nexus-arcane text-white border-nexus-arcane' : 'bg-nexus-950 text-nexus-muted border-nexus-800 hover:text-nexus-arcane hover:border-nexus-arcane'}`}
                                                >
                                                    {isAkaMode ? <MousePointerClick size={12} /> : <Plus size={12} />}
                                                    {isAkaMode ? 'Selecting...' : 'Text Scry'}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <div className="relative flex-1">
                                                    <AtSign size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-nexus-muted" />
                                                    <input 
                                                        value={manualAliasInput}
                                                        onChange={(e) => setManualAliasInput(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && addManualAlias()}
                                                        placeholder="Manual entry..."
                                                        className="w-full bg-nexus-950 border border-nexus-800 rounded-xl pl-10 pr-4 py-3 text-xs font-medium text-nexus-text focus:border-nexus-arcane outline-none shadow-inner"
                                                    />
                                                </div>
                                                <button 
                                                    onClick={addManualAlias}
                                                    className="p-3 bg-nexus-800 border border-nexus-700 rounded-xl text-nexus-muted hover:text-nexus-arcane hover:bg-nexus-arcane/10 transition-all shadow-sm"
                                                >
                                                    <Check size={16} />
                                                </button>
                                            </div>
                                            <div className="min-h-[60px] w-full bg-nexus-950 border border-nexus-700 rounded-2xl px-4 py-3 flex flex-wrap gap-2 shadow-inner">
                                                {activeSeed.aliases.map(alias => (
                                                    <div key={alias} className="flex items-center gap-2 px-3 py-1.5 bg-nexus-900 border border-nexus-800 rounded-xl text-[10px] font-bold text-nexus-arcane group transition-all hover:border-nexus-arcane/40">
                                                        <span className="max-w-[120px] truncate">{alias}</span>
                                                        <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-nexus-800">
                                                            <button 
                                                                onClick={() => promoteAlias(activeSeed.id, alias)}
                                                                className="text-nexus-muted hover:text-nexus-accent transition-colors"
                                                                title="Promote to Primary Title"
                                                            >
                                                                <Repeat size={12} />
                                                            </button>
                                                            <button 
                                                                onClick={() => updateSeed(activeSeed.id, { aliases: activeSeed.aliases.filter(a => a !== alias) })}
                                                                className="text-nexus-muted hover:text-red-500"
                                                                title="Remove Alias"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                                {activeSeed.aliases.length === 0 && !isAkaMode && (
                                                    <span className="text-[10px] text-nexus-muted/40 italic p-1">No aliases defined. Use "Text Scry" or input manually.</span>
                                                )}
                                                {isAkaMode && (
                                                    <span className="text-[10px] text-nexus-arcane font-black animate-pulse uppercase tracking-widest p-1">Scribing from text...</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-display font-black text-nexus-muted uppercase tracking-widest ml-1">Abstract (Gist)</label>
                                        <textarea 
                                            value={activeSeed.gist}
                                            onChange={(e) => updateSeed(activeSeed.id, { gist: e.target.value })}
                                            placeholder="Establish core essence..."
                                            className="w-full h-24 bg-nexus-950 border border-nexus-700 rounded-xl p-4 text-xs text-nexus-text/90 focus:border-nexus-accent outline-none resize-none no-scrollbar font-serif leading-relaxed"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Logical Expansion Matrix */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <h4 className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.3em] flex items-center gap-3">
                                        <Sparkles size={14} className="text-nexus-accent" /> Logical Hierarchy
                                    </h4>
                                    <button 
                                        onClick={() => handleExpansion(activeSeed.id)}
                                        disabled={!!isExpanding}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-nexus-800 hover:bg-nexus-accent text-nexus-muted hover:text-white rounded-xl border border-nexus-700 transition-all text-[9px] font-black uppercase tracking-widest disabled:opacity-50"
                                    >
                                        {isExpanding ? <RotateCw className="animate-spin" size={12} /> : <Wand2 size={12} />}
                                        Expand Concept
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {(activeSeed.suggestedChildren || []).map((child, i) => (
                                        <div key={i} className={`bg-nexus-800/40 border rounded-[28px] p-6 flex flex-col gap-4 group/child transition-all animate-in slide-in-from-bottom-2 ${child.isAuthorNote ? 'border-amber-500/20 bg-amber-500/5 shadow-sm' : 'border-nexus-800 hover:border-nexus-500/40'}`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    {child.isAuthorNote ? <UserCircle2 size={16} className="text-amber-500 shrink-0" /> : <Hash size={16} className="text-nexus-500 shrink-0" />}
                                                    <input 
                                                        value={child.title}
                                                        onChange={(e) => {
                                                            const next = [...activeSeed.suggestedChildren];
                                                            next[i].title = e.target.value;
                                                            updateSeed(activeSeed.id, { suggestedChildren: next });
                                                        }}
                                                        className="bg-transparent border-none p-0 text-sm font-bold text-nexus-text uppercase tracking-wider outline-none flex-1 truncate placeholder:text-nexus-muted/40"
                                                        placeholder="Child Title"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="relative">
                                                        <select 
                                                            value={child.category}
                                                            disabled={child.isAuthorNote}
                                                            onChange={(e) => {
                                                                const next = [...activeSeed.suggestedChildren];
                                                                next[i].category = e.target.value as NexusCategory;
                                                                updateSeed(activeSeed.id, { suggestedChildren: next });
                                                            }}
                                                            className="bg-nexus-950 border border-nexus-800 rounded-lg text-[8px] font-black uppercase text-nexus-muted px-2 pr-6 py-1 outline-none cursor-pointer tracking-widest disabled:opacity-30 appearance-none"
                                                        >
                                                            {Object.values(NexusCategory).map(c => <option key={c} value={c}>{c}</option>)}
                                                        </select>
                                                        <ChevronRight size={8} className="absolute right-1.5 top-1/2 -translate-y-1/2 rotate-90 text-nexus-muted pointer-events-none" />
                                                    </div>
                                                    <button 
                                                        onClick={() => removeSuggestion(activeSeed.id, i)}
                                                        className="p-1.5 text-nexus-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            <textarea 
                                                value={child.gist}
                                                placeholder="Establish essence..."
                                                onChange={(e) => {
                                                    const next = [...activeSeed.suggestedChildren];
                                                    next[i].gist = e.target.value;
                                                    updateSeed(activeSeed.id, { suggestedChildren: next });
                                                }}
                                                className="bg-nexus-950/50 border border-nexus-800/50 rounded-xl p-3 text-[11px] italic text-nexus-muted outline-none w-full h-16 resize-none no-scrollbar font-serif transition-colors focus:border-nexus-accent/30"
                                            />
                                            
                                            {child.isAuthorNote && (
                                                <div className="flex items-center gap-2 text-[8px] font-black text-amber-500 uppercase tracking-widest px-2 py-1 bg-amber-500/10 rounded-lg border border-amber-500/20 self-start">
                                                    <Sparkles size={8} /> Meta-Commentary Unit
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    
                                    {(!activeSeed.suggestedChildren || activeSeed.suggestedChildren.length === 0) && !isExpanding && (
                                        <div className="py-12 text-center border-2 border-dashed border-nexus-800 rounded-[32px] bg-nexus-950/20">
                                            <p className="text-[10px] text-nexus-muted font-bold uppercase tracking-[0.2em]">Logical Tree Collapsed</p>
                                            <p className="text-[9px] text-nexus-muted/60 italic mt-1">Initiate Expansion to see suggested sub-units.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col gap-6">
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-40">
                                <MousePointer2 size={48} className="mb-4 animate-pulse text-nexus-muted" />
                                <h3 className="text-sm font-display font-black uppercase tracking-[0.2em] mb-2 text-nexus-text">Manifest Selection</h3>
                                <p className="text-[11px] font-serif italic max-w-[200px] text-nexus-muted">Pin a term in the manifest to begin anchoring its logical structure.</p>
                            </div>
                            
                            {seeds.length > 0 && (
                                <div className="border-t border-nexus-800 pt-6 space-y-3">
                                    <div className="flex items-center gap-2 px-2 text-[9px] font-display font-black text-nexus-muted uppercase tracking-widest opacity-60">
                                        <Database size={10} /> Anchor Registry
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {seeds.map(s => (
                                            <button 
                                                key={s.id}
                                                onClick={() => setActiveSeedId(s.id)}
                                                className="flex items-center justify-between p-3 bg-nexus-800/40 border border-nexus-800 rounded-2xl hover:border-nexus-accent/40 transition-all text-left group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg border ${s.isAuthorNote ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-nexus-accent/10 border-nexus-accent/20 text-nexus-accent'}`}>
                                                        {s.isAuthorNote ? <UserCircle2 size={14} /> : <Target size={14} />}
                                                    </div>
                                                    <div>
                                                        <div className="text-[11px] font-bold text-white uppercase truncate max-w-[150px]">{s.title}</div>
                                                        <div className="text-[8px] font-mono text-nexus-muted uppercase">{s.category}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {s.aliases.length > 0 && (
                                                        <span className="text-[8px] bg-nexus-arcane/10 text-nexus-arcane px-1.5 py-0.5 rounded border border-nexus-arcane/20 font-black">+{s.aliases.length} AKA</span>
                                                    )}
                                                    <ChevronRight size={14} className="text-nexus-muted group-hover:text-nexus-accent" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <footer className="p-6 border-t border-nexus-800 bg-nexus-900/90 backdrop-blur-xl shrink-0 z-20">
                    <div className="flex gap-4">
                         <button 
                            onClick={onCancel}
                            className="flex-1 py-4 rounded-2xl bg-nexus-800 text-nexus-muted text-[10px] font-display font-black uppercase tracking-widest hover:text-nexus-text transition-all border border-nexus-700 shadow-sm"
                        >
                            Abort
                        </button>
                        <button 
                            onClick={() => onFinalize(seeds)}
                            className="flex-[2] py-4 rounded-2xl bg-nexus-accent text-white text-[10px] font-display font-black uppercase tracking-[0.2em] shadow-xl shadow-nexus-accent/20 flex items-center justify-center gap-3 group active:scale-[0.98] transition-all"
                        >
                            Commit Scaffolding <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </footer>
            </aside>
        </div>
    );
};
