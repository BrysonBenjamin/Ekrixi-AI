
import React from 'react';
import { CheckCircle, Trash2, Box, Link2, ChevronRight, Share2 } from 'lucide-react';
import { NexusObject, isLink } from '../../../types';

interface ScannerReviewProps {
    items: NexusObject[];
    onUpdate: (items: NexusObject[]) => void;
    onCommit: (items: NexusObject[]) => void;
    onCancel: () => void;
}

export const ScannerReview: React.FC<ScannerReviewProps> = ({ items, onUpdate, onCommit, onCancel }) => {
    const nodes = items.filter(i => !isLink(i));
    const links = items.filter(i => isLink(i));

    const handleRemove = (id: string) => {
        onUpdate(items.filter(i => i.id !== id));
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-500 max-w-6xl mx-auto">
            <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-nexus-800/50 pb-8">
                <div>
                    <h2 className="text-3xl font-display font-black text-nexus-text tracking-tight flex items-center gap-4 uppercase">
                        <div className="p-2 bg-nexus-accent/10 rounded-xl">
                            <CheckCircle className="text-nexus-accent" size={28} />
                        </div>
                        Extraction <span className="text-nexus-accent">Verified</span>
                    </h2>
                    <p className="text-sm text-nexus-muted mt-2 font-medium">
                        Found <span className="text-nexus-text font-bold">{nodes.length}</span> atomic units and <span className="text-nexus-text font-bold">{links.length}</span> logic associations.
                    </p>
                </div>
                
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onCancel}
                        className="px-6 py-3 rounded-2xl border border-nexus-700 text-nexus-muted hover:text-nexus-text hover:bg-nexus-800 transition-all text-[10px] font-display font-black uppercase tracking-widest"
                    >
                        Abort
                    </button>
                    <button 
                        onClick={() => onCommit(items)}
                        className="px-8 py-3 rounded-2xl bg-nexus-accent hover:brightness-110 text-white shadow-xl shadow-nexus-accent/20 transition-all text-[10px] font-display font-black uppercase tracking-[0.2em] flex items-center gap-3 active:scale-95"
                    >
                        Commit to Refinery <ChevronRight size={14} />
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 flex-1 overflow-hidden min-h-0 pb-10">
                {/* Left: Units (Nodes) */}
                <div className="flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-5 px-2">
                        <span className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.3em] flex items-center gap-2.5">
                            <Box size={14} className="text-nexus-accent" /> Atomic Units ({nodes.length})
                        </span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-3">
                        {nodes.map(node => (
                            <ReviewCard 
                                key={node.id} 
                                title={(node as any).title} 
                                type={node._type} 
                                category={(node as any).category_id}
                                gist={(node as any).gist}
                                onRemove={() => handleRemove(node.id)}
                            />
                        ))}
                        {nodes.length === 0 && <EmptyReview text="No units extracted." />}
                    </div>
                </div>

                {/* Right: Associations (Links) */}
                <div className="flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-5 px-2">
                        <span className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.3em] flex items-center gap-2.5">
                            <Link2 size={14} className="text-nexus-arcane" /> Logic Streams ({links.length})
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-3">
                        {links.map(link => (
                            <ReviewCard 
                                key={link.id} 
                                title={(link as any).verb} 
                                type={link._type} 
                                category="ASSOCIATION"
                                isLink
                                onRemove={() => handleRemove(link.id)}
                            />
                        ))}
                        {links.length === 0 && <EmptyReview text="No links detected." />}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ReviewCard = ({ title, type, category, gist, isLink, onRemove }: any) => (
    <div className="group bg-nexus-900/40 border border-nexus-800 hover:border-nexus-accent/40 rounded-[28px] p-5 flex items-start gap-5 transition-all hover:bg-nexus-900 shadow-sm hover:shadow-md">
        <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-sm ${isLink ? 'bg-nexus-arcane/5 border-nexus-arcane/20 text-nexus-arcane' : 'bg-nexus-accent/5 border-nexus-accent/20 text-nexus-accent'}`}>
            {isLink ? <Share2 size={20} /> : <Box size={20} />}
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-3 mb-1.5">
                <h3 className="text-sm font-display font-black text-nexus-text uppercase tracking-tight truncate">{title || 'Untitled'}</h3>
                <span className="text-[8px] font-mono font-black bg-nexus-800 border border-nexus-700 px-2 py-0.5 rounded-full text-nexus-muted uppercase tracking-widest">{category}</span>
            </div>
            {gist && <p className="text-[11px] text-nexus-muted leading-relaxed font-serif italic line-clamp-2">"{gist}"</p>}
        </div>
        <button 
            onClick={onRemove}
            className="p-2.5 text-nexus-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 active:scale-90 shrink-0"
            title="Discard Unit"
        >
            <Trash2 size={16} />
        </button>
    </div>
);

const EmptyReview = ({ text }: { text: string }) => (
    <div className="h-32 flex items-center justify-center border-2 border-dashed border-nexus-800 rounded-[32px] text-nexus-muted font-display font-black text-[10px] uppercase tracking-[0.3em] opacity-30">
        {text}
    </div>
);
