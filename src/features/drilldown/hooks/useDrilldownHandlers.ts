import { useCallback } from 'react';
import {
  NexusObject,
  SimpleNote,
  ContainerNote,
  NexusType,
  NexusCategory,
  ContainmentType,
  DefaultLayout,
  isLink,
  isContainer,
  isReified,
  NexusGraphUtils,
  TraitLink,
  AggregatedSemanticLink,
  AggregatedHierarchicalLink,
} from '../../../types';
import { TimeDimensionService } from '../../../core/services/TimeDimensionService';
import { GraphIntegrityService } from '../../integrity/GraphIntegrityService';
import { NexusDeletionService, DeletionProfile } from '../../../core/services/NexusDeletionService';

interface UseDrilldownHandlersProps {
  selectedId: string | null;
  onRegistryUpdate?: React.Dispatch<React.SetStateAction<Record<string, NexusObject>>>;
  onRemoveBatch?: (ids: string[]) => Promise<void>;
  registry: Record<string, NexusObject>;
  simulatedDate?: { year: number; month: number; day: number };
}

export const useDrilldownHandlers = ({
  selectedId,
  onRegistryUpdate,
  onRemoveBatch,
  registry,
  simulatedDate,
}: UseDrilldownHandlersProps) => {
  const handleUpdateItem = useCallback(
    (updates: Partial<NexusObject>) => {
      if (!selectedId || !onRegistryUpdate) return;
      onRegistryUpdate((prev) => {
        const item = prev[selectedId];
        if (!item) return prev;

        // Auto-Inheritance for Reified Snapshots
        const isS = !!(item as SimpleNote).time_data?.base_node_id;
        const bId = (item as SimpleNote).time_data?.base_node_id;
        if (isS && bId && isReified(prev[bId])) {
          const base = prev[bId] as AggregatedSemanticLink | AggregatedHierarchicalLink;
          (updates as Partial<TraitLink>).source_id = base.source_id;
          (updates as Partial<TraitLink>).target_id = base.target_id;
        }

        return {
          ...prev,
          [selectedId]: {
            ...item,
            ...updates,
            last_modified: new Date().toISOString(),
          } as NexusObject,
        };
      });
    },
    [selectedId, onRegistryUpdate],
  );

  const handleReifyLink = useCallback(
    (linkId: string) => {
      if (!onRegistryUpdate) return;
      onRegistryUpdate((prev) => {
        const link = prev[linkId];
        if (!link || !isLink(link) || isReified(link)) return prev;
        const source = prev[link.source_id];
        const target = prev[link.target_id];
        if (!source || !target) return prev;

        const reifiedUnit: NexusObject = {
          ...link,
          _type:
            link._type === NexusType.HIERARCHICAL_LINK
              ? NexusType.AGGREGATED_HIERARCHICAL_LINK
              : NexusType.AGGREGATED_SEMANTIC_LINK,
          is_reified: true,
          title: `${(source as SimpleNote).title || 'Origin'} → ${(target as SimpleNote).title || 'Terminal'}`,
          gist: `Logic: ${link.verb}`,
          prose_content: `Relationship between ${(source as SimpleNote).title} and ${(target as SimpleNote).title}.`,
          category_id: NexusCategory.META,
          children_ids: [],
          containment_type: ContainmentType.FOLDER,
          is_collapsed: false,
          default_layout: DefaultLayout.GRID,
          is_ghost: false,
          aliases: [],
          tags: ['reified'],
        } as NexusObject;
        return { ...prev, [linkId]: reifiedUnit };
      });
    },
    [onRegistryUpdate],
  );

  const handleReifyNode = useCallback(
    (nodeId: string) => {
      if (!onRegistryUpdate) return;
      onRegistryUpdate((prev) => {
        const node = prev[nodeId];
        if (!node || isLink(node) || isContainer(node)) return prev;
        const updatedNode: NexusObject = {
          ...node,
          _type: NexusType.CONTAINER_NOTE,
          containment_type: ContainmentType.FOLDER,
          is_collapsed: false,
          default_layout: DefaultLayout.GRID,
          children_ids: [],
          tags: [...((node as SimpleNote).tags || []), 'promoted-logic'],
        } as NexusObject;
        return { ...prev, [nodeId]: updatedNode };
      });
    },
    [onRegistryUpdate],
  );

  const handleReifyNodeToLink = useCallback(
    (nodeId: string, sourceId: string, targetId: string) => {
      if (!onRegistryUpdate) return;
      onRegistryUpdate((prev) => {
        const node = prev[nodeId];
        const sNode = prev[sourceId];
        const tNode = prev[targetId];
        if (!node || !sNode || !tNode) return prev;

        const next = { ...prev };

        // Delete original links between node and neighbors
        Object.keys(next).forEach((key) => {
          const l = next[key];
          if (isLink(l)) {
            if (
              (l.source_id === nodeId && l.target_id === sourceId) ||
              (l.source_id === sourceId && l.target_id === nodeId)
            )
              delete next[key];
            if (
              (l.source_id === nodeId && l.target_id === targetId) ||
              (l.source_id === targetId && l.target_id === nodeId)
            )
              delete next[key];
          }
        });

        const reifiedUnit: NexusObject = {
          ...node,
          _type: NexusType.AGGREGATED_SEMANTIC_LINK,
          is_reified: true,
          source_id: sourceId,
          target_id: targetId,
          verb: 'relates',
          verb_inverse: 'related to',
          containment_type: ContainmentType.FOLDER,
          children_ids: [],
          is_collapsed: false,
          default_layout: DefaultLayout.GRID,
        } as NexusObject;

        next[nodeId] = reifiedUnit;
        return next;
      });
    },
    [onRegistryUpdate],
  );

  const handleManifestSnapshot = useCallback(
    (nodeId: string, year: number, month?: number, day?: number) => {
      if (!onRegistryUpdate) return;
      onRegistryUpdate((prev) => {
        const baseNode = prev[nodeId] as SimpleNote;
        if (!baseNode) return prev;

        let statePayload: Partial<SimpleNote> = {
          title: `${baseNode.title} (Era: ${year})`,
          gist: baseNode.gist,
        };

        // Automated Temporal Anchoring for Reified Links
        if (isReified(baseNode)) {
          const sId = (baseNode as AggregatedSemanticLink).source_id;
          const tId = (baseNode as AggregatedSemanticLink).target_id;

          if (sId && tId) {
            const sSnapshot = TimeDimensionService.getSnapshot(
              prev,
              sId,
              year,
              month || 0,
              day || 0,
            );
            const tSnapshot = TimeDimensionService.getSnapshot(
              prev,
              tId,
              year,
              month || 0,
              day || 0,
            );

            statePayload = {
              ...statePayload,
              time_data: {
                year,
                anchored_source_id: sSnapshot?.stateNode.id || sId,
                anchored_target_id: tSnapshot?.stateNode.id || tId,
              },
            };
          }
        }

        const { timeNode, timeLink } = TimeDimensionService.createTimeState(
          baseNode,
          year,
          month,
          day,
          statePayload,
        );

        return {
          ...prev,
          [timeNode.id]: timeNode as NexusObject,
          [timeLink.id]: timeLink as NexusObject,
        };
      });
    },
    [onRegistryUpdate],
  );

  const handleEstablishLink = useCallback(
    (
      sourceId: string,
      targetId: string,
      verb: string = 'binds',
      useTimeAnchor: boolean = false,
      sourceTemporalId?: string,
      targetTemporalId?: string,
    ) => {
      if (!onRegistryUpdate) return;
      onRegistryUpdate((prev) => {
        // Use temporal IDs as literal IDs if we want strict atomic snapshot-to-snapshot links
        const effectiveSourceId = sourceTemporalId || sourceId;
        const effectiveTargetId = targetTemporalId || targetId;

        const source = prev[effectiveSourceId];
        const target = prev[effectiveTargetId];
        if (!source || !target) return prev;

        const timeData = useTimeAnchor
          ? {
              ...simulatedDate,
              // If we are using base IDs but anchoring, we store the snapshots as metadata
              // If we are using Snapshot IDs as literal source/target, the anchor is implicit in the topology
              anchored_source_id: sourceTemporalId,
              anchored_target_id: targetTemporalId,
              // Store base IDs for simulation resolution back to layout anchors
              base_source_id: sourceId,
              base_target_id: targetId,
            }
          : undefined;

        const { link, updatedSource, updatedTarget } = NexusGraphUtils.createLink(
          source,
          target,
          NexusType.SEMANTIC_LINK,
          verb,
          timeData,
        );
        return {
          ...prev,
          [effectiveSourceId]: updatedSource,
          [effectiveTargetId]: updatedTarget,
          [link.id]: link,
        };
      });
    },
    [onRegistryUpdate, simulatedDate],
  );

  const handleReparent = useCallback(
    (sourceId: string, targetId: string, oldParentId?: string, isReference: boolean = false) => {
      if (sourceId === targetId || !onRegistryUpdate) return;
      const target = registry[targetId];
      if (target && isContainer(target) && target.children_ids.includes(sourceId)) return;

      onRegistryUpdate((prev) => {
        // Detect cycles
        let current: string | null = targetId;
        while (current && current !== 'root') {
          if (current === sourceId) return prev; // Cycle detected
          const parent = Object.values(prev).find(
            (o) => isContainer(o) && o.children_ids.includes(current!),
          );
          current = parent ? parent.id : null;
        }

        let next = { ...prev };
        if (!isReference && oldParentId) {
          if (oldParentId === 'root') {
            const node = next[sourceId];
            if (node) {
              const sn = node as SimpleNote;
              next[sourceId] = {
                ...sn,
                tags: (sn.tags || []).filter((t: string) => t !== '__is_root__'),
              };
            }
          } else {
            const op = next[oldParentId];
            if (op && isContainer(op)) {
              const cn = op as ContainerNote;
              next[oldParentId] = {
                ...cn,
                children_ids: cn.children_ids.filter((id) => id !== sourceId),
              };
            }
            Object.keys(next).forEach((k) => {
              const o = next[k];
              if (
                isLink(o) &&
                o._type === NexusType.HIERARCHICAL_LINK &&
                o.source_id === oldParentId &&
                o.target_id === sourceId
              )
                delete next[k];
            });
          }
        }
        if (targetId === 'root') {
          const node = next[sourceId];
          if (node) {
            const sn = node as SimpleNote;
            next[sourceId] = {
              ...sn,
              tags: Array.from(new Set([...(sn.tags || []), '__is_root__'])),
            };
          }
          return next;
        }
        const targetNode = next[targetId];
        if (!targetNode || isLink(targetNode)) return next;

        // Promote to container if not already one
        if (!isContainer(targetNode)) {
          next[targetId] = {
            ...targetNode,
            _type:
              targetNode._type === NexusType.STORY_NOTE
                ? NexusType.STORY_NOTE
                : NexusType.CONTAINER_NOTE,
            children_ids: [sourceId],
            containment_type: ContainmentType.FOLDER,
            is_collapsed: false,
            default_layout: DefaultLayout.GRID,
          } as NexusObject;
        } else {
          const cn = targetNode as ContainerNote;
          next[targetId] = {
            ...cn,
            children_ids: Array.from(new Set([...cn.children_ids, sourceId])),
          };
        }

        const shadowLink = NexusGraphUtils.createShadowLink(targetId, sourceId);
        next[shadowLink.id] = shadowLink;
        return next;
      });
    },
    [onRegistryUpdate, registry],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (!onRegistryUpdate || !onRemoveBatch) return;

      onRegistryUpdate((prev) => {
        const baseObj = prev[id];
        if (!baseObj) return prev;

        const toDeleteIds = new Set<string>();
        toDeleteIds.add(id);

        const isSnapshot = !!(baseObj as SimpleNote).time_data?.base_node_id;
        const isLiteralLink = isLink(baseObj) && !isReified(baseObj);

        // IDENTIFY DELETE CANDIDATES using Centralized Service
        // If it's a base unit, we use HOLISTIC (Temporal + Structural)
        // If it's a snapshot or literal link, it only deletes itself (and dependent links)
        const profile =
          !isSnapshot && !isLiteralLink
            ? DeletionProfile.HOLISTIC
            : DeletionProfile.STRUCTURAL_ORPHAN;

        const candidates = NexusDeletionService.getDeleteCandidates(id, prev, profile);
        candidates.forEach((cid) => toDeleteIds.add(cid));

        const deletedIdsArray = Array.from(toDeleteIds);

        // UI OPTIMISTIC UPDATE
        let next = { ...prev };
        deletedIdsArray.forEach((did) => {
          delete next[did];
          // Clean up container references
          Object.keys(next).forEach((k) => {
            const o = next[k];
            if (isContainer(o) && (o as ContainerNote).children_ids?.includes(did)) {
              const container = o as ContainerNote;
              next[k] = {
                ...container,
                children_ids: container.children_ids.filter((cid) => cid !== did),
              };
            }
          });
        });

        // 3. Identify and purge zombie links that lost their anchor points
        const finalRegistry = GraphIntegrityService.purgeDanglingLinks(next);
        const finalDeletedIds = new Set(deletedIdsArray);
        Object.keys(prev).forEach((id) => {
          if (!finalRegistry[id]) finalDeletedIds.add(id);
        });

        // PERSISTENT DELETE (Async) - Include any dangling links found
        onRemoveBatch(Array.from(finalDeletedIds)).catch((err) =>
          console.error('[useDrilldownHandlers] Failed to persist recursive delete:', err),
        );

        return finalRegistry;
      });
    },
    [onRegistryUpdate, onRemoveBatch],
  );

  return {
    handleUpdateItem,
    handleReifyLink,
    handleReifyNode,
    handleReifyNodeToLink,
    handleEstablishLink,
    handleReparent,
    handleDelete,
    handleManifestSnapshot,
  };
};
