// ============================================================
// Ekrixi Schema v2 — Type-Safe Accessors for Nexus Objects
// ============================================================
//
// This module provides type-safe accessor functions that replace
// ad-hoc `(obj as any).time_data` patterns with proper schema v2
// `time_state` access. It also provides helpers for temporal
// date comparison and snapshot resolution.
// ============================================================

import type {
  NexusObject,
  NexusNote,
  NexusLink,
  NexusHierarchicalLink,
  NexusTimeState,
  AggregatedSimpleLink,
  AggregatedHierarchicalLink,
  Participant,
} from '../types';
import { isLink, isReified, isNote, isM2M, isBinaryLink } from '../utils/nexus';

// ============================================================
// Temporal Date Utilities
// ============================================================

export interface SimDate {
  year: number;
  month: number;
  day: number;
}

/**
 * Compare two temporal dates.
 * Returns negative if a < b, 0 if equal, positive if a > b.
 */
export function compareDates(
  a: { year: number; month?: number; day?: number },
  b: { year: number; month?: number; day?: number },
): number {
  const ay = a.year,
    am = a.month ?? 1,
    ad = a.day ?? 1;
  const by = b.year,
    bm = b.month ?? 1,
    bd = b.day ?? 1;
  if (ay !== by) return ay - by;
  if (am !== bm) return am - bm;
  return ad - bd;
}

/**
 * Consistently format a temporal date or range for display.
 */
export function formatTemporalRange(
  start?: { year: number; month?: number; day?: number },
  end?: { year: number; month?: number; day?: number },
  fallback = 'Timeless',
): string {
  if (!start) return fallback;

  const formatDate = (d: { year: number; month?: number; day?: number }) => {
    if (!d.month) return `${d.year}`;
    const date = new Date(2000, d.month - 1, d.day || 1);
    const monthStr = d.month ? date.toLocaleString('default', { month: 'short' }) : '';
    return `${d.year} ${monthStr}${d.day ? ` ${d.day}` : ''}`;
  };

  const startStr = formatDate(start);
  if (!end) return startStr;

  return `${startStr} — ${formatDate(end)}`;
}

/**
 * Check if `effectiveDate` is at or before `simDate`.
 */
export function isDateAtOrBefore(
  effectiveDate: { year: number; month?: number; day?: number },
  simDate: SimDate,
): boolean {
  return compareDates(effectiveDate, simDate) <= 0;
}

/**
 * Check if `validUntil` is after `simDate` (not yet expired).
 */
export function isDateAfter(
  validUntil: { year: number; month?: number; day?: number },
  simDate: SimDate,
): boolean {
  return compareDates(validUntil, simDate) > 0;
}

// ============================================================
// Type-Safe Accessors
// ============================================================

/**
 * Get the time_state from any NexusObject, or undefined.
 * Works for notes, links, and reified links.
 */
export function getTimeState(obj: NexusObject): NexusTimeState | undefined {
  if ('time_state' in obj) {
    return (obj as NexusNote | NexusLink | NexusHierarchicalLink).time_state;
  }
  return undefined;
}

/**
 * Get the parent identity ID (base "soul" node) for a snapshot.
 * Returns undefined if the object is not a snapshot.
 */
export function getParentIdentityId(obj: NexusObject): string | undefined {
  return getTimeState(obj)?.parent_identity_id;
}

/**
 * Get the effective date from an object's time_state.
 */
export function getEffectiveDate(
  obj: NexusObject,
): { year: number; month?: number; day?: number } | undefined {
  return getTimeState(obj)?.effective_date;
}

/**
 * Check if an object is a historical snapshot (temporal child).
 */
export function isHistoricalSnapshot(obj: NexusObject): boolean {
  const ts = getTimeState(obj);
  return ts?.is_historical_snapshot === true && ts?.parent_identity_id !== undefined;
}

/**
 * Get the source and target IDs from a binary link,
 * or the participants from an M2M hub.
 * Returns null if the object is not a link.
 */
export function getLinkEndpoints(
  obj: NexusObject,
):
  | { kind: 'binary'; source_id: string; target_id: string }
  | { kind: 'm2m'; participants: Participant[] }
  | null {
  if (isM2M(obj)) {
    return { kind: 'm2m', participants: obj.participants };
  }
  if (isBinaryLink(obj)) {
    return { kind: 'binary', source_id: obj.source_id, target_id: obj.target_id };
  }
  return null;
}

/**
 * Get note-level fields (title, gist, etc.) from any NexusObject
 * that has them (NexusNote or reified links).
 */
export function getNoteFields(
  obj: NexusObject,
): { title: string; gist: string; tags: string[] } | null {
  if (isNote(obj)) {
    return { title: obj.title, gist: obj.gist, tags: obj.tags };
  }
  if (isReified(obj)) {
    return { title: obj.title, gist: obj.gist, tags: obj.tags };
  }
  return null;
}

