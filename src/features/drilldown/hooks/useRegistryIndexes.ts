import { useMemo } from 'react';
import {
  NexusObject,
  NexusLink,
  isLink,
  isNote,
  NexusNote,
  NexusCategory,
  NexusHierarchicalLink,
  AggregatedSimpleLink,
  AggregatedHierarchicalLink,
  isBinaryLink,
  isM2M,
} from '../../../types';
import { getParentIdentityId, isHistoricalSnapshot } from '../../../core/utils/nexus-accessors';

export type LinkUnion =
  | NexusLink
  | NexusHierarchicalLink
  | AggregatedSimpleLink
  | AggregatedHierarchicalLink;

export interface RegistryIndexes {
  linksBySource: Map<string, LinkUnion[]>;
  linksByTarget: Map<string, LinkUnion[]>;
  linksByParticipant: Map<string, LinkUnion[]>;
  allLinks: LinkUnion[];
  parentsByChild: Map<string, string[]>;
  snapshotsByBase: Map<string, NexusNote[]>;
  notesByCategory: Map<NexusCategory, NexusNote[]>;
}

export const useRegistryIndexes = (registry: Record<string, NexusObject>): RegistryIndexes => {
  return useMemo(() => {
    const linksBySource = new Map<string, LinkUnion[]>();
    const linksByTarget = new Map<string, LinkUnion[]>();
    const linksByParticipant = new Map<string, LinkUnion[]>();
    const allLinks: LinkUnion[] = [];
    const parentsByChild = new Map<string, string[]>();
    const snapshotsByBase = new Map<string, NexusNote[]>();
    const notesByCategory = new Map<NexusCategory, NexusNote[]>();

    Object.values(registry).forEach((obj) => {
      // Index Links
      if (isLink(obj)) {
        const link = obj as LinkUnion;
        allLinks.push(link);

        if (isBinaryLink(obj)) {
          // Binary links: index by source and target
          if (!linksBySource.has(link.source_id)) linksBySource.set(link.source_id, []);
          if (!linksByTarget.has(link.target_id)) linksByTarget.set(link.target_id, []);
          linksBySource.get(link.source_id)!.push(link);
          linksByTarget.get(link.target_id)!.push(link);
        } else if (isM2M(obj)) {
          // M2M hubs: index each participant's node_id
          const hub = obj as unknown as {
            participants: { node_id: string; role_id: string; verb: string }[];
          };
          for (const p of hub.participants) {
            if (!linksByParticipant.has(p.node_id)) linksByParticipant.set(p.node_id, []);
            linksByParticipant.get(p.node_id)!.push(link);
            // Also add to linksBySource for backward-compat traversal
            if (!linksBySource.has(p.node_id)) linksBySource.set(p.node_id, []);
            linksBySource.get(p.node_id)!.push(link);
          }
        }
      }

      // Index Snapshots and Categories
      if (isNote(obj)) {
        const note = obj as NexusNote;

        // Category Index
        if (note.category_id) {
          if (!notesByCategory.has(note.category_id)) notesByCategory.set(note.category_id, []);
          notesByCategory.get(note.category_id)!.push(note);
        }

        // Snapshot Index
        if (isHistoricalSnapshot(note)) {
          const baseId = getParentIdentityId(note);
          if (baseId) {
            if (!snapshotsByBase.has(baseId)) snapshotsByBase.set(baseId, []);
            snapshotsByBase.get(baseId)!.push(note);
          }
        }

        // Parent/Child Index from children_ids (Structural)
        if (note.children_ids) {
          note.children_ids.forEach((cid) => {
            if (!parentsByChild.has(cid)) parentsByChild.set(cid, []);
            parentsByChild.get(cid)!.push(note.id);
          });
        }
      }
    });

    // Sort snapshots by year for deterministic access
    snapshotsByBase.forEach((list) => {
      list.sort((a, b) => {
        const aYear = a.time_state?.effective_date?.year || 0;
        const bYear = b.time_state?.effective_date?.year || 0;
        return aYear - bYear;
      });
    });

    return {
      linksBySource,
      linksByTarget,
      linksByParticipant,
      allLinks,
      parentsByChild,
      snapshotsByBase,
      notesByCategory,
    };
  }, [registry]);
};
