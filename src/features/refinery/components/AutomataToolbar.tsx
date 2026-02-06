import React from 'react';
import { Merge, Dna, ShieldAlert, Sparkles, X } from 'lucide-react';
import { NexusObject } from '../../../types';

interface AutomataToolbarProps {
  selectedObject: NexusObject | null;
  onAction?: (action: string) => void;
  onClose?: () => void;
}

export const AutomataToolbar: React.FC<AutomataToolbarProps> = ({
  selectedObject,
  onAction,
  onClose,
}) => {
  return (
    <aside className="w-full h-full md:w-64 border-l border-nexus-800 bg-nexus-900 flex flex-col shrink-0">
      <div className="p-4 border-b border-nexus-800 bg-nexus-900/60 flex items-center justify-between">
        <h3 className="text-[10px] font-bold text-nexus-accent uppercase tracking-[0.2em] flex items-center gap-2">
          <Sparkles size={14} className="text-nexus-accent" /> AI Automata
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden text-slate-500 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="p-3 space-y-4">
        <AutomataButton
          icon={Merge}
          title="Fuse Similars"
          desc="Merge near-duplicates"
          onClick={() => onAction?.('fuse')}
        />
        <AutomataButton
          icon={Dna}
          title="Semantic Linker"
          desc="Discover latent ties"
          onClick={() => onAction?.('linker')}
        />
        <AutomataButton
          icon={ShieldAlert}
          title="Consistency Audit"
          desc="Scan for lore gaps"
          onClick={() => onAction?.('audit')}
        />
      </div>

      <div className="px-4 py-8 mt-4 border-y border-nexus-800/50 bg-black/20">
        <div className="text-[9px] font-bold text-slate-700 uppercase tracking-widest text-center mb-4">
          Nexus Stability Index
        </div>
        <div className="w-full h-1 bg-nexus-800 rounded-full overflow-hidden">
          <div className="w-[84%] h-full bg-nexus-500 shadow-[0_0_10px_#6366f1]" />
        </div>
        <div className="flex justify-between mt-2 text-[8px] font-mono text-slate-600">
          <span>84.2% CONSISTENCY</span>
          <span>v3.2.R</span>
        </div>
      </div>

      {selectedObject && (
        <div className="mt-auto border-t border-nexus-800 p-4 bg-nexus-950/40">
          <div className="text-[10px] text-slate-500 uppercase font-bold mb-3">Unit Telemetry</div>
          <div className="space-y-2">
            <div className="flex justify-between text-[9px] font-mono">
              <span className="text-slate-600 uppercase">Mass Index:</span>
              <span className="text-nexus-accent">{selectedObject.internal_weight.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[9px] font-mono">
              <span className="text-slate-600 uppercase">Complexity:</span>
              <span className="text-nexus-500">
                {(selectedObject as any).total_subtree_mass || 0}
              </span>
            </div>
            <div className="flex justify-between text-[9px] font-mono">
              <span className="text-slate-600 uppercase">Integrity:</span>
              <span className="text-slate-500">OPTIMAL</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

const AutomataButton = ({ icon: Icon, title, desc, onClick }: any) => (
  <button
    onClick={onClick}
    className="w-full flex items-start gap-3 p-3 rounded-xl bg-nexus-950/50 border border-nexus-800 hover:border-nexus-600 hover:bg-nexus-900 transition-all text-left group"
  >
    <div className="p-2 rounded-lg bg-nexus-900 border border-nexus-800 group-hover:border-nexus-500 group-hover:bg-nexus-800 transition-all">
      <Icon size={16} className="text-nexus-500 group-hover:text-nexus-accent" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-[11px] font-bold text-white uppercase tracking-wider mb-0.5">
        {title}
      </div>
      <div className="text-[10px] text-slate-500 leading-tight">{desc}</div>
    </div>
  </button>
);
