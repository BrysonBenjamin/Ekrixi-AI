// ============================================================
// Schema v2 — Compatibility Type Aliases
// ============================================================
//
// Ghost imports like `SimpleNote`, `SimpleLink`, `ContainerNote`,
// and `AggregatedSemanticLink` were imported across the codebase
// but never formally defined — TypeScript silently resolved them
// as `any`.
//
// These aliases provide type-safe mappings to the canonical v2 types.
// Usage: import { SimpleNote } from '../../../types';
// ============================================================

import type {
  NexusNote,
  NexusLink,
  AggregatedSimpleLink,
  AggregatedHierarchicalLink,
} from './entities';

/** @compat Alias for NexusNote — used extensively across drilldown hooks and components */
export type SimpleNote = NexusNote;

/** @compat Alias for NexusLink — used in handler code for raw link operations */
export type SimpleLink = NexusLink;

/**
 * @compat Alias for NexusNote — In v2, containers are just NexusNote with children_ids.
 * Use `isContainer()` type guard rather than checking _type.
 */
export type ContainerNote = NexusNote;

/** @compat Alias — AggregatedSemanticLink was renamed to AggregatedSimpleLink in v2 */
export type AggregatedSemanticLink = AggregatedSimpleLink;

/** @compat Re-export for convenience */
export type { AggregatedHierarchicalLink };

/** @compat Re-export new M2M participant type */
export type { Participant } from './entities';
