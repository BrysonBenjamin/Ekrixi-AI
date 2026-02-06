import { NexusObject, NexusType, NexusCategory } from '../../../types';
import { generateId } from '../../../utils/ids';

export const getNeonSyndicateBatch = (): NexusObject[] => {
  const timestamp = new Date().toISOString();

  // Entity IDs
  const characterId = generateId();
  const techId = generateId();
  const locationId = generateId();
  const orgId = generateId();
  const eventId = generateId();

  return [
    {
      id: characterId,
      _type: NexusType.SIMPLE_NOTE,
      title: 'Zero-Day',
      gist: 'An anonymous decker known for bypassing orbital firewalls.',
      prose_content:
        "Zero-Day's real identity is unknown. Rumors suggest they are a rogue AI construct living in the mesh.",
      category_id: NexusCategory.CHARACTER,
      aliases: ['The Ghost in the Code'],
      tags: ['decker', 'wanted', 'synthetic'],
      is_ghost: false,
      internal_weight: 1.0,
      total_subtree_mass: 0,
      created_at: timestamp,
      last_modified: timestamp,
      link_ids: [],
    },
    {
      id: techId,
      _type: NexusType.SIMPLE_NOTE,
      title: 'Neural Spike',
      gist: 'Illegal combat-grade neuro-toxin delivered via data-burst.',
      prose_content:
        'A devastating software payload that causes physical brain hemorrhaging in unprotected targets.',
      category_id: NexusCategory.ITEM,
      aliases: ['Grey-Out'],
      tags: ['weapon', 'illegal', 'software'],
      is_ghost: false,
      internal_weight: 1.0,
      total_subtree_mass: 0,
      created_at: timestamp,
      last_modified: timestamp,
      link_ids: [],
    },
    {
      id: locationId,
      _type: NexusType.SIMPLE_NOTE,
      title: 'Sector 7 Under-City',
      gist: 'A lawless sprawl beneath the gleaming spires of the elite.',
      prose_content:
        'Where the sun never reaches. Everything here is for sale, including your memories.',
      category_id: NexusCategory.LOCATION,
      aliases: ['The Basement'],
      tags: ['urban', 'high-crime', 'neon'],
      is_ghost: false,
      internal_weight: 1.0,
      total_subtree_mass: 0,
      created_at: timestamp,
      last_modified: timestamp,
      link_ids: [],
    },
    {
      id: orgId,
      _type: NexusType.SIMPLE_NOTE,
      title: 'The Neon Syndicate',
      gist: 'A loosely aligned network of tech-smugglers and data-thieves.',
      prose_content: 'They control 60% of the illegal chip-trade in the lower sectors.',
      category_id: NexusCategory.ORGANIZATION,
      aliases: ['Bright-Wires'],
      tags: ['crime', 'syndicate', 'tech'],
      is_ghost: false,
      internal_weight: 1.0,
      total_subtree_mass: 0,
      created_at: timestamp,
      last_modified: timestamp,
      link_ids: [],
    },
    // Semantic Associations (Scanner Output style)
    {
      id: generateId(),
      _type: NexusType.SEMANTIC_LINK,
      source_id: characterId,
      target_id: orgId,
      verb: 'leads',
      verb_inverse: 'led by',
      created_at: timestamp,
      last_modified: timestamp,
      internal_weight: 1.0,
      total_subtree_mass: 0,
      link_ids: [],
    } as any,
    {
      id: generateId(),
      _type: NexusType.SEMANTIC_LINK,
      source_id: orgId,
      target_id: locationId,
      verb: 'operates in',
      verb_inverse: 'controlled by',
      created_at: timestamp,
      last_modified: timestamp,
      internal_weight: 1.0,
      total_subtree_mass: 0,
      link_ids: [],
    } as any,
    {
      id: generateId(),
      _type: NexusType.SEMANTIC_LINK,
      source_id: techId,
      target_id: orgId,
      verb: 'manufactured by',
      verb_inverse: 'produces',
      created_at: timestamp,
      last_modified: timestamp,
      internal_weight: 1.0,
      total_subtree_mass: 0,
      link_ids: [],
    } as any,
  ];
};
