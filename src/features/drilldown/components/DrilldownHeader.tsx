import React from 'react';
import { Home, ChevronRight, UserCircle2 } from 'lucide-react';
import { NexusObject } from '../../../types';

interface DrilldownHeaderProps {
  navStack: string[];
  registry: Record<string, NexusObject>;
  setNavStack: (stack: string[]) => void;
  showAuthorNotes: boolean;
  setShowAuthorNotes: (show: boolean) => void;
}

export const DrilldownHeader: React.FC<DrilldownHeaderProps> = ({
  navStack,
  registry,
  setNavStack,
  showAuthorNotes,
  setShowAuthorNotes,
}) => {
  const currentContainerId = navStack[navStack.length - 1];

  return (
    <header className="h-24 border-b border-nexus-800 bg-nexus-900/60 backdrop-blur-2xl flex items-center px-10 justify-between shrink-0 z-30 shadow-2xl">
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2">
        <button
          onClick={() => setNavStack([])}
          className={`p-3 rounded-2xl transition-all flex items-center gap-3 ${!currentContainerId ? 'bg-nexus-accent/10 text-nexus-accent' : 'text-nexus-muted hover:text-nexus-text'}`}
        >
          <Home size={20} />
          <span className="text-[12px] font-display font-black uppercase tracking-[0.2em] hidden sm:inline">
            DEEP ORIGIN
          </span>
        </button>
        {navStack.map((id, idx) => (
          <React.Fragment key={id}>
            <ChevronRight size={16} className="text-nexus-muted opacity-30 shrink-0" />
            <button
              onClick={() => setNavStack(navStack.slice(0, idx + 1))}
              className={`px-5 py-2.5 rounded-2xl text-[12px] font-display font-black uppercase tracking-[0.2em] transition-all border ${idx === navStack.length - 1 ? 'bg-nexus-accent/5 border-nexus-accent/20 text-nexus-accent' : 'border-transparent text-nexus-muted hover:text-nexus-text'}`}
            >
              {(registry[id] as any)?.title}
            </button>
          </React.Fragment>
        ))}
      </div>
      <div className="flex items-center gap-6">
        <button
          onClick={() => setShowAuthorNotes(!showAuthorNotes)}
          className={`px-5 py-3 rounded-2xl text-[11px] font-display font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 border ${showAuthorNotes ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.1)]' : 'border-nexus-800 text-nexus-muted hover:text-nexus-text'}`}
        >
          <UserCircle2 size={18} /> Protocol Notes: {showAuthorNotes ? 'SCRYING' : 'VEILED'}
        </button>
      </div>
    </header>
  );
};
