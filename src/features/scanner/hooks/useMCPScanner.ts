// ============================================================
// useMCPScanner — React Hook
// Provides reactive access to the MCPScannerClient singleton.
// Manages connection lifecycle, exposes tool methods + status.
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getMCPScannerClient,
  type MCPClientState,
  type DetectResult,
  type ScanResult,
  type ExpandResult,
  type RefineBatchResult,
  type CommitResult,
  type BatchSummary,
  type RefineryOperation,
  type NexusContextItem,
} from '../../../core/services/MCPScannerClient';
import type { NexusObject } from '../../../core/types/entities';
import type { NexusCategory } from '../../../core/types/enums';
import type { Batch } from '../../../mcp-server/core/batch-store';

// ============================================================
// Hook Return Type
// ============================================================

export interface UseMCPScannerReturn {
  /** Current connection state */
  state: MCPClientState;

  /** Whether the client is connected and ready */
  isReady: boolean;

  /** Whether any operation is currently in progress */
  isLoading: boolean;

  /** Last error from an operation (cleared on next successful call) */
  operationError: string | null;

  // --- Tool Methods ---

  /** Detect entities in text (no relationships). Returns entity candidates. */
  detectEntities: (text: string) => Promise<DetectResult | null>;

  /** Preview context for Viewing mode. */
  previewContext: (text: string) => Promise<NexusContextItem[] | null>;

  /** Agentic Context Resolution. */
  resolveAgenticContext: (
    query: string,
    registry: Record<string, NexusObject>,
  ) => Promise<{
    entities: NexusContextItem[];
    temporal_anchor?: string;
    graph_facts: string[];
  } | null>;

  /** Full scan: detect + extract relationships + create batch. */
  scanText: (
    text: string,
    options?: {
      anchors?: Array<{
        title: string;
        aliases?: string[];
        category?: NexusCategory;
        gist?: string;
      }>;
      registry?: Record<string, NexusObject>;
    },
  ) => Promise<ScanResult | null>;

  /** Suggest child entities for a parent. */
  expandEntity: (
    entityTitle: string,
    contextText: string,
    category?: NexusCategory,
  ) => Promise<ExpandResult | null>;

  /** Apply update/remove operations to a batch. */
  refineBatch: (
    batchId: string,
    operations: RefineryOperation[],
  ) => Promise<RefineBatchResult | null>;

  /** Commit a batch to the registry. Returns committed objects. */
  commitBatch: (batchId: string, universeId: string) => Promise<CommitResult | null>;

  // --- Batch Accessors ---

  /** Get a batch by ID. */
  getBatch: (batchId: string) => Batch | undefined;

  /** Get all NexusObjects from a batch. */
  getBatchObjects: (batchId: string) => NexusObject[];

  /** List all batches. */
  listBatches: () => BatchSummary[];

  /** Delete a batch. */
  deleteBatch: (batchId: string) => boolean;

  /** Manually reconnect if disconnected. */
  reconnect: () => Promise<void>;
}

// ============================================================
// Hook Implementation
// ============================================================

export function useMCPScanner(): UseMCPScannerReturn {
  const [state, setState] = useState<MCPClientState>({ status: 'disconnected' });
  const [isLoading, setIsLoading] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const connectAttemptedRef = useRef(false);

  const client = getMCPScannerClient();

  // Subscribe to state changes
  useEffect(() => {
    const unsub = client.onStateChange(setState);
    return unsub;
  }, [client]);

  // Auto-connect on mount
  useEffect(() => {
    if (connectAttemptedRef.current) return;
    if (state.status === 'disconnected') {
      connectAttemptedRef.current = true;
      client.connect().catch(() => {
        // Error is captured via state listener
      });
    }
  }, [client, state.status]);

  // Wrapper to handle loading/error state for async operations
  const withOperation = useCallback(<T>(fn: () => Promise<T>): Promise<T | null> => {
    setIsLoading(true);
    setOperationError(null);
    return fn()
      .then((result) => {
        setIsLoading(false);
        return result;
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setOperationError(msg);
        setIsLoading(false);
        console.error('[useMCPScanner] Operation failed:', msg);
        return null;
      });
  }, []);

  // --- Tool Methods ---

  const detectEntities = useCallback(
    (text: string) => withOperation(() => client.detectEntities(text)),
    [client, withOperation],
  );

  const previewContext = useCallback(
    (text: string) => withOperation(() => client.previewContext(text)),
    [client, withOperation],
  );

  const resolveAgenticContext = useCallback(
    (query: string, registry: Record<string, NexusObject>) =>
      withOperation(() => client.resolveAgenticContext(query, registry)),
    [client, withOperation],
  );

  const scanText = useCallback(
    (
      text: string,
      options?: {
        anchors?: Array<{
          title: string;
          aliases?: string[];
          category?: NexusCategory;
          gist?: string;
        }>;
        registry?: Record<string, NexusObject>;
      },
    ) => withOperation(() => client.scanText(text, options)),
    [client, withOperation],
  );

  const expandEntity = useCallback(
    (entityTitle: string, contextText: string, category?: NexusCategory) =>
      withOperation(() => client.expandEntity(entityTitle, contextText, category)),
    [client, withOperation],
  );

  const refineBatch = useCallback(
    (batchId: string, operations: RefineryOperation[]) =>
      withOperation(() => client.refineBatch(batchId, operations)),
    [client, withOperation],
  );

  const commitBatch = useCallback(
    (batchId: string, universeId: string) =>
      withOperation(() => client.commitBatch(batchId, universeId)),
    [client, withOperation],
  );

  // --- Batch Accessors (synchronous) ---

  const getBatch = useCallback(
    (batchId: string) => {
      if (state.status !== 'connected') return undefined;
      return client.getBatch(batchId);
    },
    [client, state.status],
  );

  const getBatchObjects = useCallback(
    (batchId: string) => {
      if (state.status !== 'connected') return [];
      return client.getBatchObjects(batchId);
    },
    [client, state.status],
  );

  const listBatches = useCallback(() => {
    if (state.status !== 'connected') return [];
    return client.listBatches();
  }, [client, state.status]);

  const deleteBatch = useCallback(
    (batchId: string) => {
      if (state.status !== 'connected') return false;
      return client.deleteBatch(batchId);
    },
    [client, state.status],
  );

  const reconnect = useCallback(async () => {
    connectAttemptedRef.current = false;
    client.disconnect();
    await client.connect();
  }, [client]);

  return {
    state,
    isReady: state.status === 'connected',
    isLoading,
    operationError,
    detectEntities,
    previewContext,
    resolveAgenticContext,
    scanText,
    expandEntity,
    refineBatch,
    commitBatch,
    getBatch,
    getBatchObjects,
    listBatches,
    deleteBatch,
    reconnect,
  };
}
