import {
  NexusObject,
  NexusNote,
  NexusLink,
  NexusHierarchicalLink,
  NexusTimeState,
  NexusCategory,
  NexusType,
  ContainmentType,
  Participant,
  isLink,
  isM2M,
  isBinaryLink,
  isNote,
  AggregatedSimpleLink,
  HierarchyType,
  isReified,
  ManifestoBlock,
} from '../../types';
// Note: imports relative to src/core/services/
import { generateId } from '../../utils/ids';

type Registry = Record<string, NexusObject>;

/**
 * Core Graph Operations Service (Phase 6)
 *
 * Implements the "Kernel" (Write), "Primitives" (Read), and "Cortex" (Advanced)
 * operations for the Ekrixi AI Knowledge Nexus.
 *
 * Designed to operate on an in-memory Registry for maximum performance (60fps),
 * serving as the primary logic layer for both Frontend (optimistic) and Backend.
 */
export class GraphOperations {
  // =========================================================================
  // II. Brain Maintenance (The Kernel) - Write Operations
  // =========================================================================

  /**
   * Init a new NexusNote. Sets ID and defaults total_subtree_mass to 0.
   */
  static createNode(
    registry: Registry,
    type: NexusNote['_type'],
    title: string,
    category: NexusCategory = NexusCategory.CONCEPT,
    gist: string = '',
    aliases: string[] = [],
    timeState?: NexusTimeState,
  ): NexusNote {
    const id = generateId();
    const now = new Date().toISOString();
    const newNode: NexusNote = {
      id,
      _type: type,
      title,
      category_id: category,
      prose_content: '',
      gist,
      aliases,
      tags: [],
      link_ids: [],
      children_ids: [],
      internal_weight: 1, // Default weight
      total_subtree_mass: 0,
      is_ghost: false,
      created_at: now,
      last_modified: now,
      ...(timeState ? { time_state: timeState } : {}),
    };

    registry[id] = newNode;
    return newNode;
  }

  /**
   * Cascade Delete. Removes node and cleans up all references.
   */
  static deleteNode(registry: Registry, nodeId: string): void {
    const node = registry[nodeId];
    if (!node) return;

    // 1. Remove from parent's children_ids
    // Optimization: we could iterate all nodes, or assume strict hierarchy.
    // In a flat registry, we might need a reverse index. For now, scan.
    Object.values(registry).forEach((obj) => {
      if (isNote(obj) && obj.children_ids?.includes(nodeId)) {
        obj.children_ids = obj.children_ids.filter((id) => id !== nodeId);
      }
    });

    // 2. Remove all links where this node is source/target
    // And remove from M2M participants
    Object.values(registry).forEach((obj) => {
      if (isLink(obj)) {
        if (isBinaryLink(obj)) {
          if (obj.source_id === nodeId || obj.target_id === nodeId) {
            delete registry[obj.id];
          }
        } else if (isM2M(obj)) {
          // Remove participant
          // Fix: Type guard needed or reliable narrowing.
          // isM2M implies participants exist.
          // If TS complains about 'never', explicit cast or check.
          if ('participants' in obj) {
            // Explicit cast to avoid 'never' or union issues
            (obj as any).participants = (obj as any).participants.filter(
              (p: Participant) => p.node_id !== nodeId,
            );
          }
        }
      }
    });

    // 3. Remove references in link_ids of other nodes (if any logic uses link_ids)
    Object.values(registry).forEach((obj) => {
      if (obj.link_ids?.includes(nodeId)) {
        obj.link_ids = obj.link_ids.filter((id) => id !== nodeId);
      }
    });

    // 4. Delete the node itself
    delete registry[nodeId];
  }

