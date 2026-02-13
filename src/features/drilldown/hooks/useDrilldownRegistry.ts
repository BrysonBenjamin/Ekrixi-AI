import { useMemo } from 'react';
import {
  NexusObject,
  SimpleNote,
  NexusType,
  isContainer,
  isLink,
  isReified,
  TraitLink,
  AggregatedSemanticLink,
  AggregatedHierarchicalLink,
} from '../../../types';
import { TimeDimensionService } from '../../../core/services/TimeDimensionService';

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
}

export const useDrilldownRegistry = ({
  registry,
  currentContainerId,
  showAuthorNotes,
  activeTimeOverrides,
}: UseDrilldownRegistryProps) => {
  const visibleNodesRegistry = useMemo(() => {
    const subRegistry: Record<string, VisibleNode> = {};
    const queue: { id: string; depth: number; pathType: VisibleNode['pathType'] }[] = [];

    if (!currentContainerId) {
      const allChildIds = new Set<string>();
      (Object.values(registry) as NexusObject[]).forEach((obj) => {
        if (isContainer(obj)) {
          obj.children_ids.forEach((cid) => allChildIds.add(cid));
        }
      });
      const roots = (Object.values(registry) as NexusObject[]).filter(
        (obj) =>
          (!isLink(obj) || isReified(obj)) &&
          (obj as any)._type !== 'TIME_LINK' &&
          (obj as any).verb !== 'has_state' &&
          !allChildIds.has(obj.id) &&
          !(obj as SimpleNote).time_data?.base_node_id,
      );
      roots.forEach((root) => queue.push({ id: root.id, depth: 0, pathType: 'focus' }));
    } else {
      const currentObj = registry[currentContainerId] as SimpleNote;
      const effectiveContainerId = currentObj?.time_data?.base_node_id || currentContainerId;
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

      if (obj._type === NexusType.STORY_NOTE) continue;
      if ((obj as any)._type === 'TIME_LINK') continue;
      if ((obj as any).verb === 'has_state') continue;

      // Exclude generic Time Nodes from graph structure (unless they are the override content source, handled later)
      if ((obj as SimpleNote).time_data?.base_node_id && id !== currentContainerId) {
        continue;
      }

      if (isReified(obj)) {
        // Temporal links are reified but don't show up in the graph
        // (Note: TimeLink is not strictly reified in type system so this check was redundant)

        const source =
          registry[(obj as AggregatedSemanticLink | AggregatedHierarchicalLink).source_id];
        const target =
          registry[(obj as AggregatedSemanticLink | AggregatedHierarchicalLink).target_id];
        const isConnectedToStory =
          source?._type === NexusType.STORY_NOTE || target?._type === NexusType.STORY_NOTE;
        if (isConnectedToStory) continue;
      }

      if ((obj as SimpleNote).is_author_note && !showAuthorNotes) continue;

      let childrenIds = (isContainer(obj) ? obj.children_ids : []) || [];

      const isNode = !isLink(obj) || isReified(obj);
      if (isNode) {
        visited.set(id, depth);

        const overrideId = activeTimeOverrides[id];
        let displayObj: any = obj;

        if (overrideId && registry[overrideId]) {
          const timeNode = registry[overrideId] as SimpleNote;
          displayObj = {
            ...obj,
            title: timeNode.title || (obj as any).title,
            gist: timeNode.gist,
            prose_content: timeNode.prose_content,
            tags: timeNode.tags,
            time_data: timeNode.time_data,
            // Support temporal labels for reified links
            verb: (timeNode as any).verb || (obj as any).verb,
            verb_inverse: (timeNode as any).verb_inverse || (obj as any).verb_inverse,
          };
        }

        // Apply Fractal Inheritance (T3 -> T2 -> T1)
        const context = TimeDimensionService.resolveInheritedContext(registry, id);
        displayObj = {
          ...displayObj,
          gist: displayObj.gist || context.gist,
          tags: Array.from(new Set([...(displayObj.tags || []), ...(context.tags || [])])),
        };

        subRegistry[id] = {
          ...displayObj,
          depth,
          pathType,
          isParentPath: pathType === 'ancestor',
          activeTemporalId: overrideId,
        } as VisibleNode;
        nodeCount++;
      }

      if (isContainer(obj)) {
        childrenIds.forEach((childId) => {
          queue.push({
            id: childId,
            depth: depth + 1,
            pathType: pathType === 'focus' || pathType === 'descendant' ? 'descendant' : 'lateral',
          });
        });
      }

      if (isReified(obj)) {
        const sId = (obj as AggregatedSemanticLink | AggregatedHierarchicalLink).source_id;
        const tId = (obj as AggregatedSemanticLink | AggregatedHierarchicalLink).target_id;
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

      (Object.values(registry) as NexusObject[]).forEach((l) => {
        if (isLink(l)) {
          const isSourceMatch = l.source_id === id;
          const isTargetMatch = l.target_id === id;

          if (isSourceMatch) {
            if (l._type === 'TIME_LINK' || l.verb === 'has_state') return;
            if (isReified(l)) {
              queue.push({
                id: l.id,
                depth: depth + 1,
                pathType:
                  pathType === 'focus' || pathType === 'descendant' ? 'descendant' : 'lateral',
              });
            }
            queue.push({
              id: l.target_id,
              depth: depth + 1,
              pathType:
                pathType === 'focus' || pathType === 'descendant' ? 'descendant' : 'lateral',
            });
          } else if (isTargetMatch) {
            if (l._type === 'TIME_LINK' || l.verb === 'state_of') return;
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
          }
        }
      });
    }
    return subRegistry;
  }, [registry, currentContainerId, showAuthorNotes, activeTimeOverrides]);

  return {
    visibleNodesRegistry,
  };
};
