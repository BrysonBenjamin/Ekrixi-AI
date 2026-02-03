import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, Copy, RotateCw, ScanLine, ChevronLeft, ChevronRight, Pencil, Check, X, GitBranch, User } from 'lucide-react';
import { MessageNode, ChatSession } from '../types';
import { NexusObject } from '../../../types';

interface MessageBubbleProps {
    node: MessageNode;
    session: ChatSession;
    editMessage: (nodeId: string, text: string) => void;
    regenerate: (nodeId: string) => void;
    navigateBranch: (nodeId: string, direction: 'prev' | 'next') => void;
    onScan: (text: string) => void;
    registry?: Record<string, NexusObject>;
}

const TooltipButton = ({ icon: Icon, label, onClick, disabled }: { icon: any, label?: string, onClick?: () => void, disabled?: boolean }) => (
    <button 
        onClick={onClick}
        disabled={disabled}
        className={`
            p-2 rounded-lg transition-all flex items-center gap-1 group relative
            ${disabled ? 'text-nexus-800 cursor-not-allowed opacity-20' : 'text-nexus-muted hover:text-nexus-text hover:bg-nexus-800 active:scale-95'}
        `}
        title={label}
    >
        <Icon size={14} />
    </button>
);

export const MessageBubble: React.FC<MessageBubbleProps> = ({ 
    node, 
    session,
    editMessage,
    regenerate,
    navigateBranch,
    onScan,
    registry = {}
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const isUser = node.role === 'user';
    const isError = node.isError;
    
    let siblingCount = 1;
    let currentSiblingIndex = 0;
    
    if (node.parentId && session.messageMap[node.parentId]) {
        const parent = session.messageMap[node.parentId];
        siblingCount = parent.childrenIds.length;
        currentSiblingIndex = parent.childrenIds.indexOf(node.id);
    } else if (!node.parentId && session.rootNodeIds) {
        siblingCount = session.rootNodeIds.length;
        currentSiblingIndex = session.rootNodeIds.indexOf(node.id);
    }

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [editText, isEditing]);

    const handleEditSave = () => {
        if (editText.trim() !== '') {
            editMessage(node.id, editText);
        }
        setIsEditing(false);
    };

    const allNodesByTitle = useMemo(() => {
        const map: Record<string, string> = {};
        // Fix: Explicitly cast to NexusObject[] to ensure 'node' is recognized as NexusObject instead of unknown during iteration
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
                // We use a custom protocol for inter-feature navigation or just styling
                return `[${title}](#navigate-${id})`;
            }
            return `<span class="nexus-ghost-link" title="Latent Unit: ${title}">${title}</span>`;
        });
    }, [allNodesByTitle]);
    
    return (
        <div className={`flex w-full mb-10 group ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex flex-col max-w-[95%] md:max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                
                {/* 1. Header Metadata */}
                {!isEditing && (
                    <div className={`flex items-center gap-2 mb-2 opacity-60 px-2 ${isUser ? 'flex-row-reverse' : ''}`}>
                        {isUser ? <User size={12} className="text-nexus-accent" /> : <Bot size={12} className="text-nexus-arcane" />}
                        <span className="text-[10px] font-display font-black tracking-[0.2em] uppercase text-nexus-text">
                            {isUser ? 'User' : 'Assistant'}
                        </span>
                    </div>
                )}

                {/* 2. Message Bubble */}
                <div className={`
                    relative px-5 py-4 rounded-2xl transition-all duration-300
                    ${isUser 
                        ? 'bg-nexus-700 text-nexus-text rounded-tr-sm border border-nexus-600 shadow-lg' 
                        : isEditing 
                            ? 'w-full' 
                            : 'text-nexus-text w-full border-l-2 border-nexus-800 pl-6'} 
                    ${isError ? 'text-red-500 border-red-200 bg-red-50' : ''}
                `}>
                    
                    {isEditing ? (
                        <div className="w-full bg-nexus-900 border border-nexus-800 rounded-2xl p-5 shadow-2xl min-w-[280px] md:min-w-[500px]">
                            <textarea
                                ref={textareaRef}
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="w-full bg-transparent text-nexus-text outline-none resize-none font-sans leading-relaxed text-base no-scrollbar"
                                rows={1}
                                autoFocus
                            />
                            <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-nexus-800">
                                <button onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-xl text-[10px] font-display font-bold text-nexus-muted hover:text-nexus-text transition-all flex items-center gap-2 uppercase tracking-widest"><X size={12} /> Cancel</button>
                                <button onClick={handleEditSave} className="px-5 py-2 rounded-xl text-[10px] font-display font-black bg-nexus-accent text-white hover:bg-nexus-text transition-all flex items-center gap-2 uppercase tracking-widest shadow-lg shadow-nexus-accent/10"><Check size={12} /> Commit</button>
                            </div>
                        </div>
                    ) : (
                        <div className="prose max-w-none prose-sm sm:prose-base dark:prose-invert prose-headings:font-display prose-headings:font-bold">
                            <ReactMarkdown
                                components={{
                                    a: ({ node, ...props }) => {
                                        const href = props.href || '';
                                        if (href.startsWith('#navigate-')) {
                                            const id = href.replace('#navigate-', '');
                                            return (
                                                <button 
                                                    onClick={(e) => { 
                                                        e.preventDefault(); 
                                                        // Note: Chat normally doesn't navigate yet, 
                                                        // but we style it as a link.
                                                        console.log("Navigating to node:", id);
                                                    }}
                                                    className="nexus-wiki-link"
                                                >
                                                    {props.children}
                                                </button>
                                            );
                                        }
                                        return <a {...props} target="_blank" rel="noopener noreferrer" className="text-nexus-accent underline" />;
                                    }
                                }}
                            >
                                {transformWikiLinks(node.text || (node.isStreaming ? "..." : ""))}
                            </ReactMarkdown>
                        </div>
                    )}
                </div>

                {/* 3. Threading & Actions */}
                {!isEditing && (
                    <div className={`
                        flex flex-wrap items-center gap-2 mt-4 transition-all duration-300
                        ${isUser ? 'md:opacity-0 md:group-hover:opacity-100' : 'opacity-100'}
                    `}>
                        
                        {siblingCount > 1 && (
                            <div className="flex items-center gap-1 bg-nexus-900 rounded-full px-2 py-1 border border-nexus-800 shadow-sm">
                                <button 
                                    onClick={() => navigateBranch(node.id, 'prev')}
                                    disabled={currentSiblingIndex === 0}
                                    className={`p-1 rounded-full transition-colors ${currentSiblingIndex === 0 ? 'text-nexus-800' : 'text-nexus-muted hover:text-nexus-accent'}`}
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                <div className="flex items-center gap-1.5 px-2 text-[9px] font-mono font-black text-nexus-muted uppercase tracking-tighter">
                                    <GitBranch size={10} className="text-nexus-accent opacity-50" />
                                    <span>{currentSiblingIndex + 1} / {siblingCount}</span>
                                </div>
                                <button 
                                    onClick={() => navigateBranch(node.id, 'next')}
                                    disabled={currentSiblingIndex === siblingCount - 1}
                                    className={`p-1 rounded-full transition-colors ${currentSiblingIndex === siblingCount - 1 ? 'text-nexus-800' : 'text-nexus-muted hover:text-nexus-accent'}`}
                                >
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        )}

                        <div className="flex items-center gap-1">
                            {isUser ? (
                                <>
                                    <TooltipButton icon={Pencil} label="Edit" onClick={() => { setEditText(node.text); setIsEditing(true); }} />
                                    <TooltipButton icon={RotateCw} label="Re-Branch" onClick={() => regenerate(node.id)} />
                                </>
                            ) : !node.isStreaming && !isError && (
                                <>
                                    <TooltipButton icon={Copy} label="Copy" onClick={() => navigator.clipboard.writeText(node.text)} />
                                    <TooltipButton icon={RotateCw} label="Regenerate" onClick={() => regenerate(node.id)} />
                                    <button 
                                        onClick={() => onScan(node.text)}
                                        className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-nexus-800 hover:bg-nexus-accent hover:text-white text-nexus-accent text-[10px] font-display font-black transition-all uppercase tracking-widest border border-nexus-700 ml-2 shadow-sm"
                                    >
                                        <ScanLine size={12} /> Scan
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
