import { NexusObject } from '../../../types';

export type FixtureCategory = 'Temporal' | 'Narrative' | 'Relational' | 'Edge Case';

export interface PlaygroundFixture {
  id: string;
  name: string;
  description: string;
  category: FixtureCategory;
  /**
   * Returns the registry objects for local simulation.
   */
  getObjects: () => Record<string, NexusObject>;
  /**
   * Seeds the data persistently to the DB.
   * Returns the ID of the primary node to focus on.
   */
  seed?: (universeId: string) => Promise<string>;
}
