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
    History
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
    NexusCategory
} from '../../types';
import { Logo } from '../../components/shared/Logo';

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
    
    const [editData, setEditData] = useState<Partial<SimpleNote>>({});
    const articleRef = useRef<HTMLDivElement>(null);

    const currentNote = useMemo(() => {
        if (!selectedId) return null;
        const obj = registry[selectedId];
        return (obj && !isLink(obj)) ? (obj as SimpleNote | ContainerNote) : null;
    }, [selectedId, registry]);

    const handleStartEdit = (node: SimpleNote | ContainerNote) => {
        setEditData({
            title: node.title,
            gist: node.gist,
            prose_content: node.prose_content,
            aliases: [...(node.aliases || [])],
            tags: [...(node.tags || [])],
            category_id: node.category_id
        });
        setEditingNodeId(node.id);
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
            return `<span class="nexus-ghost-link" title="Latent Unit: ${title}">${title}</span>`;
        });
    }, [allNodesByTitle]);

    const handleGenerateBg = async () => {
        if (!currentNote) return;
        setIsGeneratingBg(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: [{ parts: [{ text: `A cinematic high-quality background illustration for a ${currentNote.category_id} titled "${currentNote.title}". Description: ${currentNote.gist}. Atmospheric, evocative, slightly abstract conceptual art.` }] }],
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
                onUpdateObject(currentNote.id, { background_url: imgUrl });
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
        if (!selectedId || !currentNote) return;
        setIsGenerating(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const projectSummary = (Object.values(registry) as NexusObject[])
                .filter(n => !isLink(n))
                .map((n: any) => `- ${n.title}: ${n.gist}`)
                .join('\n');

            const prompt = `
                ACT AS: The Grand Chronicler of the Ekrixi AI Nexus.
                TASK: Write a definitive, high-fidelity encyclopedia entry for the "${currentNote.category_id}" known as "${currentNote.title}".
                
                STRICT KNOWLEDGE CONSTRAINTS: 
                - You MUST ONLY use information provided in the CONTEXT below.
                - Do NOT hallucinate external lore, places, or history not present in the CONTEXT.
                - If context is missing for a section, keep it brief or omit it.
                - Your goal is to SYNTHESIZE existing records into a formal scholarly entry.

                CONTEXT FOR CURRENT NODE:
                - Title: ${currentNote.title}
                - Designation: ${currentNote.category_id}
                - Summary: ${currentNote.gist}
                - Records: ${currentNote.prose_content || "No detailed record available."}
                
                GLOBAL CONTEXT (The state of the known world):
                ${projectSummary}
                
                STRUCTURE:
                1. # Executive Overview (A concise summary of purpose and origin based on gist)
                2. ## Chronological Data (Timeline of existence if known)
                3. ## Architectural/Systemic Profile (Physical or conceptual properties)
                4. ## Neural Significance (Relationship to the rest of the known registry)
                5. ## Known Associations (Explicitly reference other units using [[Title]] formatting)
                
                FORMATTING: 
                - Use rich Markdown.
                - Wrap mentions of other units in [[Double Brackets]].
                - Maintain an atmospheric yet precise scholarly tone.
            `;
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: prompt,
                config: { temperature: 0.2 } 
            });
            const artifact: WikiArtifact = {
                node_id: selectedId,
                content: response.text || "Connection to the weave lost.",
                generated_at: new Date().toISOString(),
                context_depth: 2,
                graph_version: `v${Object.keys(registry).length}`
            };
            setArtifacts(prev => ({ ...prev, [selectedId]: artifact }));
        } catch (error) {
            console.error("Encyclopedia Generation Error:", error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCommitToRegistry = () => {
        if (currentArtifact && currentNote) {
            onUpdateObject(currentNote.id, { 
                prose_content: currentArtifact.content,
                last_modified: new Date().toISOString()
            });
            setShowSaveSuccess(true);
            setTimeout(() => setShowSaveSuccess(false), 3000);
            setViewMode('NOTE');
        }
    };

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
                            return <a {...props} className="hover:text-nexus-accent underline" style={{ color: color || 'var(--accent-color)' }} target="_blank" rel="noopener noreferrer" />;
                        },
                        h1: ({ children }) => <h1 id="renderer-h1">{children}</h1>,
                        h2: ({ children }) => <h2 id="renderer-h2">{children}</h2>,
                        h3: ({ children }) => <h3 id="renderer-h3">{children}</h3>,
                        blockquote: ({ children }) => <blockquote>{children}</blockquote>,
                        ul: ({ children }) => <ul>{children}</ul>,
                        ol: ({ children }) => <ol>{children}</ol>,
                        li: ({ children }) => <li>{children}</li>,
                    }}
                >
                    {transformWikiLinks(content)}
                </ReactMarkdown>
            </div>
        );
    };

    const renderSection = (node: SimpleNote | ContainerNote, depth: number, visited: Set<string>): React.ReactNode => {
        if (depth > 2 || visited.has(node.id)) return null;
        visited.add(node.id);

        const children = isContainer(node) 
            ? node.children_ids
                .map(id => registry[id])
                .filter((child): child is (SimpleNote | ContainerNote) => !!child && !isLink(child))
            : [];

        const isEditingThis = editingNodeId === node.id;
        const themeColor = node.theme_color || currentNote?.theme_color;

        return (
            <section key={node.id} id={`section-${node.id}`} className="mb-20 animate-in fade-in slide-in-from-bottom-4 duration-700 scroll-mt-32 group/section">
                <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between border-b border-nexus-800/30 pb-4">
                        <div className="flex items-center gap-4">
                            <span className="px-3 py-1 border rounded-full text-[9px] font-display font-black uppercase tracking-widest" style={{ borderColor: `${themeColor || 'var(--nexus-500)'}50`, backgroundColor: `${themeColor || 'var(--nexus-500)'}15`, color: themeColor || 'var(--accent-color)' }}>
                                {node.category_id}
                            </span>
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
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest">Category</label>
                                        <select 
                                            value={editData.category_id}
                                            onChange={(e) => setEditData({...editData, category_id: e.target.value as NexusCategory})}
                                            className="w-full bg-nexus-950 border border-nexus-800 rounded-2xl p-4 text-sm font-bold text-nexus-text focus:border-nexus-accent outline-none shadow-inner h-[60px]"
                                        >
                                            {Object.values(NexusCategory).map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest flex items-center gap-2">The Gist <span className="text-[8px] opacity-40 font-mono">(Brief Summary)</span></label>
                                    <textarea 
                                        value={editData.gist || ''}
                                        onChange={(e) => setEditData({...editData, gist: e.target.value})}
                                        className="w-full bg-nexus-950 border border-nexus-800 rounded-2xl p-4 text-sm font-serif italic text-nexus-text focus:border-nexus-accent outline-none resize-none h-24 shadow-inner"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest">Primary Records (Markdown)</label>
                                    <textarea 
                                        value={editData.prose_content || ''}
                                        onChange={(e) => setEditData({...editData, prose_content: e.target.value})}
                                        className="w-full bg-nexus-950 border border-nexus-800 rounded-2xl p-6 text-sm font-sans text-nexus-text focus:border-nexus-accent outline-none resize-none h-64 shadow-inner no-scrollbar leading-relaxed"
                                        placeholder="# The history of this unit..."
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest flex items-center gap-2"><AtSign size={10} /> Designations</label>
                                        <input 
                                            value={editData.aliases?.join(', ') || ''}
                                            onChange={(e) => setEditData({...editData, aliases: e.target.value.split(',').map(s => s.trim())})}
                                            className="w-full bg-nexus-950 border border-nexus-800 rounded-xl p-3 text-[11px] text-nexus-text outline-none focus:border-nexus-accent shadow-inner"
                                            placeholder="alias1, alias2..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest flex items-center gap-2"><Tag size={10} /> Tags</label>
                                        <input 
                                            value={editData.tags?.join(', ') || ''}
                                            onChange={(e) => setEditData({...editData, tags: e.target.value.split(',').map(s => s.trim())})}
                                            className="w-full bg-nexus-950 border border-nexus-800 rounded-xl p-3 text-[11px] text-nexus-text outline-none focus:border-nexus-accent shadow-inner"
                                            placeholder="tag1, tag2..."
                                        />
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
                                    <h1 className="text-5xl md:text-7xl font-display font-black text-nexus-text tracking-tighter mb-4 leading-tight">
                                        {node.title}
                                    </h1>
                                ) : (
                                    <h2 className="text-3xl md:text-4xl font-display font-bold text-nexus-text tracking-tight mb-4">
                                        {node.title}
                                    </h2>
                                )}

                                <div className="relative pl-6 md:pl-10 border-l-4 py-1 mb-8" style={{ borderColor: themeColor || 'var(--accent-color)' }}>
                                    <p className="text-xl md:text-2xl text-nexus-text/80 font-serif italic leading-relaxed">
                                        "{node.gist || 'This manifestation remains uncharted.'}"
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-2 mb-10">
                                    {node.aliases && node.aliases.length > 0 && node.aliases.map(a => (
                                        <span key={a} className="flex items-center gap-1.5 px-3 py-1.5 bg-nexus-800/20 border border-nexus-700/50 rounded-lg text-[10px] font-display font-bold text-nexus-muted uppercase tracking-widest shadow-sm">
                                            <AtSign size={10} className="text-nexus-accent" /> {a}
                                        </span>
                                    ))}
                                    {node.tags && node.tags.length > 0 && node.tags.map(t => (
                                        <span key={t} className="flex items-center gap-1.5 px-3 py-1.5 bg-nexus-800/20 border border-nexus-700/50 rounded-lg text-[10px] font-display font-bold text-nexus-muted uppercase tracking-widest shadow-sm">
                                            <Tag size={10} className="text-nexus-essence" /> {t}
                                        </span>
                                    ))}
                                </div>

                                <div className="wiki-content max-w-4xl">
                                    <MarkdownRenderer content={node.prose_content || ""} color={themeColor} />
                                </div>
                            </div>

                            {children.length > 0 && (
                                <div className="pt-16 border-t border-nexus-800/30 ml-4 lg:ml-12">
                                    {children.map(child => renderSection(child, depth + 1, visited))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </section>
        );
    };

    const tableOfContents = useMemo(() => {
        if (!currentNote) return [];
        const walk = (node: SimpleNote | ContainerNote, depth: number, visited: Set<string>, toc: { id: string, title: string, depth: number }[]) => {
            if (depth > 2 || visited.has(node.id)) return;
            visited.add(node.id);
            toc.push({ id: node.id, title: node.title, depth });
            if (isContainer(node)) {
                node.children_ids.forEach(cid => {
                    const child = registry[cid];
                    if (child && !isLink(child)) walk(child as SimpleNote | ContainerNote, depth + 1, visited, toc);
                });
            }
        };
        const result: { id: string, title: string, depth: number }[] = [];
        walk(currentNote, 0, new Set(), result);
        return result;
    }, [currentNote, registry]);

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

    if (!selectedId || !currentNote) {
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
                    {(Object.values(registry) as NexusObject[]).filter(o => !isLink(o)).map((node: any) => (
                        <button 
                            key={node.id}
                            onClick={() => onSelect(node.id)}
                            className="group relative bg-nexus-900 border border-nexus-800/60 hover:border-nexus-accent hover:translate-y-[-4px] p-8 rounded-[40px] text-left transition-all duration-500 shadow-xl hover:shadow-2xl flex flex-col h-full overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-nexus-accent/5 rounded-full blur-3xl group-hover:bg-nexus-accent/10 transition-colors" />
                            <div className="flex items-center gap-3 mb-8 relative z-10">
                                <div className="p-3 bg-nexus-800 rounded-2xl border border-nexus-700 text-nexus-accent group-hover:bg-nexus-accent group-hover:text-white transition-all shadow-sm">
                                    {node.category_id === NexusCategory.LOCATION ? <MapPin size={20} /> : <Users size={20} />}
                                </div>
                                <span className="text-[10px] font-display font-black text-nexus-muted group-hover:text-nexus-accent uppercase tracking-widest transition-colors">{node.category_id}</span>
                            </div>
                            <h3 className="text-2xl font-display font-bold text-nexus-text mb-4 leading-tight relative z-10">{node.title}</h3>
                            <p className="text-sm text-nexus-muted italic line-clamp-3 mb-8 font-serif relative z-10">"{node.gist || 'Neural record awaited.'}"</p>
                            <div className="mt-auto flex items-center justify-between text-[10px] font-display font-black uppercase tracking-widest text-nexus-muted opacity-40 group-hover:opacity-100 transition-opacity relative z-10">
                                <span>Navigate Unit</span>
                                <ChevronRight size={16} className="group-hover:translate-x-2 transition-transform" />
                            </div>
                        </button>
                    ))}
                    {Object.keys(registry).filter(k => !isLink(registry[k])).length === 0 && (
                        <div className="col-span-full py-40 flex flex-col items-center justify-center border-2 border-dashed border-nexus-800 rounded-[64px] opacity-20 text-center">
                            <History size={64} className="mb-6" />
                            <h3 className="text-xl font-display font-black uppercase tracking-[0.4em]">Registry Empty</h3>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-nexus-950 overflow-hidden md:flex-row relative font-sans">
            {/* Ambient Background */}
            {currentNote.background_url && (
                <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
                    <img 
                        src={currentNote.background_url} 
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
                                            className="text-sm font-display font-bold text-nexus-text/70 hover:text-nexus-accent transition-all flex items-center gap-3 group text-left w-full"
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${selectedId === item.id ? 'bg-nexus-accent scale-150 shadow-[0_0_10px_var(--accent-color)]' : 'bg-nexus-800 group-hover:bg-nexus-accent'}`} />
                                            {item.title}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    )}

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
                                    <span className="text-[13px] font-display font-bold text-nexus-text/90 group-hover:text-nexus-text truncate">
                                        {conn.neighbor.title}
                                    </span>
                                </button>
                            ))}
                            {connections.length === 0 && <span className="text-[10px] text-nexus-muted italic opacity-40">No external causal ties recorded.</span>}
                        </div>
                    </div>
                </div>
            </aside>

            <article ref={articleRef} className="flex-1 overflow-y-auto no-scrollbar scroll-smooth relative z-10">
                <div className="max-w-5xl mx-auto px-8 py-20 lg:px-24 lg:py-24 pb-64">
                    
                    <div className="flex items-center justify-end mb-16 sticky top-4 z-50 pointer-events-none gap-4">
                        <div className="flex bg-nexus-900/90 backdrop-blur-xl border border-nexus-700/50 rounded-full p-1.5 shadow-2xl pointer-events-auto items-center">
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
                        </div>

                        {showCustomizer && (
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
                                                    onClick={() => onUpdateObject(currentNote.id, { theme_color: c.hex })}
                                                    className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 shadow-sm ${currentNote.theme_color === c.hex ? 'border-white' : 'border-transparent'}`}
                                                    style={{ backgroundColor: c.hex }}
                                                />
                                            ))}
                                            <button 
                                                onClick={() => onUpdateObject(currentNote.id, { theme_color: undefined })}
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
                                            {currentNote.background_url && (
                                                <button 
                                                    onClick={() => onUpdateObject(currentNote.id, { background_url: undefined })}
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

                    {viewMode === 'NOTE' ? (
                        <div className="relative">
                            {showSaveSuccess && (
                                <div className="absolute -top-12 right-0 bg-nexus-essence text-white px-6 py-2 rounded-full text-[10px] font-display font-black uppercase tracking-widest shadow-lg shadow-nexus-essence/20 animate-in slide-in-from-bottom-2 duration-300 flex items-center gap-2">
                                    <FileCheck size={14} /> Records Synchronized
                                </div>
                            )}
                            {renderSection(currentNote, 0, new Set())}
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
                                        <MarkdownRenderer content={currentArtifact.content} color={currentNote.theme_color} />
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
                    )}
                </div>
            </article>
        </div>
    );
};