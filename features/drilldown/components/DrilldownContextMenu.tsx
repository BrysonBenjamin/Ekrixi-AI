import React, { useEffect, useRef, useState, useMemo } from 'react';
/* Added ChevronRight to the lucide-react import list */
import { BookOpen, Link2, Trash2, X, Share2, Search, Sparkles, Plus, Database, Pencil, Compass, GitBranch, ArrowRight, MousePointer2, ChevronRight } from 'lucide-react';
import { NexusObject, isLink, isReified, isContainer } from '../../../types';
import { GraphIntegrityService } from '../../integrity/GraphIntegrityService';

interface DrilldownContextMenuProps {
    object: NexusObject;
    registry: Record<string, NexusObject>;
    x: number;
    y: number;
    onClose: () => void;
    onInspect: (id: string) => void;
    onDrilldown: (id: string) => void;
    onDelete?: (id: string) => void;
    onReify?: (id: string) => void;
    onReifyNode?: (id: string) => void;
    onReifyNodeToLink?: (nodeId: string, sourceId: string, targetId: string) => void;
    onStartLink: (id: string) => void;
    onEstablishLink?: (sourceId: string, targetId: string, verb: string) => void;
}

type MenuState = 'DEFAULT' | 'LINK_SEARCH' | 'REIFY_CHOOSE_SOURCE' | 'REIFY_CHOOSE_TARGET';