  /**
   * Creates a standard Binary TraitLink. Updates link_ids on both nodes.
   */
  static createBinaryLink(
    registry: Registry,
    sourceId: string,
    targetId: string,
    verb: string,
    verbInverse: string,
    timeState?: NexusTimeState,
  ): NexusLink | null {
    const source = registry[sourceId];
    const target = registry[targetId];
    if (!source || !target) return null;

    const id = generateId();
    const now = new Date().toISOString();

    const link: NexusLink = {
      id,
      _type: NexusType.SIMPLE_LINK,
      source_id: sourceId,
      target_id: targetId,
      verb,
      verb_inverse: verbInverse,
      created_at: now,
      last_modified: now,
      internal_weight: 1, // Default weight
      total_subtree_mass: 0,
      link_ids: [],
      ...(timeState ? { time_state: timeState } : {}),
    };

    registry[id] = link;

    // Update link_ids
    if (!source.link_ids.includes(id)) source.link_ids.push(id);
    if (!target.link_ids.includes(id)) target.link_ids.push(id);

    return link;
  }

  /**
   * Creates a Hierarchical Link (Parent/Child or Time).
   */
  static createHierarchicalLink(
    registry: Registry,
    sourceId: string,
    targetId: string,
    verb: string,
    verbInverse: string,
    hierarchyType: HierarchyType = HierarchyType.PARENT_OF,
    timeState?: NexusTimeState,
  ): NexusHierarchicalLink | null {
    const source = registry[sourceId];
    const target = registry[targetId];
    if (!source || !target) return null;

    const id = generateId();
    const now = new Date().toISOString();

    const link: NexusHierarchicalLink = {
      id,
      _type: NexusType.HIERARCHICAL_LINK,
      source_id: sourceId,
      target_id: targetId,
      verb,
      verb_inverse: verbInverse,
      hierarchy_type: hierarchyType,
      created_at: now,
      last_modified: now,
      internal_weight: 1.0,
      total_subtree_mass: 0,
      link_ids: [],
      ...(timeState && { time_state: timeState }),
    };

    registry[id] = link;

    // Update link_ids
    if (!source.link_ids.includes(id)) source.link_ids.push(id);
    if (!target.link_ids.includes(id)) target.link_ids.push(id);

    return link;
  }

  /**
   * Reification. Converts a Binary Link into a Reified M2M Hub.
   */
  static promoteToHub(registry: Registry, linkId: string): AggregatedSimpleLink | null {
    const link = registry[linkId];
    if (!isBinaryLink(link)) return null; // Already a hub or note

    // Create M2M structure
    const sourceId = link.source_id;
    const targetId = link.target_id;

    // Create new Hub object replacing the standard link
    // We preserve the ID to keep references valid? Or create new?
    // Request implies modifying the graph. Let's mutate the object if possible,
    // or replace it. Type narrowing makes mutation hard. Replace is safer.

    const hub: AggregatedSimpleLink = {
      ...link, // copy basic metadata
      _type: NexusType.AGGREGATED_SIMPLE_LINK,
      is_reified: true,
      global_verb: link.verb, // Use forward verb as global?
      verb: link.verb,
      verb_inverse: link.verb_inverse,
      participants: [
        { node_id: sourceId, role_id: 'SOURCE', verb: 'originates' },
        { node_id: targetId, role_id: 'TARGET', verb: 'targets' },
      ],
      // NexusNote properties required by ReifiedBase
      title: `Hub: ${link.verb}`,
      aliases: [],
      tags: ['reified'],
      category_id: NexusCategory.CONCEPT,
      prose_content: '',
      gist: '',
      internal_weight: 1, // Default
      total_subtree_mass: 0,
      link_ids: [],
      children_ids: [],
      is_ghost: false,
      created_at: link.created_at,
      last_modified: new Date().toISOString(),

      // Clear binary fields
      source_id: undefined as never,
      target_id: undefined as never,
    };

    registry[linkId] = hub;
    return hub;
  }

