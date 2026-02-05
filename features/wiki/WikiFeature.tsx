
import { 
    Book, 
    ArrowLeft, 
    Tag, 
    AtSign, 
    ChevronRight, 
    List,
    Cpu,
    RotateCw,
    Compass,
    Settings,
    Image as ImageIcon,
    Palette,
    Pencil,
    Check,
    X,
    Wand2,
    Trash2,
    Hash,
    Save,
    MapPin,
    Users,
    Sparkles,
    FileCheck,
    History,
    Link2,
    Repeat,
    Layers,
    GitBranch,
    Settings2,
    ArrowRight,
    Share2,
    PenTool,
    Plus,
    ShieldCheck
} from 'lucide-react';
import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { GoogleGenAI } from "@google/genai";
import { 
    NexusObject, 
    isLink, 
    isContainer, 
    SimpleNote, 
    ContainerNote,
    WikiArtifact,
    NexusCategory,
    NexusType,
    HierarchyType,
    isStrictHierarchy,
    isReified
} from '../../types';
import { Logo } from '../../components/shared/Logo';
import { MarkdownToolbar } from '../shared/MarkdownToolbar';

interface WikiFeatureProps {
    registry: Record<string, NexusObject>;
    selectedId: string | null;
    onSelect: (id: string) => void;
    onUpdateObject: (id: string, updates: Partial<NexusObject>) => void;
}

type WikiViewMode = 'NOTE' | 'ENCYCLOPEDIA';

const THEME_COLORS = [
    { name: 'Nexus Cyan', hex: '#06b6d4' },
    { name: 'Arcane Purple', hex: '#8b5cf6' },
    { name: 'Ruby Core', hex: '#e11d48' },
    { name: 'Essence Green', hex: '#10b981' },
    { name: 'Amber Glow', hex: '#f59e0b' },
    { name: 'Slate Ghost', hex: '#64748b' },
];

