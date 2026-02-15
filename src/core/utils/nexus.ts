// ============================================================
// Ekrixi Schema v2 — Type Guards & Graph Utilities
// ============================================================

import {
  NexusObject,
  TraitLink,
  NexusNote,
  NexusHierarchicalLink,
  AggregatedSimpleLink,
  AggregatedHierarchicalLink,
  NexusTimeState,
  Participant,
} from '../types';
import {
  NexusType,
  NexusCategory,
  HierarchyType,
  StoryType,
  NarrativeStatus,
} from '../types/enums';

// ============================================================
// Type Guards
// ============================================================

/** True if the object has children_ids — it acts as a container */
export const isContainer = (obj: NexusObject): obj is NexusObject & { children_ids: string[] } => {
  return 'children_ids' in obj && Array.isArray((obj as any).children_ids);
};

/** True if the object is any kind of link (binary source/target OR M2M participants) */
export const isLink = (obj: NexusObject): obj is NexusObject & TraitLink => {
  return ('source_id' in obj && 'target_id' in obj) || 'participants' in obj;
};

/** True if the object is a Many-to-Many reified hub (has participants array) */
export const isM2M = (
  obj: NexusObject,
): obj is NexusObject & { participants: Participant[]; global_verb: string } => {
  return 'participants' in obj && Array.isArray((obj as any).participants);
};

/** True if the object is a standard binary link (source_id + target_id, no participants) */
export const isBinaryLink = (obj: NexusObject): obj is NexusObject & TraitLink => {
  return 'source_id' in obj && 'target_id' in obj && !('participants' in obj);
};

/** True if _type === STORY_NOTE */
export const isStory = (obj: NexusObject): obj is NexusNote => {
  return obj._type === NexusType.STORY_NOTE;
};

/** True if the object is a reified (aggregated) link */
export const isReified = (
  obj: NexusObject,
): obj is AggregatedSimpleLink | AggregatedHierarchicalLink => {
  return 'is_reified' in obj && (obj as AggregatedSimpleLink).is_reified === true;
};

/** True if the object is a strict hierarchical type */
export const isStrictHierarchy = (
  obj: NexusObject,
): obj is NexusHierarchicalLink | AggregatedHierarchicalLink => {
  return (
    obj._type === NexusType.HIERARCHICAL_LINK ||
    obj._type === NexusType.AGGREGATED_HIERARCHICAL_LINK
  );
};

/** True if the object is a note type (SIMPLE_NOTE, AUTHOR_NOTE, or STORY_NOTE) */
export const isNote = (obj: NexusObject): obj is NexusNote => {
  return (
    obj._type === NexusType.SIMPLE_NOTE ||
    obj._type === NexusType.AUTHOR_NOTE ||
    obj._type === NexusType.STORY_NOTE
  );
};

/** True if the object has temporal state (T2 or T3) */
export const isTemporal = (
  obj: NexusObject,
): obj is NexusObject & { time_state: NexusTimeState } => {
  return 'time_state' in obj && (obj as any).time_state !== undefined;
};

/** True if the object is a historical snapshot (time-state child) */
export const isSnapshot = (
  obj: NexusObject,
): obj is NexusObject & { time_state: NexusTimeState } => {
  return 'time_state' in obj && (obj as any).time_state?.is_historical_snapshot === true;
};

/** True if the object has time_children (T3 recursive) */
export const isRecursiveTemporal = (
  obj: NexusObject,
): obj is NexusObject & { time_state: NexusTimeState & { time_children: string[] } } => {
  const ts = (obj as any).time_state;
  return ts !== undefined && Array.isArray(ts.time_children) && ts.time_children.length > 0;
};

// ============================================================
// Graph Utilities
// ============================================================

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

  createNode: (title: string, type: NexusType = NexusType.SIMPLE_NOTE): NexusNote => {
    const now = new Date().toISOString();
    const base: NexusNote = {
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `node-${Date.now()}`,
      _type: type as NexusNote['_type'],
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
      base._type = NexusType.STORY_NOTE;
      base.category_id = NexusCategory.STORY;
      base.children_ids = [];
      base.is_collapsed = false;
      base.story_type = StoryType.SCENE;
      base.sequence_index = 0;
      base.tension_level = 50;
      base.status = NarrativeStatus.VOID;
    }

    return base;
  },

  createLink: (
    source: NexusObject,
    target: NexusObject,
    type: NexusType,
    verb: string,
    qualifiers?: Record<string, string | number | boolean>,
  ) => {
    const now = new Date().toISOString();
    const linkId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `link-${Date.now()}`;

    const link: NexusObject = {
      id: linkId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _type: type as any,
      source_id: source.id,
      target_id: target.id,
      verb,
      verb_inverse: 'related to',
      ...(qualifiers && { qualifiers }),
      created_at: now,
      last_modified: now,
      internal_weight: 1.0,
      total_subtree_mass: 0,
      link_ids: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    if (type === NexusType.HIERARCHICAL_LINK || type === NexusType.AGGREGATED_HIERARCHICAL_LINK) {
      (link as NexusHierarchicalLink).hierarchy_type = HierarchyType.PARENT_OF;
    }

    const updatedSource = { ...source, link_ids: [...source.link_ids, linkId] };

    if (type === NexusType.HIERARCHICAL_LINK && isContainer(updatedSource)) {
      const note = updatedSource as NexusNote;
      note.children_ids = Array.from(new Set([...(note.children_ids || []), target.id]));
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
    } as NexusHierarchicalLink;
  },

  /**
   * Create a Many-to-Many reified hub (hyperedge).
   * Returns the hub node. Caller should update participant nodes' link_ids.
   */
  createReifiedHub: (
    title: string,
    global_verb: string,
    participants: Participant[],
    type: NexusType = NexusType.AGGREGATED_SIMPLE_LINK,
  ): AggregatedSimpleLink => {
    const now = new Date().toISOString();
    const hubId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `hub-${Date.now()}`;

    return {
      id: hubId,
      _type: NexusType.AGGREGATED_SIMPLE_LINK,
      is_reified: true,
      title,
      global_verb,
      participants,
      verb: global_verb,
      verb_inverse: `inverse of ${global_verb}`,
      aliases: [],
      tags: [],
      gist: '',
      prose_content: '',
      category_id: NexusCategory.EVENT,
      is_ghost: false,
      internal_weight: 1.0,
      total_subtree_mass: 0,
      created_at: now,
      last_modified: now,
      link_ids: [],
    } as AggregatedSimpleLink;
  },
};
