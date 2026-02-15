import React from 'react';
import { GitBranch, ArrowRight } from 'lucide-react';
import { NexusObject, SimpleNote, NexusLink } from '../../../types';

interface IntegrityPathTraceProps {
  path: string[];
  registry: Record<string, NexusObject>;
  className?: string;
}

export const IntegrityPathTrace: React.FC<IntegrityPathTraceProps> = ({
  path,
  registry,
  className = '',
}) => {
  if (!path || path.length === 0) return null;

  return (
    <div className={`flex items-center gap-2 overflow-x-auto no-scrollbar py-1 ${className}`}>
      <GitBranch size={10} className="text-nexus-muted shrink-0" />
      <span className="text-[8px] font-mono text-nexus-muted/60 uppercase whitespace-nowrap">
        Path:
      </span>
      <div className="flex items-center gap-1.5">
        {path.map((nodeId, idx) => {
          const node = registry[nodeId];
          const label =
            node && 'title' in node
              ? (node as SimpleNote).title
              : node && 'verb' in node
                ? (node as NexusLink).verb
                : nodeId.slice(0, 4);
          return (
            <React.Fragment key={`${nodeId}-${idx}`}>
              <div
                className="text-[8px] font-mono text-nexus-accent font-bold px-2 py-0.5 bg-nexus-950 rounded border border-nexus-800 whitespace-nowrap max-w-[80px] truncate"
                title={label}
              >
                {label}
              </div>
              {idx < path.length - 1 && (
                <ArrowRight size={8} className="text-nexus-muted/40 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
