// ============================================================
// MCP Server — Temporal Resolver
// Extracts and normalizes dates from text using the adopted
// convention: partial dates expand to their full range.
// ============================================================

import type { NexusTimeState } from '../../core/types/entities';

// ============================================================
// Date Types
// ============================================================

export interface PartialDate {
  year: number;
  month?: number;
  day?: number;
}

export interface DetectedDate {
  raw_text: string;
  effective_date: PartialDate;
  valid_until?: PartialDate;
  entity_hint?: string; // The entity this date might be associated with
}

// ============================================================
// Normalization Convention
// ============================================================
// { year: 1042 }        → start: Jan 1 1042, end: Dec 31 1042
// { year: 1042, month: 6 } → start: Jun 1 1042, end: Jun 30 1042
// { year: 1042, month: 6, day: 15 } → start/end: Jun 15 1042
//
// Range: 1042 to 1045  → start: Jan 1 1042, end: Dec 31 1045
// Range: Jun 1042 to Mar 1043 → start: Jun 1 1042, end: Mar 31 1043

/**
 * Expand a partial date to its earliest possible point.
 */
export function toRangeStart(d: PartialDate): PartialDate {
  return {
    year: d.year,
    month: d.month ?? 1,
    day: d.day ?? 1,
  };
}

/**
 * Expand a partial date to its latest possible point.
 */
export function toRangeEnd(d: PartialDate): PartialDate {
  const month = d.month ?? 12;
  const day = d.day ?? daysInMonth(d.year, month);
  return { year: d.year, month, day };
}

function daysInMonth(year: number, month: number): number {
  // Handles leap years for fictional calendars that follow Gregorian rules
  return new Date(year, month, 0).getDate();
}

/**
 * Convert a partial date to a numeric ordinal for easy comparison/sorting.
 * Format: YYYYMMDD
 */
export function toOrdinal(d: PartialDate): number {
  const expanded = toRangeStart(d);
  return expanded.year * 10000 + (expanded.month ?? 1) * 100 + (expanded.day ?? 1);
}

/**
 * Is date A before or equal to date B?
 */
export function isBefore(a: PartialDate, b: PartialDate): boolean {
  return toOrdinal(a) <= toOrdinal(b);
}

/**
 * Check if a child's date range falls within a parent's range.
 * Used for time_children validation.
 */
export function isWithinRange(
  child: { effective_date: PartialDate; valid_until?: PartialDate },
  parent: { effective_date: PartialDate; valid_until?: PartialDate },
): boolean {
  const childStart = toOrdinal(toRangeStart(child.effective_date));
  const parentStart = toOrdinal(toRangeStart(parent.effective_date));
  const parentEnd = toOrdinal(toRangeEnd(parent.valid_until ?? parent.effective_date));

  if (childStart < parentStart || childStart > parentEnd) return false;

  if (child.valid_until) {
    const childEnd = toOrdinal(toRangeEnd(child.valid_until));
    if (childEnd > parentEnd) return false;
  }

  return true;
}

/**
 * Build a NexusTimeState for a new snapshot node.
 */
export function createTimeState(
  effective_date: PartialDate,
  valid_until?: PartialDate,
  parent_identity_id?: string,
  is_snapshot: boolean = false,
): NexusTimeState {
  return {
    is_historical_snapshot: is_snapshot,
    effective_date,
    ...(valid_until ? { valid_until } : {}),
    ...(parent_identity_id ? { parent_identity_id } : {}),
  };
}

// ============================================================
// Date Extraction from Text
// ============================================================

/**
 * Extract temporal markers from raw text.
 * This is a pattern-based first pass — the AI extraction in scan_text
 * will provide more context-aware results.
 */
export function extractDatesFromText(text: string): DetectedDate[] {
  const dates: DetectedDate[] = [];

  // Pattern: "in [year]" or "in the year [year]"
  const yearPattern =
    /\b(?:in\s+(?:the\s+year\s+)?|circa\s+|around\s+|year\s+)(\d{1,5})(?:\s*(AD|BC|CE|BCE|AC))?\b/gi;
  let match: RegExpExecArray | null;
  while ((match = yearPattern.exec(text)) !== null) {
    let year = parseInt(match[1], 10);
    const suffix = (match[2] || '').toUpperCase();
    if (suffix === 'BC' || suffix === 'BCE') year = -year;

    dates.push({
      raw_text: match[0],
      effective_date: { year },
    });
  }

  // Pattern: "from [year] to [year]"
  const rangePattern =
    /\bfrom\s+(\d{1,5})(?:\s*(AD|BC|CE|BCE|AC))?\s+to\s+(\d{1,5})(?:\s*(AD|BC|CE|BCE|AC))?\b/gi;
  while ((match = rangePattern.exec(text)) !== null) {
    let y1 = parseInt(match[1], 10);
    const s1 = (match[2] || '').toUpperCase();
    if (s1 === 'BC' || s1 === 'BCE') y1 = -y1;

    let y2 = parseInt(match[3], 10);
    const s2 = (match[4] || '').toUpperCase();
    if (s2 === 'BC' || s2 === 'BCE') y2 = -y2;

    dates.push({
      raw_text: match[0],
      effective_date: { year: y1 },
      valid_until: { year: y2 },
    });
  }

  // Pattern: "[year]-[year]" range
  const dashRangePattern = /\b(\d{3,5})\s*[-–—]\s*(\d{3,5})\b/g;
  while ((match = dashRangePattern.exec(text)) !== null) {
    const y1 = parseInt(match[1], 10);
    const y2 = parseInt(match[2], 10);
    if (y1 < y2 && y2 - y1 < 10000) {
      dates.push({
        raw_text: match[0],
        effective_date: { year: y1 },
        valid_until: { year: y2 },
      });
    }
  }

  return dates;
}
