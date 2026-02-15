import React from 'react';
import { Activity, ArrowRight, Layers, Hash } from 'lucide-react';
import { NexusMarkdown } from '../../../../components/shared/NexusMarkdown';
import { IntegrityBadge } from '../../../integrity/components/IntegrityBadge';
import { IntegrityReport } from '../../../integrity/GraphIntegrityService';
import { NexusObject } from '../../../../types';

interface DrillNodeDetailsProps {
  gist: string;
  tags: string[];
  fullRegistry: Record<string, NexusObject>;
  onLinkClick?: (id: string) => void;
  isAuthorNote: boolean;
  reifiedContext: { sourceName: string; targetName: string; verb: string } | null;
  integrityReport?: IntegrityReport;
  childrenCount: number;
  objectId: string;
}

export const DrillNodeDetails: React.FC<DrillNodeDetailsProps> = ({
  gist,
  tags,
  fullRegistry,
  onLinkClick,
  isAuthorNote,
  reifiedContext,
  integrityReport,
  childrenCount,
  objectId,
}) => (
  <div className="px-14 pb-16 border-t border-nexus-800 pt-12 animate-in fade-in slide-in-from-top-4 duration-700 relative z-10 flex flex-col gap-10">
    {integrityReport && integrityReport.status !== 'APPROVED' && (
      <IntegrityBadge
        status={integrityReport.status}
        reason={integrityReport.reason}
        isCycle={integrityReport.isCycle}
      />
    )}

    <div className="relative">
      <div className="mb-4 text-[12px] font-display font-black text-nexus-accent uppercase tracking-[0.4em] opacity-40">
        LORE REACTION GIST
      </div>
      <NexusMarkdown
        content={`"${gist}"`}
        registry={fullRegistry}
        onLinkClick={onLinkClick}
        className={`[&_p]:font-serif [&_p]:italic [&_p]:font-medium [&_p]:text-[24px] [&_p]:leading-[1.5] [&_p]:m-0 ${
          isAuthorNote ? '[&_p]:text-amber-200/90' : '[&_p]:text-nexus-text/90'
        }`}
      />

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-4 mt-10 p-6 bg-nexus-950/30 rounded-[32px] border border-nexus-800/40">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-5 py-2.5 rounded-2xl bg-nexus-900 border border-nexus-800 text-[11px] font-black text-nexus-muted uppercase tracking-widest hover:border-nexus-accent hover:text-nexus-text transition-all cursor-default"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>

    {reifiedContext && (
      <div className="p-8 bg-nexus-950 border border-nexus-800 rounded-[40px] flex items-center justify-between gap-6 shadow-inner">
        <div className="flex-1 min-w-0 text-center">
          <div className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest mb-1 opacity-50">
            Origin
          </div>
          <div className="text-[14px] font-bold text-nexus-text truncate">
            {reifiedContext.sourceName}
          </div>
        </div>
        <div className="flex flex-col items-center gap-2 shrink-0 px-4">
          <Activity size={20} className="text-nexus-accent animate-pulse" />
          <div className="text-[12px] font-display font-black text-nexus-accent uppercase tracking-[0.2em] italic">
            {reifiedContext.verb}
          </div>
          <ArrowRight size={16} className="text-nexus-accent opacity-50" />
        </div>
        <div className="flex-1 min-w-0 text-center">
          <div className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest mb-1 opacity-50">
            Terminal
          </div>
          <div className="text-[14px] font-bold text-nexus-text truncate">
            {reifiedContext.targetName}
          </div>
        </div>
      </div>
    )}

    <div className="flex items-center justify-between">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4 px-6 py-3 rounded-2xl bg-nexus-800 border border-nexus-700 text-[14px] font-display font-black text-nexus-muted uppercase tracking-widest">
          <Layers size={20} className="opacity-40" /> {childrenCount} Connections
        </div>
      </div>
      <div className="flex items-center gap-3 text-[14px] font-mono text-nexus-muted font-bold">
        <Hash size={18} className="opacity-30" /> {objectId.slice(0, 8)}
      </div>
    </div>
  </div>
);
