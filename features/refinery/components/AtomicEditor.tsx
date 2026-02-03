
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Edit3, Hash, Tag, AtSign, Search, Plus, X, Globe, Database, Sparkles, ChevronRight, Link2, Calendar, Trash2, Repeat } from 'lucide-react';
import { NexusObject, isLink, isReified, NexusCategory } from '../../../types';

interface AtomicEditorProps {
    object: NexusObject;
    registry: Record<string, NexusObject>;
    onUpdate: (updates: any) => void;
    onDeleteLink?: (linkId: string) => void;
    onCreateLink: (sourceId: string, targetId: string, verb: string) => void;
}

const MOCK_GLOBAL_DB = [
    { id: 'g-1', title: 'The Silent Archive', category_id: NexusCategory.LOCATION, gist: 'A repository of forgotten echoes.' },
    { id: 'g-2', title: 'Void-Engineers Guild', category_id: NexusCategory.ORGANIZATION, gist: 'Masters of the gravitational anchors.' },
    { id: 'g-3', title: 'The First Resonance', category_id: NexusCategory.EVENT, gist: 'The moment the world shattered.' },
    { id: 'g-4', title: 'Aether-Cortex', category_id: NexusCategory.ITEM, gist: 'Neural interface for high-order mages.' },
    { id: 'g-5', title: 'Singularity Protocol', category_id: NexusCategory.CONCEPT, gist: 'The fallback plan for reality failure.' },
];

