import {
  NexusObject,
  NexusNote,
  NexusType,
  NexusCategory,
  HierarchyType,
  NexusHierarchicalLink,
} from '../../../types';
import { generateId } from '../../../utils/ids';

export const NexusGraphUtils = {
  /**
   * Creates a new node with default values
   */
  createNode: (title: string, type: NexusType = NexusType.SIMPLE_NOTE): NexusNote => {
    const id = generateId();
    const now = new Date().toISOString();

    return {
      id,
      _type: type as any, // Cast to any to satisfy specific union member
      title,
      internal_weight: 1,
      total_subtree_mass: 1,
      created_at: now,
      last_modified: now,
      link_ids: [],
      aliases: [],
      tags: [],
      category_id: NexusCategory.CONCEPT,
      gist: '',
      prose_content: '',
      is_ghost: false,
      children_ids: [],
    } as NexusNote;
  },

  /**
   * Connects a child to a parent with a hierarchical link and updates both objects.
   * Returns the new link and the updated parent/child objects.
   */
  reconcileHierarchy: (
    parent: NexusObject,
    child: NexusObject,
    linkType: NexusType = NexusType.HIERARCHICAL_LINK,
  ) => {
    const linkId = generateId();
    const now = new Date().toISOString();

    const newLink: NexusHierarchicalLink = {
      id: linkId,
      _type: linkType as NexusType.HIERARCHICAL_LINK,
      source_id: parent.id, // Parent contains Child
      target_id: child.id,
      verb: 'contains',
      verb_inverse: 'is contained by',
      hierarchy_type: HierarchyType.PARENT_OF,
      internal_weight: 1,
      total_subtree_mass: 0,
      created_at: now,
      last_modified: now,
      link_ids: [],
    };

    // Update Parent
    const updatedParent = {
      ...parent,
      link_ids: [...(parent.link_ids || []), linkId],
      children_ids: [...((parent as any).children_ids || []), child.id],
    };

    // Update Child
    const updatedChild = {
      ...child,
      // Child doesn't necessarily store parent_id unless it has a field for it,
      // but it might store the incoming link if we track backlinks in the object (we store link_ids)
      // link_ids usually stores OUTGOING links, but can store all involved links depending on implementation.
      // For now, let's assume link_ids tracks all connected edges.
      link_ids: [...(child.link_ids || []), linkId],
    };

    return {
      newLink,
      updatedParent,
      updatedChild,
    };
  },
};
