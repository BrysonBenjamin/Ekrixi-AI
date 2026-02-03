
import React, { useState, useMemo } from 'react';
import { 
    Search, Folder, FileText, Link2, ChevronDown, ChevronRight, 
    ChevronLeft, Boxes, Zap, CornerDownRight,
    Anchor, Share2, Terminal, UserCircle2
} from 'lucide-react';
import { NexusObject, isContainer, isLink, NexusType, isReified } from '../../../types';

interface HierarchyExplorerProps {
    items: NexusObject[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onReparent?: (sourceId: string, targetId: string, oldParentId?: string, isReference?: boolean) => void;
}

export const HierarchyExplorer: React.FC<HierarchyExplorerProps> = ({ items, selectedId, onSelect, onReparent }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const [isDraggingOverall, setIsDraggingOverall] = useState(false);
    const [isReferenceMode, setIsReferenceMode] = useState(false);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

    const toggleFolder = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const { roots, registry, reifiedLinksByTarget } = useMemo(() => {
        const reg: Record<string, NexusObject> = {};
        const byTarget: Record<string, string[]> = {};
        
        items.forEach(item => {
            reg[item.id] = item;
            if (isReified(item)) {
                const targetId = (item as any).target_id;
                if (!byTarget[targetId]) byTarget[targetId] = [];
                byTarget[targetId].push(item.id);
            }
        });

        const childIds = new Set<string>();
        items.forEach(item => {
            if (isContainer(item)) {
                item.children_ids.forEach(id => childIds.add(id));
            }
        });

        const rootNodes = items.filter(item => 
            !childIds.has(item.id) && !isLink(item)
        );

        const reifiedRoots = items.filter(item => 
            isReified(item) && !childIds.has(item.id)
        );
        
        return { 
            roots: [...rootNodes, ...reifiedRoots], 
            registry: reg, 
            reifiedLinksByTarget: byTarget 
        };
    }, [items]);

    const filteredLinks = useMemo(() => {
        return items.filter(item => 
            isLink(item) && 
            !isReified(item) &&
            (item._type === NexusType.SEMANTIC_LINK || item._type === NexusType.SIMPLE_LINK)
        );
    }, [items]);

    const handleDragStart = (e: React.DragEvent, id: string, parentId?: string) => {
        e.dataTransfer.setData("text/plain", id);
        if (parentId) e.dataTransfer.setData("application/nexus-parent-id", parentId);
        e.dataTransfer.effectAllowed = "move";
        setTimeout(() => setIsDraggingOverall(true), 0);
    };

    const handleDragEnd = () => {
        setIsDraggingOverall(false);
        setDragOverId(null);
        setIsReferenceMode(false);
    };

    const handleDragOver = (e: React.DragEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (e.altKey !== isReferenceMode) {
            setIsReferenceMode(e.altKey);
        }

        const item = registry[id];
        if (id === 'root' || (item && !isLink(item))) {
            if (dragOverId !== id) setDragOverId(id);
        }
    };

    const handleDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        e.stopPropagation();
        
        const sourceId = e.dataTransfer.getData("text/plain");
        const oldParentId = e.dataTransfer.getData("application/nexus-parent-id") || undefined;
        const isReference = e.altKey;

        setIsDraggingOverall(false);
        setDragOverId(null);
        setIsReferenceMode(false);

        if (sourceId !== targetId && onReparent) {
            onReparent(sourceId, targetId, oldParentId, isReference);
        }
    };

