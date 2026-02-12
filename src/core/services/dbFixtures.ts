import { DataService } from './DataService';
import { NexusObject, SimpleNote, NexusType } from '../types';
import { TimeDimensionService } from './TimeDimensionService';
import { generateId } from '../../utils/ids';

/**
 * dbFixtures
 * Professional mock data and utility for populating local storage.
 */
export const dbFixtures = {
  /**
   * Seed the database (Local or Firebase) with a high-fidelity starting universe.
   */
  async seedDemoUniverse() {
    const universeId = 'demo-universe-professional';

    // 1. Create the universe if it doesn't exist
    await DataService.importUniverse(
      universeId,
      'The Obsidian Spire',
      'A high-fidelity architectural nexus staging environment.',
      'guest-user',
    );

    // 2. Prepare professional mock objects
    const objects: NexusObject[] = [
      {
        id: crypto.randomUUID(),
        _type: 'SIMPLE_NOTE',
        title: 'Recursive Ontological Scaling',
        gist: 'Analyzing the recursive nature of deep-semantic lore structures in v4 scaling.',
        prose_content:
          'In-depth analysis of how ontological layers scale within the Nexus manifold.',
        tags: ['Architecture', 'Scaling', 'v4'],
        created_at: new Date().toISOString(),
        last_modified: new Date().toISOString(),
        link_ids: [],
        internal_weight: 1,
        total_subtree_mass: 1,
        aliases: [],
        category_id: 'WORLD' as any,
        is_ghost: false,
      } as any,
      {
        id: crypto.randomUUID(),
        _type: 'SIMPLE_NOTE',
        title: 'Nexus Security Protocol',
        gist: 'Documentation for the locally sovereign encryption layers used in Guest mode.',
        prose_content:
          'Security specifications for the localized encryption of world-building assets.',
        tags: ['Security', 'Sovereignty', 'Guest'],
        created_at: new Date().toISOString(),
        last_modified: new Date().toISOString(),
        link_ids: [],
        internal_weight: 1,
        total_subtree_mass: 1,
        aliases: [],
        category_id: 'WORLD' as any,
        is_ghost: false,
      } as any,
    ];

    // 3. Batch load objects
    await DataService.batchCreateOrUpdate(universeId, objects);

    console.log(`[Fixtures] Demo universe '${universeId}' successfully seeded.`);
    return universeId;
  },

  /**
   * Seeds a specific Timeline scenario for testing the Timeline Feature.
   * Creates a "City of Aethelgard" with 3 historical states.
   */
  async seedTimelineScenario(universeId: string) {
    console.log('[Fixtures] Seeding Timeline Scenario...');

    // 1. Create Base Node (The Soul)
    const baseId = generateId();
    const baseNode: SimpleNote = {
      id: baseId,
      _type: NexusType.SIMPLE_NOTE,
      title: 'The Eternal City of Aethelgard',
      gist: 'A legendary city that has stood for a thousand years, witnessing the rise and fall of empires.',
      prose_content:
        'Aethelgard is not merely a place, but a testament to human endurance. From its humble beginnings as a river trading post to its zenith as a continent-spanning capital, and finally to its tragic ruin.',
      tags: ['Location', 'Capital', 'Legendary'],
      category_id: 'LOCATION' as any, // Using string to avoid enum import issues if any
      created_at: new Date().toISOString(),
      last_modified: new Date().toISOString(),
      link_ids: [],
      internal_weight: 1,
      total_subtree_mass: 0,
      aliases: ['Aethelgard'],
      is_ghost: false,
    } as any;

    // 2. Create Time States (The Skins)
    const states = [
      {
        year: 200,
        payload: {
          title: 'Aethelgard (The Founding)',
          gist: 'A small, fortified trading post established by the River Kings.',
          prose_content:
            'In the year 200, Aethelgard was but a collection of wooden longhouses surrounded by a palisade. The River Kings saw the strategic value of the bend in the Silver River.',
        },
      },
      {
        year: 850,
        payload: {
          title: 'Aethelgard (The Golden Age)',
          gist: 'The shining capital of the realm, known for its marble spires and arcane universities.',
          prose_content:
            'By 850, the wood had given way to white marble. The Arcane University was founded, drawing scholars from across the known world. Trade flowed like water.',
        },
      },
      {
        year: 1200,
        payload: {
          title: 'Aethelgard (The Ruin)',
          gist: 'A smoldering ruin following the Dragonguard Siege.',
          prose_content:
            'Hubris invites disaster. The Great Dragon of the North laid waste to the marble spires. Now, only scavengers and ghosts roam the blackened streets.',
        },
      },
    ];

    const objectsToSave: NexusObject[] = [baseNode];

    states.forEach((state) => {
      const { timeNode, timeLink } = TimeDimensionService.createTimeState(
        baseNode,
        state.year,
        state.payload,
      );
      // Cast to NexusObject just to be safe with type checker
      objectsToSave.push(timeNode as any);
      objectsToSave.push(timeLink as any);
    });

    // 3. Persist
    await DataService.batchCreateOrUpdate(universeId, objectsToSave);
    console.log('[Fixtures] Timeline Scenario seeded.');
    return baseId;
  },

  /**
   * Seeds a "War Timeline" scenario with two states and a reified war connection.
   * Entities: The Solar Hegemony vs. The Lunar Insurgency.
   * Connection: The Variance War.
   */
  async seedWarScenario(universeId: string) {
    console.log('[Fixtures] Seeding War Scenario...');
    const objectsToSave: NexusObject[] = [];

    // 1. Create Base Nodes
    const earthId = generateId();
    const moonId = generateId();

    const earthBase: SimpleNote = {
      id: earthId,
      _type: NexusType.SIMPLE_NOTE,
      title: 'The Solar Hegemony',
      gist: 'The unified government of Earth, enforcing strict resource rationing and genetic variance laws.',
      prose_content:
        'Headquartered in Geneva, the Hegemony represents the culmination of the Unification Wars. Its mandate is survival at any cost, often at the expense of individual liberties.',
      tags: ['Polity', 'Earth', 'Government'],
      category_id: 'ORGANIZATION' as any,
      created_at: new Date().toISOString(),
      last_modified: new Date().toISOString(),
      link_ids: [],
      internal_weight: 1,
      total_subtree_mass: 0,
      aliases: ['Earth Directorate'],
      is_ghost: false,
    } as any;

    const moonBase: SimpleNote = {
      id: moonId,
      _type: NexusType.SIMPLE_NOTE,
      title: 'The Lunar Insurgency',
      gist: 'A loose coalition of miners, scientists, and genetic deviants seeking independence from Earth.',
      prose_content:
        'Hidden within the lava tubes of Tycho, the Insurgency fights for the right to modify their own biology to survive the harsh vacuum. They view Earths laws as a death sentence.',
      tags: ['Faction', 'Moon', 'Rebels'],
      category_id: 'ORGANIZATION' as any,
      created_at: new Date().toISOString(),
      last_modified: new Date().toISOString(),
      link_ids: [],
      internal_weight: 1,
      total_subtree_mass: 0,
      aliases: ['Free Moon'],
      is_ghost: false,
    } as any;

    objectsToSave.push(earthBase, moonBase);

    // 2. TIMELINE: The Tensions (2000 - 2150)
    // Earth Timeline
    const earthStates = [
      {
        year: 2150,
        title: 'Earth Directorate',
        gist: 'A bureaucratic body managing Earths dwindling resources.',
      },
      {
        year: 2155,
        title: 'Martial Law Authority',
        gist: 'Emergency powers invoked to crush the Lunar riots.',
      },
      {
        year: 2160,
        title: 'Solar Commonwealth',
        gist: 'A reformed, federalist government seeking peace.',
      },
    ];

    // Moon Timeline
    const moonStates = [
      {
        year: 2150,
        title: 'Lunar Mining Corp',
        gist: 'A corporate colony extracting Helium-3 for Earth.',
      },
      {
        year: 2155,
        title: 'Free Moon Movement',
        gist: 'Armed militia seizing control of the mass drivers.',
      },
      {
        year: 2160,
        title: 'The Lunar Republic',
        gist: 'An independent sovereign state recognized by treaty.',
      },
    ];

    // 3. Create Time States for Nodes
    earthStates.forEach((s) => {
      const { timeNode, timeLink } = TimeDimensionService.createTimeState(earthBase, s.year, {
        title: s.title,
        gist: s.gist,
      });
      objectsToSave.push(timeNode as any, timeLink as any);
    });

    moonStates.forEach((s) => {
      const { timeNode, timeLink } = TimeDimensionService.createTimeState(moonBase, s.year, {
        title: s.title,
        gist: s.gist,
      });
      objectsToSave.push(timeNode as any, timeLink as any);
    });

    // 4. Create Reified War Connection
    // First, establish the base link: Earth -> conflicts_with -> Moon
    // Then reify it into "The Variance War"
    const warLinkId = generateId();
    const warLink = {
      id: warLinkId,
      source_id: earthId,
      target_id: moonId,
      _type: NexusType.AGGREGATED_SEMANTIC_LINK, // Pre-reified
      verb: 'conflicts_with',
      verb_inverse: 'conflicts_with',
      is_reified: true,
      title: 'The Variance War',
      gist: 'A ten-year conflict over genetic modification rights and orbital tariffs.',
      prose_content:
        'The war began with the Tycho Tax Riots and escalated into orbital bombardments. It ended only when ensuring mutual destruction became inevitable.',
      children_ids: [],
      category_id: 'EVENT' as any,
      created_at: new Date().toISOString(),
      last_modified: new Date().toISOString(),
      tags: ['War', 'Conflict', 'History'],
    } as any;

    objectsToSave.push(warLink);

    // 5. TIMELINE: The War Itself
    // The War entity (Reified Link) also has history!
    const warStates = [
      {
        year: 2150,
        title: 'Tycho Tax Riots',
        gist: 'Protests against increased oxygen tariffs turn violent.',
      },
      {
        year: 2155,
        title: 'The Variance War (Total)',
        gist: 'Open warfare. Mass Driver bombardments vs Orbital Drop Shocks.',
      },
      {
        year: 2160,
        title: 'Treaty of Tycho',
        gist: 'Ceasefire and recognition of Lunar sovereignty.',
      },
    ];

    warStates.forEach((s) => {
      // We can treat reified link as a SimpleNote for time skin purposes?
      // TimeDimensionService expects SimpleNote.
      // Let's cast warLink to SimpleNote for creation, as it acts as a node.
      const { timeNode, timeLink } = TimeDimensionService.createTimeState(
        warLink as SimpleNote,
        s.year,
        { title: s.title, gist: s.gist },
      );
      objectsToSave.push(timeNode as any, timeLink as any);
    });

    // 6. Persist
    await DataService.batchCreateOrUpdate(universeId, objectsToSave);
    console.log('[Fixtures] War Scenario seeded.');
    return earthId; // Return one of the IDs to navigate to
  },

  /**
   * Clear all local storage data.
   */
  clearAll() {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('ekrixi_local_')) {
        localStorage.removeItem(key);
      }
    });
    console.log('[Fixtures] Local storage cleared.');
  },
};
