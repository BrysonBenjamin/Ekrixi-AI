import {
  NexusObject,
  NexusType,
  NexusCategory,
  ContainmentType,
  DefaultLayout,
  HierarchyType,
} from '../src/types';
import { generateId } from '../src/utils/ids';

export const getGaiaFixture = (): Record<string, NexusObject> => {
  const timestamp = new Date().toISOString();
  const registry: Record<string, NexusObject> = {};

  const createAndAdd = (obj: NexusObject) => {
    registry[obj.id] = obj;
    return obj.id;
  };

  // 1. Root: Gaia
  const gaiaId = createAndAdd({
    id: 'gaia-root',
    _type: NexusType.CONTAINER_NOTE,
    title: 'GAIA PRIME',
    gist: 'The living super-organism at the heart of the sector.',
    prose_content:
      '# Gaia Prime\nGaia is a planetary-scale biological entity. Every mountain is a bone, every river is a vein. The atmosphere is maintained by the rhythmic respiration of the Great Spore Forests.',
    category_id: NexusCategory.LOCATION,
    is_ghost: false,
    internal_weight: 1.0,
    total_subtree_mass: 100,
    created_at: timestamp,
    last_modified: timestamp,
    link_ids: [],
    aliases: ['The Mother', 'System 01'],
    tags: ['primordial', 'biological'],
    containment_type: ContainmentType.REGION,
    is_collapsed: false,
    default_layout: DefaultLayout.TREE,
    children_ids: [], // To be populated
  } as NexusObject);

  // 2. Continents
  const aetheriaId = createAndAdd({
    id: generateId(),
    _type: NexusType.CONTAINER_NOTE,
    title: 'Aetheria',
    gist: 'The floating continent of eternal winds.',
    category_id: NexusCategory.LOCATION,
    is_ghost: false,
    internal_weight: 1.0,
    total_subtree_mass: 40,
    created_at: timestamp,
    last_modified: timestamp,
    link_ids: [],
    aliases: ['Sky-Reach'],
    tags: ['high-altitude', 'wind'],
    containment_type: ContainmentType.REGION,
    is_collapsed: false,
    default_layout: DefaultLayout.GRID,
    children_ids: [],
  } as NexusObject);

  const abyssaId = createAndAdd({
    id: generateId(),
    _type: NexusType.CONTAINER_NOTE,
    title: 'The Abyssa Trenches',
    gist: 'Deep-sea bioluminescent civilizations.',
    category_id: NexusCategory.LOCATION,
    is_ghost: false,
    internal_weight: 1.0,
    total_subtree_mass: 30,
    created_at: timestamp,
    last_modified: timestamp,
    link_ids: [],
    aliases: ['The Drowned Realm'],
    tags: ['underwater', 'darkness'],
    containment_type: ContainmentType.REGION,
    is_collapsed: false,
    default_layout: DefaultLayout.GRID,
    children_ids: [],
  } as NexusObject);

  // 3. Factions
  const councilId = createAndAdd({
    id: generateId(),
    _type: NexusType.CONTAINER_NOTE,
    title: 'Solar Council',
    gist: 'Technocratic rulers of Aetheria.',
    category_id: NexusCategory.ORGANIZATION,
    is_ghost: false,
    internal_weight: 1.0,
    total_subtree_mass: 15,
    created_at: timestamp,
    last_modified: timestamp,
    link_ids: [],
    aliases: ['The Architects'],
    tags: ['authority', 'tech'],
    containment_type: ContainmentType.FACTION,
    is_collapsed: false,
    default_layout: DefaultLayout.TREE,
    children_ids: [],
  } as NexusObject);

  // 4. Characters
  const elaraId = createAndAdd({
    id: generateId(),
    _type: NexusType.SIMPLE_NOTE,
    title: 'Elara Vance',
    gist: 'A renegade pilot with Gaia-synchronized intuition.',
    category_id: NexusCategory.CHARACTER,
    is_ghost: false,
    internal_weight: 1.0,
    total_subtree_mass: 0,
    created_at: timestamp,
    last_modified: timestamp,
    link_ids: [],
    aliases: ['The Whisperer'],
    tags: ['pilot', 'empath'],
    prose_content:
      "Elara was the first to realize that Gaia's tectonic shifts were actually a form of long-wave communication.",
  } as NexusObject);

  // 5. Build Hierarchy Links
  const addHierarchy = (parentId: string, childId: string) => {
    const parent = registry[parentId];
    if (parent && 'children_ids' in parent) {
      if (!parent.children_ids.includes(childId)) {
        parent.children_ids.push(childId);
      }
    }

    const linkId = generateId();
    const link: NexusObject = {
      id: linkId,
      _type: NexusType.HIERARCHICAL_LINK,
      source_id: parentId,
      target_id: childId,
      verb: 'governs',
      verb_inverse: 'subject of',
      hierarchy_type: HierarchyType.PARENT_OF,
      internal_weight: 1.0,
      created_at: timestamp,
      last_modified: timestamp,
      link_ids: [],
    } as NexusObject;
    registry[linkId] = link;
    if (parent) parent.link_ids.push(linkId);
    registry[childId].link_ids.push(linkId);
  };

  addHierarchy(gaiaId, aetheriaId);
  addHierarchy(gaiaId, abyssaId);
  addHierarchy(aetheriaId, councilId);
  addHierarchy(councilId, elaraId);

  // 6. Semantic Link
  const semanticLinkId = generateId();
  registry[semanticLinkId] = {
    id: semanticLinkId,
    _type: NexusType.SEMANTIC_LINK,
    source_id: elaraId,
    target_id: abyssaId,
    verb: 'born in',
    verb_inverse: 'birthplace of',
    internal_weight: 1.0,
    total_subtree_mass: 0,
    created_at: timestamp,
    last_modified: timestamp,
    link_ids: [],
  } as NexusObject;
  registry[elaraId].link_ids.push(semanticLinkId);
  registry[abyssaId].link_ids.push(semanticLinkId);

  return registry;
};
