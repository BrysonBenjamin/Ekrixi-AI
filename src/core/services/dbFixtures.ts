import { DataService } from './DataService';
import {
  getWarScenarioBatch,
  getTriangleWarBatch,
} from '../../features/playground/fixtures/war_scenario_fixture';
import { getFractalWarBatch } from '../../features/playground/fixtures/fractal_war_fixture';
import {
  getDemoUniverseBatch,
  DEMO_UNIVERSE_ID,
  DEMO_UNIVERSE_NAME,
  DEMO_UNIVERSE_DESC,
} from '../../features/playground/fixtures/demo_universe_fixture';
import { getTimelineScenarioBatch } from '../../features/playground/fixtures/timeline_scenario_fixture';
import { getGaiaPrimeExpandedBatch } from '../../features/playground/fixtures/gaia_prime_expanded_fixture';
import { getCompletedManuscriptBatch } from '../../features/playground/fixtures/completed_manuscript_fixture';
import { getSeedStoryManifesto } from '../../features/playground/fixtures/story_manifesto_fixture';
import { getRefineryDemoBatch } from '../../features/refinery/fixtures/refinery_batch_fixture';
import { getNeonSyndicateBatch } from '../../features/refinery/fixtures/neon_syndicate_fixture';

/**
 * dbFixtures
 * Centralized service for seeding the environment with high-fidelity fixtures.
 * All data generation logic is outsourced to dedicated batch files.
 */
export const dbFixtures = {
  /**
   * Seed the default core demo universe.
   */
  async seedDemoUniverse() {
    await DataService.importUniverse(
      DEMO_UNIVERSE_ID,
      DEMO_UNIVERSE_NAME,
      DEMO_UNIVERSE_DESC,
      'guest-user',
    );

    const objects = getDemoUniverseBatch();
    await DataService.batchCreateOrUpdate(DEMO_UNIVERSE_ID, objects);

    console.log(`[Fixtures] Demo universe '${DEMO_UNIVERSE_ID}' seeded.`);
    return DEMO_UNIVERSE_ID;
  },

  /**
   * Seed a specific Timeline scenario (Aethelgard).
   */
  async seedTimelineScenario(universeId: string) {
    const { baseId, objects } = getTimelineScenarioBatch();
    await DataService.batchCreateOrUpdate(universeId, objects);
    return baseId;
  },

  /**
   * Seed the "Variance War" scenario (Earth vs Moon).
   */
  async seedWarScenario(universeId: string) {
    const objectsToSave = getWarScenarioBatch();
    await DataService.batchCreateOrUpdate(universeId, objectsToSave);
    return 'earth-core';
  },

  /**
   * Seed the "Triangle War" scenario (Country A, B, C).
   */
  async seedTriangleWarScenario(universeId: string) {
    const objectsToSave = getTriangleWarBatch();
    await DataService.batchCreateOrUpdate(universeId, objectsToSave);

    // Attempt to return Country A's ID for navigation
    const countryA = objectsToSave.find((obj) => (obj as any).title?.includes('Country A'));
    return countryA?.id;
  },

  /**
   * Seeds the "Fractal War" scenario (Century -> War -> Battle -> State).
   * Tests recursive T3 containers and fractal state inheritance.
   */
  async seedFractalWarScenario(universeId: string) {
    console.log('[Fixtures] Seeding Fractal War via Batch...');
    const objectsToSave = getFractalWarBatch();
    await DataService.batchCreateOrUpdate(universeId, objectsToSave);
    return 'century-unification';
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

  // --- Unified Batch Getters ---
  getWarScenarioBatch,
  getTriangleWarBatch,
  getFractalWarBatch,
  getDemoUniverseBatch,
  getTimelineScenarioBatch,
  getGaiaPrimeBatch: getGaiaPrimeExpandedBatch,
  getManuscriptBatch: getCompletedManuscriptBatch,
  getManifestoBatch: getSeedStoryManifesto,
  getOrosBatch: getRefineryDemoBatch,
  getSyndicateBatch: getNeonSyndicateBatch,
};
