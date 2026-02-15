import { useState, useMemo } from 'react';
import { NexusObject, NexusNote } from '../../../types';
import { useTimeIndex } from './useNexusGraph';

interface UseWikiStateProps {
  registry: Record<string, NexusObject>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export const useWikiState = ({ registry, selectedId, onSelect }: UseWikiStateProps) => {
  const [history, setHistory] = useState<string[]>([]);
  const [activeSnapshotId, setActiveSnapshotId] = useState<string | null>(selectedId);

  // Sync active snapshot with selection (reset when selection changes)
  // We use the "adjusting state when props change" pattern to avoid cascading effects
  const [prevSelectedId, setPrevSelectedId] = useState(selectedId);
  if (selectedId !== prevSelectedId) {
    setPrevSelectedId(selectedId);
    setActiveSnapshotId(selectedId);
  }

  // Data Indexing
  const timeIndex = useTimeIndex(registry);

  const currentObject = useMemo(() => {
    if (!selectedId) return null;
    return registry[selectedId] || null;
  }, [selectedId, registry]);

  // Determine the "Identity Node" (Root) and "Active Node" (Snapshot or Root)
  const { identityNode, activeNode, historyStack } = useMemo(() => {
    if (!currentObject) return { identityNode: null, activeNode: null, historyStack: [] };

    let root: NexusNote;
    let active: NexusNote;

    // Correct casting - assuming Notes for now as Editors primarily work on Notes
    // Links are handled via casting in components if needed, or we might need strict guards later
    const noteObj = currentObject as NexusNote;

    if (noteObj.time_state?.parent_identity_id) {
      // Current selection IS a snapshot
      root = registry[noteObj.time_state.parent_identity_id] as NexusNote;
      active = noteObj;
      // Fallback if root is missing (orphaned snapshot)
      if (!root) root = noteObj;
    } else {
      // Current selection IS the root
      root = noteObj;
      // If we have a local override for activeSnapshotId, use it
      if (activeSnapshotId && activeSnapshotId !== root.id && registry[activeSnapshotId]) {
        active = registry[activeSnapshotId] as NexusNote;
      } else {
        active = root;
      }
    }

    const stack = timeIndex[root.id] || [];
    return { identityNode: root, activeNode: active, historyStack: stack };
  }, [currentObject, registry, timeIndex, activeSnapshotId]);

  // Navigation Handlers
  const handleSelect = (id: string) => {
    if (selectedId) {
      setHistory((prev) => [...prev, selectedId]);
    }
    onSelect(id);
  };

  const handleGoBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory((p) => p.slice(0, -1));
      onSelect(prev);
    } else {
      onSelect('');
    }
  };

  const handleBackToDirectory = () => {
    setHistory([]);
    onSelect('');
  };

  return {
    currentObject,
    identityNode,
    activeNode,
    historyStack,
    activeSnapshotId,
    setActiveSnapshotId,
    handleSelect,
    handleGoBack,
    handleBackToDirectory,
  };
};
