import React, { useMemo } from 'react';
import { DrilldownCanvas } from '../../drilldown/components/DrilldownCanvas';
import { NexusObject, isContainer, isLink, isReified, NexusType } from '../../../types';
import { VisibleNode } from '../../drilldown/DrilldownFeature';
import { ChevronRight, Home, Compass } from 'lucide-react';

interface RefineryDrilldownProps {
  registry: Record<string, NexusObject>;
  focusId: string | null;
  navStack: string[];
  onNavigateStack: (id: string) => void;
  onResetStack: () => void;
  onSelect: (id: string) => void;
  onViewModeChange?: (mode: 'STRUCTURE' | 'RELATIONS' | 'INSPECTOR' | 'EXPLORER') => void;
  onReifyLink?: (id: string) => void;
  onReifyNode?: (id: string) => void;
  onReifyNodeToLink?: (nodeId: string, sourceId: string, targetId: string) => void;
}

export const RefineryDrilldown: React.FC<RefineryDrilldownProps> = ({
  registry,
  focusId,
  navStack,
  onNavigateStack,
  onResetStack,
  onSelect,
  onViewModeChange,
  onReifyLink,
  onReifyNode,
  onReifyNodeToLink,
}) => {
  // Logic to calculate visible nodes based on local registry
  const visibleNodesRegistry = useMemo(() => {
    const subRegistry: Record<string, VisibleNode> = {};
    const queue: { id: string; depth: number; pathType: VisibleNode['pathType'] }[] = [];

    if (!focusId) {
      const allChildIds = new Set<string>();
      (Object.values(registry) as NexusObject[]).forEach((obj) => {
        if (isContainer(obj)) {
          obj.children_ids.forEach((cid) => allChildIds.add(cid));
        }
      });
      const roots = (Object.values(registry) as NexusObject[]).filter(
        (obj) => (!isLink(obj) || isReified(obj)) && !allChildIds.has(obj.id),
      );
      roots.forEach((root) => queue.push({ id: root.id, depth: 0, pathType: 'focus' }));
    } else {
      queue.push({ id: focusId, depth: 0, pathType: 'focus' });
    }

    const visited = new Map<string, number>();
    while (queue.length > 0) {
      const { id, depth, pathType } = queue.shift()!;
      if (depth > 2) continue;
      if (visited.has(id) && visited.get(id)! <= depth) continue;
      const obj = registry[id];

      // Strictly exclude Story units
      if (!obj || obj._type === NexusType.STORY_NOTE) continue;

      const isNode = !isLink(obj) || isReified(obj);
      if (isNode) {
        visited.set(id, depth);
        subRegistry[id] = { ...obj, depth, pathType } as VisibleNode;
      }

      if (isContainer(obj)) {
        obj.children_ids.forEach((childId) => {
          queue.push({
            id: childId,
            depth: depth + 1,
            pathType: pathType === 'focus' || pathType === 'descendant' ? 'descendant' : 'lateral',
          });
        });
      }
      (Object.values(registry) as NexusObject[]).forEach((l) => {
        if (isLink(l)) {
          if (l.source_id === id)
            queue.push({
              id: l.target_id,
              depth: depth + 1,
              pathType:
                pathType === 'focus' || pathType === 'descendant' ? 'descendant' : 'lateral',
            });
          else if (l.target_id === id)
            queue.push({
              id: l.source_id,
              depth: depth + 1,
              pathType: pathType === 'focus' || pathType === 'ancestor' ? 'ancestor' : 'lateral',
            });
        }
      });
    }
    return subRegistry;
  }, [registry, focusId]);

  return (
    <div className="w-full h-full flex flex-col bg-nexus-950 relative overflow-hidden">
      {/* Local Nav Header */}
      <div className="h-14 border-b border-nexus-800 bg-nexus-900/60 backdrop-blur-xl flex items-center px-6 justify-between shrink-0 z-40 shadow-lg">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={onResetStack}
            className={`p-2 rounded-lg transition-all flex items-center gap-2 ${!focusId ? 'bg-nexus-accent/10 text-nexus-accent' : 'text-nexus-muted hover:text-nexus-text'}`}
          >
            <Home size={16} />
            <span className="text-[10px] font-display font-black uppercase tracking-widest hidden sm:inline">
              Batch Root
            </span>
          </button>

          {navStack.map((id, idx) => (
            <React.Fragment key={id}>
              <ChevronRight size={12} className="text-nexus-muted opacity-30 shrink-0" />
              <button
                onClick={() => onNavigateStack(id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-display font-black uppercase tracking-widest transition-all whitespace-nowrap border ${idx === navStack.length - 1 ? 'bg-nexus-accent/5 border-nexus-accent/20 text-nexus-accent' : 'border-transparent text-nexus-muted hover:text-nexus-text'}`}
              >
                {(registry[id] as any)?.title}
              </button>
            </React.Fragment>
          ))}
        </div>

        <div className="flex items-center gap-4 text-[10px] font-mono text-nexus-muted tracking-[0.2em] uppercase opacity-40">
          <Compass size={14} className="animate-spin-slow" />
          <span>Focus Oracle Active</span>
        </div>
      </div>

      <main className="flex-1 relative">
        <DrilldownCanvas
          registry={visibleNodesRegistry}
          fullRegistry={registry}
          onDrilldown={onNavigateStack}
          onInspect={(id) => {
            onSelect(id);
            onViewModeChange?.('INSPECTOR');
          }}
          onReifyLink={onReifyLink}
          onReifyNode={onReifyNode}
          onReifyNodeToLink={onReifyNodeToLink}
          focusId={focusId || undefined}
        />
      </main>
    </div>
  );
};
