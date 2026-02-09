import React, { useMemo } from 'react';
import {
  BookOpen,
  History,
  Library,
  Plus,
  PlusCircle,
  Activity,
  Trash2,
  Check,
} from 'lucide-react';
import { NexusObject, NexusType, StoryType, StoryNote } from '../../../../../types';
// Fix: Import StudioBlock from types
import { StudioBlock } from '../../../types';

interface ManuscriptGalleryProps {
  registry: Record<string, NexusObject>;
  onLoadBook: (id: string) => void;
  onCreateNewBook: (blocks?: StudioBlock[]) => void;
  onDeleteBook: (id: string) => void;
  activeBookId?: string | null;
}

export const ManuscriptGallery: React.FC<ManuscriptGalleryProps> = ({
  registry,
  onLoadBook,
  onCreateNewBook,
  onDeleteBook,
  activeBookId,
}) => {
  const existingBooks = useMemo(() => {
    return (Object.values(registry) as NexusObject[]).filter(
      (n) =>
        n._type === NexusType.STORY_NOTE &&
        ((n as StoryNote).story_type === StoryType.BOOK ||
          (n as StoryNote).story_type === StoryType.MANUSCRIPT),
    );
  }, [registry]);

  return (
    <aside className="border-r border-nexus-800 bg-nexus-900/40 flex flex-col shrink-0 w-80 animate-in slide-in-from-left duration-500 ease-out">
      <header className="p-8 border-b border-nexus-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Library size={18} className="text-nexus-ruby" />
          <h3 className="text-[10px] font-display font-black text-nexus-text uppercase tracking-[0.3em]">
            Manuscripts
          </h3>
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
              <div className="text-xs font-display font-black text-nexus-text uppercase tracking-widest">
                New Project
              </div>
              <div className="text-[8px] font-mono text-nexus-muted uppercase tracking-widest">
                Fresh Manifesto
              </div>
            </div>
          </div>
        </button>

        {existingBooks.length === 0 ? (
          <div className="py-12 text-center opacity-40">
            <History size={32} className="mx-auto text-nexus-muted mb-4" />
            <p className="text-[10px] font-display font-bold uppercase tracking-widest px-8">
              No records found
            </p>
          </div>
        ) : (
          existingBooks.map((book) => {
            const sn = book as StoryNote;
            return (
              <button
                key={sn.id}
                onClick={() => onLoadBook(sn.id)}
                className={`w-full text-left p-4 rounded-2xl border transition-all group relative ${
                  activeBookId === sn.id
                    ? 'bg-nexus-ruby/10 border-nexus-ruby shadow-lg shadow-nexus-ruby/10'
                    : 'bg-nexus-950/40 border-nexus-800 hover:border-nexus-ruby hover:bg-nexus-ruby/5'
                }`}
              >
                {activeBookId === sn.id && (
                  <div className="absolute top-3 right-3 p-1 bg-nexus-ruby rounded-full text-white animate-in zoom-in-95">
                    <Check size={12} />
                  </div>
                )}
                <div className="text-[8px] font-mono text-nexus-ruby uppercase tracking-widest mb-2 font-bold flex items-center gap-1.5">
                  <BookOpen size={10} /> Manuscript
                </div>
                <div
                  className={`text-xs font-display font-black uppercase truncate mb-1 transition-colors ${
                    activeBookId === sn.id
                      ? 'text-nexus-ruby'
                      : 'text-nexus-text group-hover:text-nexus-ruby'
                  }`}
                >
                  {sn.title}
                </div>
                <p className="text-[9px] text-nexus-muted italic line-clamp-1 font-serif">
                  "{sn.gist}"
                </p>
                <div className="flex justify-end mt-4 pt-4 border-t border-nexus-800 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteBook(sn.id);
                    }}
                    className="p-1.5 text-nexus-muted hover:text-nexus-ruby transition-colors"
                    title="Delete Manuscript"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </button>
            );
          })
        )}
      </div>
      <footer className="p-6 border-t border-nexus-800 opacity-40 flex items-center gap-3 shrink-0">
        <Activity size={14} />
        <span className="text-[8px] font-mono uppercase tracking-widest">Gallery_v2.0</span>
      </footer>
    </aside>
  );
};
