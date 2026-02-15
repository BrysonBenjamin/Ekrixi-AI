import React from 'react';
import { GitMerge, Activity } from 'lucide-react';
import { NexusObject, NexusType, isReified, isLink } from '../../../../../types';

interface ReificationPromotionProps {
  object: NexusObject;
  onUpdate: (val: Partial<NexusObject>) => void;
}

export const ReificationPromotion: React.FC<ReificationPromotionProps> = ({ object, onUpdate }) => {
  const isL = isLink(object);
  if (!isL) return null;

  const reified = isReified(object);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-nexus-blue/10 border border-nexus-blue/20">
          <GitMerge className="text-nexus-blue" size={14} />
        </div>
        <h3 className="text-xs font-black text-nexus-text uppercase tracking-[0.2em] italic">
          Entanglement State
        </h3>
      </div>

      <div className="bg-nexus-900/40 border border-nexus-800/80 rounded-2xl p-5 shadow-inner backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-[10px] font-black text-nexus-text uppercase tracking-wider">
              Cognitive Reification
            </div>
            <div className="text-[8px] text-nexus-muted font-medium italic opacity-70">
              {reified ? 'Manifested as independent concept' : 'Simple relational bond'}
            </div>
          </div>
          <button
            onClick={() => {
              const nextType = reified ? NexusType.SIMPLE_LINK : NexusType.AGGREGATED_SIMPLE_LINK;
              onUpdate({ _type: nextType } as Partial<NexusObject>);
            }}
            className={`px-4 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${
              reified
                ? 'bg-nexus-accent/20 border-nexus-accent text-nexus-accent shadow-[0_0_15px_rgba(var(--nexus-accent-rgb),0.2)]'
                : 'bg-nexus-900 border-nexus-800 text-nexus-muted hover:border-nexus-accent/50'
            }`}
          >
            {reified ? 'REIFIED' : 'REIFY'}
          </button>
        </div>
      </div>
    </div>
  );
};
