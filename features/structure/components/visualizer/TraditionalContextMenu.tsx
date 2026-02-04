
import React, { useEffect, useRef, useMemo, useState } from 'react';
import { 
    Plus, Trash2, Share2, X, ChevronRight,
    Repeat, ArrowUpRight, ArrowDownLeft, BookOpen, GitBranch, Compass
} from 'lucide-react';
import { NexusObject, isLink, isContainer, isReified, NexusGraphUtils } from '../../../../types';
import { GraphIntegrityService } from '../../../integrity/GraphIntegrityService';

interface TraditionalContextMenuProps {
    object: NexusObject;
    registry: Record<string, NexusObject>;
    x: number;
    y: number;
    onClose: () => void;
    onInspect: (id: string) => void;
    onDrilldown?: (id: string) => void;
    onAddChild?: (id: string) => void;
    onDelete?: (id: string) => void;
    onReify?: (id: string) => void;
    onReifyNode?: (id: string) => void;
    onReifyNodeToLink?: (nodeId: string, sourceId: string, targetId: string) => void;
    onInvert?: (id: string) => void;
    onSelectNode?: (id: string) => void;
}

type MenuState = 'DEFAULT' | 'REIFY_CHOOSE_SOURCE' | 'REIFY_CHOOSE_TARGET';

