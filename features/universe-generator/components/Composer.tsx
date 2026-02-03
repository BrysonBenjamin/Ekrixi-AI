
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { ArrowUp, RotateCw, Maximize2, Minimize2, StickyNote, Plus, Database, X, Sparkles, ChevronRight, Search } from 'lucide-react';
import { NexusObject, isLink } from '../../../types';

interface ComposerProps {
    isLoading: boolean;
    onSend: (text: string) => void;
    variant?: 'footer' | 'center';
    registry: Record<string, NexusObject>;
}

export const Composer: React.FC<ComposerProps> = ({ isLoading, onSend, variant = 'footer', registry }) => {
    const [text, setText] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);
    const [showContextOverlay, setShowContextOverlay] = useState(false);
    const [atMenu, setAtMenu] = useState<{ query: string } | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSend = () => {
        if (!text.trim() || isLoading) return;
        onSend(text.trim());
        setText('');
        setIsExpanded(false);
        setAtMenu(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            if (atMenu) {
                // If menu is open, handle selection logic could go here, 
                // but for now we let it fall through or close it.
                setAtMenu(null);
            }
            e.preventDefault();
            handleSend();
        }
    };

    const detectAtTrigger = (val: string, pos: number) => {
        const beforeCursor = val.slice(0, pos);
        const lastAtIndex = beforeCursor.lastIndexOf('@');
        if (lastAtIndex !== -1 && !beforeCursor.slice(lastAtIndex).includes(' ')) {
            setAtMenu({ query: beforeCursor.slice(lastAtIndex + 1) });
        } else {
            setAtMenu(null);
        }
    };

    const insertMention = (nodeTitle: string) => {
        if (!textareaRef.current) return;
        const pos = textareaRef.current.selectionStart;
        const beforeCursor = text.slice(0, pos);
        const afterCursor = text.slice(pos);
        const lastAtIndex = beforeCursor.lastIndexOf('@');
        const newText = beforeCursor.slice(0, lastAtIndex) + `[[${nodeTitle}]]` + afterCursor;
        setText(newText);
        setAtMenu(null);
        setTimeout(() => {
            textareaRef.current?.focus();
        }, 0);
    };

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            if (isExpanded) {
                 textareaRef.current.style.height = '100%';
            } else {
                 const newHeight = Math.min(textareaRef.current.scrollHeight, 200);
                 textareaRef.current.style.height = `${Math.max(newHeight, 52)}px`;
            }
        }
    }, [text, isExpanded]);

    const isCenter = variant === 'center';
    const toggleExpand = () => setIsExpanded(!isExpanded);

    const suggestions = useMemo(() => {
        if (!atMenu) return [];
        const q = atMenu.query.toLowerCase();
        // Fix: Explicitly cast to NexusObject[] to ensure filter argument 'n' is recognized as NexusObject instead of unknown
        return (Object.values(registry) as NexusObject[])
            .filter(n => !isLink(n) && (n as any).title.toLowerCase().includes(q))
            .slice(0, 5);
    }, [atMenu, registry]);

    // Fix: Explicitly cast to NexusObject[] to ensure 'o' is recognized as NexusObject when calling isLink(o)
    const registrySize = useMemo(() => (Object.values(registry) as NexusObject[]).filter(o => !isLink(o)).length, [registry]);

    return (
        <div className={`
            shrink-0 transition-all duration-500 ease-out w-full
            ${isExpanded ? 'fixed inset-0 bg-nexus-950/90 backdrop-blur-xl flex items-center justify-center p-6 md:p-12 z-[100]' : 'z-40 relative'}
        `}>
            
            {/* Mention Menu */}
            {atMenu && suggestions.length > 0 && (
                <div className={`absolute bottom-full left-0 mb-4 w-full max-w-sm bg-nexus-900 border border-nexus-700 rounded-[28px] shadow-2xl overflow-hidden backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200 z-[110] ${isExpanded ? 'ml-0' : ''}`}>
                    <div className="px-5 py-3 border-b border-nexus-800 flex items-center justify-between bg-nexus-950/40">
                         <span className="text-[10px] font-display font-black text-nexus-accent uppercase tracking-widest flex items-center gap-2"><Sparkles size={12} /> Neural Registry Scry</span>
                         <button onClick={() => setAtMenu(null)} className="text-nexus-muted hover:text-nexus-text transition-colors"><X size={14} /></button>
                    </div>
                    <div className="p-2 space-y-1">
                        {suggestions.map((node: any) => (
                            <button 
                                key={node.id}
                                onClick={() => insertMention(node.title)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl hover:bg-nexus-accent hover:text-white transition-all group text-left"
                            >
                                <div className="w-8 h-8 rounded-xl bg-nexus-950 border border-nexus-800 flex items-center justify-center text-[10px] font-black text-nexus-accent group-hover:bg-white group-hover:text-nexus-accent transition-all">
                                    {node.category_id?.charAt(0) || 'U'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold truncate">{node.title}</div>
                                    <div className="text-[8px] opacity-60 uppercase font-mono">{node.category_id}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className={`
                relative flex flex-col transition-all duration-300 group pointer-events-auto
                ${isExpanded 
                    ? 'w-full max-w-4xl h-[80vh] bg-nexus-900 rounded-[40px] border border-nexus-700 shadow-2xl overflow-hidden' 
                    : isCenter 
                        ? 'mx-auto max-w-2xl bg-nexus-900 rounded-[32px] shadow-xl border border-nexus-800 p-2' 
                        : 'mx-auto w-full bg-nexus-900 rounded-[24px] border border-nexus-800 shadow-lg ring-1 ring-nexus-text/5 hover:ring-nexus-accent/20'}
            `}>
                
                {/* Text Input Area */}
                <div className={`w-full flex-1 min-h-0 ${isExpanded ? 'p-8 pb-0' : 'px-6 pt-5 pb-2'}`}>
                    <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={(e) => {
                            setText(e.target.value);
                            detectAtTrigger(e.target.value, e.target.selectionStart);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Manifest your reality... (Use @ to scry registry)"
                        className={`
                            w-full bg-transparent border-none focus:ring-0 focus:outline-none resize-none no-scrollbar
                            text-nexus-text placeholder-nexus-muted font-normal leading-relaxed
                            ${isExpanded ? 'h-full text-xl' : 'min-h-[52px] text-[15px]'}
                        `}
                        rows={1}
                    />
                </div>

                {/* Bottom Toolbar */}
                <div className={`flex items-center justify-between ${isExpanded ? 'px-8 pb-8 pt-4' : 'px-5 pb-4 pt-1'}`}>
                    <div className="flex items-center gap-3">
                        <button className="p-2 rounded-xl text-nexus-muted hover:text-nexus-text hover:bg-nexus-800 transition-all">
                            <Plus size={18} />
                        </button>
                        
                        <div className="relative">
                            <button 
                                onClick={() => setShowContextOverlay(!showContextOverlay)}
                                className={`flex items-center gap-2 transition-all py-2 px-4 rounded-xl text-[10px] font-display font-black uppercase tracking-widest ${showContextOverlay ? 'bg-nexus-accent text-white' : 'text-nexus-muted hover:text-nexus-accent hover:bg-nexus-800'}`}
                            >
                                <StickyNote size={14} />
                                <span>Memory: {registrySize} Units</span>
                            </button>
                            
                            {showContextOverlay && (
                                <div className="absolute bottom-full left-0 mb-4 w-64 bg-nexus-900 border border-nexus-800 rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Database size={16} className="text-nexus-accent" />
                                        <h4 className="text-[10px] font-black uppercase tracking-widest">Active Scry Context</h4>
                                    </div>
                                    <p className="text-[11px] text-nexus-muted leading-relaxed font-serif italic">
                                        The synthesis engine is currently aware of all <span className="text-nexus-accent font-bold">{registrySize} units</span> in your global registry. Mention them by name or use @ to trigger specific scrying.
                                    </p>
                                    <button 
                                        onClick={() => setShowContextOverlay(false)}
                                        className="w-full mt-4 py-2 rounded-xl bg-nexus-800 text-[9px] font-black uppercase tracking-widest hover:bg-nexus-700"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                         {text.length > 0 && (
                            <button 
                                onClick={handleSend}
                                disabled={isLoading}
                                className={`
                                    flex items-center justify-center w-10 h-10 rounded-full transition-all
                                    ${!isLoading 
                                        ? 'bg-nexus-accent text-white hover:bg-nexus-text hover:scale-105 active:scale-95 shadow-lg shadow-nexus-accent/20' 
                                        : 'bg-nexus-800 text-nexus-muted cursor-not-allowed'}
                                `}
                            >
                                {isLoading ? <RotateCw size={18} className="animate-spin" /> : <ArrowUp size={20} />}
                            </button>
                         )}
                    </div>
                </div>

                 {/* Top Right Expand Trigger */}
                 {text.length > 0 && (
                    <button 
                        onClick={toggleExpand}
                        className="absolute top-4 right-4 text-nexus-muted hover:text-nexus-text p-2 rounded-xl hover:bg-nexus-800 transition-all"
                        title={isExpanded ? "Collapse" : "Expand"}
                    >
                        {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                 )}

            </div>
        </div>
    );
};
