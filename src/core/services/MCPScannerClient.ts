// ============================================================
// MCP Scanner Client — Bridge Layer
// Wraps MCP server extraction logic for use in the React app.
// Sidecar prototype: direct function calls (in-process).
// Production: swap to HTTP/SSE transport to a persistent service.
// ============================================================

import { NexusCategory } from '../types/enums';
import type { NexusObject, NexusNote } from '../types/entities';
import type { BatchOperation, Batch } from '../../mcp-server/core/batch-store';
import { extractDatesFromText } from '../../mcp-server/core/temporal-resolver';
import type { PartialDate } from '../../mcp-server/core/temporal-resolver';
import type { NexusContextItem } from '../../mcp-server/core/context-formatter';
import { GraphOperations } from './GraphOperations';
import { TimeDimensionService } from './TimeDimensionService';

// ============================================================
// Result Types (aligned with MCP tool outputs)
// ============================================================

export interface DetectedEntity {
  title: string;
  aliases: string[];
  category: NexusCategory;
  gist: string;
}

export interface ScanResult {
  batch_id: string;
  entity_count: number;
  link_count: number;
  matches: Array<{
    extracted_title: string;
    existing_id: string;
    existing_title: string;
    match_type: 'exact_title' | 'alias' | 'fuzzy';
    confidence: number;
  }>;
  detected_dates: Array<{ raw_text: string; date: PartialDate; valid_until?: PartialDate }>;
  operations: BatchOperation[];
}

export interface DetectResult {
  entities: DetectedEntity[];
  count: number;
}

export interface ExpandResult {
  parent: string;
  suggestions: Array<{
    title: string;
    category: NexusCategory;
    gist: string;
    isAuthorNote?: boolean;
  }>;
  count: number;
}

export interface RefineBatchResult {
  batch_id: string;
  operations_applied: string[];
  remaining_operations: number;
  status: string;
}

export interface CommitResult {
  committed: number;
  extend_operations: number;
  extend_details: Array<{ target_id: string; extensions: Record<string, unknown> }>;
  objects: NexusObject[];
  message: string;
}

export interface BatchSummary {
  id: string;
  name: string;
  timestamp: string;
  opCount: number;
  status: string;
}

export type RefineryOperation = {
  type: 'create' | 'update' | 'remove';
  target_id?: string;
  data?: Record<string, unknown>;
  entity?: NexusObject;
};

export type { NexusContextItem };

// ============================================================
// Connection State
// ============================================================

export type MCPConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface MCPClientState {
  status: MCPConnectionStatus;
  error?: string;
  serverVersion?: string;
}

// ============================================================
// MCPScannerClient
// ============================================================

type StatusListener = (state: MCPClientState) => void;

/**
 * Bridge between the React app and the MCP server's extraction pipeline.
 *
 * **Sidecar prototype**: Directly imports and calls the extraction functions
 * in-process. This avoids the need to spawn a subprocess or set up HTTP.
 *
 * **Production**: Replace the internal `call*` methods with HTTP/SSE calls
 * to the persistent MCP service. The public API stays identical.
 */
export class MCPScannerClient {
  private state: MCPClientState = { status: 'disconnected' };
  private listeners: Set<StatusListener> = new Set();

  // Lazily loaded modules (dynamic import to avoid bundling Node.js code in dev)
  private modules: {
    extractionPipeline?: typeof import('../../mcp-server/core/extraction-pipeline');
    batchStore?: typeof import('../../mcp-server/core/batch-store');
    graphAssembler?: typeof import('../../mcp-server/core/graph-assembler');
    contextFormatter?: typeof import('../../mcp-server/core/context-formatter');
    aiClient?: typeof import('../../mcp-server/core/ai-client');
    expandEntity?: typeof import('../../mcp-server/tools/expand-entity');
    ai?: import('../../mcp-server/core/ai-client').AIClient;
  } = {};

  // ============================================================
  // Connection Management
  // ============================================================

  /** Subscribe to connection state changes. Returns unsubscribe function. */
  onStateChange(listener: StatusListener): () => void {
    this.listeners.add(listener);
    listener(this.state); // Emit current state immediately
    return () => this.listeners.delete(listener);
  }

  getState(): MCPClientState {
    return { ...this.state };
  }

