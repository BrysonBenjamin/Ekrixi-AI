import { useCallback } from 'react';
import type { NexusObject, NexusNote } from '../../../types';
import { NexusType, NexusCategory } from '../../../types';
import { isLink, isContainer, isReified, NexusGraphUtils } from '../../../core/utils/nexus';
import type { AggregatedSimpleLink, AggregatedHierarchicalLink } from '../../../types';
import { isHistoricalSnapshot, getParentIdentityId } from '../../../core/utils/nexus-accessors';
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
    (id: string, updates: Partial<NexusObject>) => {
      if (!onRegistryUpdate) return;
      onRegistryUpdate((prev) => {
        const item = prev[id];
        if (!item) return prev;

        // Auto-Inheritance for Reified Snapshots
        const isS = isHistoricalSnapshot(item);
        const bId = getParentIdentityId(item);
        if (isS && bId && isReified(prev[bId])) {
          const base = prev[bId] as AggregatedSimpleLink | AggregatedHierarchicalLink;
          (updates as Partial<AggregatedSimpleLink>).source_id = base.source_id;
          (updates as Partial<AggregatedSimpleLink>).target_id = base.target_id;
        }

        return {
          ...prev,
          [id]: {
            ...item,
            ...updates,
            last_modified: new Date().toISOString(),
          } as NexusObject,
        };
      });
    },
    [onRegistryUpdate],
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
              : NexusType.AGGREGATED_SIMPLE_LINK,
          is_reified: true,
          title: `${(source as NexusNote).title || 'Origin'} → ${(target as NexusNote).title || 'Terminal'}`,
          gist: `Logic: ${link.verb}`,
          prose_content: `Relationship between ${(source as NexusNote).title} and ${(target as NexusNote).title}.`,
          category_id: NexusCategory.META,
          children_ids: [],
          is_collapsed: false,
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
          children_ids: [],
          is_collapsed: false,
          tags: [...((node as NexusNote).tags || []), 'promoted-logic'],
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
          _type: NexusType.AGGREGATED_SIMPLE_LINK,
          is_reified: true,
          source_id: sourceId,
          target_id: targetId,
          verb: 'relates',
          verb_inverse: 'related to',
          children_ids: [],
          is_collapsed: false,
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
        const baseNode = prev[nodeId] as NexusNote;
        if (!baseNode) return prev;

        let statePayload: Partial<NexusNote> = {
          title: `${baseNode.title} (Era: ${year})`,
          gist: baseNode.gist,
        };

        // Automated Temporal Anchoring for Reified Links
        if (isReified(baseNode)) {
          const sId = (baseNode as AggregatedSimpleLink).source_id;
          const tId = (baseNode as AggregatedSimpleLink).target_id;

          if (sId && tId) {
            // Logic for temporal awareness
          }
        }

        const timeNode = TimeDimensionService.createStateNode(
          baseNode,
          year,
          month,
          day,
          statePayload,
        );
        // implicit link creation not returned by createStateNode anymore, handled internally if needed
        // but for now we won't create a separate link object as the time_state implies the link
        const timeLink = { id: 'temp-link-placeholder' }; // placeholder to satisfy destructuring if needed, or remove destructuring

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

        if (useTimeAnchor) {
          // Logic for temporal awareness
        }

        const { link, updatedSource, updatedTarget } = NexusGraphUtils.createLink(
          source,
          target,
          NexusType.SIMPLE_LINK,
          verb,
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
      if (target && isContainer(target) && (target as NexusNote).children_ids?.includes(sourceId))
        return;

      onRegistryUpdate((prev) => {
        // Detect cycles
        let current: string | null = targetId;
        while (current && current !== 'root') {
          if (current === sourceId) return prev; // Cycle detected
          const parent = Object.values(prev).find(
            (o) => isContainer(o) && (o as NexusNote).children_ids?.includes(current!),
          );
          current = parent ? parent.id : null;
        }

        let next = { ...prev };
        if (!isReference && oldParentId) {
          if (oldParentId === 'root') {
            const node = next[sourceId];
            if (node) {
              const sn = node as NexusNote;
              next[sourceId] = {
                ...sn,
                tags: (sn.tags || []).filter((t: string) => t !== '__is_root__'),
              };
            }
          } else {
            const op = next[oldParentId];
            if (op && isContainer(op)) {
              const cn = op as NexusNote;
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
            const sn = node as NexusNote;
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
                : NexusType.SIMPLE_NOTE,
            children_ids: [sourceId],
            is_collapsed: false,
          } as NexusObject;
        } else {
          const cn = targetNode as NexusNote;
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

        const isSnapshot = isHistoricalSnapshot(baseObj);
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
            if (isContainer(o) && (o as NexusNote).children_ids?.includes(did)) {
              const container = o as NexusNote;
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
