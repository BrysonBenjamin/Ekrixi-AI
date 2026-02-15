import { NexusObject, NexusType, NexusNote, NexusCategory, AggregatedSimpleLink } from '../types';
import { isNote, isReified, isLink } from '../utils/nexus';
import { generateId } from '../../utils/ids';

export interface TimeSnapshot {
  baseNode: NexusNote;
  stateNode: NexusNote;
  effectiveYear: number;
  isBaseStateless: boolean; // True if no state was found for the year (returned base as state)
}

export class TimeDimensionService {
  /**
   * Smart lookup to find the "Soul" (Base Node) for a given entity name or alias.
   * This helps prevent creating duplicate nodes when a Base Node already exists.
   */
  static findBaseNode(registry: Record<string, NexusObject>, name: string): NexusNote | null {
    const normalizedName = name.toLowerCase().trim();

    // 1. Direct ID Match — must not be a snapshot
    if (
      registry[name] &&
      isNote(registry[name]) &&
      !(registry[name] as NexusNote).time_state?.parent_identity_id
    ) {
      return registry[name] as NexusNote;
    }

    const allNotes = Object.values(registry).filter(
      (obj) => isNote(obj) || isReified(obj),
    ) as NexusNote[];

    // 2. Exact Title Match (Base Nodes only — no parent_identity_id)
    const exactMatch = allNotes.find(
      (note) => !note.time_state?.parent_identity_id && note.title.toLowerCase() === normalizedName,
    );
    if (exactMatch) return exactMatch;

    // 3. Alias Match
    const aliasMatch = allNotes.find(
      (note) =>
        !note.time_state?.parent_identity_id &&
        note.aliases?.some((alias) => alias.toLowerCase() === normalizedName),
    );
    if (aliasMatch) return aliasMatch;

    return null;
  }

  /**
   * Retrieves the full history stack for a Base Node, sorted by year, month, day.
   */
  static getTimeStack(registry: Record<string, NexusObject>, baseNodeId: string): NexusNote[] {
    const baseNode = registry[baseNodeId] as NexusNote;
    if (!baseNode) return [];

    // Find all nodes that claim this baseNodeId as their parent
    const timeNodes = Object.values(registry).filter((obj) => {
      return (
        (isNote(obj) || isReified(obj)) &&
        (obj as NexusNote).time_state?.parent_identity_id === baseNodeId
      );
    }) as NexusNote[];

    // Sort by year, month, day ascending
    return timeNodes.sort((a, b) => {
      const ay = a.time_state?.effective_date?.year ?? 0;
      const am = a.time_state?.effective_date?.month ?? 0;
      const ad = a.time_state?.effective_date?.day ?? 1;
      const by = b.time_state?.effective_date?.year ?? 0;
      const bm = b.time_state?.effective_date?.month ?? 0;
      const bd = b.time_state?.effective_date?.day ?? 1;

      if (ay !== by) return ay - by;
      if (am !== bm) return am - bm;
      return ad - bd;
    });
  }

