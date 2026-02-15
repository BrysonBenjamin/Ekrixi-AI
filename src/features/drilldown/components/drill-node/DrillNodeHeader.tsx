import React from 'react';
import { Activity } from 'lucide-react';
import { IntegrityBadge } from '../../../integrity/components/IntegrityBadge';
import { IntegrityReport } from '../../../integrity/GraphIntegrityService';
import { NexusTimeState } from '../../../../types';

interface DrillNodeHeaderProps {
  iconSvg: string;
  color: string;
  title: string;
  category: string;
  isFocus: boolean;
  isAuthorNote: boolean;
  reified: boolean;
  isSnapshot: boolean;
  effectiveDate?: { year: number };
  timeState?: NexusTimeState;
  createdAt?: string;
  mass: number;
  integrityReport?: IntegrityReport;
}

export const DrillNodeHeader: React.FC<DrillNodeHeaderProps> = ({
  iconSvg,
  color,
  title,
  category,
  isFocus,
  isAuthorNote,
  reified,
  isSnapshot,
  effectiveDate,
  timeState,
  createdAt,
  mass,
  integrityReport,
}) => (
  <div className="flex items-center gap-10 p-12 flex-1 min-h-0 relative z-10">
    <div
      className={`w-28 h-28 rounded-[36px] flex items-center justify-center shrink-0 border-[4px] transition-transform duration-500 group-hover:-rotate-6 ${
        isFocus ? 'bg-nexus-950 border-nexus-accent shadow-xl' : 'bg-nexus-950 border-nexus-800'
      }`}
      style={{ borderColor: isFocus ? 'var(--accent-color)' : `${color}cc` }}
    >
      <div dangerouslySetInnerHTML={{ __html: iconSvg }} className="scale-[3.5]" />
    </div>

    <div className="flex-1 min-w-0 text-left py-4 flex flex-col justify-center">
      <div
        className={`text-[48px] font-display font-black uppercase tracking-tight leading-[1] transition-colors break-words ${
          isFocus
            ? 'text-nexus-accent'
            : isAuthorNote
              ? 'text-amber-500'
              : reified
                ? 'text-nexus-accent'
                : 'text-nexus-text'
        }`}
      >
        {title}
      </div>
      <div className="flex items-center gap-6 mt-5">
        <span
          className={`px-5 py-2 rounded-2xl border text-[14px] font-display font-black uppercase tracking-[0.25em] ${
            isAuthorNote
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
              : reified
                ? 'bg-nexus-accent/10 border-nexus-accent/30 text-nexus-accent'
                : 'bg-nexus-800 border-nexus-700 text-nexus-muted'
          }`}
        >
          {isAuthorNote ? "Author's Note" : reified ? 'REIFIED LOGIC UNIT' : category}
        </span>

        {(timeState || createdAt) && (
          <div
            className={`flex items-center gap-3 px-4 py-2 rounded-2xl border text-[12px] font-mono uppercase tracking-widest ${
              isSnapshot
                ? 'bg-nexus-accent/10 border-nexus-accent/40 text-nexus-accent shadow-[0_0_15px_rgba(var(--accent-rgb),0.1)]'
                : 'bg-nexus-950/50 border-nexus-800 text-nexus-muted opacity-60'
            }`}
          >
            <Activity size={14} className={isSnapshot ? 'animate-pulse' : ''} />
            {effectiveDate ? (
              <>
                {effectiveDate.year}
                {timeState?.valid_until && (
                  <span className="opacity-70"> - {timeState.valid_until.year}</span>
                )}
              </>
            ) : createdAt ? (
              `ORIGIN: ${new Date(createdAt).getFullYear()}`
            ) : (
              'ORIGIN'
            )}
            {isSnapshot && (
              <span className="ml-1 opacity-80 text-[10px] bg-nexus-accent text-white px-2 py-0.5 rounded-md font-black">
                SNAP
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 px-4 py-2 bg-nexus-950/50 rounded-2xl border border-nexus-800/80 text-[12px] font-mono text-nexus-muted uppercase tracking-widest">
          <div className="w-2 h-2 rounded-full bg-nexus-accent shadow-[0_0_10px_var(--accent-color)] opacity-40" />
          MASS: {mass.toFixed(1)}
        </div>

        {integrityReport && integrityReport.status !== 'APPROVED' && (
          <IntegrityBadge status={integrityReport.status} variant="minimal" />
        )}
      </div>
    </div>
  </div>
);