export const WikiFeature: React.FC<WikiFeatureProps> = ({ registry, selectedId, onSelect, onUpdateObject }) => {
    const [viewMode, setViewMode] = useState<WikiViewMode>('NOTE');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isGeneratingBg, setIsGeneratingBg] = useState(false);
    const [artifacts, setArtifacts] = useState<Record<string, WikiArtifact>>({});
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [showCustomizer, setShowCustomizer] = useState(false);
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);
    
    // Scry/Mention menu state
    const [atMenu, setAtMenu] = useState<{ query: string; pos: number } | null>(null);
    
    const [editData, setEditData] = useState<any>({});
    const [aliasInput, setAliasInput] = useState('');
    const [tagInput, setTagInput] = useState('');
    
    const articleRef = useRef<HTMLDivElement>(null);
    const sectionProseRef = useRef<HTMLTextAreaElement>(null);

    const currentObject = useMemo(() => {
        if (!selectedId) return null;
        return registry[selectedId] || null;
    }, [selectedId, registry]);

    const handleStartEdit = (obj: NexusObject) => {
        if (isLink(obj) && !isReified(obj)) {
            setEditData({
                _type: obj._type,
                verb: obj.verb,
                verb_inverse: obj.verb_inverse,
                hierarchy_type: (obj as any).hierarchy_type || HierarchyType.PARENT_OF,
                gist: (obj as any).gist || '',
                prose_content: (obj as any).prose_content || ''
            });
        } else {
            setEditData({
                title: (obj as any).title || (obj as any).verb,
                gist: (obj as any).gist || '',
                prose_content: (obj as any).prose_content || '',
                aliases: [...((obj as any).aliases || [])],
                tags: [...((obj as any).tags || [])],
                category_id: (obj as any).category_id || NexusCategory.CONCEPT,
                is_author_note: (obj as any).is_author_note || false
            });
        }
        setEditingNodeId(obj.id);
    };

    const handleSaveEdit = (id: string) => {
        onUpdateObject(id, editData);
        setEditingNodeId(null);
    };

    const currentArtifact = selectedId ? artifacts[selectedId] : null;

    const allNodesByTitle = useMemo(() => {
        const map: Record<string, string> = {};
        (Object.values(registry) as NexusObject[]).forEach(node => {
            const anyNode = node as any;
            if (anyNode.title) {
                map[anyNode.title.toLowerCase()] = node.id;
            }
        });
        return map;
    }, [registry]);

    const transformWikiLinks = useCallback((content: string) => {
        return content.replace(/\[\[(.*?)\]\]/g, (match, title) => {
            const id = allNodesByTitle[title.toLowerCase()];
            if (id) {
                return `[${title}](#navigate-${id})`;
            }
            return `[${title}](#ghost-${title})`;
        });
    }, [allNodesByTitle]);

    const handleGenerateBg = async () => {
        if (!currentObject) return;
        setIsGeneratingBg(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: [{ parts: [{ text: `A cinematic high-quality background illustration for a first-class logical unit titled "${(currentObject as any).title || (currentObject as any).verb}". Description: ${(currentObject as any).gist}. Atmospheric, evocative, slightly abstract conceptual art.` }] }],
                config: { imageConfig: { aspectRatio: "16:9" } }
            });
            
            let imgUrl = "";
            const parts = response.candidates?.[0]?.content?.parts || [];
            for (const part of parts) {
                if (part.inlineData) {
                    imgUrl = `data:image/png;base64,${part.inlineData.data}`;
                    break;
                }
            }
            if (imgUrl) {
                onUpdateObject(currentObject.id, { background_url: imgUrl });
            }
        } catch (err) {
            console.error("Background Generation Error:", err);
        } finally {
            setIsGeneratingBg(false);
        }
    };

    const handleScrollToSection = (id: string) => {
        const element = document.getElementById(`section-${id}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleGenerateEncyclopedia = async () => {
        if (!selectedId || !currentObject) return;
        setIsGenerating(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const projectSummary = (Object.values(registry) as NexusObject[])
                .filter(n => !isLink(n) || isReified(n))
                .map((n: any) => `- ${n.title || n.verb}: ${n.gist}`)
                .join('\n');

            const prompt = `
                ACT AS: The Grand Chronicler of the Ekrixi AI Nexus.
                TASK: Write a definitive, high-fidelity encyclopedia entry for the logical unit known as "${(currentObject as any).title || (currentObject as any).verb}".
                Knowledge Context: Summary: ${(currentObject as any).gist}. Records: ${(currentObject as any).prose_content || "N/A"}.
                Project Scope: ${projectSummary}
            `;
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: prompt,
                config: { temperature: 0.2 } 
            });
            const artifact: WikiArtifact = {
                node_id: selectedId,
                content: response.text || "Connection lost.",
                generated_at: new Date().toISOString(),
                context_depth: 2,
                graph_version: `v1`
            };
            setArtifacts(prev => ({ ...prev, [selectedId]: artifact }));
        } catch (error) {
            console.error("Encyclopedia Generation Error:", error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCommitToRegistry = () => {
        if (currentArtifact && currentObject) {
            onUpdateObject(currentObject.id, { 
                prose_content: currentArtifact.content,
                last_modified: new Date().toISOString()
            });
            setShowSaveSuccess(true);
            setTimeout(() => setShowSaveSuccess(false), 3000);
            setViewMode('NOTE');
        }
    };

    // Scry Detection
    const handleProseChange = (val: string, pos: number) => {
        setEditData({ ...editData, prose_content: val });
        const beforeCursor = val.slice(0, pos);
        const lastAt = beforeCursor.lastIndexOf('@');
        if (lastAt !== -1 && !beforeCursor.slice(lastAt).includes(' ')) {
            setAtMenu({ query: beforeCursor.slice(lastAt + 1), pos });
        } else {
            setAtMenu(null);
        }
    };

    const insertMention = (title: string) => {
        if (!atMenu) return;
        const text = editData.prose_content || '';
        const before = text.slice(0, atMenu.pos);
        const after = text.slice(atMenu.pos);
        const lastAt = before.lastIndexOf('@');
        const newText = before.slice(0, lastAt) + `[[${title}]]` + after;
        setEditData({ ...editData, prose_content: newText });
        setAtMenu(null);
        if (sectionProseRef.current) sectionProseRef.current.focus();
    };

    const scrySuggestions = useMemo(() => {
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
            .filter(n => !isLink(n) && (n as any).title?.toLowerCase().includes(q))
            .map(n => ({ node: n, depth: getDepth(n.id) }));

        return filtered
            .sort((a, b) => a.depth - b.depth)
            .map(f => f.node)
            .slice(0, 15);
    }, [atMenu, registry]);

    const MarkdownRenderer = ({ content, color }: { content: string, color?: string }) => {
        return (
            <div className="prose max-w-none">
                <ReactMarkdown
                    components={{
                        a: ({ node, ...props }) => {
                            const href = props.href || '';
                            if (href.startsWith('#navigate-')) {
                                const id = href.replace('#navigate-', '');
                                return (
                                    <button 
                                        onClick={(e) => { e.preventDefault(); onSelect(id); }}
                                        className="nexus-wiki-link"
                                        style={{ '--accent-color': color || 'var(--accent-color)' } as any}
                                    >
                                        {props.children}
                                    </button>
                                );
                            }
                            if (href.startsWith('#ghost-')) {
                                const ghostTitle = href.replace('#ghost-', '');
                                return (
                                    <span className="nexus-ghost-link" title={`Latent Unit: ${ghostTitle}`}>
                                        {props.children}
                                    </span>
                                );
                            }
                            return <a {...props} className="hover:text-nexus-accent underline" style={{ color: color || 'var(--accent-color)' }} target="_blank" rel="noopener noreferrer" />;
                        }
                    }}
                >
                    {transformWikiLinks(content)}
                </ReactMarkdown>
            </div>
        );
    };

    const renderLinkManifest = (link: any) => {
        const source = registry[link.source_id];
        const target = registry[link.target_id];
        const isEditing = editingNodeId === link.id;
        const isHierarchical = isStrictHierarchy(link);

        return (
            <section id={`section-${link.id}`} className="mb-20 animate-in fade-in duration-700">
                <div className="flex items-center justify-between mb-12 border-b border-nexus-800/30 pb-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-nexus-arcane/10 rounded-2xl border border-nexus-arcane/30 text-nexus-arcane">
                            <Link2 size={24} />
                        </div>
                        <div>
                            <h2 className="text-sm font-display font-black text-nexus-muted uppercase tracking-[0.4em]">Neural Logic Manifest</h2>
                            <p className="text-[10px] font-mono text-nexus-muted/40 uppercase tracking-widest mt-1">PROTOCOL: {link._type}</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => isEditing ? handleSaveEdit(link.id) : handleStartEdit(link)}
                        className={`px-6 py-2.5 rounded-2xl transition-all border font-display font-black text-[10px] uppercase tracking-widest flex items-center gap-3 ${isEditing ? 'bg-nexus-essence text-white border-nexus-essence shadow-lg' : 'bg-nexus-800/30 border-nexus-700/50 text-nexus-text hover:bg-nexus-accent hover:text-white'}`}
                    >
                        {isEditing ? <><Save size={14} /> Commit Changes</> : <><Pencil size={14} /> Refine Records</>}
                    </button>
                </div>

                {isEditing ? (
                    <div className="space-y-10 mb-16 animate-in zoom-in-95 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                    <Settings2 size={12} /> Logic Protocol
                                </label>
                                <select 
                                    value={editData._type} 
                                    onChange={(e) => setEditData({...editData, _type: e.target.value})}
                                    className="w-full bg-nexus-900 border border-nexus-800 rounded-2xl px-6 py-4 text-sm font-display font-bold text-nexus-text outline-none focus:border-nexus-accent transition-all shadow-inner"
                                >
                                    <option value={NexusType.SEMANTIC_LINK}>Semantic Association</option>
                                    <option value={NexusType.HIERARCHICAL_LINK}>Structural Hierarchy</option>
                                    <option value={NexusType.AGGREGATED_SEMANTIC_LINK}>Reified Association</option>
                                    <option value={NexusType.AGGREGATED_HIERARCHICAL_LINK}>Reified Hierarchy</option>
                                </select>
                            </div>
                            {(editData._type === NexusType.HIERARCHICAL_LINK || editData._type === NexusType.AGGREGATED_HIERARCHICAL_LINK) && (
                                <div className="space-y-3">
                                    <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                        <GitBranch size={12} /> Hierarchy Type
                                    </label>
                                    <select 
                                        value={editData.hierarchy_type} 
                                        onChange={(e) => setEditData({...editData, hierarchy_type: e.target.value})}
                                        className="w-full bg-nexus-900 border border-nexus-800 rounded-2xl px-6 py-4 text-sm font-display font-bold text-nexus-essence outline-none focus:border-nexus-essence transition-all shadow-inner"
                                    >
                                        <option value={HierarchyType.PARENT_OF}>Parent Of (A contains B)</option>
                                        <option value={HierarchyType.PART_OF}>Part Of (A is inside B)</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                    <Link2 size={12} /> Active Verb
                                </label>
                                <input 
                                    value={editData.verb || ''}
                                    onChange={(e) => setEditData({...editData, verb: e.target.value})}
                                    className="w-full bg-nexus-900 border border-nexus-800 rounded-2xl px-6 py-4 text-sm font-display font-bold text-nexus-text outline-none focus:border-nexus-accent shadow-inner"
                                    placeholder="Direct relationship..."
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                    <Repeat size={12} /> Reciprocal Verb
                                </label>
                                <input 
                                    value={editData.verb_inverse || ''}
                                    onChange={(e) => setEditData({...editData, verb_inverse: e.target.value})}
                                    className="w-full bg-nexus-900 border border-nexus-800 rounded-2xl px-6 py-4 text-sm font-display font-bold text-nexus-500 outline-none focus:border-nexus-accent shadow-inner"
                                    placeholder="Inverse relationship..."
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center mb-16">
                        <div className="bg-nexus-900 border border-nexus-800 p-8 rounded-[40px] text-center shadow-xl group hover:border-nexus-accent transition-all">
                            <span className="text-[9px] font-black uppercase text-nexus-muted tracking-widest block mb-4 opacity-50">Origin Node</span>
                            <div className="text-xl font-display font-bold text-nexus-text truncate px-4">{(source as any)?.title || 'Uncharted'}</div>
                            <button onClick={() => onSelect(link.source_id)} className="mt-6 text-[9px] font-black text-nexus-accent hover:underline uppercase tracking-widest">Focus origin scry</button>
                        </div>

                        <div className="flex flex-col items-center gap-6">
                            <div className="w-full h-px bg-gradient-to-r from-transparent via-nexus-accent/30 to-transparent relative">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-2 bg-nexus-950 border border-nexus-800 rounded-full shadow-2xl flex items-center gap-2">
                                    {isHierarchical ? <Layers size={14} className="text-nexus-essence" /> : <Link2 size={14} className="text-nexus-accent" />}
                                    <span className="text-nexus-accent font-display font-black text-xs uppercase tracking-[0.2em]">{link.verb}</span>
                                </div>
                            </div>
                            <div className="w-full h-px bg-gradient-to-r from-transparent via-nexus-muted/20 to-transparent relative mt-2">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-2 bg-nexus-950 border border-nexus-800 rounded-full shadow-lg">
                                    <span className="text-nexus-muted font-display font-black text-[10px] uppercase tracking-[0.1em] opacity-40">{link.verb_inverse}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-nexus-900 border border-nexus-800 p-8 rounded-[40px] text-center shadow-xl group hover:border-nexus-accent transition-all">
                            <span className="text-[9px] font-black uppercase text-nexus-muted tracking-widest block mb-4 opacity-50">Terminal Node</span>
                            <div className="text-xl font-display font-bold text-nexus-text truncate px-4">{(target as any)?.title || 'Uncharted'}</div>
                            <button onClick={() => onSelect(link.target_id)} className="mt-6 text-[9px] font-black text-nexus-accent hover:underline uppercase tracking-widest">Focus terminal scry</button>
                        </div>
                    </div>
                )}

                <div className="space-y-16">
                    <div className="space-y-4">
                         <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest ml-4 opacity-40">Causal Logic Abstract</label>
                         {isEditing ? (
                             <textarea 
                                value={editData.gist || ''}
                                onChange={(e) => setEditData({...editData, gist: e.target.value})}
                                className="w-full bg-nexus-900 border border-nexus-800 rounded-[32px] p-8 text-nexus-text text-base font-serif italic outline-none focus:border-nexus-accent shadow-inner h-32 resize-none"
                                placeholder="Manifest the core logic of this stream..."
                             />
                         ) : (
                             <div className="bg-nexus-900/40 border border-nexus-800/50 rounded-[32px] p-10 backdrop-blur-sm">
                                <p className="text-xl md:text-2xl font-serif italic text-nexus-text/90 leading-relaxed">"{link.gist || 'This connection has not yet been structurally abstracted.'}"</p>
                             </div>
                         )}
                    </div>

                    <div className="space-y-4 relative">
                         <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest ml-4 opacity-40">Deep Records (Prose)</label>
                         {isEditing ? (
                             <div className="space-y-4 relative">
                                <MarkdownToolbar 
                                    textareaRef={sectionProseRef}
                                    content={editData.prose_content || ''}
                                    onUpdate={(val) => handleProseChange(val, sectionProseRef.current?.selectionStart || 0)}
                                />
                                <textarea 
                                    ref={sectionProseRef}
                                    value={editData.prose_content || ''}
                                    onChange={(e) => handleProseChange(e.target.value, e.target.selectionStart)}
                                    spellCheck={false}
                                    className="w-full bg-nexus-900 border border-nexus-800 rounded-[32px] p-8 text-nexus-text text-sm font-mono outline-none focus:border-nexus-accent shadow-inner h-[400px] no-scrollbar leading-[1.8] tracking-tight selection:bg-nexus-accent/30"
                                    placeholder="# Document the nuances of this causality..."
                                />
                                
                                {/* Mention UI in Link Edit */}
                                {atMenu && scrySuggestions.length > 0 && (
                                    <div className="absolute bottom-full left-0 mb-4 w-64 bg-nexus-900 border border-nexus-700 rounded-[32px] shadow-2xl overflow-hidden z-[100] animate-in zoom-in-95 backdrop-blur-2xl">
                                        <div className="px-5 py-3 border-b border-nexus-800 bg-nexus-950/40 text-[9px] font-black text-nexus-accent uppercase tracking-widest">Neural Scry</div>
                                        <div className="max-h-48 overflow-y-auto no-scrollbar p-1 space-y-0.5">
                                            {scrySuggestions.map((node: any) => (
                                                <button key={node.id} onClick={() => insertMention(node.title)} className="w-full flex items-center gap-3 p-3 hover:bg-nexus-accent hover:text-white transition-all text-left group rounded-xl">
                                                    <div className="w-6 h-6 rounded bg-nexus-950 border border-nexus-800 flex items-center justify-center text-[8px] font-black group-hover:bg-white/20">{node.category_id?.charAt(0)}</div>
                                                    <div className="text-[10px] font-bold truncate">{node.title}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                             </div>
                         ) : (
                             <div className="wiki-content p-4">
                                <MarkdownRenderer content={link.prose_content || ""} />
                             </div>
                         )}
                    </div>
                </div>
            </section>
        );
    };

    const renderSection = (node: any, depth: number, visited: Set<string>): React.ReactNode => {
        if (depth > 2 || visited.has(node.id)) return null;
        visited.add(node.id);

        const children = isContainer(node) 
            ? node.children_ids
                .map((id: string) => registry[id])
                .filter((child: any) => !!child && (!isLink(child) || isReified(child)))
            : [];

        const isEditingThis = editingNodeId === node.id;
        const themeColor = node.theme_color || (currentObject as any)?.theme_color;
        const reified = isReified(node);
        const isStoryNode = node._type === NexusType.STORY_NOTE;

        return (
            <section key={node.id} id={`section-${node.id}`} className="mb-20 animate-in fade-in slide-in-from-bottom-4 duration-700 scroll-mt-32 group/section">
                <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between border-b border-nexus-800/30 pb-4">
                        <div className="flex items-center gap-4">
                            <span 
                                className="px-3 py-1 border rounded-full text-[9px] font-display font-black uppercase tracking-widest" 
                                style={{ 
                                    borderColor: isStoryNode ? 'rgba(225,29,72,0.5)' : `${themeColor || 'var(--nexus-500)'}50`, 
                                    backgroundColor: isStoryNode ? 'rgba(225,29,72,0.15)' : `${themeColor || 'var(--nexus-500)'}15`, 
                                    color: isStoryNode ? '#e11d48' : themeColor || 'var(--accent-color)' 
                                }}
                            >
                                {isStoryNode ? 'STORY UNIT' : reified ? 'REIFIED LOGIC' : (node.category_id || 'CONCEPT')}
                            </span>
                            {reified && (
                                <div className="flex items-center gap-2 text-[8px] font-mono text-nexus-muted uppercase tracking-widest opacity-60">
                                    {(registry[node.source_id] as any)?.title} <ArrowRight size={8} /> {(registry[node.target_id] as any)?.title}
                                </div>
                            )}
                            {node.is_author_note && (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-500 text-[9px] font-black uppercase tracking-widest">
                                    <ShieldCheck size={12} /> Author Protocol
                                </span>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-2 opacity-40 group-hover/section:opacity-100 transition-all">
                             <button 
                                onClick={() => handleStartEdit(node)}
                                className={`p-2.5 rounded-xl transition-all border ${isEditingThis ? 'bg-nexus-accent text-white border-nexus-accent shadow-lg' : 'bg-nexus-800/30 border-nexus-700/50 text-nexus-text hover:bg-nexus-accent hover:text-white hover:border-nexus-accent'}`}
                                title="Edit Unit Records"
                             >
                                <Pencil size={14} />
                             </button>
                             <button 
                                onClick={() => onSelect(node.id)}
                                className="p-2.5 rounded-xl bg-nexus-800/30 border border-nexus-700/50 text-nexus-text hover:bg-nexus-accent hover:text-white hover:border-nexus-accent transition-all"
                                title="Set as Scrying Focus"
                             >
                                <Compass size={14} />
                             </button>
                        </div>
                    </div>
                    
                    {isEditingThis ? (
                        <div className="space-y-8 bg-nexus-900 border border-nexus-700 rounded-[32px] p-8 md:p-10 shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                                <Settings size={120} className="animate-spin-slow" />
                             </div>
                             
                             <div className="space-y-6 relative z-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest">Unit Name</label>
                                        <input 
                                            value={editData.title || ''}
                                            onChange={(e) => setEditData({...editData, title: e.target.value})}
                                            className="w-full bg-nexus-950 border border-nexus-800 rounded-2xl p-4 text-xl font-display font-bold text-nexus-text focus:border-nexus-accent outline-none shadow-inner"
                                        />
                                    </div>
                                    {!reified && (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest">Category Signature</label>
                                            <select 
                                                value={editData.category_id}
                                                disabled={isStoryNode}
                                                onChange={(e) => setEditData({...editData, category_id: e.target.value as NexusCategory})}
                                                className={`w-full bg-nexus-950 border border-nexus-800 rounded-2xl p-4 text-sm font-bold text-nexus-text focus:border-nexus-accent outline-none shadow-inner h-[60px] ${isStoryNode ? 'opacity-50 grayscale' : ''}`}
                                            >
                                                {Object.values(NexusCategory).map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4 p-6 bg-nexus-950/50 border border-nexus-800 rounded-3xl">
                                     <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                               <ShieldCheck size={16} className="text-amber-500" />
                                               <span className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest">Author Metadata Layer</span>
                                          </div>
                                          <button 
                                            onClick={() => setEditData({...editData, is_author_note: !editData.is_author_note})}
                                            className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase transition-all ${editData.is_author_note ? 'bg-amber-500 text-black' : 'bg-nexus-800 text-nexus-muted'}`}
                                          >
                                            {editData.is_author_note ? 'PROTOCOL ACTIVE' : 'MARK AS PROTOCOL'}
                                          </button>
                                     </div>
                                     <p className="text-[9px] text-nexus-muted italic font-serif leading-relaxed">
                                          Author protocols are reified narrative governed units that appear in the Story Studio as strategic anchors.
                                     </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest flex items-center gap-2">The Gist <span className="text-[8px] opacity-40 font-mono">(Brief Summary)</span></label>
                                    <textarea 
                                        value={editData.gist || ''}
                                        onChange={(e) => setEditData({...editData, gist: e.target.value})}
                                        className="w-full bg-nexus-950 border border-nexus-800 rounded-2xl p-4 text-sm font-serif italic text-nexus-text focus:border-nexus-accent outline-none resize-none h-24 shadow-inner"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest ml-2 flex items-center gap-2">
                                            <AtSign size={12} className="text-nexus-arcane" /> Designations (AKA)
                                        </label>
                                        <div className="flex items-center gap-2 mb-3">
                                            <input 
                                                value={aliasInput}
                                                onChange={(e) => setAliasInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        const val = aliasInput.trim();
                                                        if (val && !editData.aliases.includes(val)) {
                                                            setEditData({...editData, aliases: [...editData.aliases, val]});
                                                        }
                                                        setAliasInput('');
                                                    }
                                                }}
                                                placeholder="Add nickname..."
                                                className="flex-1 bg-nexus-950 border border-nexus-800 rounded-xl px-4 py-2.5 text-xs text-nexus-text outline-none focus:border-nexus-arcane shadow-inner"
                                            />
                                            <button onClick={() => {
                                                const val = aliasInput.trim();
                                                if (val && !editData.aliases.includes(val)) {
                                                    setEditData({...editData, aliases: [...editData.aliases, val]});
                                                    setAliasInput('');
                                                }
                                            }} className="p-2.5 bg-nexus-800 border border-nexus-700 rounded-xl text-nexus-muted hover:text-nexus-arcane transition-colors"><Plus size={16}/></button>
                                        </div>
                                        <div className="flex flex-wrap gap-2 min-h-[40px] p-1">
                                            {editData.aliases?.map((a: string) => (
                                                <span key={a} className="flex items-center gap-2 px-3 py-1 bg-nexus-900 border border-nexus-800 rounded-lg text-[10px] font-bold text-nexus-arcane">
                                                    {a}
                                                    <button onClick={() => setEditData({...editData, aliases: editData.aliases.filter((al: string) => al !== a)})} className="hover:text-red-500 transition-colors"><X size={10}/></button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest ml-2 flex items-center gap-2">
                                            <Tag size={12} className="text-nexus-essence" /> Semantic Markers
                                        </label>
                                        <div className="flex items-center gap-2 mb-3">
                                            <input 
                                                value={tagInput}
                                                onChange={(e) => setTagInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        const val = tagInput.trim();
                                                        if (val && !editData.tags.includes(val)) {
                                                            setEditData({...editData, tags: [...editData.tags, val]});
                                                        }
                                                        setTagInput('');
                                                    }
                                                }}
                                                placeholder="Add tag..."
                                                className="flex-1 bg-nexus-950 border border-nexus-800 rounded-xl px-4 py-2.5 text-xs text-nexus-text outline-none focus:border-nexus-essence shadow-inner"
                                            />
                                            <button onClick={() => {
                                                const val = tagInput.trim();
                                                if (val && !editData.tags.includes(val)) {
                                                    setEditData({...editData, tags: [...editData.tags, val]});
                                                    setTagInput('');
                                                }
                                            }} className="p-2.5 bg-nexus-800 border border-nexus-700 rounded-xl text-nexus-muted hover:text-nexus-essence transition-colors"><Plus size={16}/></button>
                                        </div>
                                        <div className="flex flex-wrap gap-2 min-h-[40px] p-1">
                                            {editData.tags?.map((t: string) => (
                                                <span key={t} className="flex items-center gap-2 px-3 py-1 bg-nexus-900 border border-nexus-800 rounded-lg text-[10px] font-bold text-nexus-essence">
                                                    #{t}
                                                    <button onClick={() => setEditData({...editData, tags: editData.tags.filter((ta: string) => ta !== t)})} className="hover:text-red-500 transition-colors"><X size={10}/></button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 relative">
                                    <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest">Primary Records (Markdown)</label>
                                    <div className="space-y-3 relative">
                                        <MarkdownToolbar 
                                            textareaRef={sectionProseRef}
                                            content={editData.prose_content || ''}
                                            onUpdate={(val) => handleProseChange(val, sectionProseRef.current?.selectionStart || 0)}
                                        />
                                        <textarea 
                                            ref={sectionProseRef}
                                            value={editData.prose_content || ''}
                                            onChange={(e) => handleProseChange(e.target.value, e.target.selectionStart)}
                                            spellCheck={false}
                                            className="w-full bg-nexus-950 border border-nexus-800 rounded-2xl p-6 text-[13px] font-mono text-nexus-text focus:border-nexus-accent outline-none resize-none h-64 shadow-inner no-scrollbar leading-[1.8] tracking-tight selection:bg-nexus-accent/30"
                                            placeholder="# The history of this unit..."
                                        />
                                        
                                        {/* Mention UI in Unit Section Edit */}
                                        {atMenu && scrySuggestions.length > 0 && (
                                            <div className="absolute bottom-full left-0 mb-4 w-64 bg-nexus-900 border border-nexus-700 rounded-[32px] shadow-2xl overflow-hidden z-[100] animate-in zoom-in-95 backdrop-blur-2xl">
                                                <div className="px-5 py-3 border-b border-nexus-800 bg-nexus-950/40 text-[9px] font-black text-nexus-accent uppercase tracking-widest">Neural Scry</div>
                                                <div className="max-h-48 overflow-y-auto no-scrollbar p-1 space-y-0.5">
                                                    {scrySuggestions.map((n: any) => (
                                                        <button key={n.id} onClick={() => insertMention(n.title)} className="w-full flex items-center gap-3 p-3 hover:bg-nexus-accent hover:text-white transition-all text-left group rounded-xl">
                                                            <div className="w-6 h-6 rounded bg-nexus-950 border border-nexus-800 flex items-center justify-center text-[8px] font-black group-hover:bg-white/20">{n.category_id?.charAt(0)}</div>
                                                            <div className="text-[10px] font-bold truncate">{n.title}</div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-4 pt-6 border-t border-nexus-800">
                                    <button onClick={() => setEditingNodeId(null)} className="px-6 py-3 rounded-2xl text-[10px] font-display font-black text-nexus-muted hover:text-nexus-text transition-all uppercase tracking-widest">Discard</button>
                                    <button onClick={() => handleSaveEdit(node.id)} className="px-10 py-3 bg-nexus-accent text-white rounded-2xl text-[10px] font-display font-black uppercase tracking-[0.2em] hover:brightness-110 transition-all shadow-xl shadow-nexus-accent/20 flex items-center gap-3"><Save size={16} /> Commit Change</button>
                                </div>
                             </div>
                        </div>
                    ) : (
                        <div className="space-y-10">
                            <div>
                                {depth === 0 ? (
                                    <h1 className="text-5xl md:text-7xl font-display font-black text-nexus-text tracking-tighter mb-4 leading-tight uppercase">
                                        {node.title || node.verb}
                                    </h1>
                                ) : (
                                    <h2 className="text-3xl md:text-4xl font-display font-bold text-nexus-text tracking-tight mb-4 uppercase">
                                        {node.title || node.verb}
                                    </h2>
                                )}

                                <div className="relative pl-6 md:pl-10 border-l-4 py-1 mb-8" style={{ borderColor: isStoryNode ? '#e11d48' : themeColor || 'var(--accent-color)' }}>
                                    <p className="text-xl md:text-2xl text-nexus-text/80 font-serif italic leading-relaxed">
                                        "{node.gist || 'This manifestation remains uncharted.'}"
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-2 mb-10">
                                    {node.aliases && node.aliases.length > 0 && node.aliases.map((a: string) => (
                                        <span key={a} className="flex items-center gap-1.5 px-3 py-1.5 bg-nexus-800/20 border border-nexus-700/50 rounded-lg text-[10px] font-display font-bold text-nexus-muted uppercase tracking-widest shadow-sm">
                                            <AtSign size={10} className="text-nexus-accent" /> {a}
                                        </span>
                                    ))}
                                    {node.tags && node.tags.length > 0 && node.tags.map((t: string) => (
                                        <span key={t} className="flex items-center gap-1.5 px-3 py-1.5 bg-nexus-800/20 border border-nexus-700/50 rounded-lg text-[10px] font-display font-bold text-nexus-muted uppercase tracking-widest shadow-sm">
                                            <Tag size={10} className="text-nexus-essence" /> {t}
                                        </span>
                                    ))}
                                </div>

                                <div className="wiki-content max-w-4xl">
                                    <MarkdownRenderer content={node.prose_content || ""} color={isStoryNode ? '#e11d48' : themeColor} />
                                </div>
                            </div>

                            {children.length > 0 && (
                                <div className="pt-16 border-t border-nexus-800/30 ml-4 lg:ml-12">
                                    {children.map((child: any) => renderSection(child, depth + 1, visited))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </section>
        );
    };

    const tableOfContents = useMemo(() => {
        if (!currentObject) return [];
        const walk = (node: any, depth: number, visited: Set<string>, toc: { id: string, title: string, depth: number }[]) => {
            if (depth > 2 || visited.has(node.id)) return;
            visited.add(node.id);
            toc.push({ id: node.id, title: node.title || node.verb, depth });
            if (isContainer(node)) {
                node.children_ids.forEach((cid: string) => {
                    const child = registry[cid];
                    if (child && (!isLink(child) || isReified(child))) walk(child, depth + 1, visited, toc);
                });
            }
        };
        const result: { id: string, title: string, depth: number }[] = [];
        walk(currentObject, 0, new Set(), result);
        return result;
    }, [currentObject, registry]);

    const connections = useMemo(() => {
        if (!selectedId) return [];
        return (Object.values(registry) as NexusObject[]).filter(obj => {
            if (!isLink(obj)) return false;
            return obj.source_id === selectedId || obj.target_id === selectedId;
        }).map(link => {
            const isL = isLink(link);
            if (!isL) return null;
            const isOutgoing = link.source_id === selectedId;
            const neighborId = isOutgoing ? link.target_id : link.source_id;
            const neighbor = registry[neighborId];
            return {
                linkId: link.id,
                verb: isOutgoing ? (link as any).verb : (link as any).verb_inverse,
                neighbor
            };
        }).filter(conn => conn && conn.neighbor);
    }, [selectedId, registry]);

    if (!selectedId || !currentObject) {
        return (
            <div className="flex flex-col h-full bg-nexus-950 p-8 pb-32 overflow-y-auto no-scrollbar">
                <header className="mb-20 text-center max-w-4xl mx-auto mt-20">
                    <div className="inline-flex p-6 rounded-[32px] bg-nexus-accent/10 border border-nexus-accent/20 mb-8 shadow-2xl shadow-nexus-accent/10 animate-in zoom-in duration-700">
                        <Logo size={64} />
                    </div>
                    <h1 className="text-6xl md:text-8xl font-display font-black text-nexus-text tracking-tighter mb-4 selection:bg-nexus-accent selection:text-white uppercase">
                        Neural <span className="text-nexus-accent">Index.</span>
                    </h1>
                    <p className="text-nexus-muted font-display font-bold uppercase tracking-[0.6em] text-xs opacity-60">Global Knowledge Archive v8.0</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 max-w-7xl mx-auto">
                    {(Object.values(registry) as NexusObject[]).filter(o => !isLink(o) || isReified(o)).map((node: any) => {
                        const isStory = node._type === NexusType.STORY_NOTE;
                        return (
                            <button 
                                key={node.id}
                                onClick={() => onSelect(node.id)}
                                className={`group relative bg-nexus-900 border hover:translate-y-[-4px] p-8 rounded-[40px] text-left transition-all duration-500 shadow-xl hover:shadow-2xl flex flex-col h-full overflow-hidden ${isStory ? 'border-nexus-ruby/30 hover:border-nexus-ruby' : 'border-nexus-800/60 hover:border-nexus-accent'}`}
                            >
                                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl transition-colors ${isStory ? 'bg-nexus-ruby/5 group-hover:bg-nexus-ruby/10' : 'bg-nexus-accent/5 group-hover:bg-nexus-accent/10'}`} />
                                <div className="flex items-center gap-3 mb-8 relative z-10">
                                    <div className={`p-3 rounded-2xl border transition-all shadow-sm ${isStory ? 'bg-nexus-ruby/10 border-nexus-ruby/30 text-nexus-ruby group-hover:bg-nexus-ruby group-hover:text-white' : 'bg-nexus-800 border-nexus-700 text-nexus-accent group-hover:bg-nexus-accent group-hover:text-white'}`}>
                                        {isStory ? <PenTool size={20} /> : isReified(node) ? <Share2 size={20} /> : node.category_id === NexusCategory.LOCATION ? <MapPin size={20} /> : <Users size={20} />}
                                    </div>
                                    <span className={`text-[10px] font-display font-black uppercase tracking-widest transition-colors ${isStory ? 'text-nexus-ruby group-hover:text-nexus-ruby' : 'text-nexus-muted group-hover:text-nexus-accent'}`}>
                                        {isStory ? 'STORY UNIT' : isReified(node) ? 'REIFIED LOGIC' : node.category_id}
                                    </span>
                                </div>
                                <h3 className="text-2xl font-display font-bold text-nexus-text mb-4 leading-tight relative z-10 uppercase">{node.title || node.verb}</h3>
                                <p className="text-sm text-nexus-muted italic line-clamp-3 mb-8 font-serif relative z-10">"{node.gist || 'Neural record awaited.'}"</p>
                                <div className="mt-auto flex items-center justify-between text-[10px] font-display font-black uppercase tracking-widest text-nexus-muted opacity-40 group-hover:opacity-100 transition-opacity relative z-10">
                                    <span>Navigate Unit</span>
                                    <ChevronRight size={16} className="group-hover:translate-x-2 transition-transform" />
                                </div>
                            </button>
                        );
                    })}
                    {Object.keys(registry).filter(k => !isLink(registry[k]) || isReified(registry[k])).length === 0 && (
                        <div className="col-span-full py-40 flex flex-col items-center justify-center border-2 border-dashed border-nexus-800 rounded-[64px] opacity-20 text-center">
                            <History size={64} className="mb-6" />
                            <h3 className="text-xl font-display font-black uppercase tracking-[0.4em]">Registry Empty</h3>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const isL = isLink(currentObject) && !isReified(currentObject);
    const themeColor = (currentObject as any).theme_color;
    const isStoryActive = currentObject._type === NexusType.STORY_NOTE;

    return (
        <div className="flex flex-col h-full bg-nexus-950 overflow-hidden md:flex-row relative font-sans">
            {(currentObject as any).background_url && (
                <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
                    <img 
                        src={(currentObject as any).background_url} 
                        alt="Ambient" 
                        className="w-full h-full object-cover blur-[80px] scale-125"
                        onError={(e) => {
                            (e.target as any).style.display = 'none';
                        }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-nexus-950/40 via-nexus-950/60 to-nexus-950" />
                </div>
            )}

            <aside className="hidden lg:flex w-80 xl:w-96 border-r border-nexus-800/30 bg-nexus-900/40 flex-col overflow-y-auto no-scrollbar p-10 shrink-0 z-30 backdrop-blur-md">
                <button 
                    onClick={() => onSelect('')}
                    className="flex items-center gap-3 text-nexus-muted hover:text-nexus-accent transition-colors group text-[10px] font-display font-black uppercase tracking-widest mb-16"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Global Registry
                </button>

                <div className="space-y-16">
                    {tableOfContents.length > 1 && (
                        <nav>
                            <h4 className="text-[11px] font-display font-black text-nexus-muted uppercase tracking-[0.4em] mb-10 flex items-center gap-3 opacity-50">
                                <List size={16} /> Unit Map
                            </h4>
                            <ul className="space-y-6">
                                {tableOfContents.map((item) => (
                                    <li key={item.id} style={{ marginLeft: `${item.depth * 16}px` }}>
                                        <button 
                                            onClick={() => handleScrollToSection(item.id)}
                                            className="text-sm font-display font-bold text-nexus-text/70 hover:text-nexus-accent transition-all flex items-center gap-3 group text-left w-full uppercase"
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${selectedId === item.id ? (isStoryActive ? 'bg-nexus-ruby' : 'bg-nexus-accent') + ' scale-150 shadow-lg' : 'bg-nexus-800 group-hover:bg-nexus-accent'}`} />
                                            {item.title}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    )}

                    {!isL && connections.length > 0 && (
                        <div>
                            <h4 className="text-[11px] font-display font-black text-nexus-muted uppercase tracking-[0.4em] mb-10 flex items-center gap-3 opacity-50">
                                <Hash size={16} /> Logic Streams
                            </h4>
                            <div className="space-y-4">
                                {connections.map((conn: any) => (
                                    <button 
                                        key={conn.linkId}
                                        onClick={() => onSelect(conn.neighbor.id)}
                                        className="w-full flex flex-col p-5 rounded-3xl bg-nexus-900 border border-nexus-800 hover:border-nexus-accent hover:translate-x-1 transition-all group text-left shadow-lg"
                                    >
                                        <span className="text-[9px] font-display font-black text-nexus-muted uppercase tracking-widest mb-1.5 opacity-60 group-hover:text-nexus-accent">
                                            {conn.verb}
                                        </span>
                                        <span className="text-[13px] font-display font-bold text-nexus-text/90 group-hover:text-nexus-text truncate uppercase">
                                            {conn.neighbor.title || conn.neighbor.verb}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            <article ref={articleRef} className="flex-1 overflow-y-auto no-scrollbar scroll-smooth relative z-10">
                <div className="max-w-5xl mx-auto px-8 py-20 lg:px-24 lg:py-24 pb-64">
                    
                    <div className="flex items-center justify-end mb-16 sticky top-4 z-50 pointer-events-none gap-4">
                        <div className="flex bg-nexus-900/90 backdrop-blur-xl border border-nexus-700/50 rounded-full p-1.5 shadow-2xl pointer-events-auto items-center">
                             {!isL && (
                                <>
                                    <button 
                                        onClick={() => setViewMode('NOTE')}
                                        className={`px-6 py-2.5 rounded-full text-[10px] font-display font-black uppercase tracking-[0.2em] transition-all ${viewMode === 'NOTE' ? 'bg-nexus-accent text-white shadow-lg' : 'text-nexus-muted hover:text-nexus-text'}`}
                                    >
                                        Chronicle
                                    </button>
                                    <button 
                                        onClick={() => setViewMode('ENCYCLOPEDIA')}
                                        className={`px-6 py-2.5 rounded-full text-[10px] font-display font-black uppercase tracking-[0.2em] transition-all ${viewMode === 'ENCYCLOPEDIA' ? 'bg-nexus-accent text-white shadow-lg' : 'text-nexus-muted hover:text-nexus-text'}`}
                                    >
                                        Encyclopedia
                                    </button>
                                    
                                    <div className="w-px h-6 bg-nexus-800 mx-2" />
                                    
                                    <button 
                                        onClick={() => setShowCustomizer(!showCustomizer)}
                                        className={`p-2.5 rounded-full transition-all ${showCustomizer ? 'bg-nexus-accent text-white' : 'text-nexus-muted hover:text-nexus-text'}`}
                                        title="Visual Neural ID"
                                    >
                                        <Palette size={14} />
                                    </button>
                                </>
                             )}
                             {isL && (
                                <button 
                                    className="px-6 py-2.5 rounded-full bg-nexus-arcane text-white shadow-lg text-[10px] font-display font-black uppercase tracking-[0.2em] flex items-center gap-2"
                                >
                                    <Link2 size={12} /> Neural Logic Editor
                                </button>
                             )}
                        </div>

                        {showCustomizer && !isL && (
                            <div className="absolute top-16 right-0 w-72 bg-nexus-900 border border-nexus-700 rounded-[32px] p-6 shadow-2xl pointer-events-auto animate-in fade-in zoom-in-95 backdrop-blur-3xl">
                                <div className="space-y-8">
                                    <div>
                                        <h4 className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <Palette size={12} /> Unit Signature
                                        </h4>
                                        <div className="grid grid-cols-6 gap-2">
                                            {THEME_COLORS.map(c => (
                                                <button 
                                                    key={c.hex} 
                                                    onClick={() => onUpdateObject(currentObject.id, { theme_color: c.hex })}
                                                    className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 shadow-sm ${(currentObject as any).theme_color === c.hex ? 'border-white' : 'border-transparent'}`}
                                                    style={{ backgroundColor: c.hex }}
                                                />
                                            ))}
                                            <button 
                                                onClick={() => onUpdateObject(currentObject.id, { theme_color: undefined })}
                                                className="w-7 h-7 rounded-full border border-nexus-800 flex items-center justify-center text-nexus-muted hover:bg-nexus-800 transition-colors"
                                            >
                                                <X size={10} />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <h4 className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <ImageIcon size={12} /> Neural Ambience
                                        </h4>
                                        <div className="flex flex-col gap-3">
                                            <button 
                                                onClick={handleGenerateBg}
                                                disabled={isGeneratingBg}
                                                className="w-full py-3 bg-nexus-accent text-white rounded-2xl text-[10px] font-black flex items-center justify-center gap-2 uppercase tracking-widest disabled:opacity-50 transition-all shadow-lg shadow-nexus-accent/20"
                                            >
                                                {isGeneratingBg ? <RotateCw size={12} className="animate-spin" /> : <Wand2 size={12} />}
                                                Manifest Atmosphere
                                            </button>
                                            {(currentObject as any).background_url && (
                                                <button 
                                                    onClick={() => onUpdateObject(currentObject.id, { background_url: undefined })}
                                                    className="w-full py-3 border border-red-500/20 text-red-500 rounded-2xl text-[10px] font-black flex items-center justify-center gap-2 uppercase tracking-widest hover:bg-red-500/10 transition-all"
                                                >
                                                    <Trash2 size={12} />
                                                    Purge Layer
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {isL ? (
                        renderLinkManifest(currentObject)
                    ) : (
                        viewMode === 'NOTE' ? (
                            <div className="relative">
                                {showSaveSuccess && (
                                    <div className="absolute -top-12 right-0 bg-nexus-essence text-white px-6 py-2 rounded-full text-[10px] font-display font-black uppercase tracking-widest shadow-lg shadow-nexus-essence/20 animate-in slide-in-from-bottom-2 duration-300 flex items-center gap-2">
                                        <FileCheck size={14} /> Records Synchronized
                                    </div>
                                )}
                                {renderSection(currentObject, 0, new Set())}
                            </div>
                        ) : (
                            <div className="animate-in fade-in zoom-in-95 duration-1000">
                                 {currentArtifact ? (
                                    <div className="space-y-12">
                                        <div className="flex items-center justify-between bg-nexus-accent/10 border border-nexus-accent/20 rounded-[32px] p-6 shadow-xl animate-in slide-in-from-top-4 duration-500">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-nexus-accent/20 rounded-2xl">
                                                    <Sparkles className="text-nexus-accent" size={24} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-display font-black text-nexus-text uppercase tracking-widest">Neural Draft Manifested</h4>
                                                    <p className="text-[10px] text-nexus-muted font-mono uppercase tracking-widest">Global Graph Context Integrated</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={handleCommitToRegistry}
                                                className="px-8 py-3 bg-nexus-accent text-white rounded-2xl text-[10px] font-display font-black uppercase tracking-[0.2em] hover:brightness-110 transition-all shadow-xl shadow-nexus-accent/20 flex items-center gap-3"
                                            >
                                                <Save size={16} /> Commit to Chronicle
                                            </button>
                                        </div>
                                        
                                        <div className="bg-nexus-900/20 border border-nexus-800 rounded-[64px] p-12 md:p-20 shadow-inner overflow-hidden">
                                            <MarkdownRenderer content={currentArtifact.content} color={themeColor} />
                                        </div>
                                        
                                        <div className="flex justify-center pt-10">
                                            <button 
                                                onClick={handleGenerateEncyclopedia}
                                                disabled={isGenerating}
                                                className="text-nexus-muted hover:text-nexus-accent transition-all flex items-center gap-3 text-[10px] font-display font-black uppercase tracking-widest"
                                            >
                                                <RotateCw size={14} className={isGenerating ? "animate-spin" : ""} />
                                                Re-Weave Synthesis
                                            </button>
                                        </div>
                                    </div>
                                 ) : (
                                    <div className="py-40 flex flex-col items-center justify-center text-center space-y-12 bg-nexus-900 border border-nexus-800 rounded-[64px] p-16 shadow-2xl backdrop-blur-xl">
                                        <div className="p-10 rounded-full bg-nexus-accent/10 border border-nexus-accent/20 flex items-center justify-center relative">
                                             <Logo size={96} />
                                             <div className="absolute inset-0 bg-nexus-accent/20 rounded-full animate-pulse blur-2xl -z-10" />
                                        </div>
                                        <div className="space-y-4">
                                            <h2 className="text-4xl font-display font-black text-nexus-text tracking-tighter uppercase">Neural Record Void</h2>
                                            <p className="text-nexus-muted max-w-sm mx-auto font-serif italic text-lg opacity-70 leading-relaxed">"Initiate the Weaver protocol to manifest a definitive entry from the collective graph memory."</p>
                                        </div>
                                        <button 
                                            onClick={handleGenerateEncyclopedia}
                                            disabled={isGenerating}
                                            className="bg-nexus-accent text-white px-12 py-5 rounded-3xl font-display font-black text-xs uppercase tracking-[0.4em] transition-all hover:brightness-110 shadow-2xl shadow-nexus-accent/30 flex items-center gap-4 active:scale-95"
                                        >
                                            {isGenerating ? <RotateCw size={18} className="animate-spin" /> : <Wand2 size={18} />}
                                            {isGenerating ? "Synchronizing Graph..." : "Initiate Weaving Protocol"}
                                        </button>
                                    </div>
                                 )}
                            </div>
                        )
                    )}
                </div>
            </article>
        </div>
    );
};