    const renderNode = (node: NexusObject, depth: number = 0, context: { parentId?: string, isShadowAttachment?: boolean } = {}) => {
        const { parentId, isShadowAttachment = false } = context;
        const isFolder = isContainer(node);
        const reified = isReified(node);
        const isAuthorNote = (node as any).is_author_note;
        const isOpen = expandedFolders.has(node.id);
        const isActive = selectedId === node.id;
        const isDraggingOver = dragOverId === node.id;
        const title = (node as any).title || (isLink(node) ? (node as any).verb : 'Untitled Unit');
        
        const incomingReifiedIds = !isShadowAttachment ? (reifiedLinksByTarget[node.id] || []) : [];

        return (
            <React.Fragment key={`${node.id}-${parentId || 'root'}-${isShadowAttachment ? 'shadow' : 'main'}`}>
                {incomingReifiedIds.map(rid => {
                    const rNode = registry[rid];
                    if (!rNode) return null;
                    return renderNode(rNode, depth, { parentId, isShadowAttachment: true });
                })}

                <div className="flex flex-col">
                    <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, node.id, parentId)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(e, node.id)}
                        onDrop={(e) => handleDrop(e, node.id)}
                        onClick={() => onSelect(node.id)}
                        className={`
                            group flex items-center gap-2 px-2 py-2 rounded-xl text-[11px] transition-all cursor-pointer border relative
                            ${isAuthorNote 
                                ? isActive
                                    ? 'bg-amber-500/20 text-amber-500 border-amber-500/40 shadow-lg'
                                    : 'text-amber-500/70 border-amber-500/10 hover:bg-amber-500/10 hover:border-amber-500/30'
                                : reified || isShadowAttachment
                                ? isActive 
                                    ? 'bg-nexus-accent/20 text-nexus-accent border-nexus-accent/40 shadow-lg' 
                                    : 'text-nexus-muted border-nexus-accent/10 hover:bg-nexus-accent/10 hover:border-nexus-accent/30'
                                : isActive 
                                    ? 'bg-nexus-accent/10 text-nexus-accent border-nexus-accent/30 shadow-sm' 
                                    : isDraggingOver
                                        ? isReferenceMode 
                                            ? 'bg-nexus-essence/20 border-nexus-essence border-dashed animate-pulse'
                                            : 'bg-nexus-accent/30 border-nexus-accent border-dashed animate-pulse'
                                        : 'text-nexus-muted hover:text-nexus-text hover:bg-nexus-800/40 border-transparent'}
                            ${isShadowAttachment ? 'border-l-2 border-l-nexus-accent/50 rounded-l-none ml-[-2px]' : ''}
                        `}
                        style={{ marginLeft: `${depth * 12}px` }}
                    >
                        <div className="flex items-center gap-1.5 shrink-0">
                            {isFolder ? (
                                <button 
                                    onClick={(e) => toggleFolder(e, node.id)}
                                    className={`p-0.5 rounded transition-colors ${reified || isShadowAttachment ? 'text-nexus-accent hover:bg-nexus-accent/20' : 'text-nexus-muted hover:bg-nexus-800 group-hover:text-nexus-text'}`}
                                >
                                    {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                </button>
                            ) : (
                                <div className="w-4 flex justify-center">
                                    <div className={`w-1 h-1 rounded-full ${isAuthorNote ? 'bg-amber-500' : (reified || isShadowAttachment ? 'bg-nexus-accent shadow-[0_0_5px_var(--accent-color)]' : 'bg-nexus-700')}`} />
                                </div>
                            )}
                            
                            {isAuthorNote ? (
                                <UserCircle2 size={13} className={isActive ? 'text-amber-500' : 'text-amber-500/60'} />
                            ) : reified || isShadowAttachment ? (
                                <Share2 size={13} className={isActive ? 'text-nexus-accent' : 'text-nexus-muted'} />
                            ) : isFolder ? (
                                <Folder size={13} className={isActive ? 'text-nexus-accent' : 'text-nexus-500'} />
                            ) : (
                                <FileText size={13} className={isActive ? 'text-nexus-accent' : 'text-nexus-muted'} />
                            )}
                        </div>

                        <span className={`truncate font-display font-bold flex-1 ${reified || isShadowAttachment ? 'italic tracking-tight' : ''}`}>
                            {isAuthorNote && (
                                <span className="text-[7px] font-black text-amber-500 mr-1.5 uppercase border border-amber-500/30 px-1 rounded-sm bg-amber-500/5">Meta</span>
                            )}
                            {(reified || isShadowAttachment) && (
                                <span className="text-[7px] font-black text-nexus-accent mr-1.5 uppercase border border-nexus-accent/30 px-1 rounded-sm bg-nexus-accent/5">Logic</span>
                            )}
                            {title}
                        </span>

                        {isDraggingOver && (
                             <div className={`absolute right-2 text-[8px] font-display font-black uppercase tracking-widest ${isReferenceMode ? 'text-nexus-essence' : 'text-nexus-accent'}`}>
                                {isReferenceMode ? 'Link' : (!isFolder && !isLink(node) ? 'Promote' : 'Move')}
                             </div>
                        )}
                    </div>

                    {isFolder && isOpen && (
                        <div className="flex flex-col mt-1">
                            {node.children_ids.map(cid => {
                                const child = registry[cid];
                                return child ? renderNode(child, depth + 1, { parentId: node.id }) : null;
                            })}
                        </div>
                    )}
                </div>
            </React.Fragment>
        );
    };

    if (isCollapsed) {
        return (
            <aside className="w-16 border-r border-nexus-800 bg-nexus-900 flex flex-col items-center py-6 gap-8 shrink-0 z-20 transition-all duration-300">
                <button onClick={() => setIsCollapsed(false)} className="p-2.5 hover:bg-nexus-800 rounded-xl text-nexus-muted hover:text-nexus-accent transition-all"><ChevronRight size={20} /></button>
                <div className="h-px w-6 bg-nexus-800" />
                <div className="flex flex-col gap-6 opacity-30">
                    <Boxes size={20} className="text-nexus-muted" />
                    <Terminal size={20} className="text-nexus-accent" />
                </div>
            </aside>
        );
    }

    return (
        <aside className="w-72 md:w-80 border-r border-nexus-800 bg-nexus-900 flex flex-col overflow-hidden shrink-0 transition-all duration-300 relative z-20 shadow-2xl">
            <div 
                className={`p-5 border-b transition-all duration-300 ${dragOverId === 'root' ? (isReferenceMode ? 'bg-nexus-essence/10 border-nexus-essence' : 'bg-nexus-accent/10 border-nexus-accent') : 'bg-nexus-900/40 border-nexus-800'}`}
                onDragOver={(e) => handleDragOver(e, 'root')}
                onDrop={(e) => handleDrop(e, 'root')}
            >
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <Boxes size={16} className="text-nexus-accent" />
                        <span className={`text-[11px] font-display font-black uppercase tracking-[0.2em] ${dragOverId === 'root' ? 'text-nexus-text' : 'text-nexus-text opacity-70'}`}>
                            {dragOverId === 'root' ? (isReferenceMode ? 'Logic Attachment' : 'Move to Origin') : 'File System'}
                        </span>
                    </div>
                    <button onClick={() => setIsCollapsed(true)} className="p-1.5 hover:bg-nexus-800 rounded-lg text-nexus-muted hover:text-nexus-text transition-all"><ChevronLeft size={18} /></button>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-nexus-muted" size={13} />
                    <input 
                        type="text" 
                        placeholder="Search Registry..."
                        className="w-full bg-nexus-950 border border-nexus-800 rounded-xl py-2.5 pl-9 pr-4 text-[10px] text-nexus-text outline-none focus:border-nexus-accent transition-all placeholder:text-nexus-muted shadow-inner"
                    />
                </div>
            </div>
            
            <div 
                className={`flex-1 overflow-y-auto p-4 space-y-1 no-scrollbar border-b border-nexus-800 relative transition-colors duration-500 ${isDraggingOverall && !dragOverId ? 'bg-nexus-accent/5' : ''}`}
                onDragOver={(e) => handleDragOver(e, 'root')}
                onDrop={(e) => handleDrop(e, 'root')}
            >
                {roots.map(root => renderNode(root))}
                {roots.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 opacity-10">
                        <Terminal size={48} className="mb-4" />
                        <span className="text-[10px] uppercase font-display font-black tracking-[0.3em]">Neural Index Empty</span>
                    </div>
                )}
                
                {isDraggingOverall && (
                    <div className="absolute inset-x-5 bottom-5 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className={`p-3 border border-dashed rounded-2xl flex items-center justify-center gap-3 transition-all backdrop-blur-xl ${dragOverId === 'root' ? (isReferenceMode ? 'bg-nexus-essence/20 border-nexus-essence text-nexus-essence' : 'bg-nexus-accent/20 border-nexus-accent text-nexus-accent') : 'bg-nexus-950/40 border-nexus-800 text-nexus-muted'}`}>
                            <Anchor size={14} />
                            <span className="text-[9px] font-display font-black uppercase tracking-widest">
                                {isReferenceMode ? 'LOGIC_ATTACH' : 'ORIGIN_FORGE'}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <div className="h-56 flex flex-col bg-nexus-950/40 shrink-0">
                <div className="px-5 py-3 border-b border-nexus-800 flex items-center justify-between bg-nexus-900/40 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                        <Link2 size={13} className="text-nexus-accent" />
                        <span className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.2em]">Latent Logic</span>
                    </div>
                    <div className="text-[8px] font-mono text-nexus-muted opacity-40 uppercase tracking-widest">Alt+Drag to Bind</div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1.5 no-scrollbar">
                    {filteredLinks.map(link => {
                        if (!isLink(link)) return null;
                        const target = registry[link.target_id];
                        const isActive = selectedId === link.id;
                        
                        return (
                            <div 
                                key={link.id}
                                onClick={() => onSelect(link.id)}
                                className={`
                                    group flex items-center gap-3 px-4 py-2.5 rounded-xl text-[10px] border cursor-pointer transition-all
                                    ${isActive 
                                        ? 'bg-nexus-accent/10 text-nexus-accent border-nexus-accent/30 shadow-sm' 
                                        : 'text-nexus-muted hover:text-nexus-text hover:bg-nexus-800/40 border-transparent'}
                                `}
                            >
                                <Zap size={11} className={isActive ? 'text-nexus-accent' : 'text-nexus-muted opacity-40'} />
                                <div className="flex-1 truncate font-display font-bold">
                                    <span className="uppercase tracking-tight">{(link as any).verb}</span>
                                    <span className="mx-2 opacity-30">→</span>
                                    <span className="opacity-60">{target ? (target as any).title : 'Unknown'}</span>
                                </div>
                            </div>
                        );
                    })}
                    {filteredLinks.length === 0 && (
                        <div className="text-[9px] text-nexus-muted font-mono italic p-6 text-center opacity-30">No latent ties detected.</div>
                    )}
                </div>
            </div>
        </aside>
    );
};
