import React from 'react';
import { History as HistoryIcon, Activity, GitBranch, Terminal } from 'lucide-react';
import { NexusObject, NexusNote } from '../../../../../types';
import {
  getTimeState,
  getParentIdentityId,
  formatTemporalRange,
} from '../../../../../core/utils/nexus-accessors';
import { TimeDimensionService } from '../../../../../core/services/TimeDimensionService';

interface TemporalLineageProps {
  object: NexusObject;
  registry: Record<string, NexusObject>;
  onSelect: (id: string) => void;
}

export const TemporalLineage: React.FC<TemporalLineageProps> = ({ object, registry, onSelect }) => {
  const baseId = getParentIdentityId(object) || object.id;
  const baseNode = registry[baseId] as NexusNote;

  interface SnapshotItem {
    node: NexusObject;
    level: number;
    isBase?: boolean;
  }

  const buildLineage = (): SnapshotItem[] => {
    const items: SnapshotItem[] = [];
    const visited = new Set<string>();

    // 1. Add the Base Node (Canonical Core)
    if (baseNode) {
      items.push({ node: baseNode, level: 0, isBase: true });
      visited.add(baseId);
    }

    // 2. Traversal helper for nested time states
    const traverse = (nodeId: string, level: number) => {
      const node = registry[nodeId] as NexusNote;
      if (!node || !node.time_state?.time_children) return;

      // Get children and sort chronologically
      const children = node.time_state.time_children
        .map((id) => registry[id])
        .filter((n): n is NexusNote => !!n)
        .sort((a, b) => {
          const tsA = getTimeState(a);
          const tsB = getTimeState(b);
          if (!tsA || !tsB) return 0;
          return (
            (tsA.effective_date?.year || 0) * 10000 +
            (tsA.effective_date?.month || 0) * 100 +
            (tsA.effective_date?.day || 0) -
            ((tsB.effective_date?.year || 0) * 10000 +
              (tsB.effective_date?.month || 0) * 100 +
              (tsB.effective_date?.day || 0))
          );
        });

      for (const child of children) {
        if (visited.has(child.id)) continue;
        visited.add(child.id);
        items.push({ node: child, level });
        traverse(child.id, level + 1);
      }
    };

    // 3. Start traversal from base node
    traverse(baseId, 1);

    // 4. Safety Fallback: Catch any orphaned snapshots that belong to this identity but weren't in the tree
    const allSnapshots = TimeDimensionService.getTimeStack(registry, baseId);
    for (const snap of allSnapshots) {
      if (!visited.has(snap.id)) {
        items.push({ node: snap, level: 1 });
        visited.add(snap.id);
      }
    }

    return items;
  };

  const lineage = buildLineage();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-nexus-contrast-ruby/10 border border-nexus-contrast-ruby/20 text-nexus-contrast-ruby">
          <Terminal size={14} />
        </div>
        <h3 className="text-xs font-black text-nexus-text uppercase tracking-[0.2em] italic">
          Historical Ledger
        </h3>
      </div>

      <div className="relative pl-4 space-y-4">
        {/* Vertical Timeline Line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-[1px] bg-gradient-to-b from-nexus-contrast-ruby/50 via-nexus-contrast-ruby/10 to-nexus-contrast-ruby/50" />

        {lineage.length === 0 ? (
          <div className="p-8 border border-dashed border-nexus-800 rounded-3xl text-center opacity-40 ml-4">
            <HistoryIcon size={24} className="mx-auto text-nexus-muted mb-2" />
            <span className="text-[9px] font-black uppercase tracking-widest">
              No Manifestations Recorded
            </span>
          </div>
        ) : (
          lineage.map((item, index) => {
            const { node: snapshot, level, isBase } = item;
            const isActive = snapshot.id === object.id;
            const ts = getTimeState(snapshot);
            const dateStr = formatTemporalRange(ts?.effective_date, ts?.valid_until, '0000.00.00');

            // Check if this node has children to determine if it's an "Era"
            const hasChildren = ts?.time_children && ts.time_children.length > 0;
            const isEra = isBase || hasChildren;

            // Find if there are more items at this level later in the list (for the vertical branch line)
            const hasMoreAtLevel = lineage
              .slice(index + 1)
              .some((futureItem) => futureItem.level === level);

            return (
              <div
                key={snapshot.id}
                className="relative group"
                style={{ marginLeft: `${level * 20}px` }}
              >
                {/* Vertical Branch Line (connects siblings) */}
                {level > 0 && hasMoreAtLevel && (
                  <div className="absolute -left-[14px] top-6 bottom-[-20px] w-[1px] bg-nexus-contrast-ruby/10 group-hover:bg-nexus-contrast-ruby/20 transition-colors" />
                )}

                {/* Dot on the line */}
                <div
                  className={`absolute -left-[18.5px] top-4 w-[10px] h-[10px] rounded-full border-2 border-nexus-950 z-10 transition-all ${
                    isActive
                      ? 'bg-nexus-contrast-ruby shadow-[0_0_15px_rgba(var(--nexus-ruby-rgb),0.6)] scale-125'
                      : 'bg-nexus-800 group-hover:bg-nexus-contrast-ruby/50'
                  }`}
                />

                {/* Horizontal Connector */}
                {level > 0 && (
                  <div className="absolute -left-[18px] top-[18.5px] w-[18px] h-[1px] bg-nexus-contrast-ruby/20" />
                )}

                <button
                  onClick={() => onSelect(snapshot.id)}
                  className={`w-full border rounded-2xl p-4 text-left transition-all hover:translate-x-1 ${
                    isActive
                      ? 'border-nexus-contrast-ruby bg-nexus-contrast-ruby/10 shadow-[0_0_30px_rgba(var(--nexus-ruby-rgb),0.05)]'
                      : 'border-nexus-800/80 bg-nexus-900/40 hover:border-nexus-contrast-ruby/30 hover:bg-nexus-900/60'
                  } ${level > 0 ? 'py-3 px-4' : 'p-5'}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div
                        className={`text-[9px] font-mono font-bold tracking-[0.2em] mb-1.5 ${isActive ? 'text-nexus-contrast-ruby' : 'text-nexus-muted'}`}
                      >
                        {dateStr}
                      </div>
                      <div
                        className={`${level === 0 ? 'text-[12px]' : 'text-[11px]'} font-black text-nexus-text uppercase italic tracking-wider truncate`}
                      >
                        {isBase ? 'Canonical Core' : (snapshot as NexusNote).title}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div
                          className={`text-[8px] font-bold uppercase tracking-widest opacity-60 px-1.5 py-0.5 rounded ${
                            isEra
                              ? 'bg-nexus-contrast-ruby/10 text-nexus-contrast-ruby'
                              : 'bg-nexus-800 text-nexus-muted'
                          }`}
                        >
                          {isBase ? 'Entity Soul' : isEra ? 'Temporal Era' : 'Historical Event'}
                        </div>
                        {hasChildren && (
                          <div className="text-[8px] text-nexus-muted font-bold uppercase tracking-widest opacity-40">
                            {ts.time_children.length} Nested Units
                          </div>
                        )}
                      </div>
                    </div>
                    {isBase ? (
                      <GitBranch size={16} className="text-nexus-ruby/40 shrink-0" />
                    ) : isEra ? (
                      <Activity size={12} className="text-nexus-muted/20 shrink-0" />
                    ) : null}
                  </div>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
