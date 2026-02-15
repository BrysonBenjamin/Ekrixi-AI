import React, { useMemo } from 'react';
import { History, Clock, GitCommit, ChevronRight, GitBranch } from 'lucide-react';
import { NexusNote } from '../../../../types';
import { getTimeState } from '../../../../core/utils/nexus-accessors';

interface RevisionSelectorProps {
  identityNode: NexusNote;
  snapshots: NexusNote[];
  activeNodeId: string;
  onSelect: (id: string) => void;
  className?: string;
}

export const RevisionSelector: React.FC<RevisionSelectorProps> = ({
  identityNode,
  snapshots,
  activeNodeId,
  onSelect,
  className = '',
}) => {
  interface SnapshotItem {
    node: NexusNote;
    level: number;
    isIdentity?: boolean;
  }

  const lineage = useMemo(() => {
    const buildLineage = (): SnapshotItem[] => {
      const items: SnapshotItem[] = [];
      const visited = new Set<string>();

      // 1. Add the Identity Node
      if (identityNode) {
        items.push({ node: identityNode, level: 0, isIdentity: true });
        visited.add(identityNode.id);
      }

      // 2. Traversal helper
      const traverse = (nodeId: string, level: number) => {
        const node =
          snapshots.find((s) => s.id === nodeId) ||
          (nodeId === identityNode.id ? identityNode : null);
        if (!node || !node.time_state?.time_children) return;

        const children = node.time_state.time_children
          .map((id) => snapshots.find((s) => s.id === id))
          .filter((n): n is NexusNote => !!n)
          .sort((a, b) => {
            const yearA = getTimeState(a)?.effective_date?.year || -Infinity;
            const yearB = getTimeState(b)?.effective_date?.year || -Infinity;
            return yearA - yearB;
          });

        for (const child of children) {
          if (visited.has(child.id)) continue;
          visited.add(child.id);
          items.push({ node: child, level });
          traverse(child.id, level + 1);
        }
      };

      // 3. Start from identity
      traverse(identityNode.id, 1);

      // 4. Fallback for orphans
      for (const snap of snapshots) {
        if (!visited.has(snap.id)) {
          items.push({ node: snap, level: 1 });
          visited.add(snap.id);
        }
      }

      return items;
    };

    return buildLineage();
  }, [identityNode, snapshots]);

  return (
    <div
      className={`flex flex-col h-full bg-nexus-900/30 border-r border-nexus-800/30 w-64 ${className}`}
    >
      <div className="p-3 border-b border-nexus-800/30 flex items-center justify-between">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-nexus-muted flex items-center gap-2">
          <History size={12} /> Temporal Ledger
        </h3>
        <div className="text-[8px] font-mono text-nexus-muted/40 px-1 border border-nexus-800 rounded">
          BETA
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2 pt-4 relative">
        {/* Vertical Timeline Line */}
        <div className="absolute left-[20px] top-6 bottom-6 w-[1px] bg-gradient-to-b from-nexus-accent/20 via-nexus-accent/5 to-nexus-accent/20" />

        {lineage.map((item, index) => {
          const { node: snap, level, isIdentity } = item;
          const time = getTimeState(snap);
          const year = time?.effective_date?.year;
          const yearDisplay = year !== undefined ? `${year} AD` : 'Timeless';
          const isActive = activeNodeId === snap.id;
          const hasChildren = time?.time_children && time.time_children.length > 0;

          const hasMoreAtLevel = lineage
            .slice(index + 1)
            .some((futureItem) => futureItem.level === level);

          return (
            <div key={snap.id} className="relative group" style={{ marginLeft: `${level * 12}px` }}>
              {/* Vertical Branch Line */}
              {level > 0 && hasMoreAtLevel && (
                <div className="absolute -left-[14px] top-6 bottom-[-20px] w-[1px] bg-nexus-accent/10 group-hover:bg-nexus-accent/20 transition-colors" />
              )}

              <button
                onClick={() => onSelect(snap.id)}
                className={`
                                    w-full text-left px-3 py-2 rounded-lg transition-all border flex items-center gap-3 relative z-10
                                    ${
                                      isActive
                                        ? isIdentity
                                          ? 'bg-nexus-accent/20 border-nexus-accent/30 text-nexus-accent'
                                          : 'bg-nexus-contrast-amber/10 border-nexus-contrast-amber/30 text-nexus-contrast-amber shadow-[0_0_20px_rgba(var(--nexus-accent-rgb),0.05)]'
                                        : 'border-transparent hover:bg-nexus-800/40 text-nexus-muted'
                                    }
                                `}
              >
                <div
                  className={`
                                    p-1.5 rounded-md transition-colors shrink-0
                                    ${
                                      isActive
                                        ? isIdentity
                                          ? 'bg-nexus-accent/20'
                                          : 'bg-nexus-contrast-amber/20'
                                        : 'bg-nexus-950 text-nexus-muted group-hover:text-nexus-text'
                                    }
                                `}
                >
                  {isIdentity ? (
                    <GitCommit size={12} />
                  ) : hasChildren ? (
                    <GitBranch size={12} />
                  ) : (
                    <Clock size={12} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold font-mono tracking-tighter leading-none">
                    {isIdentity ? 'LATEST' : yearDisplay}
                  </div>
                  <div className="text-[9px] opacity-60 mt-1 truncate font-black uppercase tracking-wider italic">
                    {isIdentity
                      ? 'Canonical'
                      : snap.title !== identityNode.title
                        ? snap.title
                        : 'Snapshot'}
                  </div>
                </div>
                {isActive && <ChevronRight size={10} className="opacity-40 shrink-0" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
