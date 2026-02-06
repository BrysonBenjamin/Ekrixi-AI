import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NexusObject } from '../types';

export interface RefineryBatch {
  id: string;
  name: string;
  timestamp: string;
  items: NexusObject[];
  status: 'pending' | 'processed' | 'committed';
  source: 'SCANNER' | 'IMPORT' | 'GENERATOR';
}

interface RefineryState {
  batches: RefineryBatch[];

  // Actions
  addBatch: (batch: RefineryBatch) => void;
  updateBatchItems: (id: string, items: NexusObject[]) => void;
  removeBatch: (id: string) => void;
  clearBatches: () => void;
}

export const useRefineryStore = create<RefineryState>()(
  persist(
    (set) => ({
      batches: [],

      addBatch: (batch) =>
        set((state) => ({
          batches: [batch, ...state.batches],
        })),

      updateBatchItems: (id, items) =>
        set((state) => ({
          batches: state.batches.map((b) => (b.id === id ? { ...b, items } : b)),
        })),

      removeBatch: (id) =>
        set((state) => ({
          batches: state.batches.filter((b) => b.id !== id),
        })),

      clearBatches: () => set({ batches: [] }),
    }),
    {
      name: 'nexus-refinery-storage',
    },
  ),
);