export const DrilldownContextMenu: React.FC<DrilldownContextMenuProps> = ({
    object, registry, x, y, onClose, onInspect, onDrilldown, onDelete, onReify, onReifyNode, onReifyNodeToLink, onStartLink, onEstablishLink
}) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [menuState, setMenuState] = useState<MenuState>('DEFAULT');
    const [searchQuery, setSearchQuery] = useState('');
    const [reifySelection, setReifySelection] = useState<{ sourceId?: string, targetId?: string }>({});

    const reified = isReified(object);
    const isL = isLink(object) && !reified;
    const title = (object as any).title || (object as any).verb || 'Untitled Unit';

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        window.addEventListener('mousedown', handleClickOutside);
        return () => window.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    // Neighbors for complex reification
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

    const suggestions = useMemo(() => {
        if (menuState !== 'LINK_SEARCH' || !searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase();
        return (Object.values(registry) as NexusObject[])
            .filter(n => (!isLink(n) || isReified(n)) && n.id !== object.id && ((n as any).title || (n as any).verb).toLowerCase().includes(q))
            .slice(0, 5);
    }, [searchQuery, registry, object.id, menuState]);

    const handleEstablishLinkWithTarget = (targetId: string) => {
        if (onEstablishLink) onEstablishLink(object.id, targetId, "mentions");
        onClose();
    };

    const isEligibleForNodeReify = useMemo(() => {
        if (isLink(object) || reified || isContainer(object)) return false;
        const parentMap = GraphIntegrityService.buildHierarchyMap(registry);
        return (parentMap[object.id] || []).length > 0;
    }, [object, registry, reified]);

    const isEligibleForCausalPromotion = neighbors.length >= 2 && !isLink(object);

    const handleReifyChoice = (id: string) => {
        if (menuState === 'REIFY_CHOOSE_SOURCE') {
            setReifySelection({ sourceId: id });
            setMenuState('REIFY_CHOOSE_TARGET');
        } else if (menuState === 'REIFY_CHOOSE_TARGET') {
            if (onReifyNodeToLink && reifySelection.sourceId) {
                onReifyNodeToLink(object.id, reifySelection.sourceId, id);
            }
            onClose();
        }
    };

    return (
        <div 
            ref={menuRef}
            className="fixed z-[500] w-[260px] bg-nexus-900/95 backdrop-blur-2xl border border-nexus-700 rounded-[32px] shadow-2xl py-3 animate-in fade-in zoom-in-95 duration-150 pointer-events-auto"
            style={{ left: Math.min(x, window.innerWidth - 280), top: Math.min(y, window.innerHeight - 450) }}
        >
            <div className="px-6 py-4 border-b border-nexus-800/50 mb-2">
                <div className="text-[9px] font-display font-black text-nexus-muted uppercase tracking-[0.3em] mb-1 opacity-60">
                    {menuState === 'REIFY_CHOOSE_SOURCE' ? 'PROMOTION: SELECT ORIGIN' : 
                     menuState === 'REIFY_CHOOSE_TARGET' ? 'PROMOTION: SELECT TERMINAL' :
                     reified ? 'Reified Unit' : isL ? 'Logic Stream' : 'Unit Signature'}
                </div>
                <div className="text-[14px] font-display font-black text-nexus-text truncate">
                    {title}
                </div>
            </div>

            <div className="px-2 space-y-1">
                {menuState === 'DEFAULT' && (
                    <>
                        {(!isLink(object) || reified) && (
                            <MenuItem 
                                icon={Compass} 
                                label="Drill Down" 
                                desc="Refocus graph skeleton"
                                onClick={() => { onDrilldown(object.id); onClose(); }} 
                                color="text-nexus-accent"
                            />
                        )}
                        <MenuItem 
                            icon={Search} 
                            label="Inspect Manifest" 
                            desc="Full record access"
                            onClick={() => { onInspect(object.id); onClose(); }} 
                            color="text-nexus-accent opacity-70"
                        />

                        {isL ? (
                            <MenuItem 
                                icon={Share2} 
                                label="Reify Logic" 
                                desc="Promote connection to unit"
                                onClick={() => { onReify?.(object.id); onClose(); }} 
                                color="text-amber-500"
                            />
                        ) : (
                            <>
                                {isEligibleForCausalPromotion && (
                                    <MenuItem 
                                        icon={Share2} 
                                        label="Promote to Causal" 
                                        desc="Convert unit to active link"
                                        onClick={() => setMenuState('REIFY_CHOOSE_SOURCE')} 
                                        color="text-amber-400"
                                    />
                                )}
                                {isEligibleForNodeReify && onReifyNode && (
                                    <MenuItem 
                                        icon={GitBranch} 
                                        label="Promote Structural" 
                                        desc="Convert to container unit"
                                        onClick={() => { onReifyNode?.(object.id); onClose(); }} 
                                        color="text-amber-500 opacity-70"
                                    />
                                )}
                                <MenuItem 
                                    icon={Link2} 
                                    label="Connect" 
                                    desc="Manual scry link"
                                    onClick={() => onStartLink(object.id)} 
                                    color="text-nexus-essence"
                                />
                                <MenuItem 
                                    icon={Plus} 
                                    label="Search Registry" 
                                    desc="Find target by name"
                                    onClick={() => setMenuState('LINK_SEARCH')} 
                                    color="text-nexus-essence opacity-70"
                                />
                            </>
                        )}

                        <div className="h-px bg-nexus-800/50 my-2 mx-4" />
                        
                        <MenuItem 
                            icon={Trash2} 
                            label="Terminate" 
                            desc="Purge from Nexus" 
                            color="text-red-500" 
                            onClick={() => { if(onDelete) onDelete(object.id); onClose(); }} 
                        />
                    </>
                )}

                {menuState === 'LINK_SEARCH' && (
                    <div className="p-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center justify-between mb-3 px-1">
                             <span className="text-[9px] font-display font-black text-nexus-accent uppercase tracking-widest flex items-center gap-2"><Sparkles size={10} /> Neural Registry</span>
                             <button onClick={() => setMenuState('DEFAULT')} className="text-nexus-muted hover:text-white"><X size={12} /></button>
                        </div>
                        <div className="relative mb-2">
                            <Database size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-nexus-muted" />
                            <input 
                                autoFocus
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Designation..."
                                className="w-full bg-nexus-950 border border-nexus-800 rounded-xl py-2 pl-7 pr-3 text-[10px] text-white outline-none focus:border-nexus-accent transition-all shadow-inner"
                            />
                        </div>
                        <div className="space-y-1 overflow-y-auto max-h-[160px] no-scrollbar">
                            {suggestions.map((node: any) => (
                                <button 
                                    key={node.id}
                                    onClick={() => handleEstablishLinkWithTarget(node.id)}
                                    className="w-full flex items-center gap-2.5 p-2 rounded-xl bg-nexus-900 border border-transparent hover:border-nexus-accent/40 transition-all text-left group"
                                >
                                    <div className="w-6 h-6 rounded-lg bg-nexus-950 border border-nexus-800 flex items-center justify-center text-[9px] font-black text-nexus-accent group-hover:bg-nexus-accent group-hover:text-white transition-all">
                                        {node.category_id?.charAt(0) || 'U'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[10px] font-bold truncate text-nexus-text">{node.title || node.verb}</div>
                                        <div className="text-[7px] opacity-40 uppercase font-mono">{node.category_id || 'REIFIED'}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {(menuState === 'REIFY_CHOOSE_SOURCE' || menuState === 'REIFY_CHOOSE_TARGET') && (
                    <div className="p-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center justify-between mb-4 px-2">
                             <span className="text-[9px] font-display font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                                <Share2 size={12} /> {menuState === 'REIFY_CHOOSE_SOURCE' ? 'Choose Origin' : 'Choose Terminal'}
                             </span>
                             <button onClick={() => setMenuState('DEFAULT')} className="text-nexus-muted hover:text-white transition-colors"><X size={14} /></button>
                        </div>
                        <div className="space-y-1.5 overflow-y-auto max-h-[200px] no-scrollbar">
                            {neighbors
                                .filter(n => n.id !== reifySelection.sourceId)
                                .map((node: any) => (
                                <button 
                                    key={node.id}
                                    onClick={() => handleReifyChoice(node.id)}
                                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-nexus-950/40 border border-nexus-800 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all text-left group"
                                >
                                    <div className="w-8 h-8 rounded-xl bg-nexus-900 border border-nexus-800 flex items-center justify-center shrink-0 group-hover:border-amber-500/30">
                                        <div className="text-[10px] font-black text-nexus-muted group-hover:text-amber-500">{node.category_id?.charAt(0)}</div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[11px] font-bold text-nexus-text group-hover:text-white truncate">{node.title}</div>
                                        <div className="text-[7px] opacity-40 uppercase tracking-widest">{node.category_id}</div>
                                    </div>
                                    <ChevronRight size={12} className="text-nexus-muted group-hover:text-amber-500 opacity-0 group-hover:opacity-100 transition-all" />
                                </button>
                            ))}
                        </div>
                        <button 
                            onClick={() => setMenuState('DEFAULT')}
                            className="w-full mt-4 py-2.5 text-[9px] font-display font-black text-nexus-muted uppercase tracking-widest hover:text-nexus-text transition-colors"
                        >
                            Abort Promotion
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const MenuItem = ({ icon: Icon, label, desc, onClick, color = "text-nexus-muted" }: any) => (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }} className="w-full flex items-center gap-3.5 px-4 py-2.5 hover:bg-white/[0.04] rounded-2xl transition-all group text-left">
        <div className={`p-2 rounded-xl bg-nexus-950 border border-nexus-800 transition-colors group-hover:border-nexus-700 shadow-sm ${color}`}>
            <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
            <div className="text-[12px] font-display font-black text-nexus-text group-hover:text-white transition-colors truncate">{label}</div>
            {desc && <div className="text-[8px] font-mono font-bold uppercase tracking-widest text-nexus-muted group-hover:text-nexus-400 truncate mt-0.5">{desc}</div>}
        </div>
    </button>
);