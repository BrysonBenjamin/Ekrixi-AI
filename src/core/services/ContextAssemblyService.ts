import { NexusObject, NexusType, SimpleNote } from '../../types';
import { ThinkingProcessStep, GovernedSearchResult } from './ArangoSearchService';
import { TimeDimensionService } from './TimeDimensionService';

export interface ContextAssemblyResult {
  contextString: string;
  metrics: {
    totalTokens: number; // Approximation
    candidateCount: number;
    utilization: number;
  };
  thinking_process: ThinkingProcessStep[];
}

export interface WeightedContextUnit {
  id: string;
  score: number;
  contextYear?: number; // Target year for time-specific retrieval
  children?: {
    id: string;
    score: number;
  }[];
}

export class ContextAssemblyService {
  /**
   * Assembles a "World Memory Bank" context for the LLM, but does so in a structured,
   * observable way that we can visualize as a "Thinking Process".
   */
  static assembleWorldContext(
    registry: Record<string, NexusObject>,
    weightedUnits: WeightedContextUnit[],
    queryIntent: string,
    maxItems: number = 20,
  ): ContextAssemblyResult {
    const start = performance.now();
    const processSteps: ThinkingProcessStep[] = [];

    // 1. RESOLUTION & EXPANSION
    // Resolve IDs to actual objects and handle children expansion
    // We now also handle Time Snapshots
    const resolvedItems: {
      note: SimpleNote;
      score: number;
      isChild: boolean;
      parentId?: string;
      timeState?: SimpleNote; // The specific time-slice node if applicable
      effectiveYear?: number;
    }[] = [];

    weightedUnits.forEach((mention) => {
      const root = registry[mention.id] as SimpleNote;
      if (root) {
        // Check for Time Dimension
        // Default to far future (9999) to get latest state if no year specified
        const targetYear = mention.contextYear !== undefined ? mention.contextYear : 9999;
        const snapshot = TimeDimensionService.getSnapshot(registry, root.id, targetYear);

        let timeStateNode: SimpleNote | undefined;
        let effectiveYear: number | undefined;

        // Only treat as time state if we actually got a different node back, OR if we asked for a specific year
        // and the service confirmed it.
        if (
          snapshot &&
          !snapshot.isBaseStateless &&
          snapshot.stateNode.id !== snapshot.baseNode.id
        ) {
          timeStateNode = snapshot.stateNode;
          effectiveYear = snapshot.effectiveYear;
        }

        resolvedItems.push({
          note: root,
          score: mention.score,
          isChild: false,
          timeState: timeStateNode,
          effectiveYear: effectiveYear,
        });

        // Process children if any
        if (mention.children) {
          mention.children.forEach((child) => {
            const childNote = registry[child.id] as SimpleNote;
            if (childNote) {
              resolvedItems.push({
                note: childNote,
                score: child.score,
                isChild: true,
                parentId: root.id,
                timeState: undefined,
                effectiveYear: undefined,
              });
            }
          });
        }
      }
    });

    // 2. CANDIDATE RETRIEVAL (The "Seeing" Phase)
    // Get non-prioritized units to fill context if needed
    const prioritizedIds = new Set(resolvedItems.map((i) => i.note.id));
    const allUnits = Object.values(registry).filter(
      (o) =>
        (o._type === NexusType.SIMPLE_NOTE || o._type === NexusType.CONTAINER_NOTE) &&
        !prioritizedIds.has(o.id),
    ) as SimpleNote[];

    processSteps.push({
      stage: 'VECTOR_RETRIEVAL',
      description: `Resolved ${weightedUnits.length} weighted mentions into ${resolvedItems.length} context units. Found ${allUnits.length} additional candidates.`,
      status: 'INFO',
      durationMs: 5,
      data: {
        prioritized_count: resolvedItems.length,
        candidate_count: allUnits.length,
        strategy: 'HYBRID_PRIORITY',
      },
    });

    // 3. RELEVANCE FILTERING & SORTING
    // Sort prioritized items by score (Descending)
    resolvedItems.sort((a, b) => b.score - a.score);

    // Fill remaining slots
    const remainingSlots = Math.max(0, maxItems - resolvedItems.length);
    const filledUnits = allUnits.slice(0, remainingSlots).map((note) => ({
      note,
      score: 0, // Default for non-weighted is 0 (lowest priority)
      isChild: false,
      parentId: undefined,
      timeState: undefined,
      effectiveYear: undefined,
    }));

    const finalContextList = [...resolvedItems, ...filledUnits];

    processSteps.push({
      stage: 'LINEAGE_AUDIT',
      description: `Final context window constructed with ${finalContextList.length} units (${resolvedItems.length} forced).`,
      status: finalContextList.length < resolvedItems.length + allUnits.length ? 'PASS' : 'WARN',
      durationMs: 15,
      data: {
        selected_ids: finalContextList.map((u) => u.note.title),
        filtering_logic: 'PRIORITY_SORT + NAIVE_FILL',
      },
    });

    // 4. FORMATTING & TOKENIZATION (The "Language" Phase)
    const formattedString = finalContextList
      .map((item) => {
        const importanceTag = `[IMP: ${item.score.toString().padStart(2, '0')}]`;
        const relationTag = item.isChild
          ? `(Child of ${resolvedItems.find((p) => p.note.id === item.parentId)?.note.title || 'Parent'})`
          : '';

        let content = `${item.note.title}: ${item.note.gist}`;

        // Enhanced Time Formatting
        if (item.timeState) {
          content = `SUBJECT: ${item.note.title} (Base Identity)\n   Core Gist: ${item.note.gist}\n   SNAPSHOT (Year ${item.effectiveYear}):\n   - Condition: ${item.timeState.gist}\n   - Era Title: ${item.timeState.title}`;
        }

        // Only add explanation if score > 0, otherwise standard format
        // If it's a time node, we format uniquely regardless of score
        if (item.timeState) {
          return `${importanceTag} ${content}`;
        }

        return item.score > 0
          ? `${importanceTag} ${item.note.title} ${relationTag}: ${item.note.gist}`
          : `${item.note.title}: ${item.note.gist}`;
      })
      .join('\n\n');

    const approximateTokens = formattedString.length / 4;

    processSteps.push({
      stage: 'FINAL_VALIDATION',
      description: `Constructed context block. Approx ${Math.ceil(approximateTokens)} tokens.`,
      status: 'PASS',
      durationMs: 2,
      data: {
        token_usage: Math.ceil(approximateTokens),
        top_priority_count: resolvedItems.filter((i) => i.score >= 8).length,
        context_preview: formattedString.slice(0, 100) + '...',
      },
    });

    return {
      contextString: formattedString,
      metrics: {
        totalTokens: Math.ceil(approximateTokens),
        candidateCount: finalContextList.length,
        utilization: finalContextList.length / (resolvedItems.length + allUnits.length || 1),
      },
      thinking_process: processSteps,
    };
  }
}
