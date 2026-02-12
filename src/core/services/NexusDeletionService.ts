import { NexusObject, isLink, isContainer, NexusType, ContainerNote } from '../../types';

/**
 * DeletionProfile defines the "Blast Radius" of a deletion operation.
 */
export enum DeletionProfile {
  /**
   * Only delete the target and its adjacent links.
   * Children are preserved and promoted to orphans.
   */
  STRUCTURAL_ORPHAN = 'STRUCTURAL_ORPHAN',

  /**
   * Delete target and recursively all children in the hierarchy.
   */
  STRUCTURAL_CASCADE = 'STRUCTURAL_CASCADE',

  /**
   * Delete target and recursively all temporal snapshots (skins).
   * Also deletes causal links connected to target or its snapshots.
   * PROTECTS hierarchical links.
   */
  TEMPORAL_CAUSAL = 'TEMPORAL_CAUSAL',

  /**
   * Full recursive purge of both structural children and temporal history.
   */
  HOLISTIC = 'HOLISTIC',
}

export const NexusDeletionService = {
  /**
   * Identifies all objects that should be deleted together.
   */
  getDeleteCandidates: (
    id: string,
    registry: Record<string, NexusObject>,
    profile: DeletionProfile = DeletionProfile.STRUCTURAL_ORPHAN,
  ): Set<string> => {
    const toDelete = new Set<string>();
    const queue = [id];
    toDelete.add(id);

    const all = Object.values(registry) as (NexusObject & {
      source_id?: string;
      target_id?: string;
      time_data?: any;
    })[];

    while (queue.length > 0) {
      const currentId = queue.shift()!;

      // 1. Structural Hierarchy Cascade
      if (profile === DeletionProfile.STRUCTURAL_CASCADE || profile === DeletionProfile.HOLISTIC) {
        const obj = registry[currentId];
        if (obj && isContainer(obj)) {
          (obj as ContainerNote).children_ids.forEach((cid) => {
            if (!toDelete.has(cid)) {
              toDelete.add(cid);
              queue.push(cid);
            }
          });
        }
      }

      // 2. Temporal Snapshot Cascade
      if (profile === DeletionProfile.TEMPORAL_CAUSAL || profile === DeletionProfile.HOLISTIC) {
        all.forEach((obj) => {
          if (obj.time_data?.base_node_id === currentId) {
            if (!toDelete.has(obj.id)) {
              toDelete.add(obj.id);
              queue.push(obj.id); // Snapshots might be reified links with their own snapshots
            }
          }
        });
      }

      // 3. Link Connections
      all.forEach((obj) => {
        if (isLink(obj)) {
          const isSourceMatched = toDelete.has(obj.source_id!);
          const isTargetMatched = toDelete.has(obj.target_id!);

          if (isSourceMatched || isTargetMatched) {
            const isHierarchical =
              obj._type === NexusType.HIERARCHICAL_LINK ||
              obj._type === NexusType.AGGREGATED_HIERARCHICAL_LINK;

            // Decision Logic for and including this link in the deletion set:
            let shouldDeleteLink = false;

            if (profile === DeletionProfile.HOLISTIC) {
              shouldDeleteLink = true;
            } else if (profile === DeletionProfile.TEMPORAL_CAUSAL) {
              // Only delete non-hierarchical links in temporal mode
              shouldDeleteLink = !isHierarchical;
            } else if (
              profile === DeletionProfile.STRUCTURAL_CASCADE ||
              profile === DeletionProfile.STRUCTURAL_ORPHAN
            ) {
              // In structural modes, we delete links connected to a deleted node
              shouldDeleteLink = true;
            }

            if (shouldDeleteLink && !toDelete.has(obj.id)) {
              toDelete.add(obj.id);
              queue.push(obj.id);
            }
          }
        }
      });
    }

    return toDelete;
  },
};
