import React from 'react';
import { PenTool, Activity } from 'lucide-react';
import { NexusObject, NexusNote } from '../../../../../types';

interface NeuralAbstractProps {
  object: NexusObject;
  onUpdate: (val: Partial<NexusObject>) => void;
}

export const NeuralAbstract: React.FC<NeuralAbstractProps> = ({ object, onUpdate }) => {
  const activeNote = object as NexusNote;
  const gist = activeNote.gist || '';
  const prose = activeNote.prose_content || '';

  // Prose Health Logic: Comparing outline (gist) to actual prose content
  const healthPercentage =
    prose.length > 0 ? Math.min(100, (prose.length / Math.max(gist.length * 5, 500)) * 100) : 0;

  const healthColor =
    healthPercentage > 80
      ? 'bg-green-500'
      : healthPercentage > 30
        ? 'bg-nexus-accent'
        : 'bg-nexus-ruby';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-nexus-amber/10 border border-nexus-amber/20 text-nexus-amber">
            <PenTool size={14} />
          </div>
          <h3 className="text-xs font-black text-nexus-text uppercase tracking-[0.2em] italic">
            Neural Abstract
          </h3>
        </div>

        {/* Health Meter Chip */}
        <div className="flex items-center gap-2 px-3 py-1 bg-nexus-900/60 border border-nexus-800/80 rounded-full">
          <Activity
            size={10}
            className={
              healthPercentage > 0 ? healthColor.replace('bg-', 'text-') : 'text-nexus-muted'
            }
          />
          <span className="text-[8px] font-mono font-bold text-nexus-muted tracking-widest uppercase">
            PROSE_SYNC::{Math.round(healthPercentage)}%
          </span>
        </div>
      </div>

      <div className="relative group">
        <textarea
          value={gist}
          onChange={(e) => onUpdate({ gist: e.target.value })}
          className="w-full h-32 bg-nexus-900 border border-nexus-800 rounded-2xl p-5 text-[13px] text-nexus-text/90 font-serif italic outline-none focus:border-nexus-accent resize-none no-scrollbar leading-relaxed shadow-inner transition-all placeholder:text-nexus-muted/20"
          placeholder="Establish the core essence of this identity..."
        />

        {/* Visual Underline Sync */}
        <div className="absolute bottom-0 left-5 right-5 h-[1px] bg-nexus-800/50">
          <div
            className={`h-full ${healthColor} transition-all duration-1000 shadow-[0_0_10px_rgba(var(--accent-rgb),0.5)]`}
            style={{ width: `${healthPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};
