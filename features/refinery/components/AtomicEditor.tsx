
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    Edit3, Hash, Tag, AtSign, Search, Plus, X, 
    Database, Sparkles, ChevronRight, Link2, Calendar, 
    Trash2, Repeat, GitBranch, Layers, Settings2, ShieldCheck, Box
} from 'lucide-react';
import { 
    NexusObject, 
    isLink, 
    isReified, 
    isContainer,
    NexusCategory, 
    NexusType, 
    HierarchyType,
    isStrictHierarchy,
    ContainmentType,
    DefaultLayout
} from '../../../types';

interface AtomicEditorProps {
    object: NexusObject;
    registry: Record<string, NexusObject>;
    onUpdate: (updates: any) => void;
    onDeleteLink?: (linkId: string) => void;
    onCreateLink: (sourceId: string, targetId: string, verb: string) => void;
}

export const AtomicEditor: React.FC<AtomicEditorProps> = ({ object, registry, onUpdate, onDeleteLink, onCreateLink }) => {
    const [atMenu, setAtMenu] = useState<{ x: number, y: number, query: string } | null>(null);
    const [aliasInput, setAliasInput] = useState('');
    const [tagInput, setTagInput] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [cursorPos, setCursorPos] = useState(0);

    const isL = isLink(object);
    const reified = isReified(object);
    const isHierarchical = isStrictHierarchy(object);

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
        const text = (object as any).prose_content || '';
        const beforeCursor = text.slice(0, cursorPos);
        const afterCursor = text.slice(cursorPos);
        const lastAtIndex = beforeCursor.lastIndexOf('@');
        const newText = beforeCursor.slice(0, lastAtIndex) + `[[${nodeTitle}]]` + afterCursor;
        onUpdate({ prose_content: newText });
        setAtMenu(null);
    };

    const suggestions = useMemo(() => {
        if (!atMenu) return [];
        const q = atMenu.query.replace(/_/g, ' ').toLowerCase();
        const allItems = Object.values(registry) as NexusObject[];
        
        // Seniority calculation
        const parentMap: Record<string, string[]> = {};
        allItems.forEach(obj => {
            if (isContainer(obj)) {
                obj.children_ids.forEach(cid => {
                    if (!parentMap[cid]) parentMap[cid] = [];
                    parentMap[cid].push(obj.id);
                });
            }
        });

        const getDepth = (id: string, visited = new Set<string>()): number => {
            if (visited.has(id)) return 999;
            visited.add(id);
            const parents = parentMap[id] || [];
            if (parents.length === 0) return 0;
            return 1 + Math.min(...parents.map(p => getDepth(p, new Set(visited))));
        };

        const filtered = allItems
            .filter(n => !isLink(n) && n.id !== object.id && (n as any).title?.toLowerCase().includes(q))
            .map(n => ({ node: n, depth: getDepth(n.id) }));

        return filtered
            .sort((a, b) => a.depth - b.depth)
            .map(f => f.node)
            .slice(0, 15);
    }, [atMenu, registry, object.id]);

    const handleProtocolSwitch = (newType: NexusType) => {
        const updates: any = { _type: newType };
        
        // Ensure hierarchical traits are added if switching to hierarchy
        if ((newType === NexusType.HIERARCHICAL_LINK || newType === NexusType.AGGREGATED_HIERARCHICAL_LINK) && !('hierarchy_type' in object)) {
            updates.hierarchy_type = HierarchyType.PARENT_OF;
        }

        // Ensure container traits are added if switching to reified
        if ((newType === NexusType.AGGREGATED_SEMANTIC_LINK || newType === NexusType.AGGREGATED_HIERARCHICAL_LINK) && !reified) {
            updates.is_reified = true;
            updates.title = updates.title || (isL ? `${(registry[object.source_id] as any).title} Logic` : 'Reified Unit');
            updates.containment_type = ContainmentType.FOLDER;
            updates.default_layout = DefaultLayout.GRID;
            updates.children_ids = [];
        }

        onUpdate(updates);
    };

    return (
        <div className="w-full max-w-4xl bg-nexus-900 border border-nexus-800 rounded-[40px] p-8 md:p-12 shadow-2xl animate-in fade-in slide-in-from-bottom-6 relative h-full overflow-y-auto no-scrollbar scroll-smooth">
             <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-5">
                    <div className={`p-4 rounded-2xl border shadow-sm ${isL ? 'bg-nexus-arcane/10 border-nexus-arcane/20 text-nexus-arcane' : 'bg-nexus-accent/10 border-nexus-accent/20 text-nexus-accent'}`}>
                        {isL ? <Link2 size={32} /> : <Edit3 size={32} />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-mono font-black text-nexus-muted uppercase tracking-[0.4em] opacity-60">
                                {object._type}
                            </span>
                            {reified && (
                                <span className="px-2 py-0.5 rounded-full bg-nexus-accent/10 border border-nexus-accent/30 text-[8px] font-black text-nexus-accent uppercase tracking-widest">Reified Manifest</span>
                            )}
                        </div>
                        <h2 className="text-3xl font-display font-black text-nexus-text tracking-tighter leading-none">
                            {isL ? (isHierarchical ? 'Structural Protocol' : 'Logic Stream') : 'Atomic Unit'}
                        </h2>
                    </div>
                </div>
                {isL && (
                    <button 
                        onClick={() => onDeleteLink?.(object.id)}
                        className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center gap-3 text-[10px] font-display font-black uppercase tracking-widest shadow-sm"
                    >
                        <Trash2 size={16} /> Terminate
                    </button>
                )}
            </div>

            {isL && (
                <div className="space-y-8 mb-12">
                    <div className="flex items-center justify-between gap-8 p-10 bg-nexus-950 border border-nexus-800 rounded-[32px] shadow-inner relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                            <GitBranch size={100} />
                        </div>
                        
                        <div className="flex-1 text-center relative z-10">
                            <div className="text-[9px] font-display font-black text-nexus-muted uppercase tracking-widest mb-3 opacity-60">Origin</div>
                            <div className="text-xs font-display font-bold text-nexus-text truncate px-6 py-4 bg-nexus-900/80 border border-nexus-800 rounded-2xl shadow-sm">
                                {(registry[object.source_id] as any)?.title || 'Undefined'}
                            </div>
                        </div>
                        
                        <div className="flex flex-col items-center shrink-0 gap-3 relative z-10">
                            <div className={`p-4 rounded-full border shadow-lg transition-all ${isHierarchical ? 'bg-nexus-essence/10 border-nexus-essence/30 text-nexus-essence' : 'bg-nexus-accent/10 border-nexus-accent/30 text-nexus-accent'}`}>
                                {isHierarchical ? <Layers size={24} /> : <Repeat size={24} />}
                            </div>
                            <div className="h-4 w-px bg-nexus-800" />
                        </div>

                        <div className="flex-1 text-center relative z-10">
                            <div className="text-[9px] font-display font-black text-nexus-muted uppercase tracking-widest mb-3 opacity-60">Terminal</div>
                            <div className="text-xs font-display font-bold text-nexus-text truncate px-6 py-4 bg-nexus-900/80 border border-nexus-800 rounded-2xl shadow-sm">
                                {(registry[object.target_id] as any)?.title || 'Undefined'}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-nexus-900/40 p-8 rounded-[32px] border border-nexus-800 shadow-sm">
                         <div className="space-y-4">
                            <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                <Settings2 size={12} className="text-nexus-accent" /> Logic Protocol
                            </label>
                            <select 
                                value={object._type} 
                                onChange={(e) => handleProtocolSwitch(e.target.value as NexusType)}
                                className="w-full bg-nexus-950 border border-nexus-800 rounded-2xl px-6 py-4 text-sm font-display font-bold text-nexus-text outline-none focus:border-nexus-accent transition-all shadow-inner cursor-pointer"
                            >
                                <option value={NexusType.SEMANTIC_LINK}>Semantic Association</option>
                                <option value={NexusType.HIERARCHICAL_LINK}>Structural Hierarchy</option>
                                <option value={NexusType.AGGREGATED_SEMANTIC_LINK}>Reified Association</option>
                                <option value={NexusType.AGGREGATED_HIERARCHICAL_LINK}>Reified Hierarchy</option>
                            </select>
                        </div>
                        
                        {isHierarchical && (
                            <div className="space-y-4 animate-in slide-in-from-left-2 duration-300">
                                <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                    <GitBranch size={12} className="text-nexus-essence" /> Hierarchy Mode
                                </label>
                                <select 
                                    value={(object as any).hierarchy_type || HierarchyType.PARENT_OF} 
                                    onChange={(e) => onUpdate({ hierarchy_type: e.target.value })}
                                    className="w-full bg-nexus-950 border border-nexus-800 rounded-2xl px-6 py-4 text-sm font-display font-bold text-nexus-essence outline-none focus:border-nexus-essence transition-all shadow-inner cursor-pointer"
                                >
                                    <option value={HierarchyType.PARENT_OF}>Parent Of (Origin contains Terminal)</option>
                                    <option value={HierarchyType.PART_OF}>Part Of (Origin is inside Terminal)</option>
                                </select>
                            </div>
                        )}

                        <div className="space-y-4">
                            <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                <Link2 size={12} className="text-nexus-accent" /> Active Verb (A → B)
                            </label>
                            <input 
                                type="text" 
                                value={(object as any).verb || ''} 
                                onChange={(e) => onUpdate({ verb: e.target.value })}
                                className="w-full bg-nexus-950 border border-nexus-800 rounded-2xl px-6 py-4 text-sm font-display font-bold text-nexus-text outline-none focus:border-nexus-accent transition-all shadow-inner"
                                placeholder="Relationship..."
                            />
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                <Repeat size={12} className="text-nexus-arcane" /> Reciprocal Verb (B → A)
                            </label>
                            <input 
                                type="text" 
                                value={(object as any).verb_inverse || ''} 
                                onChange={(e) => onUpdate({ verb_inverse: e.target.value })}
                                className="w-full bg-nexus-950 border border-nexus-800 rounded-2xl px-6 py-4 text-sm font-display font-bold text-nexus-text outline-none focus:border-nexus-accent transition-all shadow-inner"
                                placeholder="Inverse..."
                            />
                        </div>
                    </div>
                </div>
            )}

            {!isL && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <div className="space-y-4">
                        <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                            <Box size={12} className="text-nexus-accent" /> Unit Designation
                        </label>
                        <input 
                            type="text" 
                            value={(object as any).title || ''} 
                            onChange={(e) => onUpdate({ title: e.target.value })}
                            className="w-full bg-nexus-950 border border-nexus-800 rounded-2xl px-6 py-4 text-sm font-display font-bold text-nexus-text outline-none focus:border-nexus-accent transition-all shadow-inner"
                            placeholder="Designation..."
                        />
                    </div>
                    <div className="space-y-4">
                        <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                            <Hash size={12} className="text-nexus-accent" /> Unit Category
                        </label>
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
            )}

            <div className="space-y-10">
                <div className="space-y-4">
                    <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.2em] ml-2 opacity-60">Manifest Abstract (Gist)</label>
                    <textarea 
                        value={(object as any).gist || ''} 
                        onChange={(e) => onUpdate({ gist: e.target.value })}
                        className="w-full bg-nexus-950 border border-nexus-800 rounded-2xl px-6 py-4 text-base font-serif italic text-nexus-text outline-none focus:border-nexus-accent transition-all shadow-inner h-24 resize-none no-scrollbar"
                        placeholder="Establish the core essence of this logical unit..."
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.2em] ml-2 flex items-center gap-2 opacity-60"><AtSign size={12} /> Designations (AKA)</label>
                        <div className="min-h-[60px] w-full bg-nexus-950 border border-nexus-800 rounded-2xl px-4 py-3 flex flex-wrap gap-2 focus-within:border-nexus-accent transition-all shadow-inner">
                            {((object as any).aliases || []).map((alias: string) => (
                                <span key={alias} className="flex items-center gap-2 px-3 py-1.5 bg-nexus-900 border border-nexus-800 rounded-xl text-[10px] font-bold text-nexus-text">
                                    {alias}
                                    <button onClick={() => onUpdate({ aliases: ((object as any).aliases || []).filter((a: string) => a !== alias) })} className="text-nexus-muted hover:text-red-500 transition-colors"><X size={12} /></button>
                                </span>
                            ))}
                            <input 
                                type="text"
                                placeholder="Add AKA..."
                                value={aliasInput}
                                onChange={(e) => setAliasInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const val = aliasInput.trim();
                                        if (val) onUpdate({ aliases: [...((object as any).aliases || []), val] });
                                        setAliasInput('');
                                    }
                                }}
                                className="bg-transparent border-none outline-none text-[11px] text-nexus-text flex-1 px-2"
                            />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.2em] ml-2 flex items-center gap-2 opacity-60"><Tag size={12} /> Semantic Markers</label>
                        <div className="min-h-[60px] w-full bg-nexus-950 border border-nexus-800 rounded-2xl px-4 py-3 flex flex-wrap gap-2 focus-within:border-nexus-accent transition-all shadow-inner">
                            {((object as any).tags || []).map((tag: string) => (
                                <span key={tag} className="flex items-center gap-2 px-3 py-1.5 bg-nexus-accent/10 border border-nexus-accent/20 rounded-xl text-[10px] font-display font-bold text-nexus-accent">
                                    #{tag}
                                    <button onClick={() => onUpdate({ tags: ((object as any).tags || []).filter((t: string) => t !== tag) })} className="text-nexus-accent/40 hover:text-red-500 transition-colors"><X size={12} /></button>
                                </span>
                            ))}
                            <input 
                                type="text"
                                placeholder="Add Tag..."
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const val = tagInput.trim();
                                        if (val) onUpdate({ tags: [...((object as any).tags || []), val] });
                                        setTagInput('');
                                    }
                                }}
                                className="bg-transparent border-none outline-none text-[11px] text-nexus-text flex-1 px-2"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-4 relative">
                    <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.2em] ml-2 flex items-center justify-between opacity-60">
                        <span>Records & Neural Prose (Markdown)</span>
                        <span className="text-[8px] italic font-mono flex items-center gap-1.5"><ShieldCheck size={10} className="text-nexus-essence" /> Encrypted Storage</span>
                    </label>
                    <div className="relative group/records">
                        <div className="absolute -inset-1 bg-gradient-to-br from-nexus-accent/10 to-transparent rounded-[32px] blur-lg opacity-0 group-focus-within/records:opacity-100 transition-all pointer-events-none" />
                        <textarea 
                            ref={textareaRef}
                            value={(object as any).prose_content || ''} 
                            onSelect={(e) => setCursorPos((e.target as any).selectionStart)}
                            onChange={(e) => handleTextChange(e.target.value)}
                            className="w-full h-96 bg-nexus-950 border border-nexus-800 rounded-[32px] px-8 py-8 text-nexus-text outline-none focus:border-nexus-accent transition-all resize-none no-scrollbar font-sans text-base leading-relaxed shadow-inner relative z-10"
                            placeholder="# Detailed Records... (Use @ to link units)"
                        />
                        
                        {atMenu && suggestions.length > 0 && (
                            <div className="absolute bottom-full left-0 mb-4 w-[320px] bg-nexus-900 border border-nexus-700 rounded-[32px] shadow-2xl overflow-hidden backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-200 z-[100]">
                                <div className="px-6 py-4 border-b border-nexus-800 flex items-center justify-between bg-nexus-950/40">
                                    <span className="text-[10px] font-display font-black text-nexus-accent uppercase tracking-[0.2em] flex items-center gap-2"><Sparkles size={14} /> Registry Search</span>
                                    <button onClick={() => setAtMenu(null)} className="text-nexus-muted hover:text-white transition-colors"><X size={14} /></button>
                                </div>
                                <div className="max-h-[300px] overflow-y-auto no-scrollbar p-2 space-y-1">
                                    {suggestions.map((node: any) => (
                                        <button 
                                            key={node.id}
                                            onClick={() => insertNodeLink(node.title)}
                                            className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-left hover:bg-nexus-accent hover:text-white transition-all group"
                                        >
                                            <div className="w-8 h-8 rounded-xl bg-nexus-950 border border-nexus-800 flex items-center justify-center text-[10px] font-black text-nexus-accent group-hover:bg-white group-hover:text-nexus-accent transition-all">
                                                {node.category_id?.charAt(0) || 'U'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[13px] font-display font-bold text-nexus-text group-hover:text-white truncate">{node.title}</div>
                                                <div className="text-[9px] text-nexus-muted font-black uppercase tracking-tighter group-hover:text-white/60">{node.category_id}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="h-24" />
        </div>
    );
};
