import { useState, useMemo, useCallback, useEffect } from 'react';
import { NexusObject, SimpleNote, SimpleLink, isContainer, NexusType } from '../../../types';
import { TimeDimensionService } from '../../../core/services/TimeDimensionService';

interface UseDrilldownStateProps {
  registry: Record<string, NexusObject>;
  integrityFocus: { linkId: string; path?: string[]; mode: 'CENTER' | 'DRILL' } | null | undefined;
}

export const useDrilldownState = ({ registry, integrityFocus }: UseDrilldownStateProps) => {
  const [navStack, setNavStack] = useState<string[]>([]);
  const [activeTimeOverrides, setActiveTimeOverrides] = useState<Record<string, string>>({}); // BaseId -> TimeNodeId
  const [showAuthorNotes, setShowAuthorNotes] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [isIntegrityOpen, setIsIntegrityOpen] = useState(false);

  const currentContainerId = navStack[navStack.length - 1];
  const currentContainer = currentContainerId ? registry[currentContainerId] : null;

  // Time Dimension Logic
  const timeStack = useMemo(() => {
    if (!currentContainerId) return [];
    const current = registry[currentContainerId] as SimpleNote;
    const baseId = current?.time_data?.base_node_id || currentContainerId;
    return TimeDimensionService.getTimeStack(registry, baseId);
  }, [currentContainerId, registry]);

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
      year: isTimeNode ? activeNode.time_data!.year : null,
      baseId,
      prevNode: prevNode as SimpleNote | null,
      nextNode: nextNode as SimpleNote | null,
      activeNode,
    };
  }, [currentContainer, timeStack, registry, activeTimeOverrides]);

  const handleTimeNav = useCallback(
    (nodeId: string) => {
      if (!nodeId) return;

      const targetNode = registry[nodeId] as SimpleNote;
      if (!targetNode) return;

      const baseId = targetNode.time_data?.base_node_id || targetNode.id;

      setActiveTimeOverrides((prev) => {
        const next = { ...prev };
        if (targetNode.time_data?.base_node_id) {
          next[baseId] = nodeId;
        } else {
          delete next[baseId];
        }
        return next;
      });
    },
    [registry],
  );

  const lookupTimeNav = useCallback(
    (nodeId: string) => {
      const node = registry[nodeId] as any;
      if (!node) return null;

      const isTimeNode = !!node.time_data?.base_node_id;
      const baseId = isTimeNode ? node.time_data.base_node_id : nodeId;

      const activeId = activeTimeOverrides[baseId] || baseId;
      const stack = TimeDimensionService.getTimeStack(registry, baseId);
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
    [registry, activeTimeOverrides, handleTimeNav],
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
