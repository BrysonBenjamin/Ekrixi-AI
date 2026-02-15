import { useMemo } from 'react';
import { NexusObject, NexusNote, isLink, isNote, isReified } from '../../../types';

/**
 * Hook to create an O(1) lookup index for temporal history stacks.
 * Returns a map of ParentID -> Array of Snapshot Nodes (sorted chronologically).
 */
export const useTimeIndex = (registry: Record<string, NexusObject>) => {
  return useMemo(() => {
    const index: Record<string, NexusNote[]> = {};

    Object.values(registry).forEach((obj) => {
      // We only care about Notes or Reified links that are snapshots
      if (isNote(obj) || isReified(obj)) {
        const note = obj as NexusNote;

        // Check if it's a snapshot with a parent
        if (note.time_state?.parent_identity_id) {
          const parentId = note.time_state.parent_identity_id;

          if (!index[parentId]) {
            index[parentId] = [];
          }

          index[parentId].push(note);
        }
      }
    });

    // Sort all stacks by effective date
    Object.keys(index).forEach((parentId) => {
      index[parentId].sort((a, b) => {
        const ay = a.time_state?.effective_date?.year ?? 0;
        const am = a.time_state?.effective_date?.month ?? 0;
        const ad = a.time_state?.effective_date?.day ?? 1; // Default to 1st
        const by = b.time_state?.effective_date?.year ?? 0;
        const bm = b.time_state?.effective_date?.month ?? 0;
        const bd = b.time_state?.effective_date?.day ?? 1;

        if (ay !== by) return ay - by;
        if (am !== bm) return am - bm;
        return ad - bd;
      });
    });

    return index;
  }, [registry]);
};

/**
 * Hook to create an O(1) lookup index for backlinks (incoming edges).
 * Returns a map of TargetID -> Array of Link Objects.
 */
export const useBacklinkIndex = (registry: Record<string, NexusObject>) => {
  return useMemo(() => {
    const index: Record<string, NexusObject[]> = {};

    Object.values(registry).forEach((obj) => {
      if (isLink(obj)) {
        const targetId = obj.target_id;

        if (!index[targetId]) {
          index[targetId] = [];
        }

        index[targetId].push(obj);
      }
    });

    return index;
  }, [registry]);
};
