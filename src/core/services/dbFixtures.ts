import { DataService } from './DataService';
import { NexusObject } from '../types';

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
