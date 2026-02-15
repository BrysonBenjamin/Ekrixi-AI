// ============================================================
// MCP Tool — refine_batch
// Edit batch operations before committing.
// ============================================================

import { z } from 'zod';
import { BatchStore } from '../core/batch-store';

export const REFINE_BATCH_TOOL = {
  name: 'refine_batch',
  description: `Edit a batch of extracted entities and relationships before committing.
  
Operations:
- "update": Modify fields on an entity in the batch.
- "remove": Remove an entity or link from the batch.

Use query the batch first with the nexus://batch/{batch_id} resource to see its contents.`,

  inputSchema: z.object({
    batch_id: z.string().describe('The batch ID returned from scan_text.'),
    operations: z.array(
      z.object({
        type: z.enum(['update', 'remove']),
        target_id: z.string().describe('The ID of the entity or link to modify/remove.'),
        data: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('For "update": partial data to merge into the entity.'),
      }),
    ),
  }),
};

export type RefineBatchInput = z.infer<typeof REFINE_BATCH_TOOL.inputSchema>;

export function handleRefineBatch(input: RefineBatchInput) {
  const batch = BatchStore.get(input.batch_id);
  if (!batch) {
    return {
      content: [{ type: 'text' as const, text: `Error: Batch "${input.batch_id}" not found.` }],
      isError: true,
    };
  }

  const results: string[] = [];

  for (const op of input.operations) {
    if (op.type === 'remove') {
      BatchStore.removeOperation(input.batch_id, op.target_id);
      results.push(`Removed: ${op.target_id}`);
    } else if (op.type === 'update' && op.data) {
      BatchStore.updateOperation(input.batch_id, op.target_id, op.data as Record<string, unknown>);
      results.push(`Updated: ${op.target_id}`);
    }
  }

  const updated = BatchStore.get(input.batch_id)!;
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            batch_id: input.batch_id,
            operations_applied: results,
            remaining_operations: updated.operations.length,
            status: updated.status,
          },
          null,
          2,
        ),
      },
    ],
  };
}
