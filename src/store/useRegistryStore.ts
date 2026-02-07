import { create } from 'zustand';
import { NexusObject } from '../types';
import { FirestoreService } from '../core/services/FirestoreService';

interface RegistryState {
  registry: Record<string, NexusObject>;
  isLoading: boolean;
  error: string | null;
  activeUniverseId: string | null;
  unsubscribeListener: (() => void) | null;

  // Actions
  loadUniverse: (universeId: string) => void;
  setRegistry: (registry: Record<string, NexusObject>) => void; // Kept for legacy/import compatibility
  upsertObject: (id: string, updates: Partial<NexusObject>) => Promise<void>;
  addBatch: (objects: NexusObject[]) => Promise<void>;
  removeObject: (id: string) => Promise<void>;
  clearRegistry: () => void;

  // Cleanup
  cleanup: () => void;
}

export const useRegistryStore = create<RegistryState>((set, get) => ({
  registry: {},
  isLoading: false,
  error: null,
  activeUniverseId: null,
  unsubscribeListener: null,

  loadUniverse: (universeId) => {
    // Cleanup previous listener
    const currentUnsubscribe = get().unsubscribeListener;
    if (currentUnsubscribe) {
      currentUnsubscribe();
    }

    set({ isLoading: true, error: null, activeUniverseId: universeId });

    // Set up new listener
    const unsubscribe = FirestoreService.listenToAllNexusObjects(universeId, (objects) => {
      const newRegistry: Record<string, NexusObject> = {};
      objects.forEach((obj) => {
        newRegistry[obj.id] = obj;
      });
      set({ registry: newRegistry, isLoading: false });
    });

    set({ unsubscribeListener: unsubscribe });
  },

  setRegistry: (registry) => set({ registry }),

  upsertObject: async (id, updates) => {
    const universeId = get().activeUniverseId;
    if (!universeId) {
      console.warn('Cannot upsert object: No active universe selected.');
      return;
    }

    const currentRegistry = get().registry;
    const existingObject = currentRegistry[id];

    // We construct the full object if it doesn't exist, or merge updates
    // Note: Firestore merge will handle partials, but if we need a full object for creation
    // we rely on the caller to provide enough data in `updates` if it's new.

    const objectToSave = existingObject
      ? ({ ...existingObject, ...updates } as NexusObject)
      : (updates as NexusObject);

    // Optimistic update locally?
    // Firestore listener calls back very fast, usually we can wait.
    // If we want instant feedback, we can set state here too.

    await FirestoreService.createOrUpdateNexusObject(universeId, objectToSave);
  },

  addBatch: async (objects) => {
    const universeId = get().activeUniverseId;
    if (!universeId) {
      console.warn('Cannot add batch: No active universe selected.');
      return;
    }
    await FirestoreService.batchCreateOrUpdate(universeId, objects);
  },

  removeObject: async (id) => {
    const universeId = get().activeUniverseId;
    if (!universeId) {
      console.warn('Cannot remove object: No active universe selected.');
      return;
    }
    await FirestoreService.deleteNexusObject(universeId, id);
  },

  clearRegistry: () => set({ registry: {} }),

  cleanup: () => {
    const unsubscribe = get().unsubscribeListener;
    if (unsubscribe) unsubscribe();
    set({ unsubscribeListener: null, registry: {}, activeUniverseId: null });
  },
}));