  /**
   * Adds a node to an existing M2M Hub.
   */
  static addParticipant(
    registry: Registry,
    hubId: string,
    nodeId: string,
    role: string,
    verb: string = 'participates',
  ): void {
    const hub = registry[hubId];
    const node = registry[nodeId];
    if (!hub || !node || !isM2M(hub)) return;

    // Check if already participant
    if (hub.participants.some((p) => p.node_id === nodeId)) return;

    hub.participants.push({
      node_id: nodeId,
      role_id: role,
      verb,
    });

    // Update node's link_ids if not present
    if (!node.link_ids.includes(hubId)) {
      node.link_ids.push(hubId);
    }
  }

  /**
   * Bubble-Up Calculation. Re-sums internal_weight + sum(Children.mass).
   */
  static updateMass(registry: Registry, nodeId: string): void {
    const node = registry[nodeId];
    if (!node) return;

    // Base mass
    let mass = node.internal_weight || 0;

    // Add children mass (need to ensure children are updated first?
    // Usually this requires a bottom-up traversal.
    // This function acts as a single-node update, maybe triggering parent update?)
    if (isNote(node) && node.children_ids) {
      for (const childId of node.children_ids) {
        const child = registry[childId];
        if (child) {
          mass += child.total_subtree_mass;
        }
      }
    }

    node.total_subtree_mass = mass;

    // Propagate up (optional, but "Bubble-Up" implies it)
    // Find parent (inefficient without parent pointer)
    // For now, we assume user calls this on leaf first or we do full re-calc.
    // Optimization: store parent_id on nodes (Schema doesn't strictly enforce it on Note, only on ManifestoBlock)
    // We'll skip auto-propagation to avoid O(N) parent search per call.
  }

  /**
   * Ensures child is in parent.children_ids.
   */
  static enforceHierarchy(registry: Registry, parentId: string, childId: string): void {
    const parent = registry[parentId];
    const child = registry[childId];
    if (!parent || !child || !isNote(parent)) return;

    // Remove from old parent if we want strictly tree?
    // Schema allows multi-parent (graph), but typically hierarchy is strict.
    // We'll just add to new parent.

    if (!parent.children_ids) parent.children_ids = [];
    if (!parent.children_ids.includes(childId)) {
      parent.children_ids.push(childId);
    }
  }

  /**
   * Generic Update for Node properties.
   */
  static updateNode(
    registry: Registry,
    nodeId: string,
    updates: Partial<Omit<NexusNote, 'id' | '_type'>>,
  ): NexusNote | null {
    const node = registry[nodeId];
    if (!node || !isNote(node)) return null;

    Object.assign(node, {
      ...updates,
      last_modified: new Date().toISOString(),
    });

    return node;
  }

  /**
   * Generic Update for Link properties.
   */
  static updateLink(
    registry: Registry,
    linkId: string,
    updates: Partial<Omit<NexusLink, 'id' | '_type'>>,
  ): NexusLink | null {
    const link = registry[linkId];
    if (!link || !isLink(link)) return null;

    Object.assign(link, {
      ...updates,
      last_modified: new Date().toISOString(),
    });

    return link as NexusLink;
  }

  /**
   * Remove a participant from a Hub.
   */
  static removeParticipant(registry: Registry, hubId: string, nodeId: string): void {
    const hub = registry[hubId];
    if (!hub || !isM2M(hub)) return;

    // Cast safely
    if ('participants' in hub) {
      (hub as any).participants = (hub as any).participants.filter(
        (p: Participant) => p.node_id !== nodeId,
      );
    }

    // Remove hub ref from node?
    const node = registry[nodeId];
    if (node && node.link_ids) {
      node.link_ids = node.link_ids.filter((id) => id !== hubId);
    }
  }

  /**
   * Add or Update a Qualifier.
   */
  static setQualifier(
    registry: Registry,
    linkId: string,
    key: string,
    value: string | number | boolean,
  ): void {
    const link = registry[linkId];
    if (!link || !isLink(link)) return;

    // Link types have optional qualifiers
    if (!link.qualifiers) link.qualifiers = {};
    link.qualifiers[key] = value;
    link.last_modified = new Date().toISOString();
  }

