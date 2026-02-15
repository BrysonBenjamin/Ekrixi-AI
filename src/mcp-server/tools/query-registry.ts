// ============================================================
// MCP Tool — query_registry
// Read-only access to the existing graph for context.
// ============================================================

import { z } from 'zod';
import type { NexusObject, NexusNote } from '../../core/types/entities';
import { NexusType, NexusCategory } from '../../core/types/enums';

export const QUERY_REGISTRY_TOOL = {
  name: 'query_registry',
  description: `Query the existing knowledge graph registry. Use this to inspect what already exists before scanning new text, or to understand the current graph structure.

Filters:
- types: Filter by NexusType (e.g., SIMPLE_NOTE, SIMPLE_LINK)
- category: Filter by category (e.g., CHARACTER, LOCATION)
- search: Text search across titles and gists`,

  inputSchema: z.object({
    universe_id: z.string().describe('The universe/nexus ID to query.'),
    types: z.array(z.nativeEnum(NexusType)).optional().describe('Filter by NexusType.'),
    category: z.nativeEnum(NexusCategory).optional().describe('Filter by category.'),
    search: z.string().optional().describe('Text search across titles and gists.'),
    limit: z.number().default(50).describe('Maximum results to return.'),
  }),
};

export type QueryRegistryInput = z.infer<typeof QUERY_REGISTRY_TOOL.inputSchema>;

function isNotelike(obj: NexusObject): obj is NexusNote {
  return 'title' in obj;
}

export function handleQueryRegistry(
  input: QueryRegistryInput,
  registry: Record<string, NexusObject>,
) {
  let results = Object.values(registry);

  // Filter by type
  if (input.types && input.types.length > 0) {
    const typeSet = new Set(input.types);
    results = results.filter((obj) => typeSet.has(obj._type as NexusType));
  }

  // Filter by category
  if (input.category) {
    results = results.filter((obj) => isNotelike(obj) && obj.category_id === input.category);
  }

  // Text search
  if (input.search) {
    const term = input.search.toLowerCase();
    results = results.filter((obj) => {
      if (isNotelike(obj)) {
        return (
          obj.title.toLowerCase().includes(term) ||
          obj.gist?.toLowerCase().includes(term) ||
          obj.aliases?.some((a) => a.toLowerCase().includes(term))
        );
      }
      return false;
    });
  }

  // Limit
  results = results.slice(0, input.limit);

  // Format output
  const formatted = results.map((obj) => {
    const base: Record<string, unknown> = {
      id: obj.id,
      _type: obj._type,
    };
    if (isNotelike(obj)) {
      base.title = obj.title;
      base.gist = obj.gist;
      base.category = obj.category_id;
      if (obj.aliases?.length) base.aliases = obj.aliases;
      if (obj.time_state) base.time_state = obj.time_state;
      if ('children_ids' in obj)
        base.children_count = (obj as { children_ids: string[] }).children_ids.length;
    }
    if ('source_id' in obj) {
      const linkObj = obj as unknown as { source_id: string; target_id: string; verb: string };
      base.source_id = linkObj.source_id;
      base.target_id = linkObj.target_id;
      base.verb = linkObj.verb;
    }
    base.link_count = obj.link_ids.length;
    return base;
  });

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            universe_id: input.universe_id,
            total_results: formatted.length,
            results: formatted,
          },
          null,
          2,
        ),
      },
    ],
  };
}
