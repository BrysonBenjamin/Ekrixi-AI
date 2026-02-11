import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  X,
  ChevronRight,
  Trash2,
  Share2,
  Info,
  Eye,
  Zap,
  BrainCircuit,
  History,
  CheckCircle2,
  Fingerprint,
  Target,
  Compass,
  ArrowLeft,
  LucideIcon,
} from 'lucide-react';
import { NexusObject, SimpleNote, SemanticLink, HierarchicalLink } from '../../../types';
import { GraphIntegrityService, IntegrityReport } from '../GraphIntegrityService';

interface IntegrityAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  registry: Record<string, NexusObject>;
  onResolve: (linkId: string, action: 'DELETE' | 'REIFY' | 'IGNORE') => void;
  onFocusAnomaly: (
    data: { linkId: string; path?: string[]; mode: 'CENTER' | 'DRILL' } | null,
  ) => void;
}

export const IntegrityAssistant: React.FC<IntegrityAssistantProps> = ({
  isOpen,
  onClose,
  registry,
  onResolve,
  onFocusAnomaly,
}) => {
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | null>(null);

  const anomalies = useMemo(() => {
    const report: Record<string, IntegrityReport> =
      GraphIntegrityService.getRegistryIntegrityMap(registry);
    return Object.entries(report)
      .filter(([_, info]) => info.status !== 'APPROVED')
      .map(([id, info]) => ({
        link: registry[id] as SemanticLink | HierarchicalLink,
        info,
      }));
  }, [registry]);

  const activeAnomaly = useMemo(
    () => anomalies.find((a) => a.link.id === selectedAnomalyId),
    [anomalies, selectedAnomalyId],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-[420px] bg-nexus-900 border-l border-nexus-800 shadow-[-20px_0_60px_rgba(0,0,0,0.5)] z-[600] flex flex-col animate-in slide-in-from-right duration-500 font-sans">
      {/* Header */}
      <header className="h-20 border-b border-nexus-800 flex items-center justify-between px-8 shrink-0 bg-nexus-900/80 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          {activeAnomaly ? (
            <button
              onClick={() => {
                setSelectedAnomalyId(null);
                onFocusAnomaly(null);
              }}
              className="p-2 -ml-2 text-nexus-muted hover:text-nexus-accent transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
          ) : (
            <div className="p-3 bg-nexus-accent/10 rounded-2xl border border-nexus-accent/30 text-nexus-accent">
              <BrainCircuit size={24} className="animate-pulse" />
            </div>
          )}
          <div>
            <h2 className="text-sm font-display font-black text-nexus-text uppercase tracking-[0.3em]">
              {activeAnomaly ? 'Anomaly Audit' : 'Integrity Oracle'}
            </h2>
            <p className="text-[10px] text-nexus-muted font-mono uppercase tracking-widest mt-1">
              {activeAnomaly ? `Logic: ${activeAnomaly.link.verb}` : 'Status: Monitoring Drift'}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            onFocusAnomaly(null);
            onClose();
          }}
          className="p-2 text-nexus-muted hover:text-nexus-text transition-colors"
        >
          <X size={20} />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 no-scrollbar space-y-6">
        {anomalies.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-40 px-10">
            <div className="p-8 rounded-full bg-nexus-essence/10 border border-nexus-essence/20 mb-6">
              <CheckCircle2 size={48} className="text-nexus-essence" />
            </div>
            <h3 className="text-lg font-display font-black text-nexus-text uppercase tracking-widest mb-2">
              Registry Unified
            </h3>
            <p className="text-xs text-nexus-muted leading-relaxed font-serif italic">
              "The Chronicler finds no logic drift in the current sector. Your knowledge
              architecture is structurally sound."
            </p>
          </div>
        ) : activeAnomaly ? (
          /* Detail View */
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <div className="p-8 bg-nexus-950 border border-nexus-800 rounded-[40px] shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                <Fingerprint size={80} />
              </div>

              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-nexus-accent/10 rounded-xl">
                  <ShieldAlert size={18} className="text-nexus-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xs font-display font-black text-nexus-text uppercase tracking-widest">
                    Chronicler's Audit
                  </h3>
                  <div className="text-[8px] font-mono text-red-500 uppercase mt-0.5 font-bold">
                    {activeAnomaly.info.status} DETECTED
                  </div>
                </div>
              </div>

              <p className="text-[13px] text-nexus-muted leading-relaxed font-serif italic mb-8">
                "{activeAnomaly.info.reason}"
              </p>

              <div className="flex gap-2 mb-8">
                <button
                  onClick={() =>
                    onFocusAnomaly({
                      linkId: activeAnomaly.link.id,
                      path: activeAnomaly.info.path,
                      mode: 'CENTER',
                    })
                  }
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-nexus-800 border border-nexus-700 text-[10px] font-black uppercase tracking-widest text-nexus-muted hover:text-nexus-text transition-all shadow-sm"
                >
                  <Target size={14} /> Center
                </button>
                <button
                  onClick={() =>
                    onFocusAnomaly({
                      linkId: activeAnomaly.link.id,
                      path: activeAnomaly.info.path,
                      mode: 'DRILL',
                    })
                  }
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-nexus-accent/10 border border-nexus-accent/30 text-[10px] font-black uppercase tracking-widest text-nexus-accent hover:bg-nexus-accent hover:text-white transition-all shadow-sm"
                >
                  <Compass size={14} /> Drill Down
                </button>
              </div>

              <div className="p-5 bg-nexus-900 border border-nexus-800 rounded-2xl mb-8 space-y-4">
                <div className="text-[9px] font-display font-black text-nexus-accent uppercase tracking-widest flex items-center gap-2">
                  <Info size={12} /> Suggestion
                </div>
                <p className="text-[11px] text-nexus-text font-medium leading-snug">
                  {activeAnomaly.info.suggestion}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <DecisionButton
                  icon={Trash2}
                  label="Terminate Logic"
                  desc="Purge redundant scry"
                  color="text-red-500"
                  bg="bg-red-500/10"
                  onClick={() => {
                    onResolve(activeAnomaly.link.id, 'DELETE');
                    setSelectedAnomalyId(null);
                  }}
                />
                <DecisionButton
                  icon={Share2}
                  label="Reify Logic"
                  desc="Promote to independent unit"
                  color="text-nexus-accent"
                  bg="bg-nexus-accent/10"
                  onClick={() => {
                    onResolve(activeAnomaly.link.id, 'REIFY');
                    setSelectedAnomalyId(null);
                  }}
                />
                <DecisionButton
                  icon={Eye}
                  label="Sequester"
                  desc="Leave logic active for now"
                  color="text-nexus-muted"
                  bg="bg-nexus-800"
                  onClick={() => {
                    setSelectedAnomalyId(null);
                    onFocusAnomaly(null);
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          /* List View */
          <div className="px-2 animate-in fade-in duration-300">
            <div className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.4em] mb-6 flex items-center gap-3">
              <Zap size={14} className="text-nexus-accent" /> Anomalies Detected ({anomalies.length}
              )
            </div>
            <div className="space-y-3">
              {anomalies.map(({ link, info }) => (
                <button
                  key={link.id}
                  onClick={() => {
                    setSelectedAnomalyId(link.id);
                    onFocusAnomaly({ linkId: link.id, path: info.path, mode: 'CENTER' });
                  }}
                  className={`w-full text-left p-5 rounded-[28px] border transition-all group relative overflow-hidden ${selectedAnomalyId === link.id ? 'bg-nexus-accent/5 border-nexus-accent shadow-lg' : 'bg-nexus-950 border-nexus-800 hover:border-nexus-700'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[8px] font-mono font-black px-2 py-0.5 rounded-full border ${info.status === 'REDUNDANT' ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-amber-500/10 border-amber-500/30 text-amber-500'}`}
                    >
                      {info.status}
                    </span>
                    <ChevronRight
                      size={14}
                      className={`transition-transform group-hover:translate-x-1 ${selectedAnomalyId === link.id ? 'rotate-90 text-nexus-accent' : 'text-nexus-muted'}`}
                    />
                  </div>
                  <div className="text-xs font-display font-bold text-nexus-text uppercase truncate">
                    {/* Fix: Access 'title' via SimpleNote cast or fallback */}
                    {'title' in (registry[link.source_id] || {})
                      ? (registry[link.source_id] as SimpleNote).title
                      : '?'}
                    {' → '}
                    {'title' in (registry[link.target_id] || {})
                      ? (registry[link.target_id] as SimpleNote).title
                      : '?'}
                  </div>
                  <div className="text-[10px] text-nexus-muted mt-1 italic">
                    Logic: "{link.verb}"
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer Persona */}
      <footer className="p-8 border-t border-nexus-800 bg-nexus-950 flex items-center gap-4 shrink-0">
        <div className="w-10 h-10 rounded-full bg-nexus-900 border border-nexus-800 flex items-center justify-center text-nexus-accent shrink-0 shadow-lg">
          <History size={20} />
        </div>
        <div>
          <div className="text-[10px] font-display font-black text-nexus-text uppercase tracking-widest">
            The Chronicler
          </div>
          <div className="text-[8px] text-nexus-muted font-mono uppercase tracking-[0.2em] opacity-60">
            Logic Engine v4.8
          </div>
        </div>
      </footer>
    </div>
  );
};

interface DecisionButtonProps {
  icon: LucideIcon;
  label: string;
  desc: string;
  color: string;
  bg: string;
  onClick: () => void;
}

const DecisionButton: React.FC<DecisionButtonProps> = ({
  icon: Icon,
  label,
  desc,
  color,
  bg,
  onClick,
}) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-nexus-900/40 border border-nexus-800 hover:border-nexus-700 hover:bg-nexus-900 transition-all group text-left"
  >
    <div
      className={`p-2.5 rounded-xl ${bg} ${color} transition-transform group-hover:scale-110 shadow-sm`}
    >
      <Icon size={18} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-[12px] font-display font-bold text-nexus-text transition-colors">
        {label}
      </div>
      <div className="text-[8px] font-mono uppercase tracking-widest text-nexus-muted mt-0.5">
        {desc}
      </div>
    </div>
  </button>
);
