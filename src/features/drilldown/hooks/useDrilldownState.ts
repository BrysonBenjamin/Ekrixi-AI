import { useState, useMemo, useCallback, useEffect } from 'react';
import type { NexusObject, NexusNote, NexusLink } from '../../../types';

import {
  buildTimeStackMap,
  resolveActiveOverrides,
  getParentIdentityId,
  getEffectiveDate,
  isHistoricalSnapshot,
  type SimDate,
} from '../../../core/utils/nexus-accessors';

interface UseDrilldownStateProps {
  registry: Record<string, NexusObject>;
  integrityFocus: { linkId: string; path?: string[]; mode: 'CENTER' | 'DRILL' } | null | undefined;
}

export const useDrilldownState = ({ registry, integrityFocus }: UseDrilldownStateProps) => {
  const [navStack, setNavStack] = useState<string[]>([]);
  const [simulatedDate, setSimulatedDate] = useState<SimDate>({
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

  // Build time stack map using schema v2 time_state.parent_identity_id
  const baseToTimeNodesMap = useMemo(() => buildTimeStackMap(registry), [registry]);

  // Derive activeTimeOverrides using optimized accessor
  const activeTimeOverrides = useMemo(
    () => resolveActiveOverrides(baseToTimeNodesMap, simulatedDate),
    [baseToTimeNodesMap, simulatedDate],
  );

  // Time Dimension Logic: stack for current container
  const timeStack = useMemo(() => {
    if (!currentContainerId) return [];
    const current = registry[currentContainerId] as NexusNote;
    const baseId = getParentIdentityId(current) || currentContainerId;
    return baseToTimeNodesMap[baseId] || [];
  }, [currentContainerId, baseToTimeNodesMap, registry]);

  // Time info for footer display
  const timeInfo = useMemo(() => {
    if (!currentContainer) return null;

    const activeId = activeTimeOverrides[currentContainer.id] || currentContainer.id;
    const activeNode = registry[activeId] as NexusNote;

    const isTimeNode = isHistoricalSnapshot(activeNode);
    const baseId = isTimeNode
      ? (getParentIdentityId(activeNode) ?? currentContainer.id)
      : currentContainer.id;

    const currentIndex = timeStack.findIndex((t) => t.id === activeId);

    // Nav Logic: prev/next in the time stack
    const prevNode =
      currentIndex > 0 ? timeStack[currentIndex - 1] : currentIndex === 0 ? registry[baseId] : null;

    const nextNode =
      currentIndex < timeStack.length - 1 && currentIndex !== -1
        ? timeStack[currentIndex + 1]
        : currentIndex === -1 && timeStack.length > 0
          ? timeStack[0]
          : null;

    const effectiveDate = getEffectiveDate(activeNode);

    return {
      isTimeNode,
      year: effectiveDate?.year ?? simulatedDate.year,
      month: effectiveDate?.month ?? simulatedDate.month,
      day: effectiveDate?.day ?? simulatedDate.day,
      baseId,
      prevNode: prevNode as NexusNote | null,
      nextNode: nextNode as NexusNote | null,
      activeNode,
    };
  }, [currentContainer, timeStack, registry, activeTimeOverrides, simulatedDate]);

  // Navigate to a specific time node by reading its effective_date
  const handleTimeNav = useCallback(
    (nodeId: string) => {
      if (!nodeId) return;

      const targetNode = registry[nodeId];
      if (!targetNode) return;

      const effectiveDate = getEffectiveDate(targetNode);
      if (effectiveDate) {
        setSimulatedDate({
          year: effectiveDate.year,
          month: effectiveDate.month ?? 1,
          day: effectiveDate.day ?? 1,
        });
      } else {
        // Reset to "Blueprint" perspective (low year avoids all overrides)
        setSimulatedDate({ year: 0, month: 1, day: 1 });
      }
    },
    [registry],
  );

  // Lookup time navigation prev/next for a given node
  const lookupTimeNav = useCallback(
    (nodeId: string) => {
      const node = registry[nodeId];
      if (!node) return null;

      const isTimeNode = isHistoricalSnapshot(node);
      const baseId = isTimeNode ? (getParentIdentityId(node) ?? nodeId) : nodeId;

      const activeId = activeTimeOverrides[baseId] || baseId;
      const stack = baseToTimeNodesMap[baseId] || [];
      if (stack.length === 0) return null;

      const idx = stack.findIndex((n) => n.id === activeId);
      let prevId: string | undefined;
      let nextId: string | undefined;

      if (idx === -1) {
        // We are at base, next is first snapshot
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

  // Drilldown into a node — resolve to base identity if it's a snapshot
  const handleDrilldown = useCallback(
    (id: string) => {
      setNavStack((prev) => {
        const node = registry[id];
        const targetId = getParentIdentityId(node) || id;

        if (prev.includes(targetId)) {
          const idx = prev.indexOf(targetId);
          return prev.slice(0, idx + 1);
        }
        return [...prev, targetId];
      });
    },
    [registry],
  );

  // Auto-drill on integrity focus
  useEffect(() => {
    if (integrityFocus && integrityFocus.mode === 'DRILL' && registry[integrityFocus.linkId]) {
      const link = registry[integrityFocus.linkId];
      const endpoints = 'source_id' in link ? (link as NexusLink).source_id : null;
      if (endpoints) {
        queueMicrotask(() => {
          setNavStack([endpoints]);
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
