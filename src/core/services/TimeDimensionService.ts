import {
  NexusObject,
  NexusType,
  SimpleNote,
  NexusTimeData,
  TimeLink,
  NexusCategory,
} from '../types';
import { generateId } from '../../utils/ids';

export interface TimeSnapshot {
  baseNode: SimpleNote;
  stateNode: SimpleNote;
  effectiveYear: number;
  isBaseStateless: boolean; // True if no state was found for the year (returned base as state)
}

export class TimeDimensionService {
  /**
   * Smart lookup to find the "Soul" (Base Node) for a given entity name or alias.
   * This helps prevent creating duplicate nodes when a Base Node already exists.
   */
  static findBaseNode(registry: Record<string, NexusObject>, name: string): SimpleNote | null {
    const normalizedName = name.toLowerCase().trim();

    // 1. Direct ID Match
    if (
      registry[name] &&
      (registry[name] as SimpleNote).time_state?.parent_identity_id === undefined
    ) {
      // Also check deprecated time_data for backward compatibility during migration
      if (!(registry[name] as SimpleNote).time_data?.base_node_id) {
        return registry[name] as SimpleNote;
      }
    }

    const allNotes = Object.values(registry).filter(
      (obj) =>
        obj._type === NexusType.SIMPLE_NOTE ||
        obj._type === NexusType.CONTAINER_NOTE ||
        obj._type === NexusType.STORY_NOTE ||
        (obj as any).is_reified === true,
    ) as SimpleNote[];

    // 2. Exact Title Match (Base Nodes only)
    const exactMatch = allNotes.find(
      (note) =>
        !note.time_state?.parent_identity_id &&
        !note.time_data?.base_node_id &&
        note.title.toLowerCase() === normalizedName,
    );
    if (exactMatch) return exactMatch;

    // 3. Alias Match
    const aliasMatch = allNotes.find(
      (note) =>
        !note.time_state?.parent_identity_id &&
        !note.time_data?.base_node_id &&
        note.aliases?.some((alias) => alias.toLowerCase() === normalizedName),
    );
    if (aliasMatch) return aliasMatch;

    return null;
  }

  /**
   * Retrieves the full history stack for a Base Node, sorted by year, month, day.
   */
  static getTimeStack(registry: Record<string, NexusObject>, baseNodeId: string): SimpleNote[] {
    const baseNode = registry[baseNodeId] as SimpleNote;
    if (!baseNode) return [];

    // Find all nodes that claim this baseNodeId as their parent
    const timeNodes = Object.values(registry).filter((obj) => {
      const note = obj as any;
      return (
        (note._type === NexusType.SIMPLE_NOTE ||
          note._type === NexusType.STORY_NOTE ||
          note.is_reified === true) &&
        (note.time_state?.parent_identity_id === baseNodeId ||
          note.time_data?.base_node_id === baseNodeId)
      );
    }) as SimpleNote[];

    // Sort by year, month, day ascending
    return timeNodes.sort((a, b) => {
      const ay = a.time_state?.effective_date?.year || a.time_data?.year || 0;
      const am = a.time_state?.effective_date?.month || a.time_data?.month || 0;
      const ad = a.time_state?.effective_date?.day || a.time_data?.day || 1; // Default to first of month
      const by = b.time_state?.effective_date?.year || b.time_data?.year || 0;
      const bm = b.time_state?.effective_date?.month || b.time_data?.month || 0;
      const bd = b.time_state?.effective_date?.day || b.time_data?.day || 1;

      if (ay !== by) return ay - by;
      if (am !== bm) return am - bm;
      return ad - bd;
    });
  }

  /**
   * Recursive Timeline Retrieval: Traverses T3 containers to build a high-fidelity history stack.
   * If a Century contains a War, which contains a Battle, this returns a unified chronological list.
   */
  static getRecursiveHistory(
    registry: Record<string, NexusObject>,
    rootNodeId: string,
  ): SimpleNote[] {
    const root = registry[rootNodeId];
    if (!root) return [];

    const history: SimpleNote[] = [];
    const visited = new Set<string>();

    const traverse = (currentId: string) => {
      if (visited.has(currentId)) return;
      visited.add(currentId);

      const node = registry[currentId] as any;
      if (!node) return;

      // Add self if it has temporal data or is a snapshot
      if (node.time_state || node.category_id === NexusCategory.STATE) {
        history.push(node as SimpleNote);
      }

      // Traverse children (Recursion!)
      if (node.children_ids && Array.isArray(node.children_ids)) {
        node.children_ids.forEach((childId: string) => traverse(childId));
      }
    };

    traverse(rootNodeId);

    // Sort the unified history
    return history.sort((a, b) => {
      const ay = a.time_state?.effective_date?.year || 0;
      const am = a.time_state?.effective_date?.month || 0;
      const ad = a.time_state?.effective_date?.day || 1;
      const by = b.time_state?.effective_date?.year || 0;
      const bm = b.time_state?.effective_date?.month || 0;
      const bd = b.time_state?.effective_date?.day || 1;

      if (ay !== by) return ay - by;
      if (am !== bm) return am - bm;
      return ad - bd;
    });
  }

  /**
   * Resolves the "Effective Context" of a node by climbing the Fractal Hierarchy.
   * A Battle inherits the gist/tags of its parent War if they are missing.
   */
  static resolveInheritedContext(
    registry: Record<string, NexusObject>,
    nodeId: string,
  ): Partial<SimpleNote> {
    const node = registry[nodeId] as any;
    if (!node) return {};

    const result: Partial<SimpleNote> = {
      gist: node.gist,
      tags: [...(node.tags || [])],
      prose_content: node.prose_content,
    };

    let parentId = node.parent_container_id || node.time_state?.parent_identity_id;
    while (parentId && registry[parentId]) {
      const parent = registry[parentId] as any;

      // Inherit missing gist
      if (!result.gist && parent.gist) result.gist = parent.gist;

      // Merge tags
      if (parent.tags) {
        result.tags = Array.from(new Set([...(result.tags || []), ...parent.tags]));
      }

      // Continue climbing
      parentId = parent.parent_container_id || parent.time_state?.parent_identity_id;
    }

    return result;
  }

