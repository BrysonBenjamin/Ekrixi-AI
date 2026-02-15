import { NexusObject, NexusNote, NexusType, HierarchyType } from '../../../types';
import { GraphOperations } from '../../../core/services/GraphOperations';
import { TimeDimensionService } from '../../../core/services/TimeDimensionService';

interface UseWikiActionsProps {
  currentObject: NexusObject | null;
  identityNode: NexusNote | null; // For snapshots
  onAddObject?: (obj: NexusObject) => void;
  onUpdateObject: (id: string, updates: Partial<NexusObject>) => void;
  setActiveSnapshotId: (id: string) => void;
  registry: Record<string, NexusObject>;
}

export const useWikiActions = ({
  currentObject,
  identityNode,
  onAddObject,
  onUpdateObject,
  setActiveSnapshotId,
  registry,
}: UseWikiActionsProps) => {
  const handleAddChild = () => {
    if (!currentObject || !onAddObject || !registry) return;

    // 1. Create new node using centralized service
    const child = GraphOperations.createNode(registry, NexusType.SIMPLE_NOTE, 'Untitled Child');

    // 2. Create hierarchical link
    const link = GraphOperations.createHierarchicalLink(
      registry,
      currentObject.id,
      child.id,
      'contains',
      'is contained by',
      HierarchyType.PARENT_OF,
    );

    // 3. Enforce hierarchy (update parents/children arrays)
    GraphOperations.enforceHierarchy(registry, currentObject.id, child.id);

    // 4. Persist changes
    // Since GraphOperations mutates the registry in-place, we read back the modified objects
    // and send them to the store/persistence layer.
    onAddObject(child);
    if (link) onAddObject(link);

    // Update parent (currentObject) with new link/child refs
    const updatedParent = registry[currentObject.id];
    if (updatedParent) onUpdateObject(updatedParent.id, updatedParent);
  };

  const handleCreateSnapshot = () => {
    if (!identityNode || !onAddObject) return;
    const year = prompt('Enter Year for Snapshot (AD):');
    if (!year || isNaN(parseInt(year))) return;

    const snapshot = TimeDimensionService.createStateNode(
      identityNode,
      parseInt(year),
      undefined,
      undefined,
      { prose_content: '' },
    );

    onAddObject(snapshot);
    setActiveSnapshotId(snapshot.id);
  };

  const handleReifyLink = (linkId: string) => {
    if (!registry || !onAddObject || !onUpdateObject) return;

    const hub = GraphOperations.promoteToHub(registry, linkId);
    if (hub) {
      // Update the link (which is now a node-like object)
      onUpdateObject(hub.id, hub);
      // We might need to refresh the view or selection?
      console.log('Reified Link:', hub);
    }
  };

  return {
    handleAddChild,
    handleCreateSnapshot,
    handleReifyLink,
  };
};
