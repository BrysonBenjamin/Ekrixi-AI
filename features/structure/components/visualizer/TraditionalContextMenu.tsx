import React, { useEffect, useRef, useMemo } from 'react';
import { 
    Plus, Trash2, Share2, 
    Repeat, ArrowUpRight, ArrowDownLeft, BookOpen, GitBranch
} from 'lucide-react';
import { NexusObject, isLink, isContainer, isReified, NexusGraphUtils } from '../../../../types';

interface TraditionalContextMenuProps {
    object: NexusObject;
    registry: Record<string, NexusObject>;
    x: number;
    y: number;
    onClose: () => void;
    onInspect: (id: string) => void;
    onAddChild?: (id: string) => void;
    onDelete?: (id: string) => void;
    onReify?: (id: string) => void;
    onReifyNode?: (id: string) => void;
    onInvert?: (id: string) => void;
    onSelectNode?: (id: string) => void;
}

export const TraditionalContextMenu: React.FC<TraditionalContextMenuProps> = ({ 
    object, registry, x, y, onClose, onInspect, onAddChild, onDelete, onReify, onReifyNode, onInvert, onSelectNode 
}) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const isL = isLink(object);
    const isC = isContainer(object);
    const reified = isReified(object);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        window.addEventListener('mousedown', handleClickOutside);
        return () => window.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const menuWidth = 260;
    const adjustedX = x + menuWidth > window.innerWidth ? x - menuWidth : x;
    const adjustedY = y; 

    const isEligibleForNodeReify = useMemo(() => {
        if (isL || reified) return false;
        const parentMap = NexusGraphUtils.buildParentMap(registry);
        const parents = parentMap[object.id] || [];
        const children = isContainer(object) ? object.children_ids : [];
        return parents.length > 0 && children.length > 0;
    }, [object, registry, isL, reified]);

    return (
        <div 
            ref={menuRef}
            className="fixed z-[500] w-[260px] bg-nexus-900/95 backdrop-blur-2xl border border-nexus-700 rounded-[32px] shadow-2xl py-3 animate-in fade-in zoom-in-95 duration-150 pointer-events-auto"
            style={{ left: adjustedX, top: adjustedY }}
        >
            <div className="px-6 py-4 border-b border-nexus-800/50 mb-2">
                <div className="text-[9px] font-display font-black text-nexus-muted uppercase tracking-widest truncate mb-1">
                    {isL ? (reified ? 'Reified Connection' : 'Logic Stream') : 'Atomic Unit'}
                </div>
                <div className="text-[14px] font-display font-black text-nexus-text truncate">
                    {(object as any).title || (object as any).verb || 'Untitled'}
                </div>
            </div>

            <div className="px-2 space-y-1">
                <MenuItem 
                    className="inspect-action"
                    icon={BookOpen} 
                    label="Inspect & Edit Records" 
                    desc="Navigate to library"
                    onClick={() => { onInspect(object.id); onClose(); }} 
                    color="text-nexus-accent"
                />

                {(isC || (isL && reified)) && (
                    <MenuItem 
                        icon={Plus} 
                        label="Establish Sub-Unit" 
                        desc="Create nested logical node"
                        color="text-nexus-essence"
                        onClick={() => { if(onAddChild) onAddChild(object.id); onClose(); }} 
                    />
                )}

                {isEligibleForNodeReify && onReifyNode && (
                    <MenuItem 
                        className="reify-action"
                        icon={GitBranch} 
                        label="Promote to Connection" 
                        desc="Reify as Bridge Logic"
                        color="text-amber-500"
                        onClick={() => { onReifyNode(object.id); onClose(); }} 
                    />
                )}

                {isL && (
                    <>
                        {!reified && (
                            <MenuItem 
                                className="reify-action"
                                icon={Share2} 
                                label="Reify Connection" 
                                desc="Promote to logic unit"
                                color="text-amber-500"
                                onClick={() => { if(onReify) onReify(object.id); onClose(); }} 
                            />
                        )}
                        <MenuItem icon={Repeat} label="Invert Logic" onClick={() => { if(onInvert) onInvert(object.id); onClose(); }} />
                        <div className="h-px bg-nexus-800/50 my-2 mx-4" />
                        <MenuItem icon={ArrowUpRight} label={`Origin Link`} onClick={() => { if(onSelectNode) onSelectNode(object.source_id); onClose(); }} />
                        <MenuItem icon={ArrowDownLeft} label={`Target Link`} onClick={() => { if(onSelectNode) onSelectNode(object.target_id); onClose(); }} />
                    </>
                )}

                <div className="h-px bg-nexus-800/50 my-2 mx-4" />
                <MenuItem icon={Trash2} label="Terminate Unit" desc="Permanent purge" color="text-red-500" onClick={() => { if(onDelete) onDelete(object.id); onClose(); }} />
            </div>
        </div>
    );
};

const MenuItem = ({ icon: Icon, label, desc, onClick, color = "text-nexus-muted", className = "" }: any) => (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }} className={`w-full flex items-center gap-4 px-4 py-2.5 hover:bg-nexus-800/60 rounded-2xl transition-all group text-left ${className}`}>
        <div className={`p-2 rounded-xl bg-nexus-950 border border-nexus-800 transition-colors group-hover:border-nexus-700 ${color}`}>
            <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
            <div className="text-[12px] font-display font-bold group-hover:text-white truncate">{label}</div>
            {desc && <div className="text-[8px] font-mono uppercase tracking-widest text-nexus-muted group-hover:text-nexus-400">{desc}</div>}
        </div>
    </button>
);