/**
 * Get verb/verb_inverse from any link-like object (NexusLink, or reified).
 */
export function getVerbs(obj: NexusObject): { verb: string; verb_inverse: string } | null {
  if (isLink(obj)) {
    return { verb: obj.verb, verb_inverse: obj.verb_inverse };
  }
  return null;
}

/**
 * Get the global_verb from an M2M reified hub.
 * Returns undefined for binary links.
 */
export function getGlobalVerb(obj: NexusObject): string | undefined {
  if (isM2M(obj)) {
    return obj.global_verb;
  }
  return undefined;
}

/**
 * Get all node IDs connected by a link, regardless of binary or M2M.
 * For binary: returns [source_id, target_id].
 * For M2M: returns all participant node_ids.
 */
export function getConnectedNodeIds(obj: NexusObject): string[] {
  if (isM2M(obj)) {
    return obj.participants.map((p: Participant) => p.node_id);
  }
  if (isBinaryLink(obj)) {
    return [obj.source_id, obj.target_id];
  }
  return [];
}

// ============================================================
// Temporal Stack Builder
// ============================================================

export interface TimeStack {
  baseId: string;
  snapshots: NexusNote[];
}

/**
 * Build a map of baseNodeId → sorted snapshot array from the full registry.
 * Uses `time_state.parent_identity_id` instead of deprecated `time_data.base_node_id`.
 */
export function buildTimeStackMap(
  registry: Record<string, NexusObject>,
): Record<string, NexusNote[]> {
  const map: Record<string, NexusNote[]> = {};

  for (const obj of Object.values(registry)) {
    const timeState = getTimeState(obj);
    if (!timeState?.parent_identity_id) continue;
    if (!timeState.is_historical_snapshot) continue;

    const baseId = timeState.parent_identity_id;

    // Only include note-like objects (SIMPLE_NOTE, STORY_NOTE, or reified)
    if (!isNote(obj) && !isReified(obj)) continue;

    if (!map[baseId]) map[baseId] = [];
    map[baseId].push(obj as NexusNote);
  }

  // Sort each stack by effective_date
  for (const snapshots of Object.values(map)) {
    snapshots.sort((a, b) => {
      const aDate = getEffectiveDate(a);
      const bDate = getEffectiveDate(b);
      if (!aDate) return -1;
      if (!bDate) return 1;
      return compareDates(aDate, bDate);
    });
  }

  return map;
}

/**
 * Given a time stack map and a simulated date, resolve which snapshot
 * is "active" for each base node. Returns baseId → snapshotId.
 *
 * Active = latest snapshot whose effective_date ≤ simulated date.
 */
export function resolveActiveOverrides(
  timeStackMap: Record<string, NexusNote[]>,
  simDate: SimDate,
): Record<string, string> {
  const overrides: Record<string, string> = {};

  for (const [baseId, stack] of Object.entries(timeStackMap)) {
    // Find all snapshots where simDate is within [effective_date, valid_until)
    const residents = stack.filter((node) => {
      const ed = getEffectiveDate(node);
      if (!ed) return false;

      const isAfterStart = compareDates(simDate, ed) >= 0;
      if (!isAfterStart) return false;

      const ts = getTimeState(node);
      if (ts?.valid_until) {
        const isBeforeEnd = compareDates(simDate, ts.valid_until) < 0;
        return isBeforeEnd;
      }

      return true; // Valid forever if no valid_until
    });

    if (residents.length > 0) {
      // Use the latest resident snapshot
      overrides[baseId] = residents[residents.length - 1].id;
    }
  }

  return overrides;
}

/**
 * Apply a temporal override to a base object.
 * Returns a merged object with the snapshot's content overlaid on the base.
 */
export function applyTemporalOverride(baseObj: NexusObject, snapshotObj: NexusObject): NexusObject {
  const snapshotNote = snapshotObj as NexusNote;
  const baseNote = baseObj as NexusNote;

  const merged: NexusObject = {
    ...baseObj,
    ...(snapshotNote.title && { title: snapshotNote.title }),
    ...(snapshotNote.gist && { gist: snapshotNote.gist }),
    ...(snapshotNote.prose_content && { prose_content: snapshotNote.prose_content }),
    ...(snapshotNote.tags && { tags: snapshotNote.tags }),
    time_state: snapshotNote.time_state ?? baseNote.time_state,
  } as NexusObject;

  // For reified links, also overlay verb labels
  if (isReified(baseObj) && isLink(snapshotObj)) {
    const linkPart = snapshotObj as unknown as { verb?: string; verb_inverse?: string };
    if (linkPart.verb) (merged as AggregatedSimpleLink).verb = linkPart.verb;
    if (linkPart.verb_inverse)
      (merged as AggregatedSimpleLink).verb_inverse = linkPart.verb_inverse;
  }

  return merged;
}
