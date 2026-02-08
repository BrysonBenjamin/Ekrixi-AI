import React, { useState, useMemo } from 'react';
import { Search, X, MapPin, Users, Box, Ghost, Share2 } from 'lucide-react';
import { NexusObject, NexusCategory, isLink, isReified, NexusType } from '../../../types';

interface LoreScryerProps {
  isOpen: boolean;
  registry: Record<string, NexusObject>;
  onClose: () => void;
  inline?: boolean;
}

export const LoreScryer: React.FC<LoreScryerProps> = ({ isOpen, registry, onClose, inline }) => {
  const [search, setSearch] = useState('');

  const items = useMemo(() => {
    const all = Object.values(registry) as NexusObject[];
    const filtered = all.filter((o) => {
      if (isLink(o) && !isReified(o)) return false;
      if (o._type === NexusType.STORY_NOTE) return false;

      const title = 'title' in o ? (o as any).title : '';
      const gist = 'gist' in o ? (o as any).gist : '';

      return (
        title?.toLowerCase().includes(search.toLowerCase()) ||
        gist?.toLowerCase().includes(search.toLowerCase())
      );
    });
    return filtered;
  }, [registry, search]);

  const handleDragStart = (e: React.DragEvent, item: NexusObject) => {
    const title = 'title' in item ? (item as any).title : 'Unit';
    e.dataTransfer.setData('application/nexus-scry-title', title);
    e.dataTransfer.setData('application/nexus-scry-id', item.id);
  };

  if (!isOpen) return null;

  return (
    <aside
      className={`flex flex-col bg-nexus-900 ${inline ? 'h-full' : 'w-80 border-l border-nexus-800 shadow-2xl z-[60] animate-in slide-in-from-right duration-300'}`}
    >
      {!inline && (
        <header className="h-16 flex items-center justify-between px-6 border-b border-nexus-800 bg-nexus-900/50 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Search size={16} className="text-nexus-accent" />
            <span className="text-[10px] font-display font-black text-nexus-text uppercase tracking-widest">
              Lore Searcher
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-nexus-muted hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </header>
      )}

      <div className="p-4 border-b border-nexus-800 shrink-0">
        <div className="relative">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-nexus-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search world memory..."
            className="w-full bg-nexus-950 border border-nexus-800 rounded-xl pl-9 pr-4 py-2.5 text-[10px] text-nexus-text outline-none focus:border-nexus-accent transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2">
        {items.length === 0 ? (
          <div className="py-20 text-center opacity-30">
            <Ghost size={32} className="mx-auto mb-3" />
            <p className="text-[9px] font-display font-black uppercase tracking-widest">
              No Lore Resolved
            </p>
          </div>
        ) : (
          items.map((item) => {
            const title = 'title' in item ? (item as any).title : 'Unit';
            const gist = 'gist' in item ? (item as any).gist : '';
            const categoryId =
              'category_id' in item ? (item as any).category_id : NexusCategory.CONCEPT;

            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                className="p-4 bg-nexus-950/40 border border-nexus-800 rounded-2xl cursor-grab active:cursor-grabbing hover:border-nexus-accent group transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <CategoryIcon cat={categoryId} reified={isReified(item)} />
                  <span className="text-[11px] font-display font-bold text-nexus-text group-hover:text-nexus-accent truncate">
                    {title}
                  </span>
                </div>
                <p className="text-[9px] text-nexus-muted italic line-clamp-2 font-serif">
                  "{gist}"
                </p>
                <div className="mt-3 flex justify-between items-center">
                  <div className="text-[7px] font-mono text-nexus-muted uppercase tracking-widest">
                    DRAG_UNIT
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-nexus-800 group-hover:bg-nexus-accent" />
                </div>
              </div>
            );
          })
        )}
      </div>

      <footer className="p-4 bg-nexus-950/50 border-t border-nexus-800 shrink-0">
        <p className="text-[8px] text-nexus-muted font-mono uppercase tracking-widest leading-relaxed">
          Drag units into writing fields or the Chat for contextual searching.
        </p>
      </footer>
    </aside>
  );
};

const CategoryIcon = ({ cat, reified }: { cat: NexusCategory; reified: boolean }) => {
  if (reified) return <Share2 size={12} className="text-nexus-accent" />;
  switch (cat) {
    case NexusCategory.LOCATION:
      return <MapPin size={12} className="text-nexus-accent" />;
    case NexusCategory.CHARACTER:
      return <Users size={12} className="text-purple-400" />;
    default:
      return <Box size={12} className="text-slate-500" />;
  }
};
