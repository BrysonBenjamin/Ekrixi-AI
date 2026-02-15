import React, { useMemo } from 'react';
import { Sparkles, X, Database } from 'lucide-react';
import { NexusObject, NexusNote, isLink, isReified } from '../../../../types';

interface LinkSearchMenuProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onBack: () => void;
  onClose: () => void;
  onSelect: (id: string) => void;
  registry: Record<string, NexusObject>;
  excludeId: string;
  useTimeAnchor: boolean;
  setUseTimeAnchor: (v: boolean) => void;
  simulatedYear?: number;
  getObjectTitle: (obj: NexusObject) => string;
}

export const LinkSearchMenu: React.FC<LinkSearchMenuProps> = ({
  searchQuery,
  setSearchQuery,
  onBack,
  onClose,
  onSelect,
  registry,
  excludeId,
  useTimeAnchor,
  setUseTimeAnchor,
  simulatedYear,
  getObjectTitle,
}) => {
  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return (Object.values(registry) as NexusObject[])
      .filter(
        (n) =>
          (!isLink(n) || isReified(n)) &&
          n.id !== excludeId &&
          getObjectTitle(n).toLowerCase().includes(q),
      )
      .slice(0, 5);
  }, [searchQuery, registry, excludeId, getObjectTitle]);

  return (
    <div className="p-2 animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-[9px] font-display font-black text-nexus-accent uppercase tracking-widest flex items-center gap-2">
          <Sparkles size={10} /> Neural Registry
        </span>
        <button onClick={onBack} className="text-nexus-muted hover:text-white">
          <X size={12} />
        </button>
      </div>
      <div className="relative mb-2">
        <Database
          size={10}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-nexus-muted"
        />
        <input
          autoFocus
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Designation..."
          className="w-full bg-nexus-950 border border-nexus-800 rounded-xl py-2 pl-7 pr-3 text-[10px] text-white outline-none focus:border-nexus-accent transition-all shadow-inner"
        />
      </div>
      <div className="space-y-1 overflow-y-auto max-h-[160px] no-scrollbar">
        {suggestions.map((node) => {
          const nodeTitle = getObjectTitle(node);
          const category = 'category_id' in node ? (node as NexusNote).category_id : 'REIFIED';

          return (
            <button
              key={node.id}
              onClick={() => onSelect(node.id)}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl bg-nexus-900 border border-transparent hover:border-nexus-accent/40 transition-all text-left group"
            >
              <div className="w-6 h-6 rounded-lg bg-nexus-950 border border-nexus-800 flex items-center justify-center text-[9px] font-black text-nexus-accent group-hover:bg-nexus-accent group-hover:text-white transition-all">
                {category?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold truncate text-nexus-text">{nodeTitle}</div>
                <div className="text-[7px] opacity-40 uppercase font-mono">
                  {category || 'REIFIED'}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {simulatedYear && (
        <div className="mt-3 pt-3 border-t border-nexus-800/50 flex items-center justify-between px-2">
          <span className="text-[8px] font-mono font-black text-nexus-muted uppercase tracking-widest">
            Temporal Anchor
          </span>
          <button
            onClick={() => setUseTimeAnchor(!useTimeAnchor)}
            className={`px-2 py-1 rounded-lg border text-[8px] font-black uppercase transition-all ${useTimeAnchor ? 'bg-nexus-accent/10 border-nexus-accent/40 text-nexus-accent shadow-[0_0_10px_rgba(var(--accent-rgb),0.2)]' : 'bg-nexus-800 border-nexus-700 text-nexus-muted'}`}
          >
            {useTimeAnchor ? `ERA: ${simulatedYear}` : 'OFF'}
          </button>
        </div>
      )}
    </div>
  );
};
