// ============================================================
// Ekrixi Schema v2 — Entity Definitions
// ============================================================

import { StudioBlock } from '../../features/story-studio/types';
import {
  NexusType,
  NexusCategory,
  StoryType,
  NarrativeStatus,
  HierarchyType,
  ContainmentType,
  DefaultLayout,
} from './enums';

// ============================================================
// Base Element
// ============================================================

export interface NexusElement {
  id: string;
  internal_weight: number;
  total_subtree_mass: number;
  created_at: string;
  last_modified: string;
  link_ids: string[];
}

// ============================================================
// Temporal State — applies to both notes and links
// ============================================================

export interface NexusTimeState {
  is_historical_snapshot: boolean;
  parent_identity_id?: string; // The base "soul" entity
  effective_date: { year: number; month?: number; day?: number };
  valid_until?: { year: number; month?: number; day?: number };
  perspective_id?: string; // POV node ID for unreliable narrator

  /**
   * IDs of child state nodes whose ranges fall within this node's range.
   * Flat-tree model: a parent sees ALL descendants within its range as children,
   * not just direct ones. All children reference the root parent via parent_identity_id.
   *
   * Validation rules:
   * 1. Child's effective_date must fall within parent's [effective_date, valid_until]
   * 2. If child has valid_until, it must also fall within parent's range
   * 3. All children reference the root parent via parent_identity_id
   */
  time_children?: string[];
}

// ============================================================
// Wiki Artifact
// ============================================================

export interface WikiArtifact {
  node_id: string;
  content: string;
  generated_at: string;
  context_depth: number;
  graph_version: string;
  weaving_protocol?: string; // AI generation instructions (input prompt)
}

// ============================================================
// Traits
// ============================================================

export interface TraitLink {
  source_id: string;
  target_id: string;
  verb: string;
  verb_inverse: string;
  qualifiers?: Record<string, string | number | boolean>;
}

export interface TraitHierarchy {
  /**
   * Hierarchy type determines the semantic direction.
   * The link encodes BOTH directions via verb / verb_inverse:
   *   Forward:  source → verb → target        ("Europe contains France")
   *   Inverse:  target → verb_inverse → source ("France is part of Europe")
   */
  hierarchy_type: HierarchyType;
}

// ============================================================
// M2M Participant (for reified hyperedge links)
// ============================================================

export interface Participant {
  node_id: string;
  role_id: string; // e.g., "AGGRESSOR", "DEFENDER"
  verb: string; // e.g., "attacking", "defending"
}

// ============================================================
// Notes
// ============================================================

export interface NexusNote extends NexusElement {
  _type: NexusType.SIMPLE_NOTE | NexusType.AUTHOR_NOTE | NexusType.STORY_NOTE;

  // Identity
  title: string;
  aliases: string[];
  tags: string[];
  category_id: NexusCategory;

  // Content
  gist: string;
  prose_content: string;
  encyclopedia_content?: string;
  weaving_protocol?: string;
  background_url?: string;

  // Visual
  is_ghost: boolean;
  is_author_note?: boolean;
  theme_color?: string;

  // Containment (from deprecated ContainerNote)
  children_ids?: string[];
  containment_type?: ContainmentType;
  default_layout?: DefaultLayout;
  is_collapsed?: boolean;

  // Temporal
  time_state?: NexusTimeState;

  // Story metadata — only valid when _type === STORY_NOTE
  story_type?: StoryType;
  sequence_index?: number;
  tension_level?: number;
  status?: NarrativeStatus;
  pov_id?: string;
  manifesto_data?: StudioBlock[];
  block_ids?: string[];
}

// ============================================================
// Links
// ============================================================

export interface NexusLink extends NexusElement, TraitLink {
  _type: NexusType.SIMPLE_LINK;
  time_state?: NexusTimeState;
}

export interface NexusHierarchicalLink extends NexusElement, TraitLink, TraitHierarchy {
  _type: NexusType.HIERARCHICAL_LINK;
  time_state?: NexusTimeState;
}

// ============================================================
// Aggregated (Reified) Links — links that are also nodes
// ============================================================
//
// Reified links use a DISCRIMINATED UNION:
//   • Binary mode: has source_id + target_id (standard A→B edge)
//   • M2M mode:    has global_verb + participants[] (hyperedge/hub)
// A reified link is ALWAYS one or the other, never both.
// ============================================================

/** Shared fields for all reified link types */
interface ReifiedBase extends NexusElement, Omit<NexusNote, '_type' | keyof NexusElement> {
  is_reified: true;
  parent_container_id?: string;
  containment_type?: ContainmentType;
  default_layout?: DefaultLayout;
}

/** Binary reified simple link — standard A→B with note-level prose */
interface AggregatedSimpleLinkBinary extends ReifiedBase, TraitLink {
  _type: NexusType.AGGREGATED_SIMPLE_LINK;
  participants?: never;
  global_verb?: never;
}

/** M2M reified simple link — hyperedge hub with N participants */
interface AggregatedSimpleLinkM2M extends ReifiedBase {
  _type: NexusType.AGGREGATED_SIMPLE_LINK;
  global_verb: string;
  participants: Participant[];
  verb: string;
  verb_inverse: string;
  qualifiers?: Record<string, string | number | boolean>;
  source_id?: never;
  target_id?: never;
}

export type AggregatedSimpleLink = AggregatedSimpleLinkBinary | AggregatedSimpleLinkM2M;

/** Binary reified hierarchical link */
interface AggregatedHierarchicalLinkBinary extends ReifiedBase, TraitLink, TraitHierarchy {
  _type: NexusType.AGGREGATED_HIERARCHICAL_LINK;
  participants?: never;
  global_verb?: never;
}

/** M2M reified hierarchical link */
interface AggregatedHierarchicalLinkM2M extends ReifiedBase, TraitHierarchy {
  _type: NexusType.AGGREGATED_HIERARCHICAL_LINK;
  global_verb: string;
  participants: Participant[];
  verb: string;
  verb_inverse: string;
  qualifiers?: Record<string, string | number | boolean>;
  source_id?: never;
  target_id?: never;
}

/**
 * A reified hierarchical link. Inherits bidirectional equivalence.
 *
 * VALIDATION: Only a time-state parent (root identity) may use this type.
 * Time-state children (is_historical_snapshot === true) must use
 * AGGREGATED_SIMPLE_LINK or SIMPLE_LINK instead.
 */
export type AggregatedHierarchicalLink =
  | AggregatedHierarchicalLinkBinary
  | AggregatedHierarchicalLinkM2M;

// ============================================================
// Manifesto Block
// ============================================================

export interface ManifestoBlock extends NexusElement {
  _type: NexusType.MANIFESTO_BLOCK;
  block_type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
  parent_id: string;
}

// ============================================================
// Union Type
// ============================================================

export type NexusObject =
  | NexusNote
  | NexusLink
  | NexusHierarchicalLink
  | AggregatedSimpleLink
  | AggregatedHierarchicalLink
  | ManifestoBlock;

export type StoryNote = NexusNote;

export type Registry = Record<string, NexusObject>;
