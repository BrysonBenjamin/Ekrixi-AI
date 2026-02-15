// ============================================================
// MCP Tool — expand_entity
// AI-powered sub-structure suggestion for an entity.
// ============================================================

import { z } from 'zod';
import { NexusCategory } from '../../core/types/enums';
import type { AIClient } from '../core/ai-client';

export const EXPAND_ENTITY_TOOL = {
  name: 'expand_entity',
  description: `Given an entity title and surrounding context, suggest sub-entities that could logically be children of this entity.

For example, expanding "The Solar Council" might suggest members, departments, or artifacts associated with it.

This is useful for building out a hierarchy before scanning more text.`,

  inputSchema: z.object({
    entity_title: z.string().describe('The entity to expand.'),
    context_text: z.string().describe('Context text that mentions or describes the entity.'),
    category: z
      .nativeEnum(NexusCategory)
      .optional()
      .describe('Category of the parent entity, for better suggestions.'),
  }),
};

export type ExpandEntityInput = z.infer<typeof EXPAND_ENTITY_TOOL.inputSchema>;

const EXPAND_PROMPT = `You are a worldbuilding assistant. Given an entity and context, suggest 3-8 logical sub-entities that could be children/components of this entity.

For each suggestion, provide:
- title: The sub-entity's name
- category: One of CHARACTER, LOCATION, ORGANIZATION, ITEM, CONCEPT, EVENT, META, STORY, WORLD, STATE
- gist: A brief description based on what can be inferred

Respond with ONLY a valid JSON array. No markdown, no explanation.`;

export async function handleExpandEntity(input: ExpandEntityInput, aiClient: AIClient) {
  const prompt = `${EXPAND_PROMPT}\n\nENTITY: "${input.entity_title}" (${input.category ?? 'unknown category'})\nCONTEXT:\n${input.context_text}`;

  try {
    const responseText = await aiClient.generateText({ prompt });
    const cleaned = responseText
      .replace(/```(?:json)?\n?/g, '')
      .replace(/\n?```/g, '')
      .trim();
    const suggestions = JSON.parse(cleaned);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              parent: input.entity_title,
              suggestions,
              count: suggestions.length,
              hint: 'Use these as anchors in scan_text with mode="anchored" to extract detailed relationships.',
            },
            null,
            2,
          ),
        },
      ],
    };
  } catch {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              parent: input.entity_title,
              error: 'Failed to parse AI response',
            },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }
}
