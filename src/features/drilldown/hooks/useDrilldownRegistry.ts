import { useMemo } from 'react';
import {
  NexusObject,
  NexusNote,
  NexusLink,
  AggregatedSimpleLink,
  AggregatedHierarchicalLink,
} from '../../../types';
import { NexusType } from '../../../types';
import { isLink, isReified, isNote, isContainer } from '../../../core/utils/nexus';
import { TimeDimensionService } from '../../../core/services/TimeDimensionService';
import {
  isHistoricalSnapshot,
  getTimeState,
  getEffectiveDate,
  applyTemporalOverride,
} from '../../../core/utils/nexus-accessors';
import { RegistryIndexes, LinkUnion } from './useRegistryIndexes';

export type VisibleNode = NexusObject & {
  depth: number;
  pathType: 'descendant' | 'ancestor' | 'lateral' | 'focus';
  isParentPath?: boolean;
  isTimeNodeExcluded?: boolean;
  activeTemporalId?: string;
};

interface UseDrilldownRegistryProps {
  registry: Record<string, NexusObject>;
  currentContainerId: string | undefined;
  showAuthorNotes: boolean;
  activeTimeOverrides: Record<string, string>;
  indexes: RegistryIndexes;
}

export const useDrilldownRegistry = ({
  registry,
  currentContainerId,
  showAuthorNotes,
  activeTimeOverrides,
  indexes,
}: UseDrilldownRegistryProps) => {
  const visibleNodesRegistry = useMemo(() => {
    const subRegistry: Record<string, VisibleNode> = {};
    const queue: { id: string; depth: number; pathType: VisibleNode['pathType'] }[] = [];

    if (!currentContainerId) {
      // Root view: find all top-level nodes (not children of any container, not snapshots)
      const allChildIds = new Set<string>();
      for (const obj of Object.values(registry)) {
        if (isContainer(obj)) {
          const note = obj as NexusNote;
          note.children_ids?.forEach((cid) => allChildIds.add(cid));
        }
      }
      for (const obj of Object.values(registry)) {
        // Skip raw links, snapshots, and contained nodes
        if (isLink(obj) && !isReified(obj)) continue;
        if (allChildIds.has(obj.id)) continue;
        if (isHistoricalSnapshot(obj)) continue;

        // Skip has_state verbs (legacy temporal links)
        if (isLink(obj) && obj.verb === 'has_state') continue;

        queue.push({ id: obj.id, depth: 0, pathType: 'focus' });
      }
    } else {
      // Container view: resolve the base identity
      const currentObj = registry[currentContainerId];
      const ts = currentObj ? getTimeState(currentObj) : undefined;
      const effectiveContainerId = ts?.parent_identity_id || currentContainerId;
      queue.push({ id: effectiveContainerId, depth: 0, pathType: 'focus' });
    }

    const visited = new Map<string, number>();
    const MAX_DRILLDOWN_NODES = 40;
    let nodeCount = 0;

    while (queue.length > 0 && nodeCount < MAX_DRILLDOWN_NODES) {
      const { id, depth, pathType } = queue.shift()!;
      if (depth > 2) continue;
      if (visited.has(id) && visited.get(id)! <= depth) continue;

      const obj = registry[id];
      if (!obj) continue;

      // Skip story notes from graph view
      if (obj._type === NexusType.STORY_NOTE) continue;

      // Skip has_state verbs (legacy temporal links)
      if (isLink(obj) && obj.verb === 'has_state') continue;

      // Exclude snapshots from graph structure (their content is overlaid on base nodes)
      if (isHistoricalSnapshot(obj) && id !== currentContainerId) {
        continue;
      }

      // Skip reified links connected to story notes
      if (isReified(obj)) {
        const source = registry[obj.source_id];
        const target = registry[obj.target_id];
        const isConnectedToStory =
          source?._type === NexusType.STORY_NOTE || target?._type === NexusType.STORY_NOTE;
        if (isConnectedToStory) continue;
      }

      // Skip author notes unless toggled on
      if (isNote(obj) && (obj as NexusNote).is_ghost && !showAuthorNotes) continue;

      const isNode = !isLink(obj) || isReified(obj);
      if (isNode) {
        visited.set(id, depth);

        const overrideId = activeTimeOverrides[id];
        let displayObj: NexusObject = obj;

        // Apply temporal override: overlay snapshot content on base node
        if (overrideId && registry[overrideId]) {
          displayObj = applyTemporalOverride(obj, registry[overrideId]);
        }

        // Apply Fractal Inheritance (T3 → T2 → T1)
        const context = TimeDimensionService.resolveInheritedContext(registry, id);
        const noteFields = displayObj as NexusNote;
        displayObj = {
          ...displayObj,
          gist: noteFields.gist || context.gist,
          tags: Array.from(new Set([...(noteFields.tags || []), ...(context.tags || [])])),
        } as NexusObject;

        subRegistry[id] = {
          ...displayObj,
          depth,
          pathType,
          isParentPath: pathType === 'ancestor',
          activeTemporalId: overrideId,
        } as VisibleNode;
        nodeCount++;
      }

      // Queue children of containers
      if (isContainer(obj)) {
        const note = obj as NexusNote;
        (note.children_ids || []).forEach((childId) => {
          queue.push({
            id: childId,
            depth: depth + 1,
            pathType: pathType === 'focus' || pathType === 'descendant' ? 'descendant' : 'lateral',
          });
        });
      }

      // Queue endpoints of reified links
      if (isReified(obj)) {
        const sId = obj.source_id;
        const tId = obj.target_id;
        if (sId)
          queue.push({
            id: sId,
            depth: depth + 1,
            pathType: pathType === 'focus' || pathType === 'ancestor' ? 'ancestor' : 'lateral',
          });
        if (tId)
          queue.push({
            id: tId,
            depth: depth + 1,
            pathType: pathType === 'focus' || pathType === 'descendant' ? 'descendant' : 'lateral',
          });
      }

      // Queue neighbors via links (O(1) lookup via indexes)
      const outgoingLinks = indexes.linksBySource.get(id) || [];
      const incomingLinks = indexes.linksByTarget.get(id) || [];

      outgoingLinks.forEach((l: LinkUnion) => {
        if (l.verb === 'has_state' || l.verb === 'state_of') return;

        if (isReified(l)) {
          queue.push({
            id: l.id,
            depth: depth + 1,
            pathType: pathType === 'focus' || pathType === 'descendant' ? 'descendant' : 'lateral',
          });
        }
        queue.push({
          id: l.target_id,
          depth: depth + 1,
          pathType: pathType === 'focus' || pathType === 'descendant' ? 'descendant' : 'lateral',
        });
      });

      incomingLinks.forEach((l: LinkUnion) => {
        if (l.verb === 'has_state' || l.verb === 'state_of') return;

        if (isReified(l)) {
          queue.push({
            id: l.id,
            depth: depth + 1,
            pathType: pathType === 'focus' || pathType === 'ancestor' ? 'ancestor' : 'lateral',
          });
        }
        queue.push({
          id: l.source_id,
          depth: depth + 1,
          pathType: pathType === 'focus' || pathType === 'ancestor' ? 'ancestor' : 'lateral',
        });
      });
    }
    return subRegistry;
  }, [registry, currentContainerId, showAuthorNotes, activeTimeOverrides, indexes]);

  return {
    visibleNodesRegistry,
  };
};