  /**
   * Remove a Qualifier.
   */
  static removeQualifier(registry: Registry, linkId: string, key: string): void {
    const link = registry[linkId];
    if (!link || !isLink(link) || !link.qualifiers) return;

    delete link.qualifiers[key];
    link.last_modified = new Date().toISOString();
  }

  // =========================================================================
  // III. Search Operations (The Primitives) - Read Operations
  // =========================================================================

  /**
   * Drill-Down. Traverses time_children. Returns snapshot at T.
   */
  static seekSnapshot(registry: Registry, nodeId: string, timestamp: number): string | null {
    const node = registry[nodeId];
    if (!node || !('time_state' in node) || !node.time_state?.time_children) return null;

    for (const childId of node.time_state.time_children) {
      const child = registry[childId];
      if (child && 'time_state' in child && child.time_state) {
        // Mapping: effective_date -> year/integer for simplicity in this implementation
        // Assuming timestamp is a year for now, per spec usage
        const start = child.time_state.effective_date.year;
        const end = child.time_state.valid_until?.year ?? Infinity;

        if (timestamp >= start && timestamp <= end) {
          return childId;
        }
      }
    }
    return null;
  }

  /**
   * Intersection. Returns all time_children overlapping with [start, end].
   */
  static scanRange(registry: Registry, nodeId: string, start: number, end: number): string[] {
    const node = registry[nodeId];
    if (!node || !('time_state' in node) || !node.time_state?.time_children) return [];

    return node.time_state.time_children.filter((childId) => {
      const child = registry[childId];
      if (!child || !('time_state' in child) || !child.time_state) return false;

      const childStart = child.time_state.effective_date.year;
      const childEnd = child.time_state.valid_until?.year ?? Infinity;

      // Overlap logic: max(start, childStart) <= min(end, childEnd)
      return Math.max(start, childStart) <= Math.min(end, childEnd);
    });
  }

  /**
   * Hierarchical Ascent. Returns the parent_id.
   * Note: Since schema uses children_ids, this is O(N) scan unless we cache properties.
   */
  static ascend(registry: Registry, nodeId: string): string | null {
    // Optimization: Check for cached parent_id if using new schema properties
    // Or scan registry.
    for (const id in registry) {
      const obj = registry[id];
      if (isNote(obj) && obj.children_ids?.includes(nodeId)) {
        return id;
      }
    }
    return null;
  }

  /**
   * Temporal Ascent ("The Cartographer").
   * Returns the parent_id of a node at a specific timestamp.
   * Prioritizes NexusHierarchicalLinks with time_state.
   * Fallbacks to static `children_ids` containment if no temporal link found.
   */
  static getHierarchyRoot(registry: Registry, nodeId: string, timestamp?: number): string | null {
    const node = registry[nodeId];
    if (!node) return null;

    // 1. Check Hierarchical Links (Dynamic/Temporal Hierarchy)
    if (node.link_ids) {
      for (const linkId of node.link_ids) {
        const link = registry[linkId];
        if (
          link &&
          link._type === NexusType.HIERARCHICAL_LINK &&
          (link as NexusHierarchicalLink).target_id === nodeId &&
          (link as NexusHierarchicalLink).hierarchy_type === HierarchyType.PARENT_OF
        ) {
          const hLink = link as NexusHierarchicalLink;

          // If timestamp provided, check validity
          if (timestamp !== undefined) {
            if (hLink.time_state) {
              const start = hLink.time_state.effective_date.year;
              const end = hLink.time_state.valid_until?.year ?? Infinity;
              if (timestamp >= start && timestamp <= end) {
                return hLink.source_id;
              }
            } else {
              // Timeless link = always valid?
              // Or valid only if no conflicting time-bound links?
              // Let's assume valid.
              return hLink.source_id;
            }
          } else {
            // No timestamp = return first parent found (or current?)
            return hLink.source_id;
          }
        }
      }
    }

    // 2. Fallback to Static Hierarchy (children_ids on potential parents)
    // Only if no temporal parent found.
    return GraphOperations.ascend(registry, nodeId);
  }

