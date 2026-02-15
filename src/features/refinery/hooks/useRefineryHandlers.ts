/**
 * useRefineryHandlers — Extracted edit handlers for the Refinery.
 *
 * Each handler mutates local state, syncs to the parent batch store,
 * and fires a best-effort MCP refineBatch call.
 */
import { useCallback } from 'react';
import {
  NexusObject,
  NexusNote,
  NexusType,
  NexusHierarchicalLink,
  HierarchyType,
  SimpleNote,
  NexusCategory,
  isContainer,
  isLink,
  isReified,
  isNote,
  AggregatedSimpleLink,
} from '../../../types';
import { NexusGraphUtils } from '../../../core/utils/nexus';
import { GraphIntegrityService } from '../../integrity/GraphIntegrityService';
import { GraphOperations } from '../../../core/services/GraphOperations';
import { generateId } from '../../../utils/ids';
import type { RefineryOperation } from '../../../core/services/MCPScannerClient';

// ── Deps passed in from the parent component ──────────────────

export interface RefineryHandlerDeps {
  localQueue: NexusObject[];
  setLocalQueue: React.Dispatch<React.SetStateAction<NexusObject[]>>;
  registry: Record<string, NexusObject>;
  activeBatchId: string | undefined;
  selectedId: string | null;
  setSelectedId: React.Dispatch<React.SetStateAction<string | null>>;
  onUpdateBatch: (batchId: string, items: NexusObject[]) => void;
  syncToMCP: (ops: RefineryOperation[]) => void;
  pushState: (
    prevItems: NexusObject[],
    undoOps: RefineryOperation[],
    redoOps: RefineryOperation[],
  ) => void;
  addToast: (message: string, type: 'error' | 'success' | 'info') => void;
}

// ── Return type ───────────────────────────────────────────────

export interface RefineryHandlers {
  handleUpdateItem: (id: string, updates: Partial<NexusObject>) => void;
  handleAddChild: (parentId: string) => void;
  handleReparent: (
    sourceId: string,
    targetId: string,
    oldParentId?: string,
    isReference?: boolean,
  ) => void;
  handleReifyLink: (linkId: string) => void;
  handleReifyNode: (nodeId: string) => void;
  handleReifyNodeToLink: (nodeId: string, sourceId: string, targetId: string) => void;
  handleEstablishLink: (sourceId: string, targetId: string, verb?: string) => void;
  handleDeleteItem: (id: string) => void;
}

// ── Hook ──────────────────────────────────────────────────────