  /**
   * Recursive Timeline Retrieval: Traverses containers to build a high-fidelity history stack.
   * If a Century contains a War, which contains a Battle, this returns a unified chronological list.
   */
  static getRecursiveHistory(
    registry: Record<string, NexusObject>,
    rootNodeId: string,
  ): NexusNote[] {
    const root = registry[rootNodeId];
    if (!root) return [];

    const history: NexusNote[] = [];
    const visited = new Set<string>();

    const traverse = (currentId: string) => {
      if (visited.has(currentId)) return;
      visited.add(currentId);

      const node = registry[currentId] as NexusNote;
      if (!node) return;

      // Add self if it has temporal data or is a snapshot
      if (node.time_state || node.category_id === NexusCategory.STATE) {
        history.push(node);
      }

      // Traverse children (Recursion!)
      if (node.children_ids && Array.isArray(node.children_ids)) {
        node.children_ids.forEach((childId: string) => traverse(childId));
      }
    };

    traverse(rootNodeId);

    // Sort the unified history
    return history.sort((a, b) => {
      const ay = a.time_state?.effective_date?.year ?? 0;
      const am = a.time_state?.effective_date?.month ?? 0;
      const ad = a.time_state?.effective_date?.day ?? 1;
      const by = b.time_state?.effective_date?.year ?? 0;
      const bm = b.time_state?.effective_date?.month ?? 0;
      const bd = b.time_state?.effective_date?.day ?? 1;

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
  ): Partial<NexusNote> {
    const node = registry[nodeId] as NexusNote;
    if (!node) return {};

    const result: Partial<NexusNote> = {
      gist: node.gist,
      tags: [...(node.tags || [])],
      prose_content: node.prose_content,
    };

    let parentId: string | undefined = node.time_state?.parent_identity_id;
    while (parentId && registry[parentId]) {
      const parent = registry[parentId] as NexusNote;

      // Inherit missing gist
      if (!result.gist && parent.gist) result.gist = parent.gist;

      // Merge tags
      if (parent.tags) {
        result.tags = Array.from(new Set([...(result.tags || []), ...parent.tags]));
      }

      // Continue climbing
      parentId = parent.time_state?.parent_identity_id;
    }

    return result;
  }

  /**
   * "Sniper Retrieval": Returns the precise state of an entity for a specific year/month/day.
   * Respects the [effective_date, valid_until) range.
   */
  static getSnapshot(
    registry: Record<string, NexusObject>,
    baseNodeId: string,
    targetYear: number,
    targetMonth: number = 0,
    targetDay: number = 0,
  ): TimeSnapshot | null {
    const baseNode = registry[baseNodeId] as NexusNote;
    if (!baseNode) return null;

    const stack = this.getTimeStack(registry, baseNodeId);
    const target = { year: targetYear, month: targetMonth, day: targetDay };

    // Find all nodes that cover this target date
    const residentNodes = stack.filter((node) => {
      const ts = node.time_state;
      if (!ts?.effective_date) return false;

      // 1. Is target AT or AFTER effective_date?
      const startsAfter = this.compareDates(target, ts.effective_date) >= 0;
      if (!startsAfter) return false;

      // 2. Is target BEFORE valid_until? (If valid_until exists)
      if (ts.valid_until) {
        const endsBefore = this.compareDates(target, ts.valid_until) < 0;
        return endsBefore;
      }

      return true; // Valid forever if no valid_until
    });

    let stateNode: NexusNote = baseNode;
    let isBaseStateless = true;

    if (residentNodes.length > 0) {
      // Use the most specific (latest effective) resident node
      stateNode = residentNodes[residentNodes.length - 1];
      isBaseStateless = false;
    }

    return {
      baseNode,
      stateNode,
      effectiveYear: stateNode.time_state?.effective_date?.year ?? targetYear,
      isBaseStateless,
    };
  }

  /**
   * Internal date comparison helper.
   */
  private static compareDates(
    a: { year: number; month?: number; day?: number },
    b: { year: number; month?: number; day?: number },
  ): number {
    const ay = a.year,
      am = a.month ?? 1,
      ad = a.day ?? 1;
    const by = b.year,
      bm = b.month ?? 1,
      bd = b.day ?? 1;
    if (ay !== by) return ay - by;
    if (am !== bm) return am - bm;
    return ad - bd;
  }

  /**
   * "State Node" Factory: Creates a proper Temporal Anchor State Node.
   */
  static createStateNode(
    baseNode: NexusNote,
    year: number,
    month: number | undefined,
    day: number | undefined,
    statePayload: Partial<NexusNote>,
  ): NexusNote {
    const timeNodeId = generateId();
    const dateStr = [year, month, day].filter((v) => v !== undefined).join('-');

    const stateNode: NexusNote = {
      ...baseNode, // Inherit base properties
      ...statePayload, // Apply overrides
      id: timeNodeId,
      _type: NexusType.SIMPLE_NOTE,
      category_id: NexusCategory.STATE, // Force Category
      title: `${baseNode.title} (${dateStr})`,
      time_state: {
        is_historical_snapshot: true,
        parent_identity_id: baseNode.id,
        effective_date: { year, month, day },
      },
      // Reset linkage
      link_ids: [],
      created_at: new Date().toISOString(),
      last_modified: new Date().toISOString(),
    };

    // If base was reified, preserve link fields so the State Node acts as a Proxy Bridge
    if (isReified(baseNode as NexusObject)) {
      const reified = baseNode as unknown as AggregatedSimpleLink;
      Object.assign(stateNode, {
        is_reified: true,
        source_id: reified.source_id,
        target_id: reified.target_id,
        verb: reified.verb,
        verb_inverse: reified.verb_inverse,
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
    activeNodes: NexusNote[], // Nodes currently in focus/simulation
  ): { source: string; target: string; verb: string }[] {
    const bubbledLinks: { source: string; target: string; verb: string }[] = [];
    const activeIds = new Set(activeNodes.map((n) => n.id));

    activeNodes.forEach((node) => {
      // If this node represents a State (Snapshot), check its outgoing links
      if (node.category_id === NexusCategory.STATE && node.time_state?.parent_identity_id) {
        const parentId = node.time_state.parent_identity_id;

        // Only bubble if the PARENT is the one "Active" in the view (Shadow Mode)
        const isShadowed = !activeIds.has(node.id) && activeIds.has(parentId);

        if (isShadowed) {
          node.link_ids.forEach((linkId) => {
            const link = registry[linkId];
            if (!link || !isLink(link)) return;

            // Resolve Target — if target is a State Node, resolve to its Parent
            let targetId = link.target_id === node.id ? link.source_id : link.target_id;
            const targetObj = registry[targetId as string] as NexusNote | undefined;

            if (
              targetObj?.category_id === NexusCategory.STATE &&
              targetObj.time_state?.parent_identity_id
            ) {
              targetId = targetObj.time_state.parent_identity_id;
            }

            // Create Bubbled Link: Parent -> Target(Resolved)
            bubbledLinks.push({
              source: parentId,
              target: targetId as string,
              verb: (link.verb as string) || 'related',
            });
          });
        }
      }
    });

    return bubbledLinks;
  }
}
