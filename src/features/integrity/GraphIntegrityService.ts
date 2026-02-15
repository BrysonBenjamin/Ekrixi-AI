import {
  NexusObject,
  NexusType,
  isLink,
  isContainer,
  isStrictHierarchy,
  ConflictStatus,
  ContainerNote,
  TraitLink,
} from '../../types';
import { isHistoricalSnapshot } from '../../core/utils/nexus-accessors';

export interface IntegrityReport {
  status: ConflictStatus;
  reason?: string;
  suggestion?: string;
  distance?: number;
  path?: string[];
  isCycle?: boolean;
}

export const GraphIntegrityService = {
  /**
   * Builds a map of IDs to their immediate hierarchical parents.
   * Strictly respects TraitHierarchy and TraitContainer.
   */
  buildHierarchyMap: (registry: Record<string, NexusObject>): Record<string, string[]> => {
    const map: Record<string, string[]> = {};
    Object.values(registry).forEach((node) => {
      if (isContainer(node)) {
        node.children_ids.forEach((childId) => {
          if (!map[childId]) map[childId] = [];
          map[childId].push(node.id);
        });
      }
      if (isLink(node) && isStrictHierarchy(node)) {
        if (!map[node.target_id]) map[node.target_id] = [];
        map[node.target_id].push(node.source_id);
      }
    });
    return map;
  },

  /**
   * Detects if adding a hierarchical link from source to target creates a cycle.
   * Checks if a path from target back to source already exists in the hierarchy.
   */
  detectCycle: (
    sourceId: string,
    targetId: string,
    registry: Record<string, NexusObject>,
  ): boolean => {
    if (sourceId === targetId) return true;
    const parentMap = GraphIntegrityService.buildHierarchyMap(registry);

    const visited = new Set<string>();
    const stack = [targetId]; // Can we reach source from target?

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === sourceId) return true;
      if (!visited.has(current)) {
        visited.add(current);
        const parents = parentMap[current] || [];
        parents.forEach((p) => stack.push(p));
      }
    }
    return false;
  },

  /**
   * Advanced analysis of a link's structural necessity.
   * - Hierarchical links: Only checked for cycles. Immune to redundancy flags.
   * - Reified links: Always approved (explicit intent).
   * - Semantic links: Flagged if any path (hierarchical or semantic) already exists.
   */
  analyzeLinkIntegrity: (
    sourceId: string,
    targetId: string,
    registry: Record<string, NexusObject>,
    proposedType?: NexusType,
  ): IntegrityReport => {
    const isProposedHierarchical =
      proposedType &&
      (proposedType === NexusType.HIERARCHICAL_LINK ||
        proposedType === NexusType.AGGREGATED_HIERARCHICAL_LINK);
    const isProposedReified =
      proposedType &&
      (proposedType === NexusType.AGGREGATED_SIMPLE_LINK ||
        proposedType === NexusType.AGGREGATED_HIERARCHICAL_LINK);

    // 1. Hierarchical links define the structural skeleton.
    // They are immune to redundancy flags; they are the "Truth".
    if (isProposedHierarchical) {
      // We check if target is already an ancestor of source
      if (GraphIntegrityService.detectCycle(sourceId, targetId, registry)) {
        return {
          status: 'REDUNDANT',
          isCycle: true,
          reason: 'Causal Loop: Establishing this hierarchy creates a structural cycle.',
          suggestion: 'Ensure your narrative structure follows a Directed Acyclic Graph (DAG).',
        };
      }
      return { status: 'APPROVED' };
    }

    // 2. Reified links represent deliberate manifest intent.
    // We ignore redundancy here to allow "manifest shortcuts" with specific records.
    if (isProposedReified) {
      return { status: 'APPROVED' };
    }

    // 3. Proximity Analysis for Semantic Links (Soft Deprecated for now)
    // We are bypassing this check to prevent annoying automatic flagging of links.
    // The architectural hooks remain if we wish to bring this back later.
    /*
    const queue: Array<{ id: string; dist: number; path: string[]; types: NexusType[] }> = [
      { id: sourceId, dist: 0, path: [sourceId], types: [] },
    ];
    const visited = new Map<string, number>();
    const maxSearchDepth = 5;

    while (queue.length > 0) {
      const { id, dist, path, types } = queue.shift()!;
      if (dist >= maxSearchDepth) continue;

      if (id === targetId && dist > 0) {
        const onlyHierarchicalInPath = types.every(
          (t) =>
            t === NexusType.HIERARCHICAL_LINK ||
            t === NexusType.AGGREGATED_HIERARCHICAL_LINK ||
            t === NexusType.CONTAINER_NOTE,
        );

        if (dist === 1) {
          return {
            status: 'REDUNDANT',
            distance: dist,
            path,
            reason: 'Direct adjacency already bridges these units in the registry.',
            suggestion: onlyHierarchicalInPath
              ? 'This semantic link is redundant with your structural hierarchy. Consider consolidating or promoting to a Reified Link.'
              : 'A direct connection already exists. Upgrade to a Reified Link if this specific logic requires its own manifest records.',
          };
        }

        return {
          status: 'IMPLIED',
          distance: dist,
          path,
          reason: `Implicit Path: A chain of ${dist} units already connects these signatures.`,
          suggestion: onlyHierarchicalInPath
            ? 'This shortcut is structurally implied by your hierarchy. Upgrade to a Hierarchical Link to formalize the nesting.'
            : 'A narrative path exists. This link might be unnecessary clutter unless it marks a critical causal anchor.',
        };
      }

      if (visited.has(id) && visited.get(id)! <= dist) continue;
      visited.set(id, dist);

      const node = registry[id];
      if (!node) continue;

      // Scan all links in registry for traversal
      Object.values(registry).forEach((l) => {
        if (isLink(l)) {
          if (l.source_id === id) {
            queue.push({
              id: l.target_id,
              dist: dist + 1,
              path: [...path, l.target_id],
              types: [...types, l._type as NexusType],
            });
          }
          // Lateral links are checked bidirectionally for proximity distance
          if (l.target_id === id && !isStrictHierarchy(l)) {
            queue.push({
              id: l.source_id,
              dist: dist + 1,
              path: [...path, l.source_id],
              types: [...types, l._type as NexusType],
            });
          }
        }
      });

      // Native containers are implicitly hierarchical links
      if (isContainer(node)) {
        node.children_ids.forEach((cid) => {
          queue.push({
            id: cid,
            dist: dist + 1,
            path: [...path, cid],
            types: [...types, NexusType.CONTAINER_NOTE],
          });
        });
      }
    }
    */

    return { status: 'APPROVED' };
  },

  /**
   * Optimized bulk analysis for visualizers
   */
  getRegistryIntegrityMap: (
    registry: Record<string, NexusObject>,
  ): Record<string, IntegrityReport> => {
    const map: Record<string, IntegrityReport> = {};
    const links = Object.values(registry).filter(isLink);

    links.forEach((link) => {
      // 0. IGNORE TEMPORAL SNAPSHOTS
      // Links that are part of a historical record (source or target having a base_node_id)
      // should be exempt from standard integrity checks as they represent valid historical states.
      const sourceNode = registry[link.source_id];
      const targetNode = registry[link.target_id];
      const isTemporalSnapshot =
        isHistoricalSnapshot(sourceNode) || isHistoricalSnapshot(targetNode);

      if (isTemporalSnapshot) return;

      const tempRegistry = { ...registry };
      // 1. Remove the link itself to check if a DIFFERENT path exists
      delete tempRegistry[link.id];

      // 2. If it's a hierarchical link, we must also temporarily strip it from
      // the source's children_ids to prevent "finding itself" via TraitContainer.
      const source = tempRegistry[link.source_id];
      if (source && isContainer(source) && isStrictHierarchy(link)) {
        tempRegistry[link.source_id] = {
          ...source,
          children_ids: source.children_ids.filter((cid) => cid !== link.target_id),
        } as ContainerNote;
      }

      map[link.id] = GraphIntegrityService.analyzeLinkIntegrity(
        link.source_id,
        link.target_id,
        tempRegistry,
        link._type as NexusType,
      );
    });

    return map;
  },

  /**
   * Identifies and removes links whose source or target are missing from the registry.
   */
  purgeDanglingLinks: (registry: Record<string, NexusObject>): Record<string, NexusObject> => {
    const next = { ...registry };
    const linkIds = Object.keys(next).filter((id) => isLink(next[id]));

    linkIds.forEach((lid) => {
      const link = next[lid] as TraitLink;
      if (!next[link.source_id] || !next[link.target_id]) {
        console.warn(
          `[GraphIntegrityService] Purging dangling link: ${lid} (Source/Target missing)`,
        );
        delete next[lid];
      }
    });

    return next;
  },
};
