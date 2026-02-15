// ============================================================
// MCP Server — Entity Matcher
// Fuzzy-matches extracted entity names against an existing
// registry to enable graph extension (delta extraction).
// ============================================================

import type { NexusObject, NexusNote } from '../../core/types/entities';

// ============================================================
// Types
// ============================================================

export interface RegistryMatch {
  /** The extracted title that was matched */
  extracted_title: string;
  /** The existing registry object that matched */
  existing_id: string;
  existing_title: string;
  /** How it matched */
  match_type: 'exact_title' | 'alias' | 'fuzzy';
  /** Confidence 0-1 */
  confidence: number;
}

// ============================================================
// Matching Functions
// ============================================================

/**
 * Normalize a string for comparison: lowercase, trim, collapse whitespace.
 */
function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Simple Levenshtein distance for fuzzy matching.
 */
function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      matrix[i][j] =
        a[i - 1] === b[j - 1]
          ? matrix[i - 1][j - 1]
          : 1 + Math.min(matrix[i - 1][j], matrix[i][j - 1], matrix[i - 1][j - 1]);
    }
  }
  return matrix[a.length][b.length];
}

/**
 * Compute similarity between two strings (0 = no match, 1 = identical).
 */
function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1.0;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshtein(na, nb);
  return 1 - dist / maxLen;
}

/**
 * Check if an object is a note-like type with title and aliases.
 */
function isNotelike(obj: NexusObject): obj is NexusNote {
  return 'title' in obj && 'aliases' in obj;
}

/**
 * Match a list of extracted entity titles against an existing registry.
 * Returns matches sorted by confidence (highest first).
 *
 * @param titles - Extracted entity titles to match
 * @param registry - Existing NexusObject registry (id → object)
 * @param fuzzyThreshold - Minimum similarity for fuzzy matches (default 0.75)
 */
export function matchEntities(
  titles: string[],
  registry: Record<string, NexusObject>,
  fuzzyThreshold: number = 0.75,
): RegistryMatch[] {
  const matches: RegistryMatch[] = [];
  const objects = Object.values(registry).filter(isNotelike);

  for (const title of titles) {
    const normalizedTitle = normalize(title);
    let bestMatch: RegistryMatch | null = null;

    for (const obj of objects) {
      // Exact title match
      if (normalize(obj.title) === normalizedTitle) {
        bestMatch = {
          extracted_title: title,
          existing_id: obj.id,
          existing_title: obj.title,
          match_type: 'exact_title',
          confidence: 1.0,
        };
        break; // Can't do better than exact
      }

      // Alias match
      const aliasMatch = obj.aliases?.find((a) => normalize(a) === normalizedTitle);
      if (aliasMatch) {
        const candidate: RegistryMatch = {
          extracted_title: title,
          existing_id: obj.id,
          existing_title: obj.title,
          match_type: 'alias',
          confidence: 0.95,
        };
        if (!bestMatch || candidate.confidence > bestMatch.confidence) {
          bestMatch = candidate;
        }
        continue;
      }

      // Fuzzy title match
      const sim = similarity(title, obj.title);
      if (sim >= fuzzyThreshold) {
        const candidate: RegistryMatch = {
          extracted_title: title,
          existing_id: obj.id,
          existing_title: obj.title,
          match_type: 'fuzzy',
          confidence: sim,
        };
        if (!bestMatch || candidate.confidence > bestMatch.confidence) {
          bestMatch = candidate;
        }
      }

      // Fuzzy alias match
      for (const alias of obj.aliases ?? []) {
        const aliasSim = similarity(title, alias);
        if (aliasSim >= fuzzyThreshold) {
          const candidate: RegistryMatch = {
            extracted_title: title,
            existing_id: obj.id,
            existing_title: obj.title,
            match_type: 'fuzzy',
            confidence: aliasSim * 0.95, // Slightly less confident than title match
          };
          if (!bestMatch || candidate.confidence > bestMatch.confidence) {
            bestMatch = candidate;
          }
        }
      }
    }

    if (bestMatch) {
      matches.push(bestMatch);
    }
  }

  return matches.sort((a, b) => b.confidence - a.confidence);
}
