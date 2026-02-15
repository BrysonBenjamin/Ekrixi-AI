import { NexusObject, NexusType, NexusCategory } from '../../../types';
import { generateId } from '../../../utils/ids';
import { PlaygroundFixture } from '../types/fixtures';
import { DataService } from '../../../core/services/DataService';

/**
 * Gaia Prime Fixture — Clean-room Alignment for Schema v2.
 */
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
    _type: NexusType.SIMPLE_NOTE,
    title: 'GAIA PRIME',
    gist: 'The living super-organism.',
    prose_content: 'Gaia is a planetary biological entity.',
    category_id: NexusCategory.LOCATION,
    is_ghost: false,
    internal_weight: 1.0,
    total_subtree_mass: 100,
    created_at: timestamp,
    last_modified: timestamp,
    link_ids: [],
    aliases: ['The Mother'],
    tags: ['primordial'],
    is_collapsed: false,
    children_ids: [],
  } as NexusObject);

  // 2. Continents
  const aetheriaId = createAndAdd({
    id: generateId(),
    _type: NexusType.SIMPLE_NOTE,
    title: 'Aetheria',
    gist: 'Floating continent.',
    prose_content: 'Held aloft by gas-bladders.',
    category_id: NexusCategory.LOCATION,
    is_ghost: false,
    internal_weight: 1.0,
    total_subtree_mass: 40,
    created_at: timestamp,
    last_modified: timestamp,
    link_ids: [],
    aliases: [],
    tags: ['wind'],
    is_collapsed: false,
    children_ids: [],
  } as NexusObject);

  // 3. Factions
  const councilId = createAndAdd({
    id: generateId(),
    _type: NexusType.SIMPLE_NOTE,
    title: 'Solar Council',
    gist: 'Technocratic rulers.',
    prose_content: 'Regulate gas-power flow.',
    category_id: NexusCategory.ORGANIZATION,
    is_ghost: false,
    internal_weight: 1.0,
    total_subtree_mass: 15,
    created_at: timestamp,
    last_modified: timestamp,
    link_ids: [],
    aliases: [],
    tags: ['authority'],
    is_collapsed: false,
    children_ids: [],
  } as NexusObject);

  // 4. Build Hierarchy Link Helper
  const addHierarchy = (parentId: string, childId: string) => {
    const parent = registry[parentId];
    if (parent && 'children_ids' in parent && Array.isArray(parent.children_ids)) {
      if (!parent.children_ids.includes(childId)) {
        parent.children_ids.push(childId);
      }
    }

    const linkId = generateId();
    registry[linkId] = {
      id: linkId,
      _type: NexusType.SIMPLE_LINK,
      source_id: parentId,
      target_id: childId,
      verb: 'contains',
      verb_inverse: 'part of',
      internal_weight: 1.0,
      total_subtree_mass: 0,
      created_at: timestamp,
      last_modified: timestamp,
      link_ids: [],
    };
    registry[parentId].link_ids.push(linkId);
    registry[childId].link_ids.push(linkId);
  };

  addHierarchy(gaiaId, aetheriaId);
  addHierarchy(aetheriaId, councilId);

  return registry;
};

export const gaiaFixture: PlaygroundFixture = {
  id: 'gaia-prime',
  name: 'Gaia Prime',
  description:
    'A biological planetary system with hierarchical locations and technocratic factions.',
  category: 'Relational',
  getObjects: () => getGaiaFixture(),
  seed: async (universeId: string) => {
    const objects = getGaiaFixture();
    await DataService.batchCreateOrUpdate(universeId, Object.values(objects));
    return 'gaia-root';
  },
};
