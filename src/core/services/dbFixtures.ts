import { FixtureRegistry } from '../../features/playground/services/FixtureRegistry';

/**
 * @deprecated Use FixtureRegistry in src/features/playground/services/FixtureRegistry.ts instead.
 *
 * dbFixtures
 * Centralized service for seeding the environment with high-fidelity fixtures.
 * Now acts as a bridge to the unified FixtureRegistry.
 */
export const dbFixtures = {
  /**
   * Seed a specific Timeline scenario.
   */
  async seedTimelineScenario(universeId: string) {
    const fixture = FixtureRegistry.getFixture('temporal-range-world');
    if (fixture?.seed) {
      return await fixture.seed(universeId);
    }
    return '';
  },

  /**
   * Seed the "War" scenario (Redirected to Gaia if others missing).
   */
  async seedWarScenario(universeId: string) {
    const fixture = FixtureRegistry.getFixture('gaia-prime');
    if (fixture?.seed) {
      return await fixture.seed(universeId);
    }
    return '';
  },

  /**
   * Seed the "Triangle War" scenario.
   */
  async seedTriangleWarScenario(universeId: string) {
    // Current fallback if missing legacy files
    return this.seedWarScenario(universeId);
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

  // --- Registry Accessors ---
  getBatch: (id: string) => FixtureRegistry.getFixture(id)?.getObjects(),
  getAllFixtures: () => FixtureRegistry.getAllFixtures(),
};
