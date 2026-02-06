import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface DangerZoneProps {
  onClear: () => void;
}

export const DangerZone: React.FC<DangerZoneProps> = ({ onClear }) => {
  return (
    <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-8 mb-10">
      <h2 className="text-lg font-display font-bold text-red-500 mb-4 flex items-center gap-3">
        <AlertTriangle size={20} />
        Kernel Reset
      </h2>
      <p className="text-sm text-red-500/70 mb-8 max-w-2xl leading-relaxed">
        Initiating a system purge will permanently wipe the active registry memory. This action is
        irrecoverable unless a recent snapshot is available.
      </p>
      <button
        onClick={() => {
          if (window.confirm('CRITICAL: Final confirmation for system wipe required.')) onClear();
        }}
        className="w-full md:w-auto px-10 py-4 rounded-2xl bg-red-500/10 hover:bg-red-500 hover:text-white text-red-600 border border-red-500/30 font-display font-black uppercase tracking-[0.2em] text-[10px] transition-all flex items-center justify-center gap-3 shadow-xl"
      >
        <Trash2 size={16} /> Purge Registry Active Memory
      </button>
    </div>
  );
};
