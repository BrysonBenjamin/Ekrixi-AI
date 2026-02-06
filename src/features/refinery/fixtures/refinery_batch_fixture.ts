import {
  NexusObject,
  NexusType,
  NexusCategory,
  ContainmentType,
  DefaultLayout,
  HierarchyType,
} from '../../../types';
import { generateId } from '../../../utils/ids';

export const getRefineryDemoBatch = (): NexusObject[] => {
  const timestamp = new Date().toISOString();

  // Core IDs
  const worldId = generateId();
  const cityId = generateId();
  const districtId = generateId();
  const protagonistId = generateId();
  const rivalId = generateId();
  const factionId = generateId();
  const itemId = generateId();

  return [
    // 1. Root Container: The World
    {
      _type: NexusType.CONTAINER_NOTE,
      id: worldId,
      title: 'Oros: The Shattered Realm',
      gist: 'A world of floating archipelagoes suspended over a sea of violet nebula.',
      prose_content:
        '# Oros\n\nOros was once a single massive continent before the *Echo Singularity*. Now, it consists of thousands of islands held together by gravitational anchors.',
      category_id: NexusCategory.LOCATION,
      is_ghost: false,
      internal_weight: 1.0,
      total_subtree_mass: 45,
      created_at: timestamp,
      last_modified: timestamp,
      link_ids: [] as string[],
      aliases: ['The Void Lands'],
      tags: [],
      containment_type: ContainmentType.REGION,
      is_collapsed: false,
      default_layout: DefaultLayout.MAP,
      children_ids: [cityId, factionId],
    },

    // 2. Mid-level Container: The City
    {
      _type: NexusType.CONTAINER_NOTE,
      id: cityId,
      title: 'Lux Aeterna',
      gist: 'The only city that never sees the nebula-tide.',
      prose_content:
        'Built on the highest peak of the central cluster, Lux Aeterna is the seat of the Solar Council.',
      category_id: NexusCategory.LOCATION,
      is_ghost: false,
      internal_weight: 0.9,
      total_subtree_mass: 20,
      created_at: timestamp,
      last_modified: timestamp,
      link_ids: [] as string[],
      aliases: ['The Sun City'],
      tags: [],
      containment_type: ContainmentType.REGION,
      is_collapsed: false,
      default_layout: DefaultLayout.GRID,
      children_ids: [districtId, protagonistId],
    },

    // 3. Leaf Container: The District
    {
      _type: NexusType.CONTAINER_NOTE,
      id: districtId,
      title: 'The Iron Docks',
      gist: 'Where the void-skiffs dock and the black market thrives.',
      prose_content: "Smells of ozone and rusted metal. It's the lowest point of Lux Aeterna.",
      category_id: NexusCategory.LOCATION,
      is_ghost: false,
      internal_weight: 0.7,
      total_subtree_mass: 5,
      created_at: timestamp,
      last_modified: timestamp,
      link_ids: [] as string[],
      aliases: ['The Sink'],
      tags: [],
      containment_type: ContainmentType.REGION,
      is_collapsed: false,
      default_layout: DefaultLayout.GRID,
      children_ids: [itemId],
    },

    // 4. Atomic Node: Protagonist
    {
      _type: NexusType.SIMPLE_NOTE,
      id: protagonistId,
      title: 'Elara Vance',
      gist: "A disgraced skiff-pilot with a talent for finding 'lost' cargo.",
      prose_content:
        'Elara lost her license after the *Kessel Incident*. Now she flies for whoever has the most Aether-Quartz.',
      category_id: NexusCategory.CHARACTER,
      is_ghost: false,
      internal_weight: 1.0,
      total_subtree_mass: 0,
      created_at: timestamp,
      last_modified: timestamp,
      link_ids: [] as string[],
      aliases: ['The Ghost Pilot'],
      tags: [],
    },

    // 5. Atomic Node: Rival
    {
      _type: NexusType.SIMPLE_NOTE,
      id: rivalId,
      title: 'Commander Krell',
      gist: 'A high-ranking enforcer for the Solar Council.',
      prose_content:
        'Krell is obsessed with order. He views Elara as a chaotic variable that needs to be removed from the equation.',
      category_id: NexusCategory.CHARACTER,
      is_ghost: false,
      internal_weight: 0.85,
      total_subtree_mass: 0,
      created_at: timestamp,
      last_modified: timestamp,
      link_ids: [] as string[],
      aliases: ["The Council's Hound"],
      tags: [],
    },

    // 6. Faction Container
    {
      _type: NexusType.CONTAINER_NOTE,
      id: factionId,
      title: 'The Void Seekers',
      gist: "A nomadic cult looking for the 'Ground Zero' of the Echo Singularity.",
      prose_content: 'They believe Oros can be remade. Their methods are... questionable.',
      category_id: NexusCategory.ORGANIZATION,
      is_ghost: false,
      internal_weight: 0.8,
      total_subtree_mass: 12,
      created_at: timestamp,
      last_modified: timestamp,
      link_ids: [] as string[],
      aliases: ['The Remakers'],
      tags: [],
      containment_type: ContainmentType.FACTION,
      is_collapsed: false,
      default_layout: DefaultLayout.TREE,
      children_ids: [rivalId],
    },

    // 7. Item Note
    {
      _type: NexusType.SIMPLE_NOTE,
      id: itemId,
      title: 'The Chronos Shard',
      gist: 'An artifact that can briefly pause the local nebula-tide.',
      prose_content:
        'Dangerous to handle without lead-lined gloves. It hums at a frequency that induces migraines in non-mages.',
      category_id: NexusCategory.ITEM,
      is_ghost: false,
      internal_weight: 0.95,
      total_subtree_mass: 0,
      created_at: timestamp,
      last_modified: timestamp,
      link_ids: [] as string[],
      aliases: ['The Time-Stitcher'],
      tags: [],
    },

    // --- HIERARCHICAL LINKS (Mandatory for Right-Click interaction in tree) ---

    {
      _type: NexusType.HIERARCHICAL_LINK,
      id: generateId(),
      source_id: worldId,
      target_id: cityId,
      verb: 'contains',
      verb_inverse: 'part of',
      hierarchy_type: HierarchyType.PARENT_OF,
      internal_weight: 1.0,
      total_subtree_mass: 0,
      created_at: timestamp,
      last_modified: timestamp,
      link_ids: [] as string[],
    },
    {
      _type: NexusType.HIERARCHICAL_LINK,
      id: generateId(),
      source_id: worldId,
      target_id: factionId,
      verb: 'contains',
      verb_inverse: 'part of',
      hierarchy_type: HierarchyType.PARENT_OF,
      internal_weight: 1.0,
      total_subtree_mass: 0,
      created_at: timestamp,
      last_modified: timestamp,
      link_ids: [] as string[],
    },
    {
      _type: NexusType.HIERARCHICAL_LINK,
      id: generateId(),
      source_id: cityId,
      target_id: districtId,
      verb: 'contains',
      verb_inverse: 'part of',
      hierarchy_type: HierarchyType.PARENT_OF,
      internal_weight: 1.0,
      total_subtree_mass: 0,
      created_at: timestamp,
      last_modified: timestamp,
      link_ids: [] as string[],
    },
    {
      _type: NexusType.HIERARCHICAL_LINK,
      id: generateId(),
      source_id: cityId,
      target_id: protagonistId,
      verb: 'contains',
      verb_inverse: 'part of',
      hierarchy_type: HierarchyType.PARENT_OF,
      internal_weight: 1.0,
      total_subtree_mass: 0,
      created_at: timestamp,
      last_modified: timestamp,
      link_ids: [] as string[],
    },
    {
      _type: NexusType.HIERARCHICAL_LINK,
      id: generateId(),
      source_id: districtId,
      target_id: itemId,
      verb: 'contains',
      verb_inverse: 'part of',
      hierarchy_type: HierarchyType.PARENT_OF,
      internal_weight: 1.0,
      total_subtree_mass: 0,
      created_at: timestamp,
      last_modified: timestamp,
      link_ids: [] as string[],
    },
    {
      _type: NexusType.HIERARCHICAL_LINK,
      id: generateId(),
      source_id: factionId,
      target_id: rivalId,
      verb: 'contains',
      verb_inverse: 'part of',
      hierarchy_type: HierarchyType.PARENT_OF,
      internal_weight: 1.0,
      total_subtree_mass: 0,
      created_at: timestamp,
      last_modified: timestamp,
      link_ids: [] as string[],
    },

    // --- SEMANTIC LINKS ---

    {
      _type: NexusType.SEMANTIC_LINK,
      id: generateId(),
      source_id: protagonistId,
      target_id: rivalId,
      verb: 'hunted by',
      verb_inverse: 'hunts',
      internal_weight: 1.0,
      total_subtree_mass: 0,
      created_at: timestamp,
      last_modified: timestamp,
      link_ids: [] as string[],
    },
    {
      _type: NexusType.SEMANTIC_LINK,
      id: generateId(),
      source_id: rivalId,
      target_id: itemId,
      verb: 'searching for',
      verb_inverse: 'searched by',
      internal_weight: 0.7,
      total_subtree_mass: 0,
      created_at: timestamp,
      last_modified: timestamp,
      link_ids: [] as string[],
    },
  ];
};
