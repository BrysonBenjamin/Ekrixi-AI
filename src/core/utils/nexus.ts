import {
  NexusObject,
  TraitContainer,
  TraitLink,
  StoryNote,
  NexusType,
  NexusCategory,
  ContainmentType,
  DefaultLayout,
  HierarchyType,
  StoryType,
  NarrativeStatus,
  SimpleNote,
  ContainerNote,
  AggregatedSemanticLink,
  AggregatedHierarchicalLink,
} from '../types';

export const isContainer = (obj: NexusObject): obj is NexusObject & TraitContainer => {
  return 'children_ids' in obj && Array.isArray((obj as any).children_ids);
};

export const isLink = (obj: NexusObject): obj is NexusObject & TraitLink => {
  return 'source_id' in obj && 'target_id' in obj;
};

export const isStory = (obj: NexusObject): obj is StoryNote => {
  return obj._type === NexusType.STORY_NOTE;
};

export const isReified = (
  obj: NexusObject,
): obj is AggregatedSemanticLink | AggregatedHierarchicalLink => {
  return 'is_reified' in obj && (obj as any).is_reified === true;
};

export const isStrictHierarchy = (obj: NexusObject): boolean => {
  return (
    obj._type === NexusType.HIERARCHICAL_LINK ||
    obj._type === NexusType.AGGREGATED_HIERARCHICAL_LINK ||
    obj._type === NexusType.CONTAINER_NOTE ||
    obj._type === NexusType.STORY_NOTE
  );
};

export const NexusGraphUtils = {
  reconcileHierarchy: (parent: NexusObject, child: NexusObject, type: NexusType) => {
    const { link, updatedSource, updatedTarget } = NexusGraphUtils.createLink(
      parent,
      child,
      type,
      'contains',
    );
    return { updatedParent: updatedSource, updatedChild: updatedTarget, newLink: link };
  },

  createNode: (
    title: string,
    type: NexusType = NexusType.SIMPLE_NOTE,
  ): SimpleNote | ContainerNote | StoryNote => {
    const now = new Date().toISOString();
    const base = {
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `node-${Date.now()}`,
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
      link_ids: [],
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
        status: NarrativeStatus.VOID,
      } as StoryNote;
    }

    if (type === NexusType.CONTAINER_NOTE) {
      return {
        ...base,
        _type: NexusType.CONTAINER_NOTE,
        containment_type: ContainmentType.FOLDER,
        is_collapsed: false,
        default_layout: DefaultLayout.GRID,
        children_ids: [],
      } as ContainerNote;
    }

    return { ...base, _type: NexusType.SIMPLE_NOTE } as SimpleNote;
  },

  createLink: (source: NexusObject, target: NexusObject, type: NexusType, verb: string) => {
    const now = new Date().toISOString();
    const linkId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `link-${Date.now()}`;

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
      link_ids: [],
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
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `link-${Date.now()}`,
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
      link_ids: [],
    } as any;
  },
};
