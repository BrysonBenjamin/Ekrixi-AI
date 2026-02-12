import { useState, useMemo, useCallback, useEffect } from 'react';
import { NexusObject, SimpleNote, SimpleLink, NexusType } from '../../../types';

interface UseDrilldownStateProps {
  registry: Record<string, NexusObject>;
  integrityFocus: { linkId: string; path?: string[]; mode: 'CENTER' | 'DRILL' } | null | undefined;
}

export const useDrilldownState = ({ registry, integrityFocus }: UseDrilldownStateProps) => {
  const [navStack, setNavStack] = useState<string[]>([]);
  const [simulatedDate, setSimulatedDate] = useState<{ year: number; month: number; day: number }>({
    year: 2026,
    month: 1,
    day: 1,
  });
  const [timelineBounds, setTimelineBounds] = useState<{ startYear: number; endYear: number }>({
    startYear: 1900,
    endYear: 2100,
  });
  const [showAuthorNotes, setShowAuthorNotes] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [isIntegrityOpen, setIsIntegrityOpen] = useState(false);

  const currentContainerId = navStack[navStack.length - 1];
  const currentContainer = currentContainerId ? registry[currentContainerId] : null;

  // Optimization: Pre-calculate time stack map to avoid O(N^2) lookup
  const baseToTimeNodesMap = useMemo(() => {
    const map: Record<string, SimpleNote[]> = {};
    Object.values(registry).forEach((obj) => {
      const note = obj as SimpleNote;
      const baseId = note.time_data?.base_node_id;
      if (
        baseId &&
        (note._type === NexusType.SIMPLE_NOTE ||
          note._type === NexusType.STORY_NOTE ||
          note._type === NexusType.CONTAINER_NOTE ||
          note._type === NexusType.AGGREGATED_SEMANTIC_LINK ||
          note._type === NexusType.AGGREGATED_HIERARCHICAL_LINK)
      ) {
        if (!map[baseId]) map[baseId] = [];
        map[baseId].push(note);
      }
    });

    // Sort each stack once
    Object.keys(map).forEach((baseId) => {
      map[baseId].sort((a, b) => {
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
    });
    return map;
  }, [registry]);

  // Derive activeTimeOverrides using optimized map
  const activeTimeOverrides = useMemo(() => {
    const overrides: Record<string, string> = {};
    Object.keys(baseToTimeNodesMap).forEach((baseId) => {
      const stack = baseToTimeNodesMap[baseId];
      // Find snapshot logic (inline to avoid extra lookups)
      const candidateNodes = stack.filter((node) => {
        const ny = node.time_data?.year || 0;
        const nm = node.time_data?.month || 0;
        const nd = node.time_data?.day || 0;
        if (ny < simulatedDate.year) return true;
        if (ny > simulatedDate.year) return false;
        if (nm < simulatedDate.month) return true;
        if (nm > simulatedDate.month) return false;
        return nd <= simulatedDate.day;
      });

      if (candidateNodes.length > 0) {
        overrides[baseId] = candidateNodes[candidateNodes.length - 1].id;
      }
    });
    return overrides;
  }, [baseToTimeNodesMap, simulatedDate]);

  // Time Dimension Logic
  const timeStack = useMemo(() => {
    if (!currentContainerId) return [];
    const current = registry[currentContainerId] as SimpleNote;
    const baseId = current?.time_data?.base_node_id || currentContainerId;
    return baseToTimeNodesMap[baseId] || [];
  }, [currentContainerId, baseToTimeNodesMap, registry]);

  const timeInfo = useMemo(() => {
    if (!currentContainer) return null;

    const activeId = activeTimeOverrides[currentContainer.id] || currentContainer.id;
    const activeNode = registry[activeId] as SimpleNote;

    const isTimeNode = !!activeNode?.time_data?.base_node_id;
    const baseId = isTimeNode ? activeNode.time_data!.base_node_id : currentContainer.id;

    const currentIndex = timeStack.findIndex((t) => t.id === activeId);

    // Nav Logic
    const prevNode =
      currentIndex > 0 ? timeStack[currentIndex - 1] : currentIndex === 0 ? registry[baseId] : null;

    const nextNode =
      currentIndex < timeStack.length - 1 && currentIndex !== -1
        ? timeStack[currentIndex + 1]
        : currentIndex === -1 && timeStack.length > 0
          ? timeStack[0]
          : null;

    return {
      isTimeNode,
      year: isTimeNode ? activeNode.time_data!.year : simulatedDate.year,
      month: isTimeNode ? activeNode.time_data!.month : simulatedDate.month,
      day: isTimeNode ? activeNode.time_data!.day : simulatedDate.day,
      baseId,
      prevNode: prevNode as SimpleNote | null,
      nextNode: nextNode as SimpleNote | null,
      activeNode,
    };
  }, [currentContainer, timeStack, registry, activeTimeOverrides, simulatedDate]);

  const handleTimeNav = useCallback(
    (nodeId: string) => {
      if (!nodeId) return;

      const targetNode = registry[nodeId] as SimpleNote;
      if (!targetNode) return;

      if (targetNode && targetNode.time_data) {
        setSimulatedDate({
          year: targetNode.time_data.year,
          month: targetNode.time_data.month || 1,
          day: targetNode.time_data.day || 1,
        });
      } else {
        // Reset to "Blueprint" perspective (low year avoids all overrides)
        setSimulatedDate({ year: 0, month: 1, day: 1 });
      }
    },
    [registry],
  );

  const lookupTimeNav = useCallback(
    (nodeId: string) => {
      const node = registry[nodeId] as SimpleNote;
      if (!node) return null;

      const isTimeNode = !!node.time_data?.base_node_id;
      const baseId = isTimeNode ? node.time_data.base_node_id : nodeId;

      const activeId = activeTimeOverrides[baseId] || baseId;
      const stack = baseToTimeNodesMap[baseId] || [];
      if (stack.length === 0) return null;

      const idx = stack.findIndex((n) => n.id === activeId);
      let prevId: string | undefined;
      let nextId: string | undefined;

      if (idx === -1) {
        // We are at base, next is first skin
        nextId = stack[0].id;
      } else {
        if (idx === 0)
          prevId = baseId; // Back to base
        else prevId = stack[idx - 1].id;

        if (idx < stack.length - 1) nextId = stack[idx + 1].id;
      }

      if (!prevId && !nextId) return null;

      return {
        prevId,
        nextId,
        onPrev: () => prevId && handleTimeNav(prevId),
        onNext: () => nextId && handleTimeNav(nextId),
      };
    },
    [registry, activeTimeOverrides, baseToTimeNodesMap, handleTimeNav],
  );

  const handleDrilldown = useCallback(
    (id: string) => {
      setNavStack((prev) => {
        const node = registry[id] as SimpleNote;
        const targetId = node?.time_data?.base_node_id || id;

        if (prev.includes(targetId)) {
          const idx = prev.indexOf(targetId);
          return prev.slice(0, idx + 1);
        }
        return [...prev, targetId];
      });
    },
    [registry],
  );

  useEffect(() => {
    if (integrityFocus && integrityFocus.mode === 'DRILL' && registry[integrityFocus.linkId]) {
      const link = registry[integrityFocus.linkId] as SimpleLink;
      if (link.source_id) {
        queueMicrotask(() => {
          setNavStack([link.source_id]);
        });
      }
    }
  }, [integrityFocus, registry]);

  return {
    navStack,
    setNavStack,
    simulatedDate,
    setSimulatedDate,
    timelineBounds,
    setTimelineBounds,
    activeTimeOverrides,
    showAuthorNotes,
    setShowAuthorNotes,
    showInspector,
    setShowInspector,
    selectedId,
    setSelectedId,
    isIntegrityOpen,
    setIsIntegrityOpen,
    currentContainerId,
    currentContainer,
    timeInfo,
    handleTimeNav,
    lookupTimeNav,
    handleDrilldown,
  };
};
