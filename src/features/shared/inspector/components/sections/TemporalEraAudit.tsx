import React from 'react';
import { History as HistoryIcon, Clock, ChevronRight, CornerDownRight } from 'lucide-react';
import { NexusObject, NexusLink, isLink } from '../../../../../types';
import { getTimeState, getParentIdentityId } from '../../../../../core/utils/nexus-accessors';
import { SnapshotPicker } from '../SnapshotPicker';
import { RegistryValidator } from '../../../../../core/utils/RegistryValidator';

interface TemporalEraAuditProps {
  object: NexusObject;
  registry: Record<string, NexusObject>;
  onUpdate: (val: Partial<NexusObject>) => void;
  onSelect?: (id: string) => void;
}

export const TemporalEraAudit: React.FC<TemporalEraAuditProps> = ({
  object,
  registry,
  onUpdate,
  onSelect,
}) => {
  const ts = getTimeState(object);
  const isSnapshot = ts?.is_historical_snapshot;
  const isL = isLink(object);
  const baseId = getParentIdentityId(object);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-nexus-ruby/10 border border-nexus-ruby/20 text-nexus-ruby">
            <Clock size={14} />
          </div>
          <h3 className="text-xs font-black text-nexus-text uppercase tracking-[0.2em] italic">
            Era Coordinates
          </h3>
        </div>

        <div className="flex gap-2">
          {(() => {
            // Find Temporal Parent
            const temporalParentId = Object.keys(registry).find((id) => {
              const obj = registry[id];
              return 'time_state' in obj && obj.time_state?.time_children?.includes(object.id);
            });

            if (temporalParentId) {
              return (
                <button
                  onClick={() => onSelect?.(temporalParentId)}
                  className="flex items-center gap-2 px-3 py-1 bg-nexus-accent text-nexus-950 rounded-lg text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-nexus-accent/20"
                >
                  Temporal Parent
                  <ChevronRight size={10} />
                </button>
              );
            }
            return null;
          })()}
          <button
            onClick={() => onSelect?.(baseId)}
            className="flex items-center gap-2 px-3 py-1 bg-nexus-ruby text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-nexus-ruby/20"
          >
            Canonical Base
            <ChevronRight size={10} />
          </button>
          <button
            onClick={() => {
              if (
                confirm(
                  'Disrupting the temporal anchor will convert this snapshot back to a soul node. Continue?',
                )
              ) {
                onUpdate({ time_state: undefined });
              }
            }}
            className="flex items-center gap-2 px-3 py-1 bg-nexus-800 text-nexus-muted rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-red-900/40 hover:text-red-200 transition-all border border-nexus-700"
          >
            Clear Range
          </button>
        </div>
      </div>

      {/* Coordinates Card */}
      <div className="bg-nexus-900 border border-nexus-800 rounded-3xl p-6 space-y-6 shadow-inner relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
          <HistoryIcon size={120} />
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[
            { label: 'Era Year', value: ts?.effective_date?.year, key: 'year' },
            { label: 'Month', value: ts?.effective_date?.month, key: 'month' },
            { label: 'Day', value: ts?.effective_date?.day, key: 'day' },
          ].map((cell) => (
            <div key={cell.key} className="space-y-2">
              <label className="text-[7px] font-mono font-bold text-nexus-muted uppercase tracking-[0.3em] ml-1">
                {cell.label}
              </label>
              <input
                type="number"
                value={cell.value || ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  const rawTs = ts || {
                    effective_date: { year: 0 },
                    is_historical_snapshot: false,
                  };
                  const updatedDate = {
                    ...rawTs.effective_date,
                    [cell.key]: isNaN(val) ? (cell.key === 'year' ? 0 : undefined) : val,
                  } as { year: number; month?: number; day?: number };

                  onUpdate({
                    time_state: {
                      ...rawTs,
                      effective_date: updatedDate,
                    },
                  });
                }}
                className="w-full bg-nexus-950 border border-nexus-800/80 focus:border-nexus-ruby rounded-xl px-4 py-3 text-[14px] font-mono font-bold text-nexus-ruby outline-none shadow-inner text-center transition-all focus:bg-nexus-950/80"
                placeholder="--"
              />
            </div>
          ))}
        </div>

        {/* Valid Until Row */}
        <div className="relative z-10 grid grid-cols-3 gap-4 pt-4 border-t border-nexus-800/20">
          {[
            { label: 'Until Year', value: ts?.valid_until?.year, key: 'year' },
            { label: 'Month', value: ts?.valid_until?.month, key: 'month' },
            { label: 'Day', value: ts?.valid_until?.day, key: 'day' },
          ].map((cell) => (
            <div key={cell.key} className="space-y-2">
              <label className="text-[6px] font-mono font-bold text-nexus-muted/40 uppercase tracking-[0.3em] ml-1">
                {cell.label}
              </label>
              <input
                type="number"
                value={cell.value || ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  const rawTs = ts || {
                    effective_date: { year: 0 },
                    is_historical_snapshot: false,
                  };

                  // If clearing everything, remove valid_until
                  if (isNaN(val) && !rawTs.valid_until) return;

                  const updatedUntil = {
                    ...(rawTs.valid_until || { year: 0 }),
                    [cell.key]: isNaN(val) ? undefined : val,
                  } as { year: number; month?: number; day?: number };

                  if (updatedUntil.year === undefined) {
                    const { valid_until, ...rest } = rawTs;
                    onUpdate({ time_state: rest });
                  } else {
                    onUpdate({
                      time_state: {
                        ...rawTs,
                        valid_until: updatedUntil,
                      },
                    });
                  }
                }}
                className="w-full bg-nexus-950/40 border border-nexus-800/40 focus:border-nexus-ruby/50 rounded-xl px-3 py-2 text-[11px] font-mono font-bold text-nexus-ruby/60 outline-none shadow-inner text-center transition-all focus:bg-nexus-950/80"
                placeholder="--"
              />
            </div>
          ))}
        </div>

        {/* Date Boundary visualization */}
        <div className="relative pt-2 pb-1">
          <div className="h-1 w-full bg-nexus-950 border border-nexus-800 rounded-full flex items-center px-1">
            <div className="h-[2px] w-[60%] bg-nexus-ruby/30 rounded-full mx-auto" />
          </div>
        </div>
      </div>

      {/* Endpoint Integrity (For Links) */}
      {isL && (object as NexusLink).source_id && (
        <div className="space-y-4">
          <h4 className="text-[8px] font-black text-nexus-text uppercase tracking-[0.2em] opacity-40 italic ml-1 flex items-center gap-2">
            <CornerDownRight size={10} />
            Instance Integrity
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <SnapshotPicker
              label="Origin Ref"
              baseNodeId={
                getParentIdentityId(registry[(object as NexusLink).source_id]) ||
                (object as NexusLink).source_id
              }
              selectedSnapshotId={(object as NexusLink).source_id}
              registry={registry}
              onSelect={(id) => {
                if (!id) return;
                const result = RegistryValidator.validateLinkEndpoints(
                  id,
                  (object as NexusLink).target_id,
                  object.id,
                );
                if (!result.isValid) {
                  alert(result.error);
                  return;
                }
                onUpdate({ source_id: id });
              }}
            />
            <SnapshotPicker
              label="Terminal Ref"
              baseNodeId={
                getParentIdentityId(registry[(object as NexusLink).target_id]) ||
                (object as NexusLink).target_id
              }
              selectedSnapshotId={(object as NexusLink).target_id}
              registry={registry}
              onSelect={(id) => {
                if (!id) return;
                const result = RegistryValidator.validateLinkEndpoints(
                  (object as NexusLink).source_id,
                  id,
                  object.id,
                );
                if (!result.isValid) {
                  alert(result.error);
                  return;
                }
                onUpdate({ target_id: id });
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