  /**
   * Hierarchical Descent. Returns children_ids.
   */
  static descend(registry: Registry, nodeId: string): string[] {
    const node = registry[nodeId];
    if (isNote(node)) {
      return node.children_ids || [];
    }
    return [];
  }

  /**
   * Lateral: Returns connected nodes via standard source/target links.
   */
  static traverseBinary(registry: Registry, nodeId: string, verbFilter?: string): string[] {
    const node = registry[nodeId];
    if (!node) return [];

    const results: string[] = [];

    // Check link_ids, or scan if link_ids unreliable
    const links = node.link_ids?.map((id) => registry[id]).filter((l) => l && isBinaryLink(l));

    if (links) {
      links.forEach((link) => {
        if (isBinaryLink(link)) {
          if (verbFilter && link.verb !== verbFilter) return;

          if (link.source_id === nodeId) results.push(link.target_id);
          else if (link.target_id === nodeId) results.push(link.source_id);
        }
      });
    }
    return results;
  }

  /**
   * Lateral: Returns all M2M Hubs where this node is a participant.
   */
  static expandHubs(registry: Registry, nodeId: string): NexusObject[] {
    const node = registry[nodeId];
    if (!node) return [];

    // Filter node.link_ids for hubs
    const results: NexusObject[] = [];
    // Use manual iteration or guarded filter.
    // filter(isM2M) might work if isM2M is a predicate.
    if (node.link_ids) {
      for (const id of node.link_ids) {
        const link = registry[id];
        if (link && isM2M(link)) {
          if (link.participants.some((p) => p.node_id === nodeId)) {
            results.push(link);
          }
        }
      }
    }
    return results;
  }

  /**
   * Lateral: Returns hub participants.
   */
  static getHubContext(registry: Registry, hubId: string): Participant[] {
    const hub = registry[hubId];
    if (hub && isM2M(hub)) {
      return hub.participants;
    }
    return [];
  }

  // =========================================================================
  // IV. Advanced Search Operations (The Cortex)
  // =========================================================================

  /**
   * Expansion. "Tell me more".
   * BFS gathering: children + time states + binary neighbors + hub memberships.
   */
  static expandContext(registry: Registry, nodeId: string, depth: number = 1): string[] {
    const visited = new Set<string>();
    const queue = [nodeId];
    visited.add(nodeId);

    // Simplistic depth 1 implementation for "World"
    const result = new Set<string>();

    const node = registry[nodeId];
    if (!node) return [];

    // 1. Children
    if (isNote(node)) {
      node.children_ids?.forEach((child) => result.add(child));
    }

    // 2. Time States
    if ('time_state' in node && node.time_state?.time_children) {
      node.time_state.time_children.forEach((t) => result.add(t));
    }

    // 3. Binary Neighbors
    GraphOperations.traverseBinary(registry, nodeId).forEach((n) => result.add(n));

    // 4. Hubs (add hub ID itself?)
    GraphOperations.expandHubs(registry, nodeId).forEach((h) => result.add(h.id));

    return Array.from(result);
  }

  /**
   * Causal Tracing. Role-based influence finding.
   */
  static traceInfluence(
    registry: Registry,
    targetNodeId: string,
  ): { agentId: string; hubId: string; weight: number }[] {
    const hubs = GraphOperations.expandHubs(registry, targetNodeId);

    // Filter for hubs where node is PASSIVE (Example logic)
    // We assume Role IDs like "VICTIM", "TARGET", "RECEIVER" are passive.
    const PASSIVE_ROLES = ['VICTIM', 'TARGET', 'RECEIVER', 'MEMBER'];
    const ACTIVE_ROLES = ['AGGRESSOR', 'SOURCE', 'LEADER', 'CAUSE'];

    const influencers: { agentId: string; hubId: string; weight: number }[] = [];

    hubs.forEach((hubItem) => {
      if (!isM2M(hubItem)) return;
      // Cast to access participants safely
      const hub = hubItem as any;

      const myRole = hub.participants.find((p: Participant) => p.node_id === targetNodeId)?.role_id;
      if (myRole && PASSIVE_ROLES.includes(myRole)) {
        // Find active participants
        hub.participants.forEach((p: Participant) => {
          if (ACTIVE_ROLES.includes(p.role_id)) {
            influencers.push({
              agentId: p.node_id,
              hubId: hub.id,
              weight: hub.internal_weight,
            });
          }
        });
      }
    });

    return influencers.sort((a, b) => b.weight - a.weight);
  }

