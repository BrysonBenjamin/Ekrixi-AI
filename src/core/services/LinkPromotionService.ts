import { DataService } from './DataService';
import { generateId } from '../../utils/ids';
import { NexusObject, NexusLink, AggregatedSimpleLink, NexusType, NexusCategory } from '../types';

/**
 * LinkReificationService (formerly LinkPromotionService)
 * Handles the escalation of graph relationships:
 *   SimpleLink → AggregatedSimpleLink (reified with note fields)
 *   Adding children to container links
 */
export const LinkPromotionService = {
  /**
   * Reifies a NexusLink into an AggregatedSimpleLink.
   * This adds a "body" to the connection (prose, gist, category).
   */
  async promoteToReified(
    universeId: string,
    sourceLink: NexusLink,
    initialContent: { title: string; gist: string; prose?: string },
  ): Promise<string> {
    console.log(`[Reification] Reifying link ${sourceLink.id}`);

    const reifiedLink: AggregatedSimpleLink = {
      ...sourceLink,
      _type: NexusType.AGGREGATED_SIMPLE_LINK,
      is_reified: true,
      title: initialContent.title,
      gist: initialContent.gist,
      prose_content: initialContent.prose || '',
      category_id: NexusCategory.EVENT,
      internal_weight: sourceLink.internal_weight || 1,
      total_subtree_mass: 1,
      aliases: [],
      tags: ['Reified'],
      created_at: new Date().toISOString(),
      last_modified: new Date().toISOString(),
      link_ids: [],
      is_ghost: false,
    };

    // Replace the old link with the new reified one
    await DataService.batchCreateOrUpdate(universeId, [reifiedLink]);

    return reifiedLink.id;
  },

  /**
   * Enables a reified link to act as a container for child links/events.
   * Adds children_ids to the reified link if not already present.
   */
  async enableContainer(
    universeId: string,
    linkId: string,
    registry: Record<string, NexusObject>,
  ): Promise<void> {
    const existing = registry[linkId] as AggregatedSimpleLink;
    if (!existing || existing._type !== NexusType.AGGREGATED_SIMPLE_LINK) {
      throw new Error(`Cannot enable container on ${linkId}: Link must be reified first.`);
    }

    console.log(`[Reification] Enabling container on link ${linkId}`);

    const updated: AggregatedSimpleLink = {
      ...existing,
      children_ids: existing.children_ids || [],
      tags: [...(existing.tags || []), 'Container', 'Fractal'],
      last_modified: new Date().toISOString(),
    };

    await DataService.batchCreateOrUpdate(universeId, [updated]);
  },

  /**
   * Fractal Nesting: Adds a child to a container link.
   */
  async addChildToContainer(
    universeId: string,
    parentId: string,
    childId: string,
    registry: Record<string, NexusObject>,
  ): Promise<void> {
    const parent = registry[parentId] as AggregatedSimpleLink;
    if (!parent || !parent.children_ids) {
      throw new Error(`Parent ${parentId} must be a reified container link.`);
    }

    const child = registry[childId] as NexusObject;
    if (!child) throw new Error(`Child ${childId} not found.`);

    console.log(`[Fractal] Nesting ${childId} under container ${parentId}`);

    // Update parent's children_ids
    const updatedParent: AggregatedSimpleLink = {
      ...parent,
      children_ids: Array.from(new Set([...(parent.children_ids || []), childId])),
      last_modified: new Date().toISOString(),
    };

    await DataService.batchCreateOrUpdate(universeId, [updatedParent]);
  },
};
