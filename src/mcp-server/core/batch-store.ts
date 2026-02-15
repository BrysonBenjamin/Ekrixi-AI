// ============================================================
// MCP Server — Batch Store
// In-memory batch management for extraction pipelines.
// ============================================================

import type { NexusObject } from '../../core/types/entities';
import { generateId } from '../../utils/ids';

// ============================================================
// Types
// ============================================================

export type BatchOperationType = 'CREATE' | 'EXTEND' | 'LINK' | 'LINK_EXISTING';

export interface BatchOperation {
  op: BatchOperationType;
  /** The new or updated NexusObject (for CREATE) */
  entity?: NexusObject;
  /** Existing object ID to extend (for EXTEND) */
  target_id?: string;
  /** Extension data (for EXTEND) */
  extensions?: {
    append_prose?: string;
    add_aliases?: string[];
    updated_gist?: string;
  };
  /** Link data (for LINK and LINK_EXISTING) */
  link?: NexusObject;
}

export interface Batch {
  id: string;
  name: string;
  timestamp: string;
  operations: BatchOperation[];
  source: 'SCANNER' | 'MCP';
  status: 'pending' | 'processed' | 'committed';
}

// ============================================================
// Store
// ============================================================

const batches = new Map<string, Batch>();

export const BatchStore = {
  /**
   * Create a new batch and return its ID.
   */
  create(name: string, operations: BatchOperation[], source: 'SCANNER' | 'MCP' = 'MCP'): string {
    const id = generateId();
    batches.set(id, {
      id,
      name,
      timestamp: new Date().toISOString(),
      operations,
      source,
      status: 'pending',
    });
    return id;
  },

  /**
   * Get a batch by ID.
   */
  get(id: string): Batch | undefined {
    return batches.get(id);
  },

  /**
   * Add operations to an existing batch.
   */
  addOperations(id: string, ops: BatchOperation[]): Batch | undefined {
    const batch = batches.get(id);
    if (!batch) return undefined;
    batch.operations.push(...ops);
    batch.timestamp = new Date().toISOString();
    return batch;
  },

  /**
   * Remove an operation from a batch by the entity/link ID it references.
   */
  removeOperation(batchId: string, targetId: string): Batch | undefined {
    const batch = batches.get(batchId);
    if (!batch) return undefined;
    batch.operations = batch.operations.filter((op) => {
      if (op.entity?.id === targetId) return false;
      if (op.link?.id === targetId) return false;
      if (op.target_id === targetId) return false;
      return true;
    });
    return batch;
  },

  /**
   * Update an operation's entity data.
   */
  updateOperation(
    batchId: string,
    targetId: string,
    updates: Partial<NexusObject>,
  ): Batch | undefined {
    const batch = batches.get(batchId);
    if (!batch) return undefined;
    batch.operations = batch.operations.map((op) => {
      if (op.entity?.id === targetId) {
        return { ...op, entity: { ...op.entity, ...updates } as NexusObject };
      }
      return op;
    });
    return batch;
  },

  /**
   * Get all NexusObjects from a batch (CREATE + LINK operations).
   */
  getObjects(id: string): NexusObject[] {
    const batch = batches.get(id);
    if (!batch) return [];
    const objects: NexusObject[] = [];
    for (const op of batch.operations) {
      if (op.entity) objects.push(op.entity);
      if (op.link) objects.push(op.link);
    }
    return objects;
  },

  /**
   * Mark a batch as committed.
   */
  markCommitted(id: string): void {
    const batch = batches.get(id);
    if (batch) batch.status = 'committed';
  },

  /**
   * Delete a batch.
   */
  delete(id: string): boolean {
    return batches.delete(id);
  },

  /**
   * List all batches (summary only).
   */
  list(): Array<{ id: string; name: string; timestamp: string; opCount: number; status: string }> {
    return Array.from(batches.values()).map((b) => ({
      id: b.id,
      name: b.name,
      timestamp: b.timestamp,
      opCount: b.operations.length,
      status: b.status,
    }));
  },
};
