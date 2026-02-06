import React, { useState, useEffect } from 'react';
import { BrainCircuit, Binary, Search } from 'lucide-react';

interface ScannerProcessingProps {
  customStatus?: string;
}

export const ScannerProcessing: React.FC<ScannerProcessingProps> = ({ customStatus }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 98; // Hold at 98 until actual stage completion
        return prev + Math.random() * 0.8;
      });
    }, 150);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col items-center justify-center p-4 md:p-8 text-center animate-in fade-in duration-700">
      <div className="relative mb-8 md:mb-12">
        <div className="absolute inset-0 bg-nexus-accent/10 rounded-full blur-[60px] md:blur-[80px] animate-pulse"></div>
        <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-2xl md:rounded-[32px] bg-nexus-900 border border-nexus-accent/20 flex items-center justify-center shadow-2xl">
          <BrainCircuit className="text-nexus-accent animate-pulse w-12 h-12 md:w-16 md:h-16" />
        </div>

        {/* Orbiting Elements */}
        <div className="absolute -top-3 -right-3 md:-top-4 md:-right-4 w-8 h-8 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-nexus-800 border border-nexus-700 flex items-center justify-center animate-bounce duration-[2000ms] shadow-lg">
          <Binary className="text-nexus-accent w-4 h-4 md:w-5 md:h-5" />
        </div>
        <div className="absolute -bottom-4 -left-1 md:-bottom-6 md:-left-2 w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-nexus-800 border border-nexus-700 flex items-center justify-center animate-bounce duration-[1500ms] delay-300 shadow-lg">
          <Search className="text-nexus-accent w-3 h-3 md:w-4 md:h-4" />
        </div>
      </div>

      <div className="w-full max-w-md space-y-6 md:space-y-8">
        <div>
          <h2 className="text-xl md:text-3xl font-display font-black text-nexus-text mb-2 md:mb-3 tracking-tighter uppercase min-h-[1.5em] px-4">
            {customStatus || 'Booting Extraction Kernel...'}
          </h2>
          <p className="text-[9px] md:text-[10px] text-nexus-muted font-mono font-bold uppercase tracking-[0.2em] md:tracking-[0.4em]">
            Neural Engine Phase: extraction_active
          </p>
        </div>

        <div className="relative h-1.5 md:h-2 w-full bg-nexus-800 rounded-full overflow-hidden border border-nexus-700 shadow-inner">
          <div
            className="h-full bg-nexus-accent transition-all duration-300 shadow-[0_0_15px_var(--accent-color)] shadow-opacity-40"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-4 md:gap-6 pt-2 md:pt-4">
          <ProcessIndicator label="Scout" active={progress > 10} />
          <ProcessIndicator label="Architect" active={progress > 40} />
          <ProcessIndicator label="Chronicler" active={progress > 75} />
        </div>
      </div>
    </div>
  );
};

const ProcessIndicator = ({ label, active }: { label: string; active: boolean }) => (
  <div className="flex flex-col items-center gap-3">
    <div
      className={`w-3 h-3 rounded-full transition-all duration-500 ${active ? 'bg-nexus-accent shadow-[0_0_8px_var(--accent-color)]' : 'bg-nexus-700'}`}
    />
    <span
      className={`text-[10px] font-display font-black uppercase tracking-widest transition-colors duration-500 ${active ? 'text-nexus-text' : 'text-nexus-muted opacity-40'}`}
    >
      {label}
    </span>
  </div>
);