  private setState(update: Partial<MCPClientState>) {
    this.state = { ...this.state, ...update };
    this.listeners.forEach((fn) => fn(this.state));
  }

  /**
   * Initialize the client. In sidecar mode, this loads the extraction modules.
   * In production, this would establish an HTTP/SSE connection.
   */
  async connect(): Promise<void> {
    if (this.state.status === 'connected') return;

    this.setState({ status: 'connecting', error: undefined });

    try {
      // Dynamic imports — these modules use Node.js APIs internally
      // but the parts we need (types, pure functions) work in the browser
      const [extractionPipeline, batchStore, graphAssembler, contextFormatter] = await Promise.all([
        import('../../mcp-server/core/extraction-pipeline'),
        import('../../mcp-server/core/batch-store'),
        import('../../mcp-server/core/graph-assembler'),
        import('../../mcp-server/core/context-formatter'),
      ]);

      this.modules.extractionPipeline = extractionPipeline;
      this.modules.batchStore = batchStore;
      this.modules.graphAssembler = graphAssembler;
      this.modules.contextFormatter = contextFormatter;

      // Create an AI client using the app's existing backend proxy
      const aiClientModule = await import('../../mcp-server/core/ai-client');
      this.modules.aiClient = aiClientModule;

      // Use the app's config to create the AI client
      const { config } = await import('../../config');
      if (config.backendUrl) {
        this.modules.ai = new aiClientModule.ProxyAIClient(config.backendUrl, 'gemini-2.0-flash');
      } else if (config.geminiApiKey) {
        this.modules.ai = new aiClientModule.DirectAIClient(
          config.geminiApiKey,
          'gemini-2.0-flash',
        );
      } else {
        throw new Error('No AI configuration: set VITE_BACKEND_URL or VITE_GEMINI_API_KEY');
      }

      this.setState({ status: 'connected', serverVersion: '1.0.0-sidecar' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.setState({ status: 'error', error: msg });
      throw err;
    }
  }

  /** Disconnect and clean up. */
  disconnect(): void {
    this.modules = {};
    this.setState({ status: 'disconnected', error: undefined });
  }

  // ============================================================
  // Tool Methods
  // ============================================================

  /**
   * Detect entities in text without extracting relationships.
   * Equivalent to MCP `scan_text` with mode='detect_only'.
   */
  async detectEntities(text: string): Promise<DetectResult> {
    this.ensureConnected();
    const { detectEntities: detect } = this.modules.extractionPipeline!;
    const seeds = await detect(text, this.modules.ai!);
    return {
      entities: seeds.map((s) => ({
        title: s.title,
        aliases: s.aliases || [],
        category: s.category,
        gist: s.gist || '',
      })),
      count: seeds.length,
    };
  }

  /**
   * Preview the "Viewing" context for a given text.
   * detects entities and formats them as standard NexusContextItems.
   */
  async previewContext(text: string): Promise<NexusContextItem[]> {
    this.ensureConnected();
    const { detectEntities: detect } = this.modules.extractionPipeline!;
    const { formatContextForAI } = this.modules.contextFormatter!;

    const seeds = await detect(text, this.modules.ai!);
    return formatContextForAI(seeds);
  }

  /**
   * Phase 9: Agentic Context Resolution ("The World Engine")
   * Orchestrates the Detective -> Historian -> Cartographer -> Reporter workflow.
   */
  async resolveAgenticContext(
    query: string,
    registry: Record<string, NexusObject>,
  ): Promise<{
    entities: NexusContextItem[];
    temporal_anchor?: string;
    graph_facts: string[];
  }> {
    this.ensureConnected();

    // 1. Detective (Entity Extraction)
    // We use the lighter 'detectEntities' to find potential nodes in the query.
    const detection = await this.detectEntities(query);
    const entitySeeds = detection.entities;

    // Match against registry to get IDs
    const candidates: NexusNote[] = [];
    entitySeeds.forEach((seed) => {
      // Simple match for now: Find by Title or Alias using TimeDimensionService helper
      const node = TimeDimensionService.findBaseNode(registry, seed.title);
      if (node) candidates.push(node);
    });

    // 2. Historian (Temporal Anchoring)
    // Extract dates from query
    const dates = extractDatesFromText(query);
    let effectiveYear: number | undefined;
    let temporalAnchorDescription: string | undefined;

    if (dates.length > 0) {
      effectiveYear = dates[0].effective_date.year;
      temporalAnchorDescription = `Explicit Date: ${effectiveYear}`;
    } else {
      // Implicit anchor from entities? (e.g. "B War" might have a time range)
      // Check candidates for events with time_state
      const eventNode = candidates.find((c) => c.category_id === 'EVENT' && 'time_state' in c);
      if (eventNode && 'time_state' in eventNode && eventNode.time_state) {
        effectiveYear = eventNode.time_state.effective_date.year;
        temporalAnchorDescription = `Implied Event: ${eventNode.title} (${effectiveYear})`;
      }
    }

    // 3. Cartographer (Hierarchical Traversal)
    const graphFacts: string[] = [];

    candidates.forEach((node) => {
      if (effectiveYear) {
        // Check Hierarchy at this time
        const parentId = GraphOperations.getHierarchyRoot(registry, node.id, effectiveYear);
        if (parentId) {
          const parent = registry[parentId];
          if (parent && 'title' in parent) {
            graphFacts.push(
              `${node.title} was contained by ${(parent as any).title} in ${effectiveYear}.`,
            );
          }
        }
      } else {
        // Static check
        const parentId = GraphOperations.ascend(registry, node.id);
        if (parentId) {
          const parent = registry[parentId];
          if (parent && 'title' in parent)
            graphFacts.push(`${node.title} is contained by ${(parent as any).title}.`);
        }
      }
    });

    // 4. Reporter (M2M Context)
    candidates.forEach((node) => {
      // Check implicit M2M participation via hubs
      const hubs = GraphOperations.expandHubs(registry, node.id);
      hubs.forEach((hub) => {
        const context = GraphOperations.getHubContext(registry, hub.id);
        const myRole = context.find((p) => p.node_id === node.id);
        if (myRole && 'title' in hub) {
          graphFacts.push(`${node.title} was ${myRole.role_id} in ${(hub as any).title}.`);
        }
      });
    });

    // Use context formatter for entities
    const { formatContextForAI } = this.modules.contextFormatter!;
    const formattedEntities = formatContextForAI(candidates);

    return {
      entities: formattedEntities,
      temporal_anchor: temporalAnchorDescription,
      graph_facts: Array.from(new Set(graphFacts)), // Dedupe
    };
  }

  /**
   * Full extraction: detect entities, extract relationships, create batch.
   * Equivalent to MCP `scan_text` with mode='auto' or 'anchored'.
   */
  async scanText(
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
  ): Promise<ScanResult> {
    this.ensureConnected();
    const { runExtraction } = this.modules.extractionPipeline!;
    const result = await runExtraction({
      text,
      aiClient: this.modules.ai!,
      anchors: options?.anchors?.map((a) => ({
        title: a.title,
        aliases: a.aliases || [],
        category: a.category || NexusCategory.CONCEPT,
        gist: a.gist,
      })),
      registry: options?.registry,
    });
    return result;
  }

  /**
   * Expand an entity into suggested children.
   * Equivalent to MCP `expand_entity`.
   */
  async expandEntity(
    entityTitle: string,
    contextText: string,
    category?: NexusCategory,
  ): Promise<ExpandResult> {
    this.ensureConnected();

    const prompt = `You are a worldbuilding assistant. Given an entity and context, suggest 3-8 logical sub-entities that could be children/components of this entity.

For each suggestion, provide:
- title: The sub-entity's name
- category: One of CHARACTER, LOCATION, ORGANIZATION, ITEM, CONCEPT, EVENT, META, STORY, WORLD, STATE
- gist: A brief description based on what can be inferred

Respond with ONLY a valid JSON array. No markdown, no explanation.

ENTITY: "${entityTitle}" (${category ?? 'unknown category'})
CONTEXT:
${contextText}`;

    const responseText = await this.modules.ai!.generateText({ prompt });
    const cleaned = responseText
      .replace(/```(?:json)?\n?/g, '')
      .replace(/\n?```/g, '')
      .trim();
    const suggestions = JSON.parse(cleaned);

    return {
      parent: entityTitle,
      suggestions,
      count: suggestions.length,
    };
  }

  /**
   * Refine a batch by applying update/remove operations.
   * Equivalent to MCP `refine_batch`.
   */
  async refineBatch(batchId: string, operations: RefineryOperation[]): Promise<RefineBatchResult> {
    this.ensureConnected();
    const { BatchStore } = this.modules.batchStore!;
    const batch = BatchStore.get(batchId);
    if (!batch) {
      throw new Error(`Batch "${batchId}" not found`);
    }

    const results: string[] = [];

    for (const op of operations) {
      if (op.type === 'remove' && op.target_id) {
        BatchStore.removeOperation(batchId, op.target_id);
        results.push(`Removed: ${op.target_id}`);
      } else if (op.type === 'update' && op.target_id && op.data) {
        BatchStore.updateOperation(batchId, op.target_id, op.data as Partial<NexusObject>);
        results.push(`Updated: ${op.target_id}`);
      } else if (op.type === 'create' && op.entity) {
        // Determine if it's a LINK or CREATE op based on entity type?
        // For simplicity, we treat everything as CREATE or LINK based on BatchOperation logic.
        // But BatchStore.addOperations takes BatchOperation[].
        // We'll map it to a generic CREATE operation.
        const batchOp: BatchOperation = {
          op: 'CREATE',
          entity: op.entity,
        };
        // If it's a link, maybe we should use LINK op?
        // BatchStore.getObjects returns both entity and link fields.
        // If we put a link in 'entity' field of CREATE op, getObjects will return it.
        // So CREATE is safe for both nodes and links in this simplified store.
        BatchStore.addOperations(batchId, [batchOp]);
        results.push(`Created: ${op.entity.id}`);
      }
    }

    const updated = BatchStore.get(batchId)!;
    return {
      batch_id: batchId,
      operations_applied: results,
      remaining_operations: updated.operations.length,
      status: updated.status,
    };
  }

  /**
   * Commit a batch to the registry.
   * Equivalent to MCP `commit_batch`.
   */
  async commitBatch(batchId: string, universeId: string): Promise<CommitResult> {
    this.ensureConnected();
    const { BatchStore } = this.modules.batchStore!;
    const { wireLinkIds } = this.modules.graphAssembler!;

    const batch = BatchStore.get(batchId);
    if (!batch) {
      throw new Error(`Batch "${batchId}" not found`);
    }
    if (batch.status === 'committed') {
      throw new Error(`Batch "${batchId}" already committed`);
    }

    // Collect and wire objects
    let objects = BatchStore.getObjects(batchId);
    objects = wireLinkIds(objects);

    // Collect EXTEND ops
    const extendOps = batch.operations
      .filter((op) => op.op === 'EXTEND' && op.target_id && op.extensions)
      .map((op) => ({
        target_id: op.target_id!,
        extensions: op.extensions as Record<string, unknown>,
      }));

    BatchStore.markCommitted(batchId);

    return {
      committed: objects.length,
      extend_operations: extendOps.length,
      extend_details: extendOps,
      objects,
      message:
        extendOps.length > 0
          ? `${objects.length} objects committed. ${extendOps.length} EXTEND operations logged.`
          : `${objects.length} objects committed successfully.`,
    };
  }

  /**
   * Get a batch by ID.
   */
  getBatch(batchId: string): Batch | undefined {
    this.ensureConnected();
    return this.modules.batchStore!.BatchStore.get(batchId);
  }

  /**
   * Get all NexusObjects from a batch.
   */
  getBatchObjects(batchId: string): NexusObject[] {
    this.ensureConnected();
    return this.modules.batchStore!.BatchStore.getObjects(batchId);
  }

  /**
   * List all batches.
   */
  listBatches(): BatchSummary[] {
    this.ensureConnected();
    return this.modules.batchStore!.BatchStore.list();
  }

  /**
   * Delete a batch.
   */
  deleteBatch(batchId: string): boolean {
    this.ensureConnected();
    return this.modules.batchStore!.BatchStore.delete(batchId);
  }

  // ============================================================
  // Internal
  // ============================================================

  private ensureConnected(): void {
    if (this.state.status !== 'connected') {
      throw new Error(
        `MCPScannerClient not connected (status: ${this.state.status}). Call connect() first.`,
      );
    }
  }
}

// ============================================================
// Singleton
// ============================================================

let instance: MCPScannerClient | null = null;

/** Get or create the shared MCPScannerClient instance. */
export function getMCPScannerClient(): MCPScannerClient {
  if (!instance) {
    instance = new MCPScannerClient();
  }
  return instance;
}
