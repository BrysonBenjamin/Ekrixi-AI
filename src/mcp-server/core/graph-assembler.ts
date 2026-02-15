// ============================================================
// MCP Server — Graph Assembler
// Constructs v2-only NexusObjects from extraction data.
// ============================================================

import type {
  NexusNote,
  NexusHierarchicalLink,
  NexusLink,
  NexusObject,
  NexusTimeState,
  AggregatedSimpleLink,
  Participant,
} from '../../core/types/entities';
import { NexusType, NexusCategory, HierarchyType } from '../../core/types/enums';

// ============================================================
// ID Generation (Node.js compatible)
// ============================================================

import { generateId } from '../../utils/ids';

import { GraphOperations } from '../../core/services/GraphOperations';
import type { Registry } from '../../core/types/entities';

// ============================================================
// Factory Functions — v2 Schema Only
// ============================================================

export interface CreateNoteOptions {
  title: string;
  type?: NexusType.SIMPLE_NOTE | NexusType.AUTHOR_NOTE | NexusType.STORY_NOTE;
  category?: NexusCategory;
  gist?: string;
  prose_content?: string;
  aliases?: string[];
  tags?: string[];
  children_ids?: string[];
  time_state?: NexusTimeState;
}

export function createNote(opts: CreateNoteOptions): NexusNote {
  const tempRegistry: Registry = {};
  const note = GraphOperations.createNode(
    tempRegistry,
    opts.type ?? NexusType.SIMPLE_NOTE,
    opts.title,
    opts.category || NexusCategory.CONCEPT,
    opts.gist,
    opts.aliases,
    opts.time_state,
  );

  // Apply extras that createNode might not take as arg or takes differently
  // GraphOperations.createNode(registry, type, title, category, gist, aliases?, time_state?)
  // It doesn't take prose_content, tags, children_ids as args directly in the simplified signature?
  // Let's check GraphOperations.createNode signature.
  // Spec says: createNode(registry, type, title, category, gist = '', aliases = [], timeState?)
  // So we need to update the node for other fields.

  // Note: createNode adds to registry.
  // We update it.
  GraphOperations.updateNode(tempRegistry, note.id, {
    prose_content: opts.prose_content,
    tags: opts.tags,
    children_ids: opts.children_ids,
    aliases: opts.aliases, // Passed to createNode? Let's verify signature first.
  });

  return tempRegistry[note.id] as NexusNote;
}

export interface CreateLinkOptions {
  source_id: string;
  target_id: string;
  verb: string;
  verb_inverse?: string;
  time_state?: NexusTimeState;
}

export function createSimpleLink(opts: CreateLinkOptions): NexusLink {
  const tempRegistry: Registry = {
    [opts.source_id]: { id: opts.source_id, link_ids: [] } as any,
    [opts.target_id]: { id: opts.target_id, link_ids: [] } as any,
  };
  // createBinaryLink(registry, sourceId, targetId, verb, verbInverse, timeState?)
  const link = GraphOperations.createBinaryLink(
    tempRegistry,
    opts.source_id,
    opts.target_id,
    opts.verb,
    opts.verb_inverse,
    opts.time_state,
  );

  if (!link) throw new Error('Failed to create link via GraphOperations');
  return link;
}

export function createHierarchicalLink(
  source_id: string,
  target_id: string,
  verb: string = 'contains',
  verb_inverse: string = 'part of',
  time_state?: NexusTimeState,
): NexusHierarchicalLink {
  const tempRegistry: Registry = {
    [source_id]: { id: source_id, link_ids: [] } as any,
    [target_id]: { id: target_id, link_ids: [] } as any,
  };
  // createHierarchicalLink(registry, sourceId, targetId, verb, verbInverse, hierarchyType?)
  const link = GraphOperations.createHierarchicalLink(
    tempRegistry,
    source_id,
    target_id,
    verb,
    verb_inverse,
    HierarchyType.PARENT_OF,
    time_state,
  );

  if (!link) throw new Error('Failed to create hierarchical link via GraphOperations');
  return link;
}

export interface CreateM2MOptions {
  title: string;
  global_verb: string;
  participants: { node_id: string; role_id: string; verb?: string }[];
  time_state?: NexusTimeState;
}

export function createM2MHub(opts: CreateM2MOptions): AggregatedSimpleLink {
  const tempRegistry: Registry = {};
  // First create a representative node (hub)
  // We can use createNode or just direct promote if we had a link.
  // GraphOperations.promoteToHub works on an existing BINARY link.
  // If we want to create from scratch, we might need a dedicated factory in GraphOperations or just assemble it here.

  // For simplicity, let's create a "Ghost" node first or just manually assemble the hub.
  // Looking at GraphOperations.ts, promoteToHub is the primary way.
  // Let's create a binary link between p0 and p1, then promote.
  if (opts.participants.length < 2) throw new Error('M2M Hub requires at least 2 participants');

  const p1 = opts.participants[0];
  const p2 = opts.participants[1];

  const link = createSimpleLink({
    source_id: p1.node_id,
    target_id: p2.node_id,
    verb: opts.global_verb,
    time_state: opts.time_state,
  });

  const reg: Registry = { [link.id]: link };
  // We must add the participant nodes to the temporary registry so GraphOperations.addParticipant
  // can find them and update their link_ids (even if they are just dummies here).
  for (const p of opts.participants) {
    reg[p.node_id] = { id: p.node_id, link_ids: [] } as any;
  }

  const hub = GraphOperations.promoteToHub(reg, link.id);
  if (!hub) throw new Error('Failed to promote link to hub');

  // Update hub title and global verb
  hub.title = opts.title;
  hub.global_verb = opts.global_verb;

  // Add remaining participants
  for (let i = 2; i < opts.participants.length; i++) {
    const p = opts.participants[i];
    GraphOperations.addParticipant(reg, hub.id, p.node_id, p.role_id, p.verb);
  }

  // Update roles for the first two as well
  hub.participants[0].role_id = p1.role_id;
  hub.participants[0].verb = p1.verb || opts.global_verb;
  hub.participants[1].role_id = p2.role_id;
  hub.participants[1].verb = p2.verb || opts.global_verb;

  return hub;
}

// ============================================================
// Link ID Wiring
// ============================================================

/**
 * Given a flat list of NexusObjects, compute link_ids for every node.
 * Each node gets the IDs of all links that reference it as source or target.
 */
export function wireLinkIds(objects: NexusObject[]): NexusObject[] {
  const linkMap = new Map<string, string[]>();

  // Collect link references
  for (const obj of objects) {
    if ('source_id' in obj && 'target_id' in obj) {
      const link = obj as NexusLink | NexusHierarchicalLink;
      const addRef = (nodeId: string) => {
        const existing = linkMap.get(nodeId) ?? [];
        existing.push(link.id);
        linkMap.set(nodeId, existing);
      };
      addRef(link.source_id);
      addRef(link.target_id);
    }
  }

  // Wire them in
  return objects.map((obj) => {
    const refs = linkMap.get(obj.id);
    if (refs) {
      return { ...obj, link_ids: Array.from(new Set([...obj.link_ids, ...refs])) };
    }
    return obj;
  });
}
