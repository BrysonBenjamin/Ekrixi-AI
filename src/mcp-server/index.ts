// ============================================================
// Knowledge Nexus MCP Server — Entry Point
// Stdio transport, v2 schema only.
// ============================================================

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { SCAN_TEXT_TOOL, handleScanText, type ScanTextInput } from './tools/scan-text';
import { REFINE_BATCH_TOOL, handleRefineBatch, type RefineBatchInput } from './tools/refine-batch';
import { COMMIT_BATCH_TOOL, handleCommitBatch, type CommitBatchInput } from './tools/commit-batch';
import {
  QUERY_REGISTRY_TOOL,
  handleQueryRegistry,
  type QueryRegistryInput,
} from './tools/query-registry';
import {
  EXPAND_ENTITY_TOOL,
  handleExpandEntity,
  type ExpandEntityInput,
} from './tools/expand-entity';

import { BatchStore } from './core/batch-store';
import { createAIClient, type AIClient } from './core/ai-client';
import { NexusType, NexusCategory, HierarchyType } from '../core/types/enums';
import type { NexusObject } from '../core/types/entities';

// ============================================================
// Configuration
// ============================================================

let aiClient: AIClient;
try {
  aiClient = createAIClient();
} catch (err) {
  console.error('[MCP] AI client initialization failed:', (err as Error).message);
  console.error('[MCP] Set BACKEND_URL or GEMINI_API_KEY environment variable.');
  process.exit(1);
}

// In-memory registry — in production, this would connect to Firebase/IndexedDB
const registries = new Map<string, Record<string, NexusObject>>();

function getRegistry(universeId: string): Record<string, NexusObject> {
  if (!registries.has(universeId)) {
    registries.set(universeId, {});
  }
  return registries.get(universeId)!;
}

// ============================================================
// Server Setup
// ============================================================

const server = new McpServer({
  name: 'knowledge-nexus',
  version: '1.0.0',
});

// ============================================================
// Tools
// ============================================================

server.tool(
  SCAN_TEXT_TOOL.name,
  SCAN_TEXT_TOOL.description,
  SCAN_TEXT_TOOL.inputSchema.shape,
  async (input: ScanTextInput) => {
    const registry = input.universe_id ? getRegistry(input.universe_id) : undefined;
    return handleScanText(input, aiClient, registry);
  },
);

server.tool(
  REFINE_BATCH_TOOL.name,
  REFINE_BATCH_TOOL.description,
  REFINE_BATCH_TOOL.inputSchema.shape,
  async (input: RefineBatchInput) => {
    return handleRefineBatch(input);
  },
);

server.tool(
  COMMIT_BATCH_TOOL.name,
  COMMIT_BATCH_TOOL.description,
  COMMIT_BATCH_TOOL.inputSchema.shape,
  async (input: CommitBatchInput) => {
    const result = handleCommitBatch(input);

    if (result.error) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${result.error}` }],
        isError: true,
      };
    }

    // Persist to in-memory registry
    const registry = getRegistry(input.universe_id);
    for (const obj of result.objects) {
      registry[obj.id] = obj;
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              committed: result.objects.length,
              extend_operations: result.extendOps.length,
              extend_details: result.extendOps,
              message:
                result.extendOps.length > 0
                  ? `${result.objects.length} objects committed. ${result.extendOps.length} EXTEND operations logged — these reference existing objects that should be manually updated.`
                  : `${result.objects.length} objects committed successfully.`,
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

server.tool(
  QUERY_REGISTRY_TOOL.name,
  QUERY_REGISTRY_TOOL.description,
  QUERY_REGISTRY_TOOL.inputSchema.shape,
  async (input: QueryRegistryInput) => {
    const registry = getRegistry(input.universe_id);
    return handleQueryRegistry(input, registry);
  },
);

server.tool(
  EXPAND_ENTITY_TOOL.name,
  EXPAND_ENTITY_TOOL.description,
  EXPAND_ENTITY_TOOL.inputSchema.shape,
  async (input: ExpandEntityInput) => {
    return handleExpandEntity(input, aiClient);
  },
);

// ============================================================
// Resources
// ============================================================

// Static resource: Schema v2 type definitions
server.resource('nexus-schema', 'nexus://schema/v2', async (uri) => ({
  contents: [
    {
      uri: uri.href,
      mimeType: 'application/json',
      text: JSON.stringify(
        {
          version: 'v2',
          types: Object.values(NexusType),
          categories: Object.values(NexusCategory),
          hierarchy_types: Object.values(HierarchyType),
          note_types: ['SIMPLE_NOTE', 'AUTHOR_NOTE', 'STORY_NOTE'],
          link_types: ['SIMPLE_LINK', 'HIERARCHICAL_LINK'],
          aggregated_types: ['AGGREGATED_SIMPLE_LINK', 'AGGREGATED_HIERARCHICAL_LINK'],
          conventions: {
            temporal_dates:
              'Partial dates expand to full ranges: {year: 1042} = Jan 1 to Dec 31 1042',
            containers: 'Notes with children_ids serve as containers (no ContainmentType enum)',
            link_ids: 'Computed field — list of link IDs referencing this node',
          },
        },
        null,
        2,
      ),
    },
  ],
}));

// Dynamic resource: Batch contents
server.resource(
  'nexus-batch',
  new ResourceTemplate('nexus://batch/{batch_id}', { list: undefined }),
  async (uri, { batch_id }) => {
    const batchId = Array.isArray(batch_id) ? batch_id[0] : batch_id;
    const batch = BatchStore.get(batchId);
    if (!batch) {
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({ error: `Batch "${batchId}" not found` }),
          },
        ],
      };
    }

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              id: batch.id,
              name: batch.name,
              status: batch.status,
              timestamp: batch.timestamp,
              source: batch.source,
              operations: batch.operations.map((op) => ({
                op: op.op,
                entity_id: op.entity?.id,
                entity_title:
                  op.entity && 'title' in op.entity
                    ? (op.entity as unknown as { title: string }).title
                    : undefined,
                target_id: op.target_id,
                link_id: op.link?.id,
                extensions: op.extensions,
              })),
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

// ============================================================
// Start Server
// ============================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Knowledge Nexus MCP Server running on stdio');
}

main().catch((err) => {
  console.error('Failed to start MCP server:', err);
  process.exit(1);
});