  /**
   * "Sniper Retrieval": Returns the precise state of an entity for a specific year/month/day.
   */
  static getSnapshot(
    registry: Record<string, NexusObject>,
    baseNodeId: string,
    targetYear: number,
    targetMonth: number = 0,
    targetDay: number = 0,
  ): TimeSnapshot | null {
    const baseNode = registry[baseNodeId] as SimpleNote;
    if (!baseNode) return null;

    const stack = this.getTimeStack(registry, baseNodeId);

    // Find the closest node in the past
    const candidateNodes = stack.filter((node) => {
      const ny = node.time_state?.effective_date?.year || node.time_data?.year || 0;
      const nm = node.time_state?.effective_date?.month || node.time_data?.month || 0;
      const nd = node.time_state?.effective_date?.day || node.time_data?.day || 0;

      if (ny < targetYear) return true;
      if (ny > targetYear) return false;
      if (nm < targetMonth) return true;
      if (nm > targetMonth) return false;
      return nd <= targetDay;
    });

    let stateNode: SimpleNote = baseNode;
    let isBaseStateless = true;

    if (candidateNodes.length > 0) {
      stateNode = candidateNodes[candidateNodes.length - 1]; // Last one is the latest due to sort
      isBaseStateless = false;
    }

    return {
      baseNode,
      stateNode,
      effectiveYear:
        stateNode.time_state?.effective_date?.year || stateNode.time_data?.year || targetYear,
      isBaseStateless,
    };
  }

  /**
   * "State Node" Factory: Creates a proper Temporal Anchor State Node.
   * This replaces the old TIME_LINK + Reified Node pattern for simple states.
   */
  static createStateNode(
    baseNode: SimpleNote,
    year: number,
    month: number | undefined,
    day: number | undefined,
    statePayload: Partial<SimpleNote>,
  ): SimpleNote {
    const timeNodeId = generateId();

    const dateStr = [year, month, day].filter((v) => v !== undefined).join('-');
    const { time_data, ...cleanPayload } = statePayload; // Exclude old time_data if passed

    const stateNode: any = {
      ...baseNode, // Inherit base properties
      ...cleanPayload, // Apply overrides
      id: timeNodeId,
      _type: NexusType.SIMPLE_NOTE,
      category_id: NexusCategory.STATE, // Force Category
      title: `${baseNode.title} (${dateStr})`,
      time_state: {
        is_historical_snapshot: true,
        parent_identity_id: baseNode.id,
        effective_date: { year, month, day },
        is_canonical: false,
      },
      // Reset linkage
      link_ids: [],
      // Keep reification context if the BASE was reified, but usually State Nodes are NOT reified links themselves
      // unless we are explicitly versioning a reified link (which we support).
      is_reified: (baseNode as any).is_reified || false,
      created_at: new Date().toISOString(),
      last_modified: new Date().toISOString(),
    };

    // If base was reified, we need to preserve those props so the State Node acts as a Proxy Bridge
    if ((baseNode as any).is_reified) {
      Object.assign(stateNode, {
        source_id: (baseNode as any).source_id,
        target_id: (baseNode as any).target_id,
        verb: (baseNode as any).verb,
        verb_inverse: (baseNode as any).verb_inverse,
      });
    }

    return stateNode;
  }

  /**
   * "Bubbling": Solves the Spaghetti Graph problem.
   * If A -> StateNode(B_2150) -> B,
   * Then A is effectively linked to B.
   * This method returns a set of "Imputed Links" for visualizers.
   */
  static getBubbledLinks(
    registry: Record<string, NexusObject>,
    activeNodes: SimpleNote[], // Nodes currently in focus/simulation
  ): { source: string; target: string; verb: string }[] {
    const bubbledLinks: { source: string; target: string; verb: string }[] = [];
    const activeIds = new Set(activeNodes.map((n) => n.id));

    activeNodes.forEach((node) => {
      // If this node represents a State (Snapshot), check its outgoing links
      if (node.category_id === NexusCategory.STATE && node.time_state?.parent_identity_id) {
        const parentId = node.time_state.parent_identity_id;

        // Only bubble if the PARENT is the one "Active" in the view (Shadow Mode)
        // If the State Node itself is active (Drilled into specific time), we show real links.
        // IF the State Node is HIDDEN (implied), we bubble its links to the parent.
        const isShadowed = !activeIds.has(node.id) && activeIds.has(parentId);

        if (isShadowed) {
          // Let's stick to bubbling logic: If I link to "France (1800)", I am linking to "France".
          // This function mostly helps when we have links *from* the state node.

          node.link_ids.forEach((linkId) => {
            const link = registry[linkId] as any;
            if (!link) return;

            // Resolve Target
            // If target is a State Node, resolve to its Parent
            let targetId = link.target_id === node.id ? link.source_id : link.target_id;
            const targetObj = registry[targetId] as SimpleNote;

            if (
              targetObj?.category_id === NexusCategory.STATE &&
              targetObj.time_state?.parent_identity_id
            ) {
              targetId = targetObj.time_state.parent_identity_id;
            }

            // Create Bubbled Link: Parent -> Target(Resolved)
            bubbledLinks.push({
              source: parentId,
              target: targetId,
              verb: link.verb || 'related',
            });
          });
        }
      }
    });

    return bubbledLinks;
  }
}
