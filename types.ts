/**
 * NEXUS.TS
 * Version: 4.3 (Dramaturgical Storage Extension)
 */

// Fix: Import StudioBlock from the correct types file
import { StudioBlock } from './features/story-studio/types';

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

export enum NexusType {
  SIMPLE_NOTE = 'SIMPLE_NOTE',
  CONTAINER_NOTE = 'CONTAINER_NOTE',
  STORY_NOTE = 'STORY_NOTE',
  SIMPLE_LINK = 'SIMPLE_LINK',
  SEMANTIC_LINK = 'SEMANTIC_LINK',
  HIERARCHICAL_LINK = 'HIERARCHICAL_LINK',
  AGGREGATED_SEMANTIC_LINK = 'AGGREGATED_SEMANTIC_LINK',
  AGGREGATED_HIERARCHICAL_LINK = 'AGGREGATED_HIERARCHICAL_LINK',
}

export enum NexusCategory {
  CHARACTER = 'CHARACTER',
  LOCATION = 'LOCATION',
  ITEM = 'ITEM',
  EVENT = 'EVENT',
  CONCEPT = 'CONCEPT',
  META = 'META',
  ORGANIZATION = 'ORGANIZATION',
  STORY = 'STORY'
}

export enum StoryType {
  BOOK = 'BOOK',
  CHAPTER = 'CHAPTER',
  SCENE = 'SCENE',
  BEAT = 'BEAT'
}

export enum NarrativeStatus {
  VOID = 'VOID',
  OUTLINE = 'OUTLINE',
  DRAFT = 'DRAFT',
  POLISHED = 'POLISHED'
}

export enum ContainmentType {
  FOLDER = 'FOLDER',
  REGION = 'REGION',
  FACTION = 'FACTION',
  PLOT_ARC = 'PLOT_ARC',
  MANUSCRIPT = 'MANUSCRIPT'
}

export enum DefaultLayout {
  FORCE_DIRECTED = 'FORCE_DIRECTED',
  MAP = 'MAP',
  TREE = 'TREE',
  GRID = 'GRID',
  TIMELINE = 'TIMELINE'
}

export enum HierarchyType {
  PARENT_OF = 'PARENT_OF',
  PART_OF = 'PART_OF'
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

export interface AggregatedSemanticLink extends Omit<SemanticLink, '_type'>, TraitContainer, Omit<SimpleNote, '_type' | keyof NexusElement> {
  _type: 'AGGREGATED_SEMANTIC_LINK';
  is_reified: true;
}

export interface AggregatedHierarchicalLink extends Omit<HierarchicalLink, '_type'>, TraitContainer, Omit<SimpleNote, '_type' | keyof NexusElement> {
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

export const isContainer = (obj: NexusObject): obj is (NexusObject & TraitContainer) => {
  return 'children_ids' in obj && Array.isArray((obj as any).children_ids);
};

export const isLink = (obj: NexusObject): obj is (NexusObject & TraitLink) => {
  return 'source_id' in obj && 'target_id' in obj;
};

export const isStory = (obj: NexusObject): obj is StoryNote => {
  return obj._type === NexusType.STORY_NOTE;
};

export const isReified = (obj: NexusObject): boolean => {
  return 'is_reified' in obj && (obj as any).is_reified === true;
};

export const isStrictHierarchy = (obj: NexusObject): boolean => {
  return obj._type === NexusType.HIERARCHICAL_LINK || 
         obj._type === NexusType.AGGREGATED_HIERARCHICAL_LINK ||
         obj._type === NexusType.CONTAINER_NOTE ||
         obj._type === NexusType.STORY_NOTE;
};

export type ConflictStatus = 'APPROVED' | 'IMPLIED' | 'REDUNDANT';

export const NexusGraphUtils = {
  reconcileHierarchy: (parent: NexusObject, child: NexusObject, type: NexusType) => {
    const { link, updatedSource, updatedTarget } = NexusGraphUtils.createLink(parent, child, type, 'contains');
    return { updatedParent: updatedSource, updatedChild: updatedTarget, newLink: link };
  },

  createNode: (title: string, type: NexusType = NexusType.SIMPLE_NOTE): SimpleNote | ContainerNote | StoryNote => {
    const now = new Date().toISOString();
    const base = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `node-${Date.now()}`,
      title,
      aliases: [],
      tags: [], 
      gist: '',
      prose_content: '',
      category_id: NexusCategory.CONCEPT,
      is_ghost: false,
      internal_weight: 1.0,
      total_subtree_mass: 0,
      created_at: now,
      last_modified: now,
      link_ids: []
    };

    if (type === NexusType.STORY_NOTE) {
        return {
            ...base,
            _type: NexusType.STORY_NOTE,
            category_id: NexusCategory.STORY,
            containment_type: ContainmentType.MANUSCRIPT,
            is_collapsed: false,
            default_layout: DefaultLayout.TIMELINE,
            children_ids: [],
            story_type: StoryType.SCENE,
            sequence_index: 0,
            tension_level: 50,
            status: NarrativeStatus.VOID
        } as StoryNote;
    }

    if (type === NexusType.CONTAINER_NOTE) {
      return {
        ...base,
        _type: NexusType.CONTAINER_NOTE,
        containment_type: ContainmentType.FOLDER,
        is_collapsed: false,
        default_layout: DefaultLayout.GRID,
        children_ids: []
      } as ContainerNote;
    }

    return { ...base, _type: NexusType.SIMPLE_NOTE } as SimpleNote;
  },

  createLink: (source: NexusObject, target: NexusObject, type: NexusType, verb: string) => {
    const now = new Date().toISOString();
    const linkId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `link-${Date.now()}`;
    
    const link: NexusObject = {
      id: linkId,
      _type: type as any,
      source_id: source.id,
      target_id: target.id,
      verb,
      verb_inverse: 'related to',
      created_at: now,
      last_modified: now,
      internal_weight: 1.0,
      total_subtree_mass: 0,
      link_ids: []
    };
    
    if (type === NexusType.HIERARCHICAL_LINK || type === NexusType.AGGREGATED_HIERARCHICAL_LINK) {
        (link as any).hierarchy_type = HierarchyType.PARENT_OF;
    }

    const updatedSource = { ...source, link_ids: [...source.link_ids, linkId] };
    
    if (type === NexusType.HIERARCHICAL_LINK && isContainer(updatedSource)) {
        updatedSource.children_ids = Array.from(new Set([...updatedSource.children_ids, target.id]));
    }

    const updatedTarget = { ...target, link_ids: [...target.link_ids, linkId] };

    return { link, updatedSource, updatedTarget };
  },

  createShadowLink: (sourceId: string, targetId: string): NexusObject => {
    const now = new Date().toISOString();
    return {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `link-${Date.now()}`,
      _type: NexusType.HIERARCHICAL_LINK,
      source_id: sourceId,
      target_id: targetId,
      verb: 'contains',
      verb_inverse: 'part of',
      hierarchy_type: HierarchyType.PARENT_OF,
      created_at: now,
      last_modified: now,
      internal_weight: 1.0,
      total_subtree_mass: 0,
      link_ids: []
    } as any;
  }
};