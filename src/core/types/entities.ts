import { StudioBlock } from '../../features/story-studio/types';
import {
  NexusType,
  NexusCategory,
  StoryType,
  NarrativeStatus,
  ContainmentType,
  DefaultLayout,
  HierarchyType,
} from './enums';

export interface NexusElement {
  id: string;
  internal_weight: number;
  total_subtree_mass: number;
  created_at: string;
  last_modified: string;
  link_ids: string[];
}

export interface WikiArtifact {
  node_id: string;
  content: string;
  generated_at: string;
  context_depth: number;
  graph_version: string;
}

export interface TraitContainer {
  containment_type: ContainmentType;
  is_collapsed: boolean;
  default_layout: DefaultLayout;
  children_ids: string[];
}

export interface TraitHierarchy {
  hierarchy_type: HierarchyType;
}

export interface TraitLink {
  source_id: string;
  target_id: string;
  verb: string;
  verb_inverse: string;
}

export interface SimpleNote extends NexusElement {
  _type: 'SIMPLE_NOTE' | 'STORY_NOTE';
  title: string;
  aliases: string[];
  tags: string[];
  gist: string;
  prose_content: string;
  category_id: NexusCategory;
  is_ghost: boolean;
  is_author_note?: boolean;
  background_url?: string;
  theme_color?: string;
}

export interface ContainerNote extends Omit<SimpleNote, '_type'>, TraitContainer {
  _type: 'CONTAINER_NOTE' | 'STORY_NOTE';
}

export interface StoryNote extends ContainerNote {
  _type: 'STORY_NOTE';
  story_type: StoryType;
  sequence_index: number;
  tension_level: number;
  status: NarrativeStatus;
  pov_id?: string;
  manifesto_data?: StudioBlock[]; // Stored drafting state
}

export interface SimpleLink extends NexusElement, TraitLink {
  _type: 'SIMPLE_LINK';
}

export interface SemanticLink extends Omit<SimpleLink, '_type'> {
  _type: 'SEMANTIC_LINK';
}

export interface HierarchicalLink extends Omit<SimpleLink, '_type'>, TraitHierarchy {
  _type: 'HIERARCHICAL_LINK';
}

export interface AggregatedSemanticLink
  extends
    Omit<SemanticLink, '_type'>,
    TraitContainer,
    Omit<SimpleNote, '_type' | keyof NexusElement> {
  _type: 'AGGREGATED_SEMANTIC_LINK';
  is_reified: true;
}

export interface AggregatedHierarchicalLink
  extends
    Omit<HierarchicalLink, '_type'>,
    TraitContainer,
    Omit<SimpleNote, '_type' | keyof NexusElement> {
  _type: 'AGGREGATED_HIERARCHICAL_LINK';
  is_reified: true;
}

export type NexusObject =
  | SimpleNote
  | ContainerNote
  | StoryNote
  | SimpleLink
  | SemanticLink
  | HierarchicalLink
  | AggregatedSemanticLink
  | AggregatedHierarchicalLink;
