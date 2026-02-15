import React from 'react';
import { Sparkles, X } from 'lucide-react';

interface ScryEraSelectMenuProps {
  scryDate: { year: number; month?: number; day?: number };
  setScryDate: (date: { year: number; month?: number; day?: number }) => void;
  onBack: () => void;
  onManifest: () => void;
}

export const ScryEraSelectMenu: React.FC<ScryEraSelectMenuProps> = ({
  scryDate,
  setScryDate,
  onBack,
  onManifest,
}) => {
  return (
    <div className="p-2 animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="flex items-center justify-between mb-4 px-2">
        <span className="text-[9px] font-display font-black text-fuchsia-400 uppercase tracking-widest flex items-center gap-2">
          <Sparkles size={12} /> Target Date
        </span>
        <button onClick={onBack} className="text-nexus-muted hover:text-white transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="space-y-3 px-1">
        <div className="space-y-1">
          <label className="text-[7px] font-mono font-bold text-nexus-muted/60 uppercase ml-1">
            Year
          </label>
          <input
            type="number"
            value={scryDate.year}
            onChange={(e) => setScryDate({ ...scryDate, year: parseInt(e.target.value) || 0 })}
            className="w-full bg-nexus-950 border border-nexus-800 rounded-lg px-3 py-2 text-[11px] font-mono text-nexus-text outline-none focus:border-fuchsia-500/50"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[7px] font-mono font-bold text-nexus-muted/60 uppercase ml-1">
              Month
            </label>
            <input
              type="number"
              min="1"
              max="12"
              placeholder="MM"
              value={scryDate.month || ''}
              onChange={(e) =>
                setScryDate({ ...scryDate, month: parseInt(e.target.value) || undefined })
              }
              className="w-full bg-nexus-950 border border-nexus-800 rounded-lg px-3 py-2 text-[11px] font-mono text-nexus-text outline-none focus:border-fuchsia-500/50"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[7px] font-mono font-bold text-nexus-muted/60 uppercase ml-1">
              Day
            </label>
            <input
              type="number"
              min="1"
              max="31"
              placeholder="DD"
              value={scryDate.day || ''}
              onChange={(e) =>
                setScryDate({ ...scryDate, day: parseInt(e.target.value) || undefined })
              }
              className="w-full bg-nexus-950 border border-nexus-800 rounded-lg px-3 py-2 text-[11px] font-mono text-nexus-text outline-none focus:border-fuchsia-500/50"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={onManifest}
            className="w-full py-2.5 rounded-xl bg-nexus-accent/10 border border-nexus-accent/20 text-nexus-accent hover:bg-nexus-accent hover:text-white transition-all text-[10px] font-display font-black uppercase tracking-widest shadow-lg"
          >
            Manifest Snapshot
          </button>
        </div>
      </div>
    </div>
  );
};
