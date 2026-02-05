import React, { useMemo } from 'react';
import { BookOpen, History, Library, Plus, PlusCircle, Activity } from 'lucide-react';
import { NexusObject, NexusType, StoryType } from '../../../types';
import { StudioBlock } from '../StoryStudioFeature';

interface ManuscriptGalleryProps {
    registry: Record<string, NexusObject>;
    onLoadBook: (id: string) => void;
    onCreateNewBook: (blocks?: StudioBlock[]) => void;
}

export const ManuscriptGallery: React.FC<ManuscriptGalleryProps> = ({ registry, onLoadBook, onCreateNewBook }) => {
    const existingBooks = useMemo(() => {
        return (Object.values(registry) as NexusObject[])
            .filter(n => n._type === NexusType.STORY_NOTE && (n as any).story_type === StoryType.BOOK);
    }, [registry]);

    return (
        <aside className="border-r border-nexus-800 bg-nexus-900/40 flex flex-col shrink-0 w-80 animate-in slide-in-from-left duration-500 ease-out">
            <header className="p-8 border-b border-nexus-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <Library size={18} className="text-nexus-ruby" />
                    <h3 className="text-[10px] font-display font-black text-nexus-text uppercase tracking-[0.3em]">Manuscripts</h3>
                </div>
                <button 
                    onClick={() => onCreateNewBook()}
                    className="p-1.5 bg-nexus-ruby/10 border border-nexus-ruby/30 text-nexus-ruby rounded-lg hover:bg-nexus-ruby hover:text-white transition-all shadow-sm"
                    title="Start New Manuscript Session"
                >
                    <Plus size={16} />
                </button>
            </header>
            <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-3">
                <button 
                    onClick={() => onCreateNewBook()}
                    className="w-full text-left p-4 rounded-2xl bg-nexus-ruby/5 border border-dashed border-nexus-ruby/30 hover:border-nexus-ruby hover:bg-nexus-ruby/10 transition-all group mb-4"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-nexus-ruby/10 rounded-xl text-nexus-ruby group-hover:scale-110 transition-transform">
                            <PlusCircle size={20} />
                        </div>
                        <div>
                            <div className="text-xs font-display font-black text-nexus-text uppercase tracking-widest">New Project</div>
                            <div className="text-[8px] font-mono text-nexus-muted uppercase tracking-widest">Fresh Manifesto</div>
                        </div>
                    </div>
                </button>

                {existingBooks.length === 0 ? (
                    <div className="py-12 text-center opacity-40">
                        <History size={32} className="mx-auto text-nexus-muted mb-4" />
                        <p className="text-[10px] font-display font-bold uppercase tracking-widest px-8">No records found</p>
                    </div>
                ) : (
                    existingBooks.map((book: any) => (
                        <button key={book.id} onClick={() => onLoadBook(book.id)} className="w-full text-left p-4 rounded-2xl bg-nexus-950/40 border border-nexus-800 hover:border-nexus-ruby hover:bg-nexus-ruby/5 transition-all group">
                            <div className="text-[8px] font-mono text-nexus-ruby uppercase tracking-widest mb-2 font-bold flex items-center gap-1.5"><BookOpen size={10} /> Manuscript</div>
                            <div className="text-xs font-display font-black text-nexus-text uppercase truncate mb-1 group-hover:text-nexus-ruby transition-colors">{book.title}</div>
                            <p className="text-[9px] text-nexus-muted italic line-clamp-1 font-serif">"{book.gist}"</p>
                        </button>
                    ))
                )}
            </div>
            <footer className="p-6 border-t border-nexus-800 opacity-40 flex items-center gap-3 shrink-0">
                <Activity size={14}/><span className="text-[8px] font-mono uppercase tracking-widest">Gallery_v2.0</span>
            </footer>
        </aside>
    );
};