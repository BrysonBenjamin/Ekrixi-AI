// ============================================================
// MCP Tool — commit_batch
// Persist a batch's objects to the database.
// ============================================================

import { z } from 'zod';
import { BatchStore } from '../core/batch-store';
import { wireLinkIds } from '../core/graph-assembler';
import type { NexusObject } from '../../core/types/entities';

export const COMMIT_BATCH_TOOL = {
  name: 'commit_batch',
  description: `Commit a batch to the knowledge graph registry. This persists all CREATE and LINK operations as new NexusObjects.
  
EXTEND operations are logged but require manual application (the MCP server does not directly modify existing objects to avoid data loss).

Set wire_link_ids=true (default) to automatically compute link_ids arrays on all nodes before committing.`,

  inputSchema: z.object({
    batch_id: z.string().describe('The batch ID to commit.'),
    universe_id: z.string().describe('The universe/nexus to commit into.'),
    wire_link_ids: z.boolean().default(true).describe('Auto-compute link_ids before committing.'),
  }),
};

export type CommitBatchInput = z.infer<typeof COMMIT_BATCH_TOOL.inputSchema>;

/**
 * Commit handler. Returns the objects to be persisted.
 * The actual persistence is handled by the caller (MCP server index),
 * which has access to the data service.
 */
export function handleCommitBatch(input: CommitBatchInput): {
  objects: NexusObject[];
  extendOps: Array<{ target_id: string; extensions: Record<string, unknown> }>;
  error?: string;
} {
  const batch = BatchStore.get(input.batch_id);
  if (!batch) {
    return { objects: [], extendOps: [], error: `Batch "${input.batch_id}" not found.` };
  }

  if (batch.status === 'committed') {
    return { objects: [], extendOps: [], error: `Batch "${input.batch_id}" already committed.` };
  }

  // Collect objects to persist
  let objects = BatchStore.getObjects(input.batch_id);

  // Wire link_ids if requested
  if (input.wire_link_ids) {
    objects = wireLinkIds(objects);
  }

  // Collect EXTEND operations (for logging/manual application)
  const extendOps = batch.operations
    .filter((op) => op.op === 'EXTEND' && op.target_id && op.extensions)
    .map((op) => ({
      target_id: op.target_id!,
      extensions: op.extensions as Record<string, unknown>,
    }));

  // Mark as committed
  BatchStore.markCommitted(input.batch_id);

  return { objects, extendOps };
}
