import React from 'react';
import {
  ShieldAlert,
  X,
  RotateCw,
  AlertTriangle,
  Check,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

import { AuditResult } from './useStudioSpineLogic';

interface AuditModalProps {
  show: boolean;
  onClose: () => void;
  isAuditing: boolean;
  auditResult: AuditResult | null;
}

export const AuditModal: React.FC<AuditModalProps> = ({
  show,
  onClose,
  isAuditing,
  auditResult,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-8 bg-nexus-950/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-nexus-900 border border-nexus-800 rounded-[48px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
        <header className="h-20 flex items-center justify-between px-10 border-b border-nexus-800">
          <div className="flex items-center gap-4">
            <ShieldAlert
              size={24}
              className={
                auditResult?.status === 'NEEDS_REFACTOR' ? 'text-red-500' : 'text-nexus-essence'
              }
            />
            <div>
              <h3 className="text-xl font-display font-black text-nexus-text uppercase tracking-tight text-nexus-text">
                Structural <span className="text-nexus-ruby">Audit</span>
              </h3>
              <p className="text-[10px] font-mono text-nexus-muted uppercase tracking-widest">
                Neural Analysis Complete
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-nexus-muted hover:text-white">
            <X size={24} />
          </button>
        </header>
        <div className="p-10 space-y-8 overflow-y-auto no-scrollbar max-h-[70vh]">
          {isAuditing ? (
            <div className="py-20 flex flex-col items-center gap-4">
              <RotateCw className="animate-spin text-nexus-ruby" size={48} />
              <span className="text-[10px] font-black uppercase tracking-widest text-nexus-muted">
                Evaluating Sequence Fidelity...
              </span>
            </div>
          ) : (
            auditResult && (
              <>
                <div
                  className={`p-8 rounded-[32px] border ${auditResult.status === 'NEEDS_REFACTOR' ? 'bg-red-500/5 border-red-500/30' : 'bg-nexus-essence/5 border-nexus-essence/30'}`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    {auditResult.status === 'NEEDS_REFACTOR' ? (
                      <AlertTriangle className="text-red-500" size={20} />
                    ) : (
                      <Check className="text-nexus-essence" size={20} />
                    )}
                    <span
                      className={`text-[10px] font-black uppercase tracking-widest ${auditResult.status === 'NEEDS_REFACTOR' ? 'text-red-400' : 'text-nexus-essence'}`}
                    >
                      Status: {auditResult.status}
                    </span>
                  </div>
                  <p className="text-lg font-serif italic text-nexus-text leading-relaxed">
                    "{auditResult.critique}"
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {auditResult.alternatives.map((alt, i: number) => (
                    <div
                      key={i}
                      className="p-8 bg-nexus-950 border border-nexus-800 rounded-[32px] hover:border-nexus-ruby/50 transition-all group"
                    >
                      <h4 className="text-sm font-display font-black text-nexus-text uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Sparkles size={14} className="text-nexus-ruby" /> Alternative {i + 1}:{' '}
                        {alt.name}
                      </h4>
                      <p className="text-xs text-nexus-muted leading-relaxed font-serif">
                        {alt.rationale}
                      </p>
                      <button className="mt-6 text-[9px] font-black uppercase tracking-[0.2em] text-nexus-muted group-hover:text-nexus-ruby transition-colors flex items-center gap-2">
                        Explore Potential <ChevronRight size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
};
