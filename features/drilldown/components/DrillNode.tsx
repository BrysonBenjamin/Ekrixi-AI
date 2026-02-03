
import React, { useMemo } from 'react';
import { NexusObject, isContainer, isReified } from '../../../types';
import { getCategoryColor, getCategoryIconSvg } from '../../refinery/components/visualizer/NodeTemplates';
import { Layers, Target, Hash, UserCircle2 } from 'lucide-react';
import { VisibleNode } from '../DrilldownFeature';

interface DrillNodeProps {
    object: VisibleNode;
    zoomScale: number;
    fullRegistry: Record<string, NexusObject>;
    isFocus?: boolean;
    isHovered?: boolean;
}

export const DrillNode: React.FC<DrillNodeProps> = ({ object, zoomScale, fullRegistry, isFocus, isHovered }) => {
    const isLODDetailed = zoomScale > 0.45 || isFocus || isHovered;
    const isLODMicro = zoomScale < 0.15 && !isHovered && !isFocus;
    
    const nexusObj = object as NexusObject;
    const depth = object.depth;
    const reified = isReified(nexusObj);
    const category = (object as any).category_id || 'CONCEPT';
    const isParentPath = object.pathType === 'ancestor';
    const isAuthorNote = (object as any).is_author_note;

    // Saturated logic colors for visibility against paper-white
    let categoryColor = getCategoryColor(category);
    if (isAuthorNote) categoryColor = '#f59e0b'; // Amber-500
    
    const logicColor = isParentPath 
        ? 'var(--arcane-color)' 
        : (object.pathType === 'descendant' ? 'var(--essence-color)' : 'var(--accent-color)');

    const color = (isFocus || isParentPath || object.pathType === 'descendant') ? logicColor : categoryColor;
    
    const iconSvg = isAuthorNote 
        ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
        : getCategoryIconSvg(category, color, reified);
    const isC = isContainer(nexusObj);

    const title = useMemo(() => {
        if ((object as any).title) return (object as any).title;
        if ((object as any).verb) return (object as any).verb;
        return nexusObj.id.slice(0, 8);
    }, [object, nexusObj.id]);

    const depthOpacity = isFocus ? 1 : (isParentPath ? 0.9 : Math.max(0.4, 1 - (depth * 0.2)));

    if (isLODMicro) {
        return (
            <foreignObject width="120" height="120" x="-60" y="-60" className="overflow-visible pointer-events-none">
                <div 
                    className={`w-20 h-20 rounded-full border-[5px] flex items-center justify-center transition-all duration-700 shadow-2xl ${isAuthorNote ? 'bg-amber-950/40' : 'bg-nexus-900'}`}
                    style={{ borderColor: color, opacity: depthOpacity }}
                >
                    <div dangerouslySetInnerHTML={{ __html: iconSvg }} className="scale-[2.2]" />
                </div>
            </foreignObject>
        );
    }

    return (
        <foreignObject 
            width={isLODDetailed ? "420" : "320"} 
            height={isLODDetailed ? "320" : "120"} 
            x={isLODDetailed ? "-210" : "-160"} 
            y={isLODDetailed ? "-160" : "-60"} 
            className="overflow-visible"
        >
            <div 
                className={`
                    w-full h-full flex flex-col rounded-[56px] border-[2px] transition-all duration-700 pointer-events-auto cursor-pointer group relative
                    ${isFocus ? 'ring-[16px] ring-nexus-accent/15 z-50 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.15)]' : 'shadow-xl'}
                    ${isC ? 'border-dashed' : 'border-solid'}
                    ${reified ? 'bg-nexus-accent/[0.03] backdrop-blur-md' : (isAuthorNote ? 'bg-amber-950/20 backdrop-blur-xl border-amber-500/50' : 'bg-nexus-900 backdrop-blur-xl')}
                `}
                style={{ 
                    borderColor: isFocus ? 'var(--accent-color)' : (isHovered ? color : `${color}40`),
                    opacity: isHovered || isFocus ? 1 : depthOpacity,
                    transform: isFocus ? 'scale(1.1)' : isHovered ? 'scale(1.04)' : 'scale(1)',
                    boxShadow: isFocus ? `0 60px 100px -20px ${color}25` : (isAuthorNote ? `0 40px 100px -20px #f59e0b25` : 'var(--shadow-color)')
                }}
            >
                <div className="flex items-center gap-8 p-10 flex-1 min-h-0 relative z-10">
                    <div 
                        className={`w-20 h-20 rounded-[28px] flex items-center justify-center shrink-0 border-[3px] transition-all duration-500 group-hover:-rotate-6 ${isFocus || isHovered ? 'bg-nexus-accent/5 border-nexus-accent/30 shadow-lg' : 'bg-nexus-950 border-nexus-800'}`}
                        style={{ borderColor: isFocus ? 'var(--accent-color)' : `${color}60` }}
                    >
                        <div dangerouslySetInnerHTML={{ __html: iconSvg }} className="scale-[2.8]" />
                    </div>
                    
                    <div className="flex-1 min-w-0 text-left">
                        <div className={`text-[26px] font-display font-black uppercase tracking-tight truncate transition-colors ${isFocus ? 'text-nexus-accent' : (isAuthorNote ? 'text-amber-500' : 'text-nexus-text')}`}>
                            {title}
                        </div>
                        <div className="flex items-center gap-4 mt-2.5">
                            <span className={`px-3 py-1 rounded-xl border text-[10px] font-display font-black uppercase tracking-widest ${isAuthorNote ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-nexus-800/40 border-nexus-700/50 text-nexus-muted'}`}>
                                {isAuthorNote ? "Author's Note" : category}
                            </span>
                            {isFocus && (
                                <span className="flex items-center gap-2 text-[10px] font-display font-black text-nexus-accent animate-pulse-slow uppercase tracking-[0.3em]">
                                    <Target size={12} /> Focal Point
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {isLODDetailed && (
                    <div className="px-12 pb-14 border-t border-nexus-800/30 pt-10 animate-in fade-in slide-in-from-top-4 duration-700 relative z-10">
                        <p className={`text-[15px] leading-[1.7] font-serif italic mb-10 line-clamp-3 font-medium text-left ${isAuthorNote ? 'text-amber-200/80' : 'text-nexus-text/80'}`}>
                            "{(object as any).gist || 'Fragment resolved from global neural memory.'}"
                        </p>
                        
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-5">
                                <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-nexus-800/40 border border-nexus-700 text-[11px] font-display font-black text-nexus-muted uppercase tracking-widest">
                                    <Layers size={16} className="opacity-40" /> {isC ? (object as any).children_ids.length : 0} Descendants
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] font-mono text-nexus-muted font-bold">
                                <Hash size={14} className="opacity-30" /> {nexusObj.id.slice(0, 8)}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </foreignObject>
    );
};
