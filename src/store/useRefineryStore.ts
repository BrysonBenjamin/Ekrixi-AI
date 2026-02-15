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
  syncFromMCP: (
    mcpBatches: { id: string; name: string; timestamp: string; status: string }[],
  ) => void;
  upsertBatch: (batch: Partial<RefineryBatch> & { id: string }) => void;
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

      syncFromMCP: (mcpBatches) =>
        set((state) => {
          // Merge strategy: Keep local items if they exist, update metadata.
          // Add new batches from MCP.
          // We don't delete local batches that aren't in MCP yet (could be offline created),
          // unless strict sync is required. For now, we perform an additive merge.

          const newBatches = [...state.batches];

          mcpBatches.forEach((mcp) => {
            const index = newBatches.findIndex((b) => b.id === mcp.id);
            if (index >= 0) {
              // Update metadata
              newBatches[index] = {
                ...newBatches[index],
                name: mcp.name,
                timestamp: mcp.timestamp,
                status: mcp.status as RefineryBatch['status'],
              };
            } else {
              // Add new batch (items empty initially, will need fetch)
              newBatches.push({
                id: mcp.id,
                name: mcp.name,
                timestamp: mcp.timestamp,
                items: [], // Will be populated by specific getBatchObjects call
                status: mcp.status as RefineryBatch['status'],
                source: 'SCANNER',
              });
            }
          });

          return { batches: newBatches };
        }),

      upsertBatch: (batch) =>
        set((state) => {
          const index = state.batches.findIndex((b) => b.id === batch.id);
          if (index >= 0) {
            const newBatches = [...state.batches];
            newBatches[index] = { ...newBatches[index], ...batch };
            return { batches: newBatches };
          } else {
            return {
              batches: [
                {
                  items: [],
                  name: 'New Batch',
                  timestamp: new Date().toISOString(),
                  status: 'pending',
                  source: 'MCP',
                  ...batch,
                } as RefineryBatch,
                ...state.batches,
              ],
            };
          }
        }),
    }),
    {
      name: 'nexus-refinery-storage',
    },
  ),
);
