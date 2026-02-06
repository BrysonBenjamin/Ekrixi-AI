import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { NexusObject } from '../types';

interface RegistryState {
  registry: Record<string, NexusObject>;
  activeUniverseId: string | null;

  // Actions
  loadUniverse: (universeId: string) => void;

  setRegistry: (registry: Record<string, NexusObject>) => void;
  upsertObject: (id: string, updates: Partial<NexusObject>) => void;
  addBatch: (objects: NexusObject[]) => void;
  removeObject: (id: string) => void;
  clearRegistry: () => void;
}

// Helper to save to disk
const saveToDisk = (universeId: string, registry: Record<string, NexusObject>) => {
  try {
    localStorage.setItem(`nexus-registry-${universeId}`, JSON.stringify({ state: { registry } }));
  } catch (e) {
    console.error('Failed to save registry', e);
  }
};

export const useRegistryStore = create<RegistryState>()(
  subscribeWithSelector((set, get) => ({
    registry: {},
    activeUniverseId: null,

    loadUniverse: (universeId) => {
      const currentId = get().activeUniverseId;
      if (currentId === universeId) return; // Already loaded

      // 1. Save current if exists (safety check, though subscription handles this)
      // if (currentId) saveToDisk(currentId, get().registry);

      // 2. Load new
      const key = `nexus-registry-${universeId}`;
      const raw = localStorage.getItem(key);
      let loadedRegistry = {};

      // Try explicit modern format first
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          // Zustand persist format is { state: { registry: ... }, version: ... }
          loadedRegistry = parsed.state?.registry || parsed.registry || {};
        } catch (e) {
          console.error(e);
        }
      } else if (universeId === 'default' && localStorage.getItem('nexus-registry-storage')) {
        // Migration: Check for legacy 'nexus-registry-storage' if default
        try {
          const legacy = localStorage.getItem('nexus-registry-storage');
          if (legacy) {
            const parsed = JSON.parse(legacy);
            loadedRegistry = parsed.state?.registry || {};
          }
        } catch (e) {
          console.error(e);
        }
      }

      set({ registry: loadedRegistry, activeUniverseId: universeId });
    },

    setRegistry: (registry) => set({ registry }),

    upsertObject: (id, updates) =>
      set((state) => {
        const existing = state.registry[id];
        if (!existing && !updates.id) return state;

        const newState = {
          ...state.registry,
          [id]: {
            ...(existing || {}),
            ...updates, // updates spread later to override
            id: id,
            last_modified: new Date().toISOString(),
          } as NexusObject,
        };
        return { registry: newState };
      }),

    addBatch: (objects) =>
      set((state) => {
        const newRegistry = { ...state.registry };
        objects.forEach((obj) => {
          newRegistry[obj.id] = obj;
        });
        return { registry: newRegistry };
      }),

    removeObject: (id) =>
      set((state) => {
        const newRegistry = { ...state.registry };
        delete newRegistry[id];
        return { registry: newRegistry };
      }),

    clearRegistry: () => set({ registry: {} }),
  })),
);

// Auto-persistence subscription
useRegistryStore.subscribe(
  (state) => state.registry,
  (registry) => {
    const id = useRegistryStore.getState().activeUniverseId;
    if (id) {
      saveToDisk(id, registry);
    }
  },
);
