import { LocalDataService } from './LocalDataService';
import { NexusObject } from '../types';

/**
 * dbFixtures
 * Professional mock data and utility for populating local storage.
 */
export const dbFixtures = {
  /**
   * Seed the local database with a high-fidelity starting universe.
   */
  async seedDemoUniverse() {
    const universeId = 'demo-universe-professional';

    // 1. Create the universe if it doesn't exist
    await LocalDataService.importUniverse(
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
        name: 'Recursive Ontological Scaling',
        content: 'Analyzing the recursive nature of deep-semantic lore structures in v4 scaling.',
        tags: ['Architecture', 'Scaling', 'v4'],
        _createdAt: new Date().toISOString(),
        _updatedAt: new Date().toISOString(),
      } as any,
      {
        id: crypto.randomUUID(),
        _type: 'SIMPLE_NOTE',
        name: 'Nexus Security Protocol',
        content: 'Documentation for the locally sovereign encryption layers used in Guest mode.',
        tags: ['Security', 'Sovereignty', 'Guest'],
        _createdAt: new Date().toISOString(),
        _updatedAt: new Date().toISOString(),
      } as any,
    ];

    // 3. Batch load objects
    await LocalDataService.batchCreateOrUpdate(universeId, objects);

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
