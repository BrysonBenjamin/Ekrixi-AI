
import React, { useMemo } from 'react';
import { NexusObject, isContainer, isReified, isLink } from '../../../types';
import { getCategoryColor, getCategoryIconSvg } from '../../refinery/components/visualizer/NodeTemplates';
import { Layers, Target, Hash, ShieldAlert, ArrowRight, Activity } from 'lucide-react';
import { VisibleNode } from '../DrilldownFeature';
import { IntegrityBadge } from '../../integrity/components/IntegrityBadge';
import { GraphIntegrityService, IntegrityReport } from '../../integrity/GraphIntegrityService';

interface DrillNodeProps {
    object: VisibleNode;
    zoomScale: number;
    fullRegistry: Record<string, NexusObject>;
    isFocus?: boolean;
    isHovered?: boolean;
    integrityReport?: IntegrityReport;
}

export const DrillNode: React.FC<DrillNodeProps> = ({ object, zoomScale, fullRegistry, isFocus, isHovered, integrityReport }) => {
    const isLODDetailed = zoomScale > 0.45 || isFocus || isHovered;
    const isLODMicro = zoomScale < 0.15 && !isHovered && !isFocus;
    
    const nexusObj = object as NexusObject;
    const depth = object.depth;
    const reified = isReified(nexusObj);
    const category = (object as any).category_id || 'CONCEPT';
    const isParentPath = object.pathType === 'ancestor';
    const isAuthorNote = (object as any).is_author_note;

    const isReifiedTarget = useMemo(() => {
        return (Object.values(fullRegistry) as NexusObject[]).some(obj => 
            isReified(obj) && (obj as any).target_id === nexusObj.id
        );
    }, [fullRegistry, nexusObj.id]);

    let categoryColor = getCategoryColor(category);
    if (isAuthorNote) categoryColor = '#f59e0b'; 
    if (reified) categoryColor = 'var(--accent-color)';
    
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

    const reifiedContext = useMemo(() => {
        if (!reified) return null;
        const source = fullRegistry[(nexusObj as any).source_id];
        const target = fullRegistry[(nexusObj as any).target_id];
        return {
            sourceName: (source as any)?.title || 'Origin',
            targetName: (target as any)?.title || 'Terminal',
            verb: (nexusObj as any).verb
        };
    }, [reified, nexusObj, fullRegistry]);

    if (isLODMicro) {
        return (
            <foreignObject width="120" height="120" x="-60" y="-60" className="overflow-visible pointer-events-none">
                <div 
                    className={`w-20 h-20 rounded-full border-[5px] flex items-center justify-center transition-all duration-700 shadow-[0_10px_30px_rgba(0,0,0,0.8)] ${isAuthorNote ? 'bg-nexus-900 border-amber-500' : (reified ? 'bg-nexus-900 border-nexus-accent shadow-[0_0_20px_var(--accent-color)]' : 'bg-nexus-900')}`}
                    style={{ borderColor: color, opacity: 1 }}
                >
                    <div dangerouslySetInnerHTML={{ __html: iconSvg }} className="scale-[2.2]" />
                    {integrityReport && integrityReport.status !== 'APPROVED' && (
                        <div className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 flex items-center justify-center border-2 border-nexus-900 text-[10px] text-white">!</div>
                    )}
                </div>
            </foreignObject>
        );
    }

    return (
        <foreignObject 
            width={isLODDetailed ? "420" : "320"} 
            height={isLODDetailed ? (reified ? "380" : "320") : "120"} 
            x={isLODDetailed ? "-210" : "-160"} 
            y={isLODDetailed ? (reified ? "-190" : "-160") : "-60"} 
            className="overflow-visible"
        >
            <div 
                className={`
                    w-full h-full flex flex-col rounded-[56px] border-[3px] transition-all duration-700 pointer-events-auto cursor-pointer group relative
                    ${isFocus ? 'ring-[20px] ring-nexus-accent/15 z-50 shadow-[0_50px_150px_-30px_rgba(0,0,0,0.4)]' : 'shadow-[0_20px_60px_rgba(0,0,0,0.4)]'}
                    ${isC || reified ? 'border-dashed' : 'border-solid'}
                    ${reified ? 'bg-nexus-900 ring-4 ring-nexus-accent/10' : (isAuthorNote ? 'bg-nexus-900 border-amber-500' : 'bg-nexus-900')}
                `}
                style={{ 
                    borderColor: isFocus ? 'var(--accent-color)' : (isHovered ? color : `${color}80`),
                    opacity: 1,
                    transform: isFocus ? 'scale(1.1)' : isHovered ? 'scale(1.04)' : (isReifiedTarget ? 'scale(1.05)' : 'scale(1)'),
                }}
            >
                <div className="flex items-center gap-8 p-10 flex-1 min-h-0 relative z-10">
                    <div 
                        className={`w-20 h-20 rounded-[28px] flex items-center justify-center shrink-0 border-[3px] transition-all duration-500 group-hover:-rotate-6 ${isFocus || isHovered ? 'bg-nexus-950 border-nexus-accent shadow-lg' : 'bg-nexus-950 border-nexus-800'}`}
                        style={{ borderColor: isFocus ? 'var(--accent-color)' : `${color}cc` }}
                    >
                        <div dangerouslySetInnerHTML={{ __html: iconSvg }} className="scale-[2.8]" />
                    </div>
                    
                    <div className="flex-1 min-w-0 text-left">
                        <div className={`text-[26px] font-display font-black uppercase tracking-tight truncate transition-colors ${isFocus ? 'text-nexus-accent' : (isAuthorNote ? 'text-amber-500' : (reified ? 'text-nexus-accent' : 'text-nexus-text'))}`}>
                            {title}
                        </div>
                        <div className="flex items-center gap-4 mt-2.5">
                            <span className={`px-3 py-1 rounded-xl border text-[10px] font-display font-black uppercase tracking-widest ${isAuthorNote ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : reified ? 'bg-nexus-accent/10 border-nexus-accent/30 text-nexus-accent' : 'bg-nexus-800 border-nexus-700 text-nexus-muted'}`}>
                                {isAuthorNote ? "Author's Note" : reified ? "Reified Logic Unit" : category}
                            </span>
                            {integrityReport && integrityReport.status !== 'APPROVED' && (
                                <IntegrityBadge status={integrityReport.status} variant="minimal" />
                            )}
                        </div>
                    </div>
                </div>

                {isLODDetailed && (
                    <div className="px-12 pb-14 border-t border-nexus-800 pt-10 animate-in fade-in slide-in-from-top-4 duration-700 relative z-10 flex flex-col gap-8">
                        {integrityReport && integrityReport.status !== 'APPROVED' && (
                            <div className="mb-0">
                                <IntegrityBadge status={integrityReport.status} reason={integrityReport.reason} isCycle={integrityReport.isCycle} />
                            </div>
                        )}
                        
                        <p className={`text-[15px] leading-[1.7] font-serif italic line-clamp-3 font-medium text-left ${isAuthorNote ? 'text-amber-200/90' : 'text-nexus-text/90'}`}>
                            "{(object as any).gist || 'Fragment resolved from global neural memory.'}"
                        </p>

                        {reifiedContext && (
                            <div className="p-6 bg-nexus-950 border border-nexus-800 rounded-[32px] flex items-center justify-between gap-4 shadow-inner">
                                <div className="flex-1 min-w-0 text-center">
                                    <div className="text-[8px] font-display font-black text-nexus-muted uppercase tracking-widest mb-1 opacity-50">Origin</div>
                                    <div className="text-[10px] font-bold text-nexus-text truncate">{reifiedContext.sourceName}</div>
                                </div>
                                <div className="flex flex-col items-center gap-1 shrink-0 px-2">
                                    <Activity size={12} className="text-nexus-accent animate-pulse" />
                                    <div className="text-[9px] font-display font-black text-nexus-accent uppercase tracking-widest italic">{reifiedContext.verb}</div>
                                    <ArrowRight size={10} className="text-nexus-accent opacity-50" />
                                </div>
                                <div className="flex-1 min-w-0 text-center">
                                    <div className="text-[8px] font-display font-black text-nexus-muted uppercase tracking-widest mb-1 opacity-50">Terminal</div>
                                    <div className="text-[10px] font-bold text-nexus-text truncate">{reifiedContext.targetName}</div>
                                </div>
                            </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-5">
                                <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-nexus-800 border border-nexus-700 text-[11px] font-display font-black text-nexus-muted uppercase tracking-widest">
                                    <Layers size={16} className="opacity-40" /> {isC || reified ? (object as any).children_ids?.length || 0 : 0} Connections
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] font-mono text-nexus-muted font-bold">
                                <Hash size={14} className="opacity-30" /> {nexusObj.id.slice(0, 8)}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};
