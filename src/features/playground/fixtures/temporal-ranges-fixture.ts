import { NexusNote, NexusType, NexusCategory, NexusObject } from '../../../types';
import { generateId } from '../../../utils/ids';
import { PlaygroundFixture } from '../types/fixtures';
import { DataService } from '../../../core/services/DataService';

/**
 * Creates a High-Complexity Historical Registry with deep temporal nesting based on real human history.
 */
export function createHistoricalTemporalFixture(): Record<string, NexusObject> {
  const registry: Record<string, NexusObject> = {};
  const worldId = generateId();

  const timestamp = new Date().toISOString();

  const createBaseIdentity = (
    id: string,
    title: string,
    gist: string,
    prose: string,
    category: NexusCategory,
  ): NexusNote => {
    return {
      id,
      _type: NexusType.SIMPLE_NOTE,
      category_id: category,
      title,
      gist,
      prose_content: prose,
      aliases: [],
      tags: ['Identity'],
      link_ids: [],
      is_ghost: false,
      created_at: timestamp,
      last_modified: timestamp,
      internal_weight: 1.0,
      total_subtree_mass: 100.0,
      children_ids: [],
    };
  };

  const humanityNode = createBaseIdentity(
    worldId,
    'Human Civilization',
    'The collective history of the human race.',
    'From the first cities in Sumer to the digital age, a story of expansion, conflict, and innovation.',
    NexusCategory.WORLD,
  );

  registry[worldId] = humanityNode;

  const createSnapshot = (
    identityId: string,
    title: string,
    gist: string,
    yearStart: number,
    yearEnd?: number,
    childIds: string[] = [],
  ): NexusNote => {
    const base = registry[identityId] as NexusNote;
    const id = generateId();
    const snap: NexusNote = {
      ...base,
      id,
      title: `${title} (${base.title})`,
      gist,
      prose_content: `Snapshot of ${base.title} during ${title}.`,
      category_id: NexusCategory.STATE,
      tags: ['Snapshot'],
      time_state: {
        is_historical_snapshot: true,
        parent_identity_id: identityId,
        effective_date: { year: yearStart },
        valid_until: yearEnd ? { year: yearEnd } : undefined,
        time_children: childIds,
      },
      children_ids: [],
      internal_weight: 0.5,
      total_subtree_mass: 0.0,
      link_ids: [],
    };
    registry[id] = snap;
    return snap;
  };

  // --- ANCIENT ERA ---
  const bronzeCollapse = createSnapshot(
    worldId,
    'Late Bronze Age Collapse',
    'A mysterious period of societal failure.',
    -1200,
    -1150,
  );
  const romanRepublic = createSnapshot(
    worldId,
    'The Roman Republic',
    'The Rise of Rome from city-state to Mediterranean power.',
    -509,
    -27,
  );
  const ancientEra = createSnapshot(
    worldId,
    'Ancient Era',
    'From the invention of writing to the fall of Rome.',
    -3000,
    476,
    [bronzeCollapse.id, romanRepublic.id],
  );

  // --- MIDDLE AGES ---
  const blackDeath = createSnapshot(
    worldId,
    'The Black Death',
    'A devastating global epidemic of bubonic plague.',
    1347,
    1351,
  );
  const middleAges = createSnapshot(
    worldId,
    'Post-Classical Era (Middle Ages)',
    'From the fall of the Western Roman Empire to the Renaissance.',
    476,
    1450,
    [blackDeath.id],
  );

  // --- MODERN ERA ---
  const industrialRev = createSnapshot(
    worldId,
    'Industrial Revolution',
    'The transition to new manufacturing processes.',
    1760,
    1840,
  );
  const spaceAge = createSnapshot(
    worldId,
    'The Space Age',
    'Commencing with the launch of Sputnik 1.',
    1957,
    2024,
  );
  const modernEra = createSnapshot(
    worldId,
    'Modern Era',
    'The period from the Renaissance to the present day.',
    1450,
    2024,
    [industrialRev.id, spaceAge.id],
  );

  // Root children are the macro eras
  humanityNode.children_ids = [ancientEra.id, middleAges.id, modernEra.id];
  // In our flat temporal model, we also link them as time children if we want them to show up in the timeline
  humanityNode.time_state = {
    is_historical_snapshot: false,
    effective_date: { year: -3000 },
    valid_until: { year: 2024 },
    time_children: [ancientEra.id, middleAges.id, modernEra.id],
  };

  return registry;
}

export const temporalRangeFixture: PlaygroundFixture = {
  id: 'temporal-range-world',
  name: 'Human History Timeline',
  description:
    'A comprehensive timeline of human civilization from the Bronze Age to the Digital Age, demonstrating nested temporal ranges.',
  category: 'Temporal',
  getObjects: () => createHistoricalTemporalFixture(),
  seed: async (universeId: string) => {
    const objects = createHistoricalTemporalFixture();
    await DataService.batchCreateOrUpdate(universeId, Object.values(objects));

    // Return the root identity ID
    return (
      Object.keys(objects).find((id) => {
        const obj = objects[id] as NexusNote;
        return obj.category_id === NexusCategory.WORLD && !obj.time_state?.is_historical_snapshot;
      }) || ''
    );
  },
};
