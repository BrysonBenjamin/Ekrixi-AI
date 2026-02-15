import React from 'react';
import { Calendar, ArrowUp, ArrowDown, History, Compass } from 'lucide-react';
import { NexusObject, NexusNote } from '../../../types';

interface TimeInfo {
  isTimeNode: boolean;
  year: number | null;
  month?: number | null;
  day?: number | null;
  baseId: string;
  prevNode: NexusNote | null;
  nextNode: NexusNote | null;
  activeNode: NexusNote;
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
    <div className="absolute bottom-8 left-8 right-8 pointer-events-none flex justify-between items-end z-20">
      <div className="p-6 bg-nexus-900/80 backdrop-blur-3xl border border-nexus-800 rounded-[32px] pointer-events-auto shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] max-w-lg group hover:max-w-2xl transition-all duration-700 ease-in-out relative overflow-hidden ring-1 ring-white/5">
        {/* Progress Glow Background */}
        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-nexus-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

        {/* Timeline UI Overlay - Condensed */}
        {timeInfo && (
          <div className="absolute top-0 right-0 p-6 flex flex-col items-center gap-3 z-30 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-500 delay-100">
            <div className="flex flex-col items-center gap-1.5 mb-1">
              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-indigo-400/60">
                Temporal Era
              </span>
              <div className="flex items-center gap-3 px-4 py-2 bg-indigo-900/40 rounded-xl border border-indigo-500/30 backdrop-blur-md shadow-lg">
                <Calendar size={12} className="text-indigo-300" />
                <span className="text-[11px] font-black text-indigo-100 font-mono tracking-tighter">
                  {formatDate(timeInfo)}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => timeInfo.prevNode && handleTimeNav(timeInfo.prevNode.id)}
                disabled={!timeInfo.prevNode}
                className={`p-2 rounded-xl border transition-all ${
                  timeInfo.prevNode
                    ? 'bg-nexus-800/80 border-nexus-700 hover:border-nexus-accent hover:text-nexus-accent text-nexus-muted hover:shadow-[0_0_20px_rgba(var(--accent-rgb),0.2)]'
                    : 'opacity-30 border-transparent cursor-not-allowed'
                }`}
                title="Past"
              >
                <ArrowDown size={14} />
              </button>
              <button
                onClick={() => timeInfo.nextNode && handleTimeNav(timeInfo.nextNode.id)}
                disabled={!timeInfo.nextNode}
                className={`p-2 rounded-xl border transition-all ${
                  timeInfo.nextNode
                    ? 'bg-nexus-800/80 border-nexus-700 hover:border-nexus-accent hover:text-nexus-accent text-nexus-muted hover:shadow-[0_0_20px_rgba(var(--accent-rgb),0.2)]'
                    : 'opacity-30 border-transparent cursor-not-allowed'
                }`}
                title="Future"
              >
                <ArrowUp size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Content Section */}
        <div className="flex items-center gap-4 mb-4 transition-transform duration-500 group-hover:translate-x-1">
          <div
            className={`p-2.5 rounded-xl transition-all duration-500 group-hover:scale-110 ${timeInfo?.isTimeNode ? 'bg-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.2)]' : 'bg-nexus-accent/10 shadow-[0_0_30px_rgba(var(--accent-rgb),0.1)]'}`}
          >
            {timeInfo?.isTimeNode ? (
              <History size={20} className="text-indigo-400" />
            ) : (
              <Compass size={20} className="text-nexus-accent" />
            )}
          </div>
          <span className="text-[9px] font-display font-black text-nexus-muted uppercase tracking-[0.4em] opacity-40 group-hover:opacity-100 transition-opacity">
            {timeInfo?.isTimeNode ? 'TEMPORAL FOCUS' : 'BLUEPRINT PERSPECTIVE'}
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between group-hover:px-1 transition-all">
            <h2 className="text-4xl font-display font-black text-nexus-text tracking-tighter leading-none group-hover:text-nexus-accent transition-all duration-500">
              {currentContainer ? (currentContainer as NexusNote).title : 'The Deep Nexus'}
              {timeInfo?.year && !timeInfo?.day && (
                <span className="opacity-20 ml-3 text-xl align-top font-mono tracking-tighter group-hover:opacity-100 transition-opacity">
                  [{timeInfo.year}]
                </span>
              )}
            </h2>

            {/* Tech HUD Mini-Stats */}
            <div className="flex gap-4 opacity-0 group-hover:opacity-40 transition-opacity duration-700 delay-300 font-mono text-[8px] font-bold text-nexus-muted">
              <div className="flex flex-col items-end">
                <span className="uppercase opacity-40">Mass</span>
                <span className="text-nexus-text">
                  {(currentContainer as any)?.total_subtree_mass || 0}U
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="uppercase opacity-40">Weight</span>
                <span className="text-nexus-text">
                  {(currentContainer as any)?.internal_weight || 0}σ
                </span>
              </div>
            </div>
          </div>

          <div className="h-px w-0 group-hover:w-full bg-gradient-to-r from-nexus-accent/40 to-transparent transition-all duration-1000 delay-200" />

          <h2 className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.2em] transition-all duration-500 group-hover:translate-x-1">
            <span className="opacity-40">
              {timeInfo?.isTimeNode ? `Inheritance Core: ` : 'Global Manifestation Map'}
            </span>
            {timeInfo?.isTimeNode && (
              <span className="text-indigo-300 font-mono">
                {(registry[timeInfo.baseId] as NexusNote)?.title || 'Unknown'}
              </span>
            )}
          </h2>
        </div>
      </div>
    </div>
  );
};
