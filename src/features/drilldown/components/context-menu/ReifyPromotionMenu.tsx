import React from 'react';
import { Share2, X, ChevronRight } from 'lucide-react';
import { NexusObject, NexusNote } from '../../../../types';

interface ReifyPromotionMenuProps {
  menuState: 'REIFY_CHOOSE_SOURCE' | 'REIFY_CHOOSE_TARGET';
  onBack: () => void;
  neighbors: NexusObject[];
  reifySelection: { sourceId?: string; targetId?: string };
  handleReifyChoice: (id: string) => void;
  getObjectTitle: (obj: NexusObject) => string;
}

export const ReifyPromotionMenu: React.FC<ReifyPromotionMenuProps> = ({
  menuState,
  onBack,
  neighbors,
  reifySelection,
  handleReifyChoice,
  getObjectTitle,
}) => {
  return (
    <div className="p-2 animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="flex items-center justify-between mb-4 px-2">
        <span className="text-[9px] font-display font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
          <Share2 size={12} />{' '}
          {menuState === 'REIFY_CHOOSE_SOURCE' ? 'Choose Origin' : 'Choose Terminal'}
        </span>
        <button onClick={onBack} className="text-nexus-muted hover:text-white transition-colors">
          <X size={14} />
        </button>
      </div>
      <div className="space-y-1.5 overflow-y-auto max-h-[200px] no-scrollbar">
        {neighbors
          .filter((n) => n.id !== reifySelection.sourceId)
          .map((node) => {
            const nodeTitle = getObjectTitle(node);
            const category = 'category_id' in node ? (node as NexusNote).category_id : 'REIFIED';

            return (
              <button
                key={node.id}
                onClick={() => handleReifyChoice(node.id)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-nexus-950/40 border border-nexus-800 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all text-left group"
              >
                <div className="w-8 h-8 rounded-xl bg-nexus-900 border border-nexus-800 flex items-center justify-center shrink-0 group-hover:border-amber-500/30">
                  <div className="text-[10px] font-black text-nexus-muted group-hover:text-amber-500">
                    {category?.charAt(0)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold text-nexus-text group-hover:text-white truncate">
                    {nodeTitle}
                  </div>
                  <div className="text-[7px] opacity-40 uppercase tracking-widest">{category}</div>
                </div>
                <ChevronRight
                  size={12}
                  className="text-nexus-muted group-hover:text-amber-500 opacity-0 group-hover:opacity-100 transition-all"
                />
              </button>
            );
          })}
      </div>
      <button
        onClick={onBack}
        className="w-full mt-4 py-2.5 text-[9px] font-display font-black text-nexus-muted uppercase tracking-widest hover:text-nexus-text transition-colors"
      >
        Abort Promotion
      </button>
    </div>
  );
};
