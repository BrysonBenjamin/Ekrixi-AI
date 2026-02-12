import { NexusObject, NexusType, SimpleNote, NexusTimeData, TimeLink } from '../types';
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
    if (registry[name] && (registry[name] as SimpleNote).time_data?.base_node_id === undefined) {
      return registry[name] as SimpleNote;
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
        !note.time_data?.base_node_id && // Must be a Base Node
        note.title.toLowerCase() === normalizedName,
    );
    if (exactMatch) return exactMatch;

    // 3. Alias Match
    const aliasMatch = allNotes.find(
      (note) =>
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
        note.time_data?.base_node_id === baseNodeId
      );
    }) as SimpleNote[];

    // Sort by year, month, day ascending
    return timeNodes.sort((a, b) => {
      const ay = a.time_data?.year || 0;
      const am = a.time_data?.month || 0;
      const ad = a.time_data?.day || 0;
      const by = b.time_data?.year || 0;
      const bm = b.time_data?.month || 0;
      const bd = b.time_data?.day || 0;

      if (ay !== by) return ay - by;
      if (am !== bm) return am - bm;
      return ad - bd;
    });
  }

  /**
   * "Sniper Retrieval": Returns the precise state of an entity for a specific year/month/day.
   * Logic: Finds the Time Node with the largest date <= requested date.
   * If no such node exists (e.g., date is before birth), returns the Base Node itself.
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
      const ny = node.time_data?.year || 0;
      const nm = node.time_data?.month || 0;
      const nd = node.time_data?.day || 0;

      if (ny < targetYear) return true;
      if (ny > targetYear) return false;
      if (nm < targetMonth) return true;
      if (nm > targetMonth) return false;
      return nd <= targetDay;
    });

    // If we have candidates, pick the one with the latest date (closest to target)
    let stateNode: SimpleNote = baseNode;
    let isBaseStateless = true;

    if (candidateNodes.length > 0) {
      stateNode = candidateNodes[candidateNodes.length - 1]; // Last one is the latest due to sort
      isBaseStateless = false;
    }

    return {
      baseNode,
      stateNode,
      effectiveYear: stateNode.time_data?.year || targetYear, // fallback to target if base
      isBaseStateless,
    };
  }

  /**
   * Creates a new Time Node (Skin) linked to the Base Node (Soul).
   * Does NOT mutate the registry directly, but returns the new objects to be added.
   * The consumer (Processor/Factory) is responsible for committing to the registry.
   */
  static createTimeState(
    baseNode: SimpleNote,
    year: number,
    month: number | undefined,
    day: number | undefined,
    statePayload: Partial<SimpleNote>,
  ): { timeNode: SimpleNote; timeLink: TimeLink } {
    const timeNodeId = generateId();

    const isReifiedLink = (baseNode as any).source_id && (baseNode as any).target_id;
    const dateStr = [year, month, day].filter((v) => v !== undefined).join('-');

    const timeNode: SimpleNote = {
      ...baseNode, // Inherit base properties initially
      ...statePayload, // Override with specific state data
      id: timeNodeId,
      _type: isReifiedLink ? baseNode._type : NexusType.SIMPLE_NOTE,
      title: `${baseNode.title} (${dateStr})`, // Default title, can be renamed
      time_data: {
        year: year,
        month,
        day,
        base_node_id: baseNode.id,
        ...(statePayload.time_data || {}),
      },
      // Reset purely structural/mechanical fields that shouldn't be cloned 1:1 if they exist
      link_ids: [],
      // children_ids: [], // Time nodes are SimpleNotes, not Containers, so they don't have children_ids by default
      created_at: new Date().toISOString(),
      last_modified: new Date().toISOString(),
      // Preserve Reified Link properties if applicable
      ...(isReifiedLink
        ? {
            source_id: (baseNode as any).source_id,
            target_id: (baseNode as any).target_id,
            verb: (baseNode as any).verb,
            verb_inverse: (baseNode as any).verb_inverse,
            is_reified: true,
          }
        : {}),
    };

    const timeLink: TimeLink = {
      _type: 'TIME_LINK',
      id: generateId(),
      source_id: baseNode.id,
      target_id: timeNodeId,
      year: year,
      month,
      day,
      verb: 'has_state',
      verb_inverse: 'state_of',
      hierarchy_type: 'PARENT_OF' as any, // Leveraging existing hierarchy type for compatibility if needed
      internal_weight: 1,
      total_subtree_mass: 0,
      created_at: new Date().toISOString(),
      last_modified: new Date().toISOString(),
      link_ids: [],
      is_reified: true,
    } as any;

    return { timeNode, timeLink };
  }
}
