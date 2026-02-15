import React from 'react';
import { ShieldCheck, ArrowRight } from 'lucide-react';

interface InspectorFooterProps {
  onCommit: () => void;
  isWikiLink: boolean;
}

export const InspectorFooter: React.FC<InspectorFooterProps> = ({ onCommit, isWikiLink }) => {
  return (
    <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-nexus-800/50 bg-nexus-950/90 backdrop-blur-xl z-10">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-nexus-accent/10 border border-nexus-accent/20">
            <ShieldCheck size={14} className="text-nexus-accent" />
          </div>
          <div>
            <div className="text-[7px] font-mono font-bold text-nexus-muted uppercase tracking-[0.3em]">
              Registry::Verified
            </div>
            <div className="text-[10px] font-black text-nexus-text uppercase italic tracking-wider">
              Sync Active
            </div>
          </div>
        </div>

        <button
          onClick={onCommit}
          className="group relative px-8 py-3 rounded-2xl bg-nexus-accent text-nexus-950 text-[11px] font-black uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_20px_40px_-10px_rgba(var(--nexus-accent-rgb),0.4)] overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          <span className="relative z-10 flex items-center gap-2">
            {isWikiLink ? 'Nexus Wiki' : 'Commit Manifest'}
            <ArrowRight size={14} />
          </span>
        </button>
      </div>
    </div>
  );
};
