import { NexusObject, NexusCategory, NexusNote } from '../../../types';
import { PlaygroundFixture } from '../types/fixtures';
import { temporalRangeFixture } from '../fixtures/temporal-ranges-fixture';
import { gaiaFixture } from '../fixtures/gaia-fixture';
import { DataService } from '../../../core/services/DataService';

export class FixtureRegistry {
  private static fixtures: Map<string, PlaygroundFixture> = new Map();

  static register(fixture: PlaygroundFixture) {
    this.fixtures.set(fixture.id, fixture);
  }

  static getFixture(id: string): PlaygroundFixture | undefined {
    return this.fixtures.get(id);
  }

  static getAllFixtures(): PlaygroundFixture[] {
    return Array.from(this.fixtures.values());
  }

  /**
   * Initializes the registry with default fixtures.
   */
  static init() {
    this.register(temporalRangeFixture);
    this.register(gaiaFixture);

    // Add more defaults here as they are migrated...
  }
}

// Initialize on load
FixtureRegistry.init();
