import React from 'react';
import { Calendar, ArrowUp, ArrowDown, History, Compass } from 'lucide-react';
import { NexusObject, SimpleNote } from '../../../types';

interface TimeInfo {
  isTimeNode: boolean;
  year: number | null;
  month?: number | null;
  day?: number | null;
  baseId: string;
  prevNode: SimpleNote | null;
  nextNode: SimpleNote | null;
  activeNode: SimpleNote;
}

interface DrilldownFooterProps {
  currentContainer: NexusObject | null;
  timeInfo: TimeInfo | null;
  registry: Record<string, NexusObject>;
  handleTimeNav: (id: string) => void;
}

const formatDate = (info: TimeInfo) => {
  if (!info.year) return 'BASE';
  const months = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC',
  ];
  let str = `${info.year}`;
  if (info.month) {
    str = `${info.day || 1} ${months[info.month - 1]} ${info.year}`;
  }
  return str;
};

export const DrilldownFooter: React.FC<DrilldownFooterProps> = ({
  currentContainer,
  timeInfo,
  registry,
  handleTimeNav,
}) => {
  return (
    <div className="absolute bottom-12 left-12 right-12 pointer-events-none flex justify-between items-end z-20">
      <div className="p-12 bg-nexus-900/80 backdrop-blur-3xl border border-nexus-800 rounded-[64px] pointer-events-auto shadow-[0_50px_100px_-20px_rgba(0,0,0,0.6)] max-w-2xl group hover:border-nexus-accent/40 transition-all duration-500 relative overflow-hidden">
        {/* Timeline UI Overlay */}
        {timeInfo && (
          <div className="absolute top-0 right-0 p-10 flex flex-col items-center gap-4 z-30">
            <div className="flex flex-col items-center gap-2 mb-2">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 opacity-60">
                Temporal Era
              </span>
              <div className="flex items-center gap-3 px-5 py-3 bg-indigo-900/40 rounded-2xl border border-indigo-500/30 backdrop-blur-md shadow-lg">
                <Calendar size={16} className="text-indigo-300" />
                <span className="text-sm font-black text-indigo-100 font-mono tracking-tighter">
                  {formatDate(timeInfo)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {/* Next (Future) */}
              <button
                onClick={() => timeInfo.nextNode && handleTimeNav(timeInfo.nextNode.id)}
                disabled={!timeInfo.nextNode}
                className={`p-3 rounded-2xl border transition-all ${
                  timeInfo.nextNode
                    ? 'bg-nexus-800/80 border-nexus-700 hover:border-nexus-accent hover:text-nexus-accent text-nexus-muted hover:shadow-[0_0_20px_rgba(var(--accent-rgb),0.2)]'
                    : 'opacity-30 border-transparent cursor-not-allowed'
                }`}
                title="Next Era (Future)"
              >
                <ArrowUp size={20} />
              </button>

              {/* Prev (Past) */}
              <button
                onClick={() => timeInfo.prevNode && handleTimeNav(timeInfo.prevNode.id)}
                disabled={!timeInfo.prevNode}
                className={`p-3 rounded-2xl border transition-all ${
                  timeInfo.prevNode
                    ? 'bg-nexus-800/80 border-nexus-700 hover:border-nexus-accent hover:text-nexus-accent text-nexus-muted hover:shadow-[0_0_20px_rgba(var(--accent-rgb),0.2)]'
                    : 'opacity-30 border-transparent cursor-not-allowed'
                }`}
                title="Previous Era (Past)"
              >
                <ArrowDown size={20} />
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-6 mb-5">
          <div
            className={`p-3 rounded-2xl ${timeInfo?.isTimeNode ? 'bg-indigo-500/20 shadow-[0_0_40px_rgba(99,102,241,0.2)]' : 'bg-nexus-accent/10'}`}
          >
            {timeInfo?.isTimeNode ? (
              <History size={28} className="text-indigo-400" />
            ) : (
              <Compass size={28} className="text-nexus-accent" />
            )}
          </div>
          <span className="text-[12px] font-display font-black text-nexus-muted uppercase tracking-[0.5em] opacity-40">
            {timeInfo?.isTimeNode ? 'TEMPORAL FOCUS' : 'BLUEPRINT PERSPECTIVE'}
          </span>
        </div>
        <h2 className="text-6xl font-display font-black text-nexus-text tracking-tighter leading-[0.9] mb-6 group-hover:text-nexus-accent transition-colors">
          {currentContainer ? (currentContainer as SimpleNote).title : 'The Deep Nexus'}
          {timeInfo?.year && (
            <span className="opacity-30 ml-4 text-3xl align-top font-mono tracking-tighter">
              ({formatDate(timeInfo)})
            </span>
          )}
        </h2>
        <h2 className="text-[12px] font-display font-black text-nexus-muted uppercase tracking-[0.3em] opacity-40">
          {timeInfo?.isTimeNode
            ? `Inheritance Core: ${(registry[timeInfo.baseId] as SimpleNote)?.title || 'Unknown'}`
            : 'Global Manifestation Map'}
        </h2>
      </div>
    </div>
  );
};
