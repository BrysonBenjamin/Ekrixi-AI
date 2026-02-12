import React from 'react';
import { Home, ChevronRight, UserCircle2 } from 'lucide-react';
import { NexusObject, SimpleNote } from '../../../types';
import { YearSlider } from './YearSlider';

interface DrilldownHeaderProps {
  navStack: string[];
  registry: Record<string, NexusObject>;
  setNavStack: (stack: string[]) => void;
  showAuthorNotes: boolean;
  setShowAuthorNotes: (show: boolean) => void;
  simulatedDate: { year: number; month: number; day: number };
  setSimulatedDate: (date: { year: number; month: number; day: number }) => void;
  timelineBounds: { startYear: number; endYear: number };
  onBoundsChange: (bounds: { startYear: number; endYear: number }) => void;
}

export const DrilldownHeader: React.FC<DrilldownHeaderProps> = ({
  navStack,
  registry,
  setNavStack,
  showAuthorNotes,
  setShowAuthorNotes,
  simulatedDate,
  setSimulatedDate,
  timelineBounds,
  onBoundsChange,
}) => {
  const currentContainerId = navStack[navStack.length - 1];

  return (
    <header className="h-24 border-b border-nexus-800 bg-nexus-900/60 backdrop-blur-2xl flex items-center px-6 gap-6 justify-between shrink-0 z-30 shadow-2xl">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 min-w-[180px]">
        <button
          onClick={() => setNavStack([])}
          className={`p-2.5 rounded-xl transition-all flex items-center gap-2.5 ${!currentContainerId ? 'bg-nexus-accent/10 text-nexus-accent' : 'text-nexus-muted hover:text-nexus-text'}`}
        >
          <Home size={18} />
          <span className="text-[11px] font-display font-black uppercase tracking-[0.2em] hidden lg:inline">
            ORIGIN
          </span>
        </button>
        {navStack.map((id, idx) => (
          <React.Fragment key={id}>
            <ChevronRight size={14} className="text-nexus-muted opacity-30 shrink-0" />
            <button
              onClick={() => setNavStack(navStack.slice(0, idx + 1))}
              className={`px-4 py-2 rounded-xl text-[11px] font-display font-black uppercase tracking-[0.2em] transition-all border whitespace-nowrap ${idx === navStack.length - 1 ? 'bg-nexus-accent/5 border-nexus-accent/20 text-nexus-accent' : 'border-transparent text-nexus-muted hover:text-nexus-text'}`}
            >
              {(registry[id] as SimpleNote)?.title}
            </button>
          </React.Fragment>
        ))}
      </div>

      <div className="flex-1 flex justify-center max-w-xl mx-4">
        <YearSlider
          currentDate={simulatedDate}
          onDateChange={setSimulatedDate}
          timelineBounds={timelineBounds}
          onBoundsChange={onBoundsChange}
        />
      </div>

      <div className="flex items-center gap-4 min-w-[180px] justify-end">
        <button
          onClick={() => setShowAuthorNotes(!showAuthorNotes)}
          className={`px-4 py-2.5 rounded-xl text-[10px] font-display font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2.5 border ${showAuthorNotes ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.1)]' : 'border-nexus-800 text-nexus-muted hover:text-nexus-text'}`}
        >
          <UserCircle2 size={16} /> <span className="hidden xl:inline">Notes:</span>{' '}
          {showAuthorNotes ? 'SCRYING' : 'VEILED'}
        </button>
      </div>
    </header>
  );
};
