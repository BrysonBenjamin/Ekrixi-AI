import { NexusObject, NexusNote, NexusLink, isLink, isReified, SimpleNote } from '../../../types';

/**
 * Filters the registry to reflect the state of the Nexus at a specific point in time.
 *
 * Rules:
 * 1. Base entities (no parent_identity_id) must exist (created_at <= date).
 * 2. If a snapshot exists for a base entity that covers the date, use the snapshot.
 * 3. If no snapshot covers the date, use the base entity (assuming base represents "current" or "default" state).
 *    - Note: In a rigorous temporal system, base might only be a container for snapshots.
 *    - For this prototype, we treat base as valid if no snapshot overrides it.
 * 4. Filter out any entities created after the date.
 */
export function getTemporalRegistry(
  registry: Record<string, NexusObject>,
  date: Date,
): Record<string, NexusObject> {
  const targetTime = date.getTime();
  const temporalRegistry: Record<string, NexusObject> = {};

  // 1. Group snapshots by their parent identity
  const snapshotsByIdentity: Record<string, NexusObject[]> = {};

  Object.values(registry).forEach((obj) => {
    // We treat SimpleNote/NexusNote/NexusLink uniformly regarding time_state
    const timeState = (obj as any).time_state;
    if (timeState?.parent_identity_id) {
      const pid = timeState.parent_identity_id;
      if (!snapshotsByIdentity[pid]) snapshotsByIdentity[pid] = [];
      snapshotsByIdentity[pid].push(obj);
    }
  });

  // 2. Iterate all objects to select the correct version
  Object.values(registry).forEach((obj) => {
    const timeState = (obj as any).time_state;

    // Skip snapshots in the main loop; we handle them via their base identity
    if (timeState?.parent_identity_id) return;

    // Check base existence
    const createdAt = new Date(obj.created_at).getTime();
    if (createdAt > targetTime) return; // Created in future relative to targetTime

    const snapshots = snapshotsByIdentity[obj.id] || [];

    // Find applicable snapshot
    // Snapshot is applicable if: effective_date <= targetTime AND (valid_until > targetTime OR valid_until is undefined/null)
    // If valid_until is undefined, it assumes validity until next snapshot or forever?
    // "valid_until" in NexusTimeState

    let bestSnapshot: NexusObject | null = null;

    // Sort snapshots by effective_date descending to find the latest valid one
    snapshots.sort((a, b) => {
      const ta = getEffectiveTime(a);
      const tb = getEffectiveTime(b);
      return tb - ta;
    });

    for (const snap of snapshots) {
      const eff = getEffectiveTime(snap);
      const val = getValidUntilTime(snap);

      if (eff <= targetTime) {
        if (!val || val > targetTime) {
          bestSnapshot = snap;
          break; // Found the most recent valid snapshot
        }
      }
    }

    if (bestSnapshot) {
      // Use the snapshot, but maintain the Identity ID?
      // If we change the ID to snapshot ID, links might break if they point to Identity ID.
      // BUT links themselves might be temporal.
      // If links point to Identity ID, and we replace Identity Object with Snapshot Object (which has different ID),
      // the graph visualizer (d3) will fail to link them unless we remap links or keep ID same.
      //
      // Strategy: Use the Snapshot's data, but KEEP the Base Entity's ID.
      // We merge snapshot properties ONTOP of base entity.
      // This ensures graph topology remains stable (IDs don't change), but content/visuals reflect the snapshot.

      const merged = {
        ...bestSnapshot,
        id: obj.id, // FORCE base ID
        // Maybe keep some metadata from snapshot
        _is_snapshot: true,
        _snapshot_id: bestSnapshot.id,
      };
      temporalRegistry[obj.id] = merged as NexusObject;
    } else {
      // Use base entity
      temporalRegistry[obj.id] = obj;
    }
  });

  // 3. Filter Links
  // We need to ensure links connect to nodes that actually exist in temporalRegistry.
  // And links themselves should be time-filtered if they have history (not implemented fully for links yet, handled same as nodes above if they have time_state).

  // The loop above handled Links too (as they are in registry).
  // But we must verify endpoints exist.

  const finalRegistry: Record<string, NexusObject> = {};
  Object.values(temporalRegistry).forEach((obj) => {
    if (isLink(obj)) {
      if (temporalRegistry[obj.source_id] && temporalRegistry[obj.target_id]) {
        finalRegistry[obj.id] = obj;
      }
    } else {
      finalRegistry[obj.id] = obj;
    }
  });

  return finalRegistry;
}

function getEffectiveTime(obj: NexusObject): number {
  const ts = (obj as any).time_state;
  if (!ts?.effective_date) return 0;
  const { year, month = 1, day = 1 } = ts.effective_date;
  return new Date(year, month - 1, day).getTime();
}

function getValidUntilTime(obj: NexusObject): number | null {
  const ts = (obj as any).time_state;
  if (!ts?.valid_until) return null;
  const { year, month = 1, day = 1 } = ts.valid_until;
  return new Date(year, month - 1, day).getTime();
}
