import React from 'react';
import { Package, FlaskConical, ChevronRight } from 'lucide-react';
import type { RefineryBatch } from '../types';

interface RefineryInboxProps {
  batches: RefineryBatch[];
  onSelectBatch: (batchId: string) => void;
  onNavigateToPlayground: () => void;
}

export const RefineryInbox: React.FC<RefineryInboxProps> = ({
  batches,
  onSelectBatch,
  onNavigateToPlayground,
}) => {
  return (
    <div className="p-8 md:p-12 h-full flex flex-col">
      <div className="flex items-center justify-between mb-12">
        <h1 className="text-4xl font-display font-black uppercase text-nexus-text tracking-tighter">
          Refinery <span className="text-nexus-accent">Inbox</span>
        </h1>
        <div className="flex items-center gap-4 text-xs md:text-[10px] font-mono font-black text-nexus-muted uppercase tracking-widest opacity-40">
          Intel Ready: {batches.length} BATCHES
        </div>
      </div>

      {batches.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-700">
          <div className="p-10 bg-nexus-900 rounded-[64px] border border-nexus-800 shadow-2xl relative">
            <Package size={80} className="text-nexus-muted opacity-20" />
            <div className="absolute -top-4 -right-4 w-12 h-12 bg-nexus-accent rounded-2xl flex items-center justify-center text-white shadow-lg animate-bounce">
              <FlaskConical size={24} />
            </div>
          </div>
          <div className="text-center space-y-3">
            <h3 className="text-2xl font-display font-bold text-nexus-text uppercase">
              Extraction Buffer Empty
            </h3>
            <p className="text-sm text-nexus-muted font-serif italic max-w-sm mx-auto opacity-70">
              "No unprocessed scry data found. Use the Playground to inject development fixtures or
              the Scanner for lore extraction."
            </p>
          </div>
          <div className="flex gap-4">
            <button
              disabled
              className="px-8 py-4 bg-nexus-900 border border-nexus-800 rounded-3xl text-[10px] font-black uppercase tracking-widest text-nexus-muted opacity-50"
            >
              Open Scanner
            </button>
            <div className="text-nexus-accent animate-pulse px-2 flex items-center">
              <ChevronRight />
            </div>
            <div className="p-1 rounded-3xl bg-nexus-accent/10 border border-nexus-accent/20">
              <button
                onClick={onNavigateToPlayground}
                className="px-8 py-4 bg-nexus-accent text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-nexus-accent/20 hover:brightness-110 transition-all active:scale-95"
              >
                Go to Playground
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {batches.map((b) => (
            <button
              key={b.id}
              onClick={() => onSelectBatch(b.id)}
              className="group p-8 bg-nexus-900 border border-nexus-800 rounded-[40px] text-left hover:border-nexus-accent hover:translate-y-[-4px] transition-all duration-500 shadow-xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-nexus-950 rounded-2xl border border-nexus-800 text-nexus-muted group-hover:text-nexus-accent transition-colors">
                  <Package size={20} />
                </div>
                <div className="text-xs md:text-[10px] font-mono font-black text-nexus-muted uppercase tracking-widest opacity-40">
                  {b.source}
                </div>
              </div>
              <div className="text-xl font-display font-bold text-nexus-text mb-2 truncate group-hover:text-nexus-accent transition-colors">
                {b.name}
              </div>
              <div className="text-xs md:text-[10px] text-nexus-muted uppercase font-black tracking-widest">
                {b.items.length} Structural Units
              </div>
              <div className="mt-8 flex items-center justify-between text-[9px] font-black text-nexus-muted uppercase tracking-widest opacity-30 group-hover:opacity-100 transition-opacity">
                <span>Initialize Scry</span>
                <ChevronRight size={14} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
