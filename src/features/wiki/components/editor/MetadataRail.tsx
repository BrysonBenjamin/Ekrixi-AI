import React from 'react';
import { NexusNote, NexusCategory } from '../../../../types';
import { History, Calendar, GitCommit, Copy } from 'lucide-react';
import { getTimeState } from '../../../../core/utils/nexus-accessors';

interface MetadataRailProps {
  node: NexusNote;
  historyStack: NexusNote[];

  onSelectSnapshot: (id: string) => void;
  onUpdate: (updates: Partial<NexusNote>) => void;
  onCreateSnapshot: () => void;
}

export const MetadataRail: React.FC<MetadataRailProps> = ({
  node,
  historyStack,
  onSelectSnapshot,
  onUpdate,
  onCreateSnapshot,
}) => {
  const isSnapshot = !!node.time_state?.parent_identity_id;

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* 
        ------------------------------------
        PROPERTIES FORM
        ------------------------------------
      */}
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-[9px] font-black uppercase tracking-widest text-nexus-muted opacity-60 pl-1">
            Type Classification
          </label>
          <select
            value={node.category_id || NexusCategory.CONCEPT}
            onChange={(e) => onUpdate({ category_id: e.target.value as NexusCategory })}
            className="w-full bg-nexus-900 border border-nexus-800 rounded-lg px-2 py-1.5 text-xs text-nexus-text outline-none focus:border-nexus-accent"
          >
            {Object.values(NexusCategory).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="w-full h-px bg-nexus-800/30" />

      {/* 
        ------------------------------------
        HISTORY STACK (Root Logic Only)
        ------------------------------------
      */}
      {!isSnapshot && (
        <div className="space-y-3">
          <div className="flex items-center justify-between pr-1">
            <h4 className="text-[9px] font-black uppercase tracking-widest text-nexus-muted opacity-60 pl-1 flex items-center gap-2">
              <History size={12} /> Temporal History
            </h4>
            <button
              onClick={onCreateSnapshot}
              className="text-[9px] px-2 py-0.5 bg-nexus-800 hover:bg-nexus-accent hover:text-white rounded text-nexus-muted transition-colors"
            >
              + SNAP
            </button>
          </div>

          <div className="space-y-2 relative">
            {/* Vertical Line */}
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-nexus-800/50" />

            {historyStack.length === 0 ? (
              <div className="pl-8 py-2 text-xs text-nexus-muted italic opacity-40">
                No recorded history.
              </div>
            ) : (
              historyStack.map((snap) => {
                const time = getTimeState(snap);
                const year = time?.effective_date?.year || '????';

                return (
                  <button
                    key={snap.id}
                    onClick={() => onSelectSnapshot(snap.id)}
                    className="relative w-full flex items-center gap-3 pl-1 py-1.5 group"
                  >
                    {/* Dot */}
                    <div className="relative z-10 w-2 h-2 rounded-full bg-nexus-800 border border-nexus-950 group-hover:bg-amber-500 transition-colors ml-[11px]" />

                    <div className="flex-1 text-left px-2 py-1.5 rounded-lg hover:bg-nexus-800/50 transition-colors">
                      <div className="text-xs font-mono font-bold text-nexus-text group-hover:text-amber-500">
                        {year} AD
                      </div>
                      <div className="text-[9px] text-nexus-muted truncate opacity-70">
                        {snap.title.replace(/.*\((.*)\)/, '$1') || 'Snapshot'}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 
        ------------------------------------
        SNAPSHOT INFO (Snapshot Logic Only)
        ------------------------------------
      */}
      {isSnapshot && (
        <div className="p-4 bg-amber-900/10 border border-amber-500/20 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-amber-500">
            <Calendar size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">
              Historical Record
            </span>
          </div>
          <p className="text-xs text-amber-200/70 leading-relaxed">
            You are viewing a static snapshot of this entity from
            <strong className="text-amber-100 ml-1">
              {getTimeState(node)?.effective_date?.year || '????'} AD
            </strong>
            .
          </p>
          <div className="pt-2">
            <button
              onClick={() => onSelectSnapshot(node.time_state?.parent_identity_id || '')}
              className="text-[10px] underline text-amber-500/50 hover:text-amber-500"
            >
              Return to Present
            </button>
          </div>
        </div>
      )}

      <div className="mt-auto pt-10">
        <button
          className="w-full flex items-center justify-center gap-2 p-2 rounded border border-nexus-800 text-[10px] font-mono text-nexus-muted hover:text-nexus-text hover:bg-nexus-800/50 transition-colors group"
          onClick={() => navigator.clipboard.writeText(node.id)}
        >
          <Copy size={12} />
          <span className="truncate max-w-[150px]">{node.id}</span>
        </button>
      </div>
    </div>
  );
};
