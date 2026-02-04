
import React from 'react';
import { 
    Search, Plus, Trash2, Share2, X, 
    ArrowRight, Box, Zap, ArrowRightLeft, 
    ArrowUpRight, ArrowDownLeft, Repeat
} from 'lucide-react';
import { NexusObject, isLink, isContainer, isReified } from '../../../../types';

interface QuickActionMenuProps {
    object: NexusObject;
    registry: Record<string, NexusObject>;
    onClose: () => void;
    onInspect: (id: string) => void;
    onAddChild?: (id: string) => void;
    onDelete?: (id: string) => void;
    onReify?: (id: string) => void;
    onInvert?: (id: string) => void;
    onSelectNode?: (id: string) => void;
}

export const QuickActionMenu: React.FC<QuickActionMenuProps> = ({ 
    object, registry, onClose, onInspect, onAddChild, onDelete, onReify, onInvert, onSelectNode 
}) => {
    const isL = isLink(object);
    const isC = isContainer(object);
    const reified = isReified(object);
    
    const title = (object as any).title || (object as any).verb || 'Untitled';
    const type = object._type.replace(/_/g, ' ');

    // Resolve connection titles for links
    let sourceTitle = 'Unknown';
    let targetTitle = 'Unknown';
    if (isL) {
        const s = registry[object.source_id];
        const t = registry[object.target_id];
        sourceTitle = s ? (s as any).title || 'Untitled' : 'Unknown';
        targetTitle = t ? (t as any).title || 'Untitled' : 'Unknown';
    }

    const getHeaderIcon = () => {
        if (reified) return <Share2 size={24} className="text-orange-500" />;
        if (isL) return <Zap size={24} className="text-nexus-accent" />;
        if (isC) return <Box size={24} className="text-nexus-500" />;
        return <Box size={24} className="text-slate-400" />;
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                className="absolute inset-0 cursor-pointer" 
                onClick={onClose} 
            />
            
            <div className="relative w-full max-w-[320px] bg-nexus-900 border border-nexus-800 rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-5 pt-6 pb-4 text-center border-b border-nexus-800/50">
                    <div className="flex justify-center mb-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg border ${reified ? 'bg-orange-500/10 border-orange-500/20 shadow-orange-500/10' : 'bg-nexus-500/10 border-nexus-500/20 shadow-nexus-500/10'}`}>
                            {getHeaderIcon()}
                        </div>
                    </div>
                    
                    {isL && !reified ? (
                        <div className="flex flex-col items-center">
                            <div className="flex items-center gap-2 text-slate-400 mb-1">
                                <span className="text-[8px] font-bold uppercase tracking-widest truncate max-w-[80px]">{sourceTitle}</span>
                                <ArrowRightLeft size={8} className="text-nexus-500 opacity-50" />
                                <span className="text-[8px] font-bold uppercase tracking-widest truncate max-w-[80px]">{targetTitle}</span>
                            </div>
                            <h3 className="text-lg font-bold text-white tracking-tight px-4 capitalize italic">
                                "{(object as any).verb}"
                            </h3>
                        </div>
                    ) : (
                        <>
                            <h3 className="text-lg font-bold text-white tracking-tight mb-0.5 truncate px-4">{title}</h3>
                            <div className={`text-[9px] font-mono uppercase tracking-[0.2em] ${reified ? 'text-orange-500' : 'text-slate-500'}`}>{reified ? 'Reified Unit' : type}</div>
                        </>
                    )}
                </div>

                {/* Actions */}
                <div className="p-3 grid grid-cols-1 gap-1.5 max-h-[50vh] overflow-y-auto no-scrollbar">
                    <ActionButton 
                        icon={Search} 
                        label="Inspect Unit" 
                        desc="View manifest"
                        onClick={() => { onInspect(object.id); onClose(); }} 
                    />
                    
                    {isL && (
                        <ActionButton 
                            icon={Repeat} 
                            label="Invert" 
                            desc="Swap direction"
                            onClick={() => { if(onInvert) onInvert(object.id); onClose(); }} 
                        />
                    )}

                    {isC && onAddChild && (
                        <ActionButton 
                            icon={Plus} 
                            label="Append" 
                            desc="New nested node"
                            onClick={() => { onAddChild(object.id); onClose(); }} 
                        />
                    )}

                    {isL && !reified && onReify && (
                        <ActionButton 
                            icon={Share2} 
                            label="Reify" 
                            desc="Promote logic"
                            color="text-orange-500"
                            onClick={() => { onReify(object.id); onClose(); }} 
                        />
                    )}

                    {isL && onSelectNode && (
                        <>
                            <div className="h-px bg-nexus-800/50 my-1 mx-4" />
                            <ActionButton 
                                icon={ArrowUpRight} 
                                label={`Go to ${sourceTitle}`} 
                                desc="Jump to origin"
                                onClick={() => { onSelectNode(object.source_id); onClose(); }} 
                            />
                            <ActionButton 
                                icon={ArrowDownLeft} 
                                label={`Go to ${targetTitle}`} 
                                desc="Jump to terminal"
                                onClick={() => { onSelectNode(object.target_id); onClose(); }} 
                            />
                        </>
                    )}

                    <div className="h-px bg-nexus-800/50 my-1 mx-4" />

                    <ActionButton 
                        icon={Trash2} 
                        label="Terminate" 
                        desc="Permanent purge"
                        color="text-red-400"
                        onClick={() => { if(onDelete) onDelete(object.id); onClose(); }} 
                    />
                </div>

                {/* Footer Close */}
                <button 
                    onClick={onClose}
                    className="w-full py-4 bg-nexus-800/30 hover:bg-nexus-800 text-slate-500 font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border-t border-nexus-800/50 transition-colors"
                >
                    <X size={12} /> Close
                </button>
            </div>
        </div>
    );
};

const ActionButton = ({ icon: Icon, label, desc, onClick, color = "text-nexus-500" }: any) => (
    <button 
        onClick={onClick}
        className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-black/20 hover:bg-white/[0.03] border border-transparent hover:border-nexus-800 transition-all group active:scale-[0.98]"
    >
        <div className={`p-2 rounded-lg bg-nexus-900 border border-nexus-800 group-hover:border-slate-700 transition-colors ${color}`}>
            <Icon size={16} />
        </div>
        <div className="text-left flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors truncate">{label}</div>
            <div className="text-[8px] text-slate-600 font-medium uppercase tracking-wider truncate">{desc}</div>
        </div>
        <ArrowRight size={12} className="text-slate-800 group-hover:text-slate-400 transition-all shrink-0" />
    </button>
);
