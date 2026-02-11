import React from 'react';
import { AlertTriangle, ShieldX, Lightbulb } from 'lucide-react';
import { ConflictStatus } from '../../../types';

interface IntegrityBadgeProps {
  status: ConflictStatus;
  reason?: string;
  suggestion?: string;
  isCycle?: boolean;
  variant?: 'detailed' | 'minimal';
  className?: string;
}

export const IntegrityBadge: React.FC<IntegrityBadgeProps> = ({
  status,
  reason,
  suggestion,
  isCycle,
  variant = 'detailed',
  className = '',
}) => {
  if (status === 'APPROVED' && !isCycle) return null;

  const isRedundant = status === 'REDUNDANT' || isCycle;

  if (variant === 'minimal') {
    return (
      <div
        className={`p-1.5 rounded-lg border transition-all duration-300 ${isRedundant ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-amber-500/10 border-amber-500/30 text-amber-500'} ${className}`}
        title={reason}
      >
        {isRedundant ? <ShieldX size={12} /> : <AlertTriangle size={12} />}
      </div>
    );
  }

  return (
    <div
      className={`p-4 rounded-[24px] flex flex-col gap-3 animate-in slide-in-from-top-2 border shadow-sm ${isRedundant ? 'bg-red-500/5 border-red-500/20' : 'bg-amber-500/5 border-amber-500/20'} ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`p-1.5 rounded-lg ${isRedundant ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'}`}
        >
          {isRedundant ? <ShieldX size={14} /> : <AlertTriangle size={14} />}
        </div>
        <span
          className={`text-[10px] font-display font-black uppercase tracking-[0.2em] ${isRedundant ? 'text-red-400' : 'text-amber-400'}`}
        >
          {isCycle
            ? 'Causal Loop Detected'
            : isRedundant
              ? 'Redundancy Blocked'
              : 'Implied Relation'}
        </span>
      </div>

      {reason && (
        <p className="text-[11px] text-nexus-muted leading-relaxed font-serif italic pl-1">
          "{reason}"
        </p>
      )}

      {suggestion && (
        <div className="mt-1 flex items-start gap-3 p-3 bg-nexus-950/40 rounded-xl border border-nexus-800/50 group transition-all hover:border-nexus-accent/30">
          <Lightbulb size={12} className="text-nexus-accent shrink-0 mt-0.5 animate-pulse" />
          <div className="flex-1">
            <div className="text-[8px] font-display font-black text-nexus-accent uppercase tracking-widest mb-1">
              Structural Suggestion
            </div>
            <p className="text-[10px] text-nexus-muted font-medium leading-tight group-hover:text-nexus-text transition-colors">
              {suggestion}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