export const AtomicEditor: React.FC<AtomicEditorProps> = ({ object, registry, onUpdate, onDeleteLink, onCreateLink }) => {
    const [atMenu, setAtMenu] = useState<{ x: number, y: number, query: string } | null>(null);
    const [aliasInput, setAliasInput] = useState('');
    const [tagInput, setTagInput] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [cursorPos, setCursorPos] = useState(0);

    const isLinkObject = isLink(object);
    const reified = isReified(object);

    const handleTextChange = (text: string) => {
        onUpdate({ prose_content: text });
        const linkRegex = /\[\[(.*?)\]\]/g;
        let match;
        while ((match = linkRegex.exec(text)) !== null) {
            const linkedTitle = match[1].trim();
            const target = (Object.values(registry) as NexusObject[]).find(node => (node as any).title === linkedTitle);
            if (target && target.id !== object.id) {
                onCreateLink(object.id, target.id, 'mentions');
            }
        }
        detectAtTrigger(text, cursorPos);
    };

    const detectAtTrigger = (text: string, pos: number) => {
        const beforeCursor = text.slice(0, pos);
        const lastAtIndex = beforeCursor.lastIndexOf('@');
        if (lastAtIndex !== -1 && !beforeCursor.slice(lastAtIndex).includes(' ')) {
            const query = beforeCursor.slice(lastAtIndex + 1);
            setAtMenu({ x: 0, y: 0, query }); 
        } else {
            setAtMenu(null);
        }
    };

    const insertNodeLink = (nodeTitle: string) => {
        if (!textareaRef.current) return;
        const text = (object as any).prose_content || '';
        const beforeCursor = text.slice(0, cursorPos);
        const afterCursor = text.slice(cursorPos);
        const lastAtIndex = beforeCursor.lastIndexOf('@');
        const newText = beforeCursor.slice(0, lastAtIndex) + `[[${nodeTitle}]]` + afterCursor;
        onUpdate({ prose_content: newText });
        setAtMenu(null);
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                const newPos = lastAtIndex + nodeTitle.length + 4;
                textareaRef.current.setSelectionRange(newPos, newPos);
            }
        }, 0);
    };

    const suggestions = useMemo(() => {
        if (!atMenu) return { local: [], global: [] };
        const q = atMenu.query.toLowerCase();
        const local = (Object.values(registry) as NexusObject[])
            .filter(n => 'title' in n && n.id !== object.id && (n as any).title.toLowerCase().includes(q))
            .slice(0, 6);
        const global = MOCK_GLOBAL_DB
            .filter(n => n.title.toLowerCase().includes(q))
            .slice(0, 4);
        return { local, global };
    }, [atMenu, registry, object.id]);

    const handleAddAlias = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const val = aliasInput.trim().replace(/,$/, '');
            if (val && !((object as any).aliases || []).includes(val)) {
                onUpdate({ aliases: [...((object as any).aliases || []), val] });
            }
            setAliasInput('');
        }
    };

    const handleRemoveAlias = (alias: string) => {
        onUpdate({ aliases: ((object as any).aliases || []).filter((a: string) => a !== alias) });
    };

    const handleAddTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const val = tagInput.trim().replace(/,$/, '');
            if (val && !((object as any).tags || []).includes(val)) {
                onUpdate({ tags: [...((object as any).tags || []), val] });
            }
            setTagInput('');
        }
    };

    const handleRemoveTag = (tag: string) => {
        onUpdate({ tags: ((object as any).tags || []).filter((t: string) => t !== tag) });
    };

    return (
        <div className="w-full max-w-3xl bg-nexus-900 border border-nexus-800 rounded-[40px] p-10 md:p-12 shadow-2xl animate-in fade-in slide-in-from-bottom-6 relative h-full overflow-y-auto no-scrollbar scroll-smooth">
             <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-nexus-accent/10 rounded-2xl border border-nexus-accent/20 shadow-sm">
                        {isLinkObject ? <Link2 className="text-nexus-accent" size={32} /> : <Edit3 className="text-nexus-accent" size={32} />}
                    </div>
                    <div>
                        <span className="text-[10px] font-mono font-black text-nexus-muted uppercase tracking-[0.4em] mb-1 block opacity-60">{object._type} {reified ? '(REIFIED)' : ''}</span>
                        <h2 className="text-3xl font-display font-black text-nexus-text tracking-tighter leading-none">{isLinkObject && !reified ? 'Logic Stream' : 'Atomic Unit'}</h2>
                    </div>
                </div>
                {isLinkObject && (
                    <button 
                        onClick={() => onDeleteLink?.(object.id)}
                        className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center gap-3 text-[10px] font-display font-black uppercase tracking-widest shadow-lg shadow-red-500/10"
                    >
                        <Trash2 size={16} /> Terminate
                    </button>
                )}
            </div>

            {isLinkObject && (
                <div className="flex items-center justify-between gap-8 p-8 bg-nexus-950 border border-nexus-800 rounded-[32px] mb-12 shadow-inner">
                    <div className="flex-1 text-center">
                        <div className="text-[9px] font-display font-black text-nexus-muted uppercase tracking-widest mb-3 opacity-60">Source Origin</div>
                        <div className="text-xs font-display font-bold text-nexus-text truncate px-5 py-3 bg-nexus-900 border border-nexus-800 rounded-2xl shadow-sm">{(registry[object.source_id] as any)?.title || 'Source'}</div>
                    </div>
                    <div className="flex flex-col items-center shrink-0 gap-2">
                        <span className="text-[10px] font-mono font-black text-nexus-accent bg-nexus-accent/10 px-4 py-1.5 rounded-full uppercase tracking-[0.2em] border border-nexus-accent/30 shadow-lg shadow-nexus-accent/10 italic">"{(object as any).verb}"</span>
                    </div>
                    <div className="flex-1 text-center">
                        <div className="text-[9px] font-display font-black text-nexus-muted uppercase tracking-widest mb-3 opacity-60">Terminal Goal</div>
                        <div className="text-xs font-display font-bold text-nexus-text truncate px-5 py-3 bg-nexus-900 border border-nexus-800 rounded-2xl shadow-sm">{(registry[object.target_id] as any)?.title || 'Target'}</div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <div className="space-y-3">
                    <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.2em] ml-2 flex items-center gap-2 opacity-60"><Search size={12} /> Designation</label>
                    <input 
                        type="text" 
                        value={(object as any).title || (object as any).verb || ''} 
                        onChange={(e) => onUpdate({ title: e.target.value })}
                        className="w-full bg-nexus-950 border border-nexus-800 rounded-2xl px-6 py-4 text-sm font-display font-bold text-nexus-text outline-none focus:border-nexus-accent transition-all shadow-inner"
                        placeholder="Identifier..."
                    />
                </div>
                <div className="space-y-3">
                    <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.2em] ml-2 flex items-center gap-2 opacity-60"><Hash size={12} /> Unit Category</label>
                    <select 
                        value={(object as any).category_id} 
                        onChange={(e) => onUpdate({ category_id: e.target.value })}
                        className="w-full bg-nexus-950 border border-nexus-800 rounded-2xl px-6 py-4 text-sm font-display font-bold text-nexus-text outline-none focus:border-nexus-accent transition-all shadow-inner cursor-pointer"
                    >
                        {Object.values(NexusCategory).map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
            </div>

            {isLinkObject && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <div className="space-y-3">
                        <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.2em] ml-2 flex items-center gap-2 opacity-60"><Link2 size={12} /> Manifest Verb</label>
                        <input 
                            type="text" 
                            value={(object as any).verb || ''} 
                            onChange={(e) => onUpdate({ verb: e.target.value })}
                            className="w-full bg-nexus-950 border border-nexus-800 rounded-2xl px-6 py-4 text-sm font-display font-bold text-nexus-accent outline-none focus:border-nexus-accent transition-all shadow-inner"
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.2em] ml-2 flex items-center gap-2 opacity-60"><Repeat size={12} /> Reciprocal Logic</label>
                        <input 
                            type="text" 
                            value={(object as any).verb_inverse || ''} 
                            onChange={(e) => onUpdate({ verb_inverse: e.target.value })}
                            className="w-full bg-nexus-950 border border-nexus-800 rounded-2xl px-6 py-4 text-sm font-display font-bold text-nexus-500 outline-none focus:border-nexus-accent transition-all shadow-inner"
                        />
                    </div>
                </div>
            )}

            <div className="space-y-10">
                <div className="space-y-3">
                    <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.2em] ml-2 opacity-60">Manifest Summary (Gist)</label>
                    <input 
                        type="text" 
                        value={(object as any).gist || ''} 
                        onChange={(e) => onUpdate({ gist: e.target.value })}
                        className="w-full bg-nexus-950 border border-nexus-800 rounded-2xl px-6 py-4 text-base font-serif italic text-nexus-text outline-none focus:border-nexus-accent transition-all shadow-inner"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.2em] ml-2 flex items-center gap-2 opacity-60"><AtSign size={12} /> Aliases</label>
                        <div className="min-h-[60px] w-full bg-nexus-950 border border-nexus-800 rounded-2xl px-4 py-3 flex flex-wrap gap-2 focus-within:border-nexus-accent transition-all shadow-inner">
                            {((object as any).aliases || []).map((alias: string) => (
                                <span key={alias} className="flex items-center gap-2 px-3 py-1.5 bg-nexus-900 border border-nexus-800 rounded-xl text-[10px] font-display font-bold text-nexus-text group transition-all">
                                    {alias}
                                    <button onClick={() => handleRemoveAlias(alias)} className="text-nexus-muted hover:text-red-500 transition-colors"><X size={12} /></button>
                                </span>
                            ))}
                            <input 
                                type="text"
                                placeholder="Add Designation..."
                                value={aliasInput}
                                onChange={(e) => setAliasInput(e.target.value)}
                                onKeyDown={handleAddAlias}
                                className="bg-transparent border-none outline-none text-[11px] text-nexus-text min-w-[100px] flex-1 px-2 h-8 font-display font-medium"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.2em] ml-2 flex items-center gap-2 opacity-60"><Tag size={12} /> Semantic Tags</label>
                        <div className="min-h-[60px] w-full bg-nexus-950 border border-nexus-800 rounded-2xl px-4 py-3 flex flex-wrap gap-2 focus-within:border-nexus-accent transition-all shadow-inner">
                            {((object as any).tags || []).map((tag: string) => (
                                <span key={tag} className="flex items-center gap-2 px-3 py-1.5 bg-nexus-accent/10 border border-nexus-accent/20 rounded-xl text-[10px] font-display font-bold text-nexus-accent group transition-all">
                                    #{tag}
                                    <button onClick={() => handleRemoveTag(tag)} className="text-nexus-accent/40 hover:text-red-500 transition-colors"><X size={12} /></button>
                                </span>
                            ))}
                            <input 
                                type="text"
                                placeholder="Add Marker..."
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={handleAddTag}
                                className="bg-transparent border-none outline-none text-[11px] text-nexus-text min-w-[100px] flex-1 px-2 h-8 font-display font-medium"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-3 relative">
                    <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.2em] ml-2 flex items-center justify-between opacity-60">
                        <span>Arcane Records (Markdown)</span>
                        <div className="flex gap-4">
                            <span className="text-[8px] italic font-mono">[[Title]] RELATIONS</span>
                            <span className="text-[8px] text-nexus-accent font-black tracking-widest">'@' SEARCH</span>
                        </div>
                    </label>
                    <div className="relative">
                        <textarea 
                            ref={textareaRef}
                            value={(object as any).prose_content || ''} 
                            onSelect={(e) => {
                                const newPos = (e.target as any).selectionStart;
                                setCursorPos(newPos);
                                detectAtTrigger((e.target as any).value, newPos);
                            }}
                            onChange={(e) => {
                                setCursorPos(e.target.selectionStart);
                                handleTextChange(e.target.value);
                            }}
                            className="w-full h-80 bg-nexus-950 border border-nexus-800 rounded-[32px] px-8 py-8 text-nexus-text outline-none focus:border-nexus-accent transition-all resize-none no-scrollbar font-sans text-base leading-relaxed shadow-inner"
                        />
                        
                        {atMenu && (
                            <div className="absolute bottom-full left-0 mb-4 w-[320px] bg-nexus-900 border border-nexus-700 rounded-[32px] shadow-2xl overflow-hidden backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-200 z-[100]">
                                <div className="px-6 py-4 border-b border-nexus-800 flex items-center justify-between bg-nexus-950/40">
                                    <span className="text-[10px] font-display font-black text-nexus-accent uppercase tracking-[0.2em] flex items-center gap-2"><Sparkles size={14} className="animate-pulse" /> Nexus Search</span>
                                    <button onClick={() => setAtMenu(null)} className="text-nexus-muted hover:text-nexus-text transition-colors"><X size={14} /></button>
                                </div>
                                <div className="max-h-[350px] overflow-y-auto no-scrollbar pb-3">
                                    <div className="px-6 py-4 text-[9px] font-display font-black text-nexus-muted uppercase tracking-widest flex items-center justify-between opacity-50">
                                        <div className="flex items-center gap-2"><Database size={12} /> Local Buffer</div>
                                        <span className="text-nexus-accent">{suggestions.local.length} UNITS</span>
                                    </div>
                                    <div className="px-3 space-y-1">
                                        {suggestions.local.map((node: any) => (
                                            <button 
                                                key={node.id}
                                                onClick={() => insertNodeLink(node.title)}
                                                className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-left hover:bg-nexus-accent hover:text-white transition-all group"
                                            >
                                                <div className="w-8 h-8 rounded-xl bg-nexus-950 border border-nexus-800 flex items-center justify-center text-[10px] font-black text-nexus-accent group-hover:bg-white group-hover:text-nexus-accent transition-all group-hover:scale-105">
                                                    {node.category_id?.charAt(0) || 'U'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[13px] font-display font-bold text-nexus-text group-hover:text-white truncate">{node.title}</div>
                                                    <div className="text-[9px] text-nexus-muted font-black uppercase tracking-tighter group-hover:text-white/60">{node.category_id}</div>
                                                </div>
                                                <ChevronRight size={14} className="text-nexus-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-8 bg-nexus-950 border border-nexus-800 rounded-[32px] shadow-sm">
                     <div className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.3em] mb-5 flex items-center gap-2 opacity-50"><Calendar size={14} /> Neural Lifecycle</div>
                     <div className="flex flex-col md:flex-row justify-between gap-4 text-[10px] font-mono font-bold text-nexus-muted uppercase tracking-widest">
                         <span>MANIFESTED: {new Date(object.created_at).toLocaleString()}</span>
                         <span>RECONCILED: {new Date(object.last_modified).toLocaleString()}</span>
                     </div>
                </div>
            </div>
            
            <div className="h-24" /> {/* Spacer for scroll bottom padding */}
        </div>
    );
};
