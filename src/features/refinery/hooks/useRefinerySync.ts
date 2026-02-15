import { useEffect } from 'react';
import { useMCPScanner } from '../../scanner/hooks/useMCPScanner';
import { useRefineryStore } from '../../../store/useRefineryStore';

/**
 * Syncs local RefineryStore with MCP state.
 * Should be mounted at a high level (App or Layout) to ensure
 * data is available when navigating to Refinery.
 */
/**
 * useRefinerySync
 *
 * Synchronizes the local Zustand store with the MCP backend.
 * - Hydrates batches from MCP on mount/reconnect.
 * - Ensures the local store reflects the true state from the backend.
 */
export function useRefinerySync() {
  const { isReady, listBatches } = useMCPScanner();
  const syncFromMCP = useRefineryStore((s) => s.syncFromMCP);

  useEffect(() => {
    if (isReady) {
      // Sync list of batches
      const summaries = listBatches();
      if (summaries && summaries.length > 0) {
        // Map BatchSummary to the shape expected by syncFromMCP
        // BatchSummary: { id, name, timestamp, opCount, status }
        syncFromMCP(summaries);
      }
    }
  }, [isReady, listBatches, syncFromMCP]);
}
