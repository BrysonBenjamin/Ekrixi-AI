// ============================================================
// MCP Server — Context Formatter
// Standardizes how Nexus content is presented to the AI.
// ============================================================

import type { NexusObject, NexusNote } from '../../core/types/entities';
import { isNote, isLink } from '../../types'; // Re-export from types/index
import type { EntitySeed } from './extraction-pipeline';

export interface NexusContextItem {
  id?: string;
  title: string;
  category: string;
  gist: string;
  prose?: string;
  relevance?: string; // Optional, usually AI-generated on output, but can be pre-filled if known
}

/**
 * Format a mixed list of NexusObjects or EntitySeeds into standardized context items.
 */
export function formatContextForAI(
  items: (NexusObject | EntitySeed)[],
  options?: { includeProse?: boolean },
): NexusContextItem[] {
  return items.map((item) => {
    if ('_type' in item) {
      // NexusObject
      if (isNote(item)) {
        return {
          id: item.id,
          title: item.title,
          category: item.category_id,
          gist: item.gist,
          prose: options?.includeProse ? item.prose_content : undefined,
        };
      } else if (isLink(item)) {
        // Formatting links is tricky. Maybe ignore or formatted as text?
        // For now, return basic info if available.
        // Links usually don't have titles in v2 unless reified.
        // If it's a reified link (which is an Object in the union), we can format it.
        if ('title' in item && typeof item.title === 'string') {
          return {
            id: item.id,
            title: item.title,
            category: (item as any).category_id || 'LINK', // Reified links have categories? Usually META or CONCEPT.
            gist: (item as any).gist || '',
          };
        }
        return {
          id: item.id,
          title: `Link: ${item.verb}`,
          category: 'CONNECTION',
          gist: `Connects ${item.source_id} to ${item.target_id}`,
        };
      }
      // Fallback
      return {
        id: item.id,
        title: 'Unknown Object',
        category: 'UNKNOWN',
        gist: '',
      };
    } else {
      // EntitySeed
      return {
        title: item.title,
        category: item.category,
        gist: item.gist || '',
      };
    }
  });
}

/**
 * Convert context items to a string representation for prompt injection.
 */
export function stringifyContext(context: NexusContextItem[]): string {
  return context
    .map((item) => {
      let str = `- ${item.title} (${item.category})`;
      if (item.gist) str += `: ${item.gist}`;
      if (item.relevance) str += `\n  Relevance: ${item.relevance}`;
      return str;
    })
    .join('\n');
}
