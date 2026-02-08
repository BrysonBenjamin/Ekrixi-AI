import React from 'react';
import { Scan, BrainCircuit, ShieldCheck, RefreshCw, ChevronRight, Wand2 } from 'lucide-react';
import { ScanStage } from '../ScannerFeature';
import { Logo } from '../../../components/shared/Logo';

interface ScannerHeaderProps {
  stage: ScanStage;
  onReset: () => void;
}

export const ScannerHeader: React.FC<ScannerHeaderProps> = ({ stage, onReset }) => {
  const steps = [
    { id: 'INPUT', label: 'Intel Entry', icon: Scan },
    { id: 'PREPROCESS', label: 'Preprocessing', icon: Wand2 },
    { id: 'PROCESSING', label: 'Neural Extraction', icon: BrainCircuit },
    { id: 'REVIEW', label: 'Tactical Review', icon: ShieldCheck },
  ];

  return (
    <header className="h-16 md:h-20 border-b border-nexus-800 bg-nexus-900/50 backdrop-blur-md flex items-center px-4 md:px-8 justify-between shrink-0 z-50">
      <div className="flex items-center gap-3 md:gap-4">
        <div className="p-2 md:p-2.5 bg-nexus-accent/10 rounded-xl border border-nexus-accent/30 flex items-center justify-center">
          <Logo size={24} className="md:w-8 md:h-8" />
        </div>
        <div>
          <h1 className="text-base md:text-xl font-display font-black text-nexus-text tracking-tight leading-none mb-1 uppercase">
            Ekrixi <span className="text-nexus-accent hidden sm:inline">AI Scanner</span>
            <span className="text-nexus-accent sm:hidden">Scanner</span>
          </h1>
          <div className="text-[9px] md:text-[10px] text-nexus-muted font-mono uppercase tracking-[0.2em] flex items-center gap-2">
            <span className="hidden sm:inline">Intel-to-Unit Pipeline</span>
            <span className="lg:hidden text-nexus-accent flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-nexus-accent animate-pulse" />
              {steps.find((s) => s.id === stage)?.label}
            </span>
          </div>
        </div>
      </div>

      <nav className="hidden lg:flex items-center gap-6">
        {steps.map((step, idx) => {
          const isActive = stage === step.id;
          const isPast = steps.findIndex((s) => s.id === stage) > idx;
          const Icon = step.icon;

          return (
            <React.Fragment key={step.id}>
              <div
                className={`flex items-center gap-3 transition-all duration-500 ${isActive ? 'text-nexus-accent scale-105' : isPast ? 'text-nexus-muted' : 'text-nexus-muted/40'}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${isActive ? 'border-nexus-accent shadow-[0_0_15px_var(--accent-color)] shadow-opacity-30' : isPast ? 'border-nexus-accent/50 bg-nexus-accent/5' : 'border-nexus-700/50'}`}
                >
                  <Icon size={14} className={isActive ? 'animate-pulse' : ''} />
                </div>
                <span
                  className={`text-[10px] font-display font-black uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-60'}`}
                >
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <ChevronRight size={14} className="text-nexus-muted opacity-20" />
              )}
            </React.Fragment>
          );
        })}
      </nav>

      <button
        onClick={onReset}
        className="p-2 hover:bg-nexus-800 rounded-lg text-nexus-muted hover:text-nexus-text transition-all group"
        title="Reset Scanner"
      >
        <RefreshCw
          size={18}
          className="group-active:rotate-180 transition-transform duration-500"
        />
      </button>
    </header>
  );
};