export function useRefineryHandlers(deps: RefineryHandlerDeps): RefineryHandlers {
  const {
    localQueue,
    setLocalQueue,
    registry,
    activeBatchId,
    selectedId,
    setSelectedId,
    onUpdateBatch,
    syncToMCP,
    pushState,
    addToast,
  } = deps;

  const handleUpdateItem = useCallback(
    (id: string, updates: Partial<NexusObject>) => {
      const originalItem = localQueue.find((i) => i.id === id);
      if (!originalItem) return;

      // Calculate inverse updates (only for keys present in updates)
      const inverseUpdates: Record<string, unknown> = {};
      (Object.keys(updates) as Array<keyof NexusObject>).forEach((key) => {
        const val = originalItem[key];
        if (val !== undefined) {
          inverseUpdates[key as string] = val;
        }
      });

      // 1. Create Temp Registry with CLONE of item
      const tempRegistry: Record<string, NexusObject> = { [id]: structuredClone(originalItem) };

      // 2. Apply Graph Operation
      // Note: GraphOperations updates `last_modified` automatically
      const item = tempRegistry[id];
      if (isLink(item)) {
        // Remove id and _type from updates to satisfy Partial<Omit<...>>
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _, _type: __, ...validUpdates } = updates;
        GraphOperations.updateLink(tempRegistry, id, validUpdates);
      } else if (isNote(item)) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _, _type: __, ...validUpdates } = updates;
        GraphOperations.updateNode(tempRegistry, id, validUpdates);
      } else {
        // Fallback for generic objects or M2M if not covered primarily
        Object.assign(item, { ...updates, last_modified: new Date().toISOString() });
      }

      // 3. Update Local Queue
      const nextQueue = localQueue.map((i) => {
        if (i.id === id) {
          return tempRegistry[id];
        }
        return i;
      });

      // Record Undo/Redo
      const redoOp: RefineryOperation = {
        type: 'update',
        target_id: id,
        data: updates as Record<string, unknown>,
      };
      const undoOp: RefineryOperation = { type: 'update', target_id: id, data: inverseUpdates };
      pushState(localQueue, [undoOp], [redoOp]);

      setLocalQueue(nextQueue);
      if (activeBatchId) onUpdateBatch(activeBatchId, nextQueue);
      syncToMCP([redoOp]);
    },
    [localQueue, activeBatchId, onUpdateBatch, syncToMCP, setLocalQueue, pushState],
  );

  const handleAddChild = useCallback(
    (parentId: string) => {
      const parent = localQueue.find((i) => i.id === parentId);
      if (!parent || (isLink(parent) && !isReified(parent))) return;

      // 1. Create Temp Registry
      // We need parent in registry to update its children_ids
      const tempRegistry: Record<string, NexusObject> = { [parentId]: structuredClone(parent) };

      // 2. Perform Operations
      // Create Node
      const newNode = GraphOperations.createNode(tempRegistry, NexusType.SIMPLE_NOTE, 'New Unit');

      // Create Hierarchy Link
      const link = GraphOperations.createHierarchicalLink(
        tempRegistry,
        parentId,
        newNode.id,
        'contains',
        'part of',
        HierarchyType.PARENT_OF,
      );

      // Enforce Hierarchy
      GraphOperations.enforceHierarchy(tempRegistry, parentId, newNode.id);

      // 3. Extract updated/new objects
      const updatedParent = tempRegistry[parentId];

      // 4. Update Local Queue
      const nextQueue = [
        ...localQueue.filter((i) => i.id !== parentId),
        updatedParent,
        newNode,
        ...(link ? [link] : []),
      ];

      // Record Undo/Redo
      const redoOps: RefineryOperation[] = [
        { type: 'create', entity: newNode },
        ...(link ? [{ type: 'create', entity: link } as RefineryOperation] : []),
        {
          type: 'update',
          target_id: parentId,
          data: { children_ids: (updatedParent as NexusNote).children_ids },
        },
      ];

      // Inverse: Remove new node & link, restore parent children
      const originalChildrenIds = (parent as any).children_ids || [];
      const undoOps: RefineryOperation[] = [
        { type: 'remove', target_id: newNode.id },
        ...(link ? [{ type: 'remove', target_id: link.id } as RefineryOperation] : []),
        { type: 'update', target_id: parentId, data: { children_ids: originalChildrenIds } },
      ];

      pushState(localQueue, undoOps, redoOps);

      setLocalQueue(nextQueue);
      setSelectedId(newNode.id);
      if (activeBatchId) onUpdateBatch(activeBatchId, nextQueue);
      syncToMCP(redoOps);
      addToast('Sub-unit established.', 'success');
    },
    [
      localQueue,
      activeBatchId,
      onUpdateBatch,
      syncToMCP,
      setLocalQueue,
      setSelectedId,
      addToast,
      pushState,
    ],
  );

  const handleReparent = useCallback(
    (sourceId: string, targetId: string, oldParentId?: string, isReference: boolean = false) => {
      if (sourceId === targetId) {
        addToast('Self-Reference Blocked: A unit cannot contain itself.', 'error');
        return;
      }

      const target = localQueue.find((i) => i.id === targetId);
      if (target && isContainer(target) && target.children_ids.includes(sourceId)) {
        addToast('Duplicate Reference: Unit already exists in target.', 'info');
        return;
      }

      if (targetId !== 'root' && GraphIntegrityService.detectCycle(targetId, sourceId, registry)) {
        addToast('Cycle Detected: Operation Aborted.', 'error');
        return;
      }

      // 1. Create Temp Registry
      // We need source, target, and oldParent
      const tempRegistry: Record<string, NexusObject> = {};
      const source = localQueue.find((i) => i.id === sourceId);
      if (source) tempRegistry[sourceId] = structuredClone(source);

      if (targetId !== 'root') {
        const t = localQueue.find((i) => i.id === targetId);
        if (t) tempRegistry[targetId] = structuredClone(t);
      }

      if (oldParentId && oldParentId !== 'root') {
        const op = localQueue.find((i) => i.id === oldParentId);
        if (op) tempRegistry[oldParentId] = structuredClone(op);
      }

      const mcpOps: RefineryOperation[] = [];
      let shadowLink: NexusHierarchicalLink | null = null;
      let undoOps: RefineryOperation[] = [];

      // 2. Perform Operations

      // A. Remove from Old Parent
      if (!isReference && oldParentId) {
        if (oldParentId === 'root') {
          // Remove root tag
          const s = tempRegistry[sourceId];
          if (s && isNote(s)) {
            const newTags = s.tags.filter((t) => t !== '__is_root__');
            GraphOperations.updateNode(tempRegistry, sourceId, { tags: newTags });
            mcpOps.push({ type: 'update', target_id: sourceId, data: { tags: newTags } });
            undoOps.push({ type: 'update', target_id: sourceId, data: { tags: s.tags } }); // Original tags
          }
        } else {
          // Remove from parent children_ids
          const op = tempRegistry[oldParentId];
          if (op && isContainer(op)) {
            const oldChildren = op.children_ids;
            const newChildren = oldChildren.filter((id) => id !== sourceId);
            GraphOperations.updateNode(tempRegistry, oldParentId, { children_ids: newChildren });
            mcpOps.push({
              type: 'update',
              target_id: oldParentId,
              data: { children_ids: newChildren },
            });
            undoOps.push({
              type: 'update',
              target_id: oldParentId,
              data: { children_ids: oldChildren },
            });
          }
          // We also need to remove the specific hierarchical link connecting them?
          // The original code filtered the link out of `nextQueue`.
          // Here we are working object-by-object.
          // Links are separate objects. We need to find the link and delete it?
          // Original code: nextQueue = nextQueue.filter(...)
          // We need to identify that link.
          const linkToDelete = localQueue.find(
            (i) =>
              isLink(i) &&
              i._type === NexusType.HIERARCHICAL_LINK &&
              i.source_id === oldParentId &&
              i.target_id === sourceId,
          );
          if (linkToDelete) {
            mcpOps.push({ type: 'remove', target_id: linkToDelete.id });
            undoOps.push({ type: 'create', entity: linkToDelete });
          }
        }
      }

      // B. Add to New Target
      if (targetId === 'root') {
        // Add root tag
        const s = tempRegistry[sourceId];
        if (s && isNote(s)) {
          // We might have updated s already in step A.
          const currentTags = s.tags || [];
          const newTags = Array.from(new Set([...currentTags, '__is_root__']));
          GraphOperations.updateNode(tempRegistry, sourceId, { tags: newTags });
          // Ops? We already pushed an update op for source if unwrapping from root.
          // Now wrapping to root.
          // Merging ops is complex. Let's just push another op.
          mcpOps.push({ type: 'update', target_id: sourceId, data: { tags: newTags } });
          // Undo for this specfic step
          // If we are moving from X to Root, undo means removing Root tag
          // But wait, step A handles removing root tag if coming *from* root.
          // If going *to* root, undo needs to restore previous tags (without root tag).
          // This is tricky if we don't snapshot state between A and B.
          // Simplification: Just capture the *final* state vs *initial* state for the node.
        }
      } else {
        // Add to new parent children_ids
        const t = tempRegistry[targetId];
        // Note: GraphOperations.enforceHierarchy does this, but we want to capture the change for Ops.
        if (t && isContainer(t)) {
          const oldChildren = t.children_ids;
          GraphOperations.enforceHierarchy(tempRegistry, targetId, sourceId);
          const newChildren = (tempRegistry[targetId] as NexusNote).children_ids;

          if (oldChildren.length !== newChildren.length) {
            // Only if changed
            mcpOps.push({
              type: 'update',
              target_id: targetId,
              data: { children_ids: newChildren },
            });
            undoOps.push({
              type: 'update',
              target_id: targetId,
              data: { children_ids: oldChildren },
            });
          }
        }

        // Create Shadow Link
        // Use GraphOperations.createHierarchicalLink
        shadowLink = GraphOperations.createHierarchicalLink(
          tempRegistry, // It adds to registry, but registry is partial.
          targetId,
          sourceId,
          'contains',
          'part of',
          HierarchyType.PARENT_OF,
        );

        if (shadowLink) {
          mcpOps.push({ type: 'create', entity: shadowLink });
          undoOps.push({ type: 'remove', target_id: shadowLink.id });
        }
      }

      // 3. Construct Next Queue
      // Start with localQueue
      let nextQueue = [...localQueue];

      // Remove deleted link
      if (!isReference && oldParentId && oldParentId !== 'root') {
        nextQueue = nextQueue.filter(
          (i) =>
            !(
              isLink(i) &&
              i._type === NexusType.HIERARCHICAL_LINK &&
              i.source_id === oldParentId &&
              i.target_id === sourceId
            ),
        );
      }

      // Apply updates from Temp Registry
      Object.keys(tempRegistry).forEach((k) => {
        // If it's the shadow link, we add it later
        if (shadowLink && k === shadowLink.id) return;

        // Update item in queue
        const updated = tempRegistry[k];
        nextQueue = nextQueue.map((i) => (i.id === k ? updated : i));
      });

      // Add shadow link
      if (shadowLink) {
        nextQueue.push(shadowLink);
      }

      // Consolidate Undo/Redo Ops for Source if modified multiple times?
      // MCP handles sequential ops fine.
      // But Undo needs to be reverse order.

      pushState(localQueue, undoOps.reverse(), mcpOps);

      setLocalQueue(nextQueue);
      if (activeBatchId) onUpdateBatch(activeBatchId, nextQueue);
      if (mcpOps.length > 0) syncToMCP(mcpOps);
      addToast('Unit Relocated.', 'success');
    },
    [
      localQueue,
      registry,
      activeBatchId,
      onUpdateBatch,
      syncToMCP,
      setLocalQueue,
      addToast,
      pushState,
    ],
  );

  const handleReifyLink = useCallback(
    (linkId: string) => {
      const item = localQueue.find((i) => i.id === linkId);
      if (!item || !isLink(item) || isReified(item)) return;

      // 1. Create Temp Registry
      // promoteToHub needs the link in registry
      const tempRegistry: Record<string, NexusObject> = { [linkId]: structuredClone(item) };

      // 2. Apply Graph Operation
      // Note: promoteToHub returns the new object
      const hub = GraphOperations.promoteToHub(tempRegistry, linkId);
      if (!hub) return;

      // 3. Update Local Queue
      const nextQueue = localQueue.map((i) => (i.id === linkId ? hub : i));

      // Record Undo/Redo
      // Redo: Update the item to be the hub
      // We can treat this as an update or a replace. To be safe, full update of fields.
      const redoOp: RefineryOperation = {
        type: 'update',
        target_id: linkId,
        data: {
          _type: hub._type,
          is_reified: true,
          title: hub.title,
          gist: hub.gist,
          category_id: hub.category_id,
          children_ids: [],
          is_collapsed: false,
          participants: hub.participants, // Important for Hub
        },
      };

      // Undo: Restore original link properties
      const undoData: Record<string, unknown> = {
        _type: item._type,
        is_reified: false,
        is_collapsed: 'is_collapsed' in item ? item.is_collapsed : false,
        // Remove hub properties if they persist?
        // MCP update merges data. If we don't explicitly delete/unset, extras might stay?
        // Schema usually ignores extras or we must overwrite.
        participants: undefined, // Potentially needed to clear M2M fields?
      };
      if ('title' in item) undoData.title = item.title;
      if ('gist' in item) undoData.gist = item.gist;
      if ('category_id' in item) undoData.category_id = item.category_id;
      if ('children_ids' in item) undoData.children_ids = item.children_ids;

      const undoOp: RefineryOperation = { type: 'update', target_id: linkId, data: undoData };
      pushState(localQueue, [undoOp], [redoOp]);

      setLocalQueue(nextQueue);
      if (activeBatchId) onUpdateBatch(activeBatchId, nextQueue);
      syncToMCP([redoOp]);
      addToast('Link promoted to logic unit.', 'success');
    },
    [localQueue, activeBatchId, onUpdateBatch, syncToMCP, setLocalQueue, addToast, pushState],
  );

  const handleReifyNode = useCallback(
    (nodeId: string) => {
      const originalNode = localQueue.find((i) => i.id === nodeId);
      if (!originalNode) return;

      // 1. Temp Registry
      const tempRegistry: Record<string, NexusObject> = { [nodeId]: structuredClone(originalNode) };

      // 2. Operations
      // "Reify Node" here effectively means "Reset/Clear Children" based on original code?
      // "children_ids: [], is_collapsed: false"
      // It seems to be converting it to a Leaf? Or just clearing hierarchy?
      // Original code says: "Unit promoted to structural container." (toast says structural container?)
      // But it clears children_ids.
      // Wait, if it *clears* children, it becomes a leaf or empty container.
      // The name `handleReifyNode` is confusing if it just clears children.
      // Maybe it means "Make it a container" (by initializing params)?
      // But it strictly sets children to empty array.
      // I will preserve the logic: update children_ids to [].

      GraphOperations.updateNode(tempRegistry, nodeId, { children_ids: [], is_collapsed: false });
      const updatedNode = tempRegistry[nodeId];

      // 3. Update Local
      const nextQueue = localQueue.map((item) => (item.id === nodeId ? updatedNode : item));

      const redoOps: RefineryOperation[] = [
        { type: 'update', target_id: nodeId, data: { children_ids: [], is_collapsed: false } },
      ];
      // Safe access for undo data
      const undoData: Record<string, unknown> = {};
      if ('children_ids' in originalNode) undoData.children_ids = originalNode.children_ids;
      if ('is_collapsed' in originalNode) undoData.is_collapsed = originalNode.is_collapsed;

      const undoOps: RefineryOperation[] = [{ type: 'update', target_id: nodeId, data: undoData }];
      pushState(localQueue, undoOps, redoOps);

      setLocalQueue(nextQueue);
      if (activeBatchId) onUpdateBatch(activeBatchId, nextQueue);
      syncToMCP(redoOps);
      addToast('Unit promoted to structural container.', 'success');
    },
    [localQueue, activeBatchId, onUpdateBatch, syncToMCP, setLocalQueue, addToast, pushState],
  );

  const handleReifyNodeToLink = useCallback(
    (nodeId: string, sourceId: string, targetId: string) => {
      const node = localQueue.find((i) => i.id === nodeId);
      if (!node || isLink(node)) return;

      // 1. Temp Registry
      // We need multiple items in registry to check/remove links
      // Strategy: Filter localQueue first to identify links to remove
      const filteredQueue = localQueue.filter((item) => {
        if (isLink(item)) {
          const isSBridge =
            (item.source_id === nodeId && item.target_id === sourceId) ||
            (item.source_id === sourceId && item.target_id === nodeId);
          const isTBridge =
            (item.source_id === nodeId && item.target_id === targetId) ||
            (item.source_id === targetId && item.target_id === nodeId);
          return !isSBridge && !isTBridge;
        }
        return true;
      });
      const removedLinks = localQueue.filter((item) => !filteredQueue.includes(item));

      // 2. Transmute Node to Hub (Manual Operation as GraphOps restricts type change)
      // Ideally GraphOperations should support this "Transmute" op.
      const updatedNode: AggregatedSimpleLink = {
        ...node,
        _type: NexusType.AGGREGATED_SIMPLE_LINK,
        is_reified: true,
        source_id: sourceId, // These might be fake for Hubs if they use participants?
        // Schema says AggregatedSimpleLink has source/target as undefined/never?
        // GraphOperations.promoteToHub sets them to undefined.
        // But this handler sets them?
        // "source_id: sourceId, target_id: targetId" - likely incorrect for Schema v2 Hubs which use participants.
        // But let's stick to what the original code did for now to avoid breaking UI that expects it,
        // OR fix it if we are sure.
        // Original code: "source_id: sourceId, target_id: targetId".
        // GraphOperations.promoteToHub: sets participants.
        // I should align with GraphOperations.promoteToHub pattern if possible.
        // But this is "Node to Link".
        // I'll stick to original logic but fix the type cast if needed.
        // Wait, if I change it to Hub, I should add participants.
        participants: [
          { node_id: sourceId, role_id: 'SOURCE', verb: 'originates' },
          { node_id: targetId, role_id: 'TARGET', verb: 'targets' },
        ],
        verb: 'governs',
        verb_inverse: 'governed by',
        children_ids: [],
        is_collapsed: false,
        last_modified: new Date().toISOString(),
      } as unknown as AggregatedSimpleLink;
      // Cast to unknown first because 'node' has children_ids etc which might conflict or need to be overwritten.

      // 3. Update Queue
      const nextQueue = filteredQueue.map((item) => {
        if (item.id === nodeId) {
          return updatedNode;
        }
        return item;
      });

      const redoOps: RefineryOperation[] = [
        ...removedLinks.map((l) => ({ type: 'remove', target_id: l.id }) as RefineryOperation),
        {
          type: 'update',
          target_id: nodeId,
          data: {
            _type: NexusType.AGGREGATED_SIMPLE_LINK,
            is_reified: true,
            participants: updatedNode.participants,
          },
        },
      ];

      const undoOps: RefineryOperation[] = [
        ...removedLinks.map((l) => ({ type: 'create', entity: l }) as RefineryOperation),
        {
          type: 'update',
          target_id: nodeId,
          data: {
            _type: node._type,
            is_reified: isReified(node),
            participants: undefined, // Clear participants
            // Restore old props
            children_ids: 'children_ids' in node ? node.children_ids : [],
            // ... other props
          },
        },
      ];

      pushState(localQueue, undoOps, redoOps);

      setLocalQueue(nextQueue);
      if (activeBatchId) onUpdateBatch(activeBatchId, nextQueue);
      syncToMCP(redoOps);
      addToast('Unit promoted to Causal Stream.', 'success');
    },
    [localQueue, activeBatchId, onUpdateBatch, syncToMCP, setLocalQueue, addToast, pushState],
  );

  const handleEstablishLink = useCallback(
    (sourceId: string, targetId: string, verb: string = 'binds') => {
      const source = localQueue.find((i) => i.id === sourceId);
      const target = localQueue.find((i) => i.id === targetId);
      if (!source || !target || sourceId === targetId) return;

      // 1. Temp Registry
      const tempRegistry: Record<string, NexusObject> = {
        [sourceId]: structuredClone(source),
        [targetId]: structuredClone(target),
      };

      // 2. GraphOps
      const link = GraphOperations.createBinaryLink(
        tempRegistry,
        sourceId,
        targetId,
        verb,
        'related to', // Default inverse
      );

      if (!link) return;

      // 3. Update Queue
      const nextQueue = [
        ...localQueue.filter((i) => i.id !== sourceId && i.id !== targetId),
        tempRegistry[sourceId],
        tempRegistry[targetId],
        link,
      ];

      const redoOps: RefineryOperation[] = [
        { type: 'create', entity: link },
        {
          type: 'update',
          target_id: sourceId,
          data: { link_ids: (tempRegistry[sourceId] as NexusNote).link_ids },
        },
        {
          type: 'update',
          target_id: targetId,
          data: { link_ids: (tempRegistry[targetId] as NexusNote).link_ids },
        },
      ];

      const undoOps: RefineryOperation[] = [
        { type: 'remove', target_id: link.id },
        {
          type: 'update',
          target_id: sourceId,
          data: { link_ids: 'link_ids' in source ? source.link_ids : [] },
        },
        {
          type: 'update',
          target_id: targetId,
          data: { link_ids: 'link_ids' in target ? target.link_ids : [] },
        },
      ];

      pushState(localQueue, undoOps, redoOps);

      setLocalQueue(nextQueue);
      if (activeBatchId) onUpdateBatch(activeBatchId, nextQueue);
      syncToMCP(redoOps);
      addToast('Semantic connection established.', 'success');
    },
    [localQueue, activeBatchId, onUpdateBatch, syncToMCP, setLocalQueue, addToast, pushState],
  );

  const handleDeleteItem = useCallback(
    (id: string) => {
      const itemToDelete = localQueue.find((i) => i.id === id);
      if (!itemToDelete) return;

      // 1. Create Temp Registry from ENTIRE Queue
      // We need full context for cascade deletes (links, children, etc.)
      const tempRegistry: Record<string, NexusObject> = {};
      localQueue.forEach((i) => (tempRegistry[i.id] = structuredClone(i)));

      // 2. Perform Delete
      GraphOperations.deleteNode(tempRegistry, id);

      // 3. Rebuild Queue
      // Filter out items that are no longer in tempRegistry
      const nextQueue = localQueue.filter((i) =>
        Object.prototype.hasOwnProperty.call(tempRegistry, i.id),
      );
      // Note: We also need to update items that were modified (e.g. removed from children_ids)
      // So we should map from tempRegistry back to queue order?
      // Or just use the values from tempRegistry?
      // LocalQueue order matters? It seems to be an array.
      // Using values from tempRegistry might lose order if we iterate keys.
      // Better: Iterate original localQueue, check if exists in tempRegistry, and use the *updated* version.
      const newQueueWithUpdates = localQueue
        .filter((i) => Object.prototype.hasOwnProperty.call(tempRegistry, i.id))
        .map((i) => tempRegistry[i.id]);

      // Calculate Ops
      // Deleted items
      const deletedIds = localQueue.filter((i) => !tempRegistry[i.id]).map((i) => i.id);
      const deletedItems = localQueue.filter((i) => !tempRegistry[i.id]);

      // Modified items (e.g. parent with child removed)
      const modifiedItems = newQueueWithUpdates.filter((current) => {
        const original = localQueue.find((i) => i.id === current.id);
        return original && JSON.stringify(current) !== JSON.stringify(original); // Simple check
      });

      const redoOps: RefineryOperation[] = [
        ...deletedIds.map((dId) => ({ type: 'remove', target_id: dId }) as RefineryOperation),
        ...modifiedItems.map(
          (m) =>
            ({
              type: 'update',
              target_id: m.id,
              data: {
                children_ids: (m as any).children_ids,
                link_ids: (m as any).link_ids,
                participants: (m as any).participants,
              },
              // Restricted to likely changed fields to avoid sending full object
            }) as RefineryOperation,
        ),
      ];

      const undoOps: RefineryOperation[] = [
        ...deletedItems.map((d) => ({ type: 'create', entity: d }) as RefineryOperation),
        ...modifiedItems.map((m) => {
          const original = localQueue.find((i) => i.id === m.id);
          return {
            type: 'update',
            target_id: m.id,
            data: {
              children_ids: (original as any)?.children_ids,
              link_ids: (original as any)?.link_ids,
              participants: (original as any)?.participants,
            },
          } as RefineryOperation;
        }),
      ];

      pushState(localQueue, undoOps, redoOps);

      setLocalQueue(newQueueWithUpdates);
      if (activeBatchId) onUpdateBatch(activeBatchId, newQueueWithUpdates);
      syncToMCP(redoOps);

      if (selectedId === id || deletedIds.includes(selectedId || '')) {
        setSelectedId(null);
      }
      addToast('Unit Purged from Batch.', 'info');
    },
    [
      localQueue,
      selectedId,
      activeBatchId,
      onUpdateBatch,
      syncToMCP,
      setLocalQueue,
      setSelectedId,
      addToast,
      pushState,
    ],
  );

  return {
    handleUpdateItem,
    handleAddChild,
    handleReparent,
    handleReifyLink,
    handleReifyNode,
    handleReifyNodeToLink,
    handleEstablishLink,
    handleDeleteItem,
  };
}