export const TraditionalContextMenu: React.FC<TraditionalContextMenuProps> = ({ 
    object, registry, x, y, onClose, onInspect, onDrilldown, onAddChild, onDelete, onReify, onReifyNode, onReifyNodeToLink, onInvert, onSelectNode 
}) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [menuState, setMenuState] = useState<MenuState>('DEFAULT');
    const [reifySelection, setReifySelection] = useState<{ sourceId?: string }>({});

    const reified = isReified(object);
    const isL = isLink(object) && !reified;
    const isC = isContainer(object);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        window.addEventListener('mousedown', handleClickOutside);
        return () => window.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const neighbors = useMemo(() => {
        if (isLink(object)) return [];
        return (Object.values(registry) as NexusObject[]).filter(l => {
            if (!isLink(l)) return false;
            return l.source_id === object.id || l.target_id === object.id;
        }).map(l => {
            const neighborId = (l as any).source_id === object.id ? (l as any).target_id : (l as any).source_id;
            return registry[neighborId];
        }).filter(Boolean);
    }, [object, registry]);

    const menuWidth = 240;
    const adjustedX = x + menuWidth > window.innerWidth ? x - menuWidth : x;
    const adjustedY = Math.min(y, window.innerHeight - 400); 

    const isEligibleForNodeReify = useMemo(() => {
        if (isLink(object) || isC) return false;
        const parentMap = GraphIntegrityService.buildHierarchyMap(registry);
        return (parentMap[object.id] || []).length > 0;
    }, [object, registry, isC]);

    const isEligibleForCausalPromotion = neighbors.length >= 2 && !isLink(object);

    const handleReifyChoice = (id: string) => {
        if (menuState === 'REIFY_CHOOSE_SOURCE') {
            setReifySelection({ sourceId: id });
            setMenuState('REIFY_CHOOSE_TARGET');
        } else if (menuState === 'REIFY_CHOOSE_TARGET') {
            onReifyNodeToLink?.(object.id, reifySelection.sourceId!, id);
            onClose();
        }
    };

    return (
        <div 
            ref={menuRef}
            className="fixed z-[500] w-[240px] bg-nexus-900/95 backdrop-blur-2xl border border-nexus-700 rounded-[24px] shadow-2xl py-2 animate-in fade-in zoom-in-95 duration-150 pointer-events-auto"
            style={{ left: adjustedX, top: adjustedY }}
        >
            <div className="px-4 py-3 border-b border-nexus-800/50 mb-1">
                <div className="text-[8px] font-display font-black text-nexus-muted uppercase tracking-widest truncate mb-0.5 opacity-60">
                    {menuState === 'REIFY_CHOOSE_SOURCE' ? 'Promotion: Source' : 
                     menuState === 'REIFY_CHOOSE_TARGET' ? 'Promotion: Target' :
                     reified ? 'Reified Logic Unit' : isL ? 'Logic Stream' : (isC ? 'Container Unit' : 'Atomic Unit')}
                </div>
                <div className="text-[12px] font-display font-black text-nexus-text truncate">
                    {(object as any).title || (object as any).verb || 'Untitled'}
                </div>
            </div>

            <div className="px-1.5 space-y-0.5">
                {menuState === 'DEFAULT' ? (
                    <>
                        <MenuItem 
                            icon={BookOpen} 
                            label="Inspect Records" 
                            onClick={() => { onInspect(object.id); onClose(); }} 
                            color="text-nexus-accent"
                        />

                        {onDrilldown && (!isLink(object) || reified) && (
                            <MenuItem 
                                icon={Compass} 
                                label="Drill Down" 
                                onClick={() => { onDrilldown(object.id); onClose(); }} 
                                color="text-nexus-accent"
                            />
                        )}

                        {(isC || reified) && (
                            <MenuItem 
                                icon={Plus} 
                                label="Sub-Unit" 
                                color="text-nexus-essence"
                                onClick={() => { if(onAddChild) onAddChild(object.id); onClose(); }} 
                            />
                        )}

                        {isEligibleForCausalPromotion && (
                            <MenuItem 
                                icon={Share2} 
                                label="Promote Causal" 
                                desc="Bind neighbors via unit"
                                onClick={() => setMenuState('REIFY_CHOOSE_SOURCE')} 
                                color="text-amber-400"
                            />
                        )}

                        {isEligibleForNodeReify && onReifyNode && (
                            <MenuItem 
                                icon={GitBranch} 
                                label="Promote Logic" 
                                desc="Turn into structural unit"
                                color="text-amber-500"
                                onClick={() => { onReifyNode(object.id); onClose(); }} 
                            />
                        )}

                        {isLink(object) && (
                            <>
                                {!reified && (
                                    <MenuItem 
                                        icon={Share2} 
                                        label="Reify Connection" 
                                        desc="Promote logic to unit"
                                        color="text-amber-500"
                                        onClick={() => { if(onReify) onReify(object.id); onClose(); }} 
                                    />
                                )}
                                {!reified && <MenuItem icon={Repeat} label="Invert Logic" onClick={() => { if(onInvert) onInvert(object.id); onClose(); }} />}
                                <div className="h-px bg-nexus-800/50 my-1 mx-3" />
                                <MenuItem icon={ArrowUpRight} label={`Origin`} onClick={() => { if(onSelectNode) onSelectNode(object.source_id); onClose(); }} />
                                <MenuItem icon={ArrowDownLeft} label={`Target`} onClick={() => { if(onSelectNode) onSelectNode(object.target_id); onClose(); }} />
                            </>
                        )}

                        <div className="h-px bg-nexus-800/50 my-1 mx-3" />
                        <MenuItem icon={Trash2} label="Terminate" color="text-red-500" onClick={() => { if(onDelete) onDelete(object.id); onClose(); }} />
                    </>
                ) : (
                    <div className="p-1 space-y-1">
                        {neighbors
                            .filter(n => n.id !== reifySelection.sourceId)
                            .map((node: any) => (
                            <button 
                                key={node.id}
                                onClick={() => handleReifyChoice(node.id)}
                                className="w-full flex items-center justify-between p-2 rounded-xl bg-nexus-950/40 hover:bg-amber-500/10 transition-all text-left group border border-transparent hover:border-amber-500/30"
                            >
                                <div className="flex items-center gap-2 truncate">
                                    <div className="w-6 h-6 rounded-lg bg-nexus-900 border border-nexus-800 flex items-center justify-center shrink-0">
                                        <div className="text-[8px] font-black text-nexus-muted group-hover:text-amber-500">{node.category_id?.charAt(0)}</div>
                                    </div>
                                    <div className="text-[11px] font-bold text-nexus-text group-hover:text-white truncate">{node.title}</div>
                                </div>
                                <ChevronRight size={10} className="text-nexus-muted group-hover:text-amber-500" />
                            </button>
                        ))}
                        <button onClick={() => setMenuState('DEFAULT')} className="w-full py-2 text-[9px] font-black text-nexus-muted uppercase hover:text-nexus-text">Cancel</button>
                    </div>
                )}
            </div>
        </div>
    );
};

const MenuItem = ({ icon: Icon, label, desc, onClick, color = "text-nexus-muted" }: any) => (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }} className={`w-full flex items-center gap-3 px-3 py-1.5 hover:bg-nexus-800/60 rounded-xl transition-all group text-left`}>
        <div className={`p-1.5 rounded-lg bg-nexus-950 border border-nexus-800 transition-colors group-hover:border-nexus-700 ${color}`}>
            <Icon size={14} />
        </div>
        <div className="flex-1 min-w-0">
            <div className="text-[11px] font-display font-bold group-hover:text-white truncate">{label}</div>
            {desc && <div className="text-[7px] font-mono uppercase tracking-widest text-nexus-muted group-hover:text-nexus-400 truncate">{desc}</div>}
        </div>
    </button>
);
