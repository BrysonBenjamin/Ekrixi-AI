import { create } from 'zustand';
import { NexusObject } from '../types';
import { DataService } from '../core/services/DataService';

interface RegistryState {
  registry: Record<string, NexusObject>;
  isLoading: boolean;
  error: string | null;
  activeUniverseId: string | null;
  unsubscribeListener: (() => void) | null;

  // Actions
  loadUniverse: (universeId: string) => void;
  setRegistry: (
    registryOrUpdater:
      | Record<string, NexusObject>
      | ((prev: Record<string, NexusObject>) => Record<string, NexusObject>),
  ) => Promise<void>;
  upsertObject: (id: string, updates: Partial<NexusObject>) => Promise<void>;
  addBatch: (objects: NexusObject[]) => Promise<void>;
  removeObject: (id: string) => Promise<void>;
  removeBatch: (ids: string[]) => Promise<void>;
  resetUniverse: () => Promise<void>;

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
    const unsubscribe = DataService.listenToAllNexusObjects(universeId, (objects) => {
      const newRegistry: Record<string, NexusObject> = {};
      objects.forEach((obj) => {
        newRegistry[obj.id] = obj;
      });
      set({ registry: newRegistry, isLoading: false });
    });

    set({ unsubscribeListener: unsubscribe });
  },

  setRegistry: async (registryOrUpdater) => {
    const universeId = get().activeUniverseId;
    if (!universeId) return;

    const currentRegistry = get().registry;
    const newRegistry =
      typeof registryOrUpdater === 'function'
        ? registryOrUpdater(currentRegistry)
        : registryOrUpdater;

    // Optimistic local update
    set({ registry: newRegistry });

    // Persist to database
    // Note: For large registries, we might want to diff.
    // For now, we'll batch create/update everything in the new registry.
    const objects = Object.values(newRegistry) as NexusObject[];
    if (objects.length > 0) {
      await DataService.batchCreateOrUpdate(universeId, objects);
    }
  },

  upsertObject: async (id, updates) => {
    const universeId = get().activeUniverseId;
    if (!universeId) {
      console.warn('Cannot upsert object: No active universe selected.');
      return;
    }

    const currentRegistry = get().registry;
    const existingObject = currentRegistry[id];

    const objectToSave = existingObject
      ? ({ ...existingObject, ...updates } as NexusObject)
      : (updates as NexusObject);

    await DataService.createOrUpdateNexusObject(universeId, objectToSave);
  },

  addBatch: async (objects) => {
    const universeId = get().activeUniverseId;
    if (!universeId) {
      console.warn('Cannot add batch: No active universe selected.');
      return;
    }
    await DataService.batchCreateOrUpdate(universeId, objects);
  },

  removeObject: async (id) => {
    const universeId = get().activeUniverseId;
    if (!universeId) {
      console.warn('Cannot remove object: No active universe selected.');
      return;
    }
    await DataService.deleteNexusObject(universeId, id);
  },

  removeBatch: async (ids) => {
    const universeId = get().activeUniverseId;
    if (!universeId) {
      console.warn('Cannot remove batch: No active universe selected.');
      return;
    }
    if (ids.length === 0) return;
    await DataService.batchDelete(universeId, ids);
  },

  resetUniverse: async () => {
    const universeId = get().activeUniverseId;
    if (!universeId) return;

    const objects = Object.values(get().registry);
    // Delete one by one for now
    for (const obj of objects) {
      await DataService.deleteNexusObject(universeId, obj.id);
    }
    set({ registry: {} });
  },

  cleanup: () => {
    const unsubscribe = get().unsubscribeListener;
    if (unsubscribe) unsubscribe();
    set({ unsubscribeListener: null, registry: {}, activeUniverseId: null });
  },
}));