  /**
   * Complex Filtering. Multi-pass sieve.
   */
  static filterGraph(
    registry: Registry,
    criteria: {
      entities?: string[]; // IDs or Titles? IDs for strictness.
      timeRange?: { start: number; end: number };
      mustContainVerb?: string;
      minMass?: number;
    },
  ): string[] {
    let candidates = Object.keys(registry);

    // Sieve 1: Mass
    if (criteria.minMass !== undefined) {
      candidates = candidates.filter((id) => {
        const node = registry[id];
        return node && node.total_subtree_mass >= (criteria.minMass || 0);
      });
    }

    // Sieve 2: Time Range
    // Scan time states of nodes.
    if (criteria.timeRange) {
      const { start, end } = criteria.timeRange;
      candidates = candidates.filter((id) => {
        // scanRange logic inline or helper?
        // Node is valid if it OR its time_children overlap.
        const node = registry[id];
        if (!node) return false;

        // Check node itself? Nodes don't have time ranges directly usually, their time states do?
        // Spec says: "scanRange(Country A..." -> Isolates warp snapshot.
        // So we probably want nodes that EXIST in that range.
        // For simplicity: if node has time_state children overlapping, OR if node is timeless?
        // Let's use scanRange helper.
        const overlapping = GraphOperations.scanRange(registry, id, start, end);
        return overlapping.length > 0;
      });
    }

    // Sieve 3: Lateral (Verb)
    if (criteria.mustContainVerb) {
      candidates = candidates.filter((id) => {
        const binary = GraphOperations.traverseBinary(registry, id, criteria.mustContainVerb);
        // Check if any link has this verb? traverseBinary filters by verb.
        // If returns > 0, then yes.
        return binary.length > 0;
      });
    }

    // Sieve 4: Entities (RAG Clues)
    // "Find Country A and Region B IDs" -> implies input is IDs.
    // If input is titles, we need search. Assuming IDs.
    // Logic: Keep candidates that are connected to these entities?
    // Or just keep the entities themselves?
    // Spec says: "Find Country A... Sieve 3 Check descend(Region B)..."
    // This implies a graph traversal from these roots.
    // "Candidates" usually means "Result Set".
    // If criteria.entities is provided, maybe we start with them+neighbors instead of All?

    if (criteria.entities && criteria.entities.length > 0) {
      // Intersection of Candidates with (Entities + Neighbors)
      const vicinity = new Set<string>();
      criteria.entities.forEach((e) => {
        vicinity.add(e);
        GraphOperations.expandContext(registry, e, 1).forEach((n) => vicinity.add(n));
      });

      candidates = candidates.filter((id) => vicinity.has(id));
    }

    return candidates;
  }

  /**
   * Common Ground Search.
   */
  static findIntersection(registry: Registry, nodeA: string, nodeB: string): string | null {
    // 1. Expand Contexts
    const contextA = new Set(GraphOperations.expandContext(registry, nodeA, 1));
    const contextB = new Set(GraphOperations.expandContext(registry, nodeB, 1));

    // 2. Intersection
    for (const id of contextA) {
      if (contextB.has(id)) return id;
    }

    // 3. Ascend Check (Share a parent?)
    const parentA = GraphOperations.ascend(registry, nodeA);
    const parentB = GraphOperations.ascend(registry, nodeB);

    if (parentA && parentB && parentA === parentB) return parentA;
    if (parentA && contextB.has(parentA)) return parentA;
    if (parentB && contextA.has(parentB)) return parentB;

    return null;
  }
}
