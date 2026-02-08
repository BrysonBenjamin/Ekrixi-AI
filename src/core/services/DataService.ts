import { config } from '../../config';
import { FirestoreService } from './FirestoreService';
import { LocalDataService } from './LocalDataService';
import { IDataService } from '../types/data-service';

/**
 * DataService
 * The primary interface for all database operations in Ekrixi AI.
 * Automatically switches between Firebase and Local storage based on system configuration.
 */
export const DataService: IDataService = config.useLocalDatabase
  ? LocalDataService
  : (FirestoreService as unknown as IDataService);

if (import.meta.env.DEV) {
  console.log(
    `[DataService] Initialized in ${config.useLocalDatabase ? 'LOCAL' : 'FIREBASE'} mode.`,
  );
}

// Re-export constants or helpers if needed
export default DataService;
