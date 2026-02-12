import { useCallback } from 'react';
import {
  NexusObject,
  SimpleNote,
  SimpleLink,
  ContainerNote,
  NexusType,
  NexusCategory,
  ContainmentType,
  DefaultLayout,
  isLink,
  isContainer,
  isReified,
  NexusGraphUtils,
} from '../../../types';

interface UseDrilldownHandlersProps {
  selectedId: string | null;
  onRegistryUpdate?: React.Dispatch<React.SetStateAction<Record<string, NexusObject>>>;
  registry: Record<string, NexusObject>;
}

export const useDrilldownHandlers = ({
  selectedId,
  onRegistryUpdate,
  registry,
}: UseDrilldownHandlersProps) => {
  const handleUpdateItem = useCallback(
    (updates: Partial<NexusObject>) => {
      if (!selectedId || !onRegistryUpdate) return;
      onRegistryUpdate((prev) => {
        const item = prev[selectedId];
        if (!item) return prev;
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

  const handleEstablishLink = useCallback(
    (sourceId: string, targetId: string, verb: string = 'binds') => {
      if (!onRegistryUpdate) return;
      onRegistryUpdate((prev) => {
        const source = prev[sourceId];
        const target = prev[targetId];
        if (!source || !target) return prev;
        const { link, updatedSource, updatedTarget } = NexusGraphUtils.createLink(
          source,
          target,
          NexusType.SEMANTIC_LINK,
          verb,
        );
        return {
          ...prev,
          [sourceId]: updatedSource,
          [targetId]: updatedTarget,
          [link.id]: link,
        };
      });
    },
    [onRegistryUpdate],
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
      if (!onRegistryUpdate) return;
      onRegistryUpdate((prev) => {
        const next = { ...prev };
        delete next[id];
        Object.keys(next).forEach((k) => {
          const o = next[k];
          if (isLink(o) && (o.source_id === id || o.target_id === id)) delete next[k];
          if (isContainer(o) && o.children_ids.includes(id)) {
            const container = o as ContainerNote;
            next[k] = {
              ...container,
              children_ids: container.children_ids.filter((cid) => cid !== id),
            };
          }
        });
        return next;
      });
    },
    [onRegistryUpdate],
  );

  return {
    handleUpdateItem,
    handleReifyLink,
    handleReifyNode,
    handleReifyNodeToLink,
    handleEstablishLink,
    handleReparent,
    handleDelete,
  };
};
