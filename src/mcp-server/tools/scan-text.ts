// ============================================================
// MCP Tool — scan_text
// Core extraction tool: text → entities + links (as batch)
// ============================================================

import { z } from 'zod';
import { NexusCategory } from '../../core/types/enums';
import { runExtraction, detectEntities } from '../core/extraction-pipeline';
import type { AIClient } from '../core/ai-client';

export const SCAN_TEXT_TOOL = {
  name: 'scan_text',
  description: `Extract entities and relationships from raw text into a knowledge graph batch.

Modes:
- "auto": AI detects entities and extracts relationships automatically.
- "anchored": You provide pre-selected entities (anchors), and the AI extracts relationships between them.
- "detect_only": AI detects entity candidates and returns them without extracting relationships. Use this for iterative anchoring.

If universe_id is provided, the server will match extracted entities against the existing registry and produce EXTEND operations for entities that already exist (delta extraction).`,

  inputSchema: z.object({
    text: z.string().describe('The raw text to extract entities and relationships from.'),
    mode: z.enum(['auto', 'anchored', 'detect_only']).default('auto').describe('Extraction mode.'),
    anchors: z
      .array(
        z.object({
          title: z.string(),
          aliases: z.array(z.string()).default([]),
          category: z.nativeEnum(NexusCategory).default(NexusCategory.CONCEPT),
          gist: z.string().optional(),
        }),
      )
      .optional()
      .describe('Pre-selected entities for "anchored" mode.'),
    universe_id: z
      .string()
      .optional()
      .describe('Universe ID for registry-aware extraction (delta mode).'),
  }),
};

export type ScanTextInput = z.infer<typeof SCAN_TEXT_TOOL.inputSchema>;

export async function handleScanText(
  input: ScanTextInput,
  aiClient: AIClient,
  registry?: Record<string, import('../../core/types/entities').NexusObject>,
) {
  if (input.mode === 'detect_only') {
    const seeds = await detectEntities(input.text, aiClient);
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              mode: 'detect_only',
              entities: seeds,
              count: seeds.length,
              hint: 'Use scan_text with mode="anchored" and these entities as anchors to extract relationships.',
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  const result = await runExtraction({
    text: input.text,
    aiClient,
    anchors: input.anchors,
    registry,
  });

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            batch_id: result.batch_id,
            entity_count: result.entity_count,
            link_count: result.link_count,
            matches: result.matches,
            detected_dates: result.detected_dates,
            operations_summary: result.operations.map((op) => ({
              op: op.op,
              title:
                op.entity && 'title' in op.entity
                  ? (op.entity as unknown as { title: string }).title
                  : undefined,
              target_id: op.target_id,
              link_verb:
                op.link && 'verb' in op.link
                  ? (op.link as unknown as { verb: string }).verb
                  : undefined,
            })),
          },
          null,
          2,
        ),
      },
    ],
  };
}
