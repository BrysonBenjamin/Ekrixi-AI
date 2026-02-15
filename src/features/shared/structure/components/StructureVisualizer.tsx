import React, { useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';
import { NexusObject, isLink, isContainer, SimpleNote, isReified } from '../../../../types';
import { TreeHUD } from './visualizer/TreeHUD';
import { ResponsiveTree } from './visualizer/ResponsiveTree';
import { TraditionalContextMenu } from './visualizer/TraditionalContextMenu';
import { FloatingContextualMenu } from './visualizer/FloatingContextualMenu';

interface StructureVisualizerProps {
  registry: Record<string, NexusObject>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddChild?: (parentId: string) => void;
  onDelete?: (id: string) => void;
  onDeleteLink?: (id: string) => void;
  onReifyLink?: (id: string) => void;
  onReifyNode?: (id: string) => void;
  onReifyNodeToLink?: (nodeId: string, sourceId: string, targetId: string) => void;
  onInvertLink?: (id: string) => void;
  onInspect?: (id: string) => void;
  /**
   * Called when a node is double-clicked or "drilled into".
   * If not provided, defaults to inspecting/selecting the node.
   */
  onDrilldown?: (id: string) => void;
  onViewModeChange?: (mode: 'STRUCTURE' | 'RELATIONS' | 'INSPECTOR') => void;
  onReparent?: (
    sourceId: string,
    targetId: string,
    oldParentId?: string,
    isReference?: boolean,
  ) => void;
  onMenuOpened?: () => void;
}

export const StructureVisualizer: React.FC<StructureVisualizerProps> = ({
  registry,
  selectedId,
  onSelect,
  onAddChild,
  onDelete,
  onDeleteLink,
  onReifyLink,
  onReifyNode,
  onReifyNodeToLink,
  onInvertLink,
  onInspect,
  onDrilldown,
  onViewModeChange,
  onReparent,
  onMenuOpened,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [orientation, setOrientation] = useState<'HORIZONTAL' | 'VERTICAL'>('HORIZONTAL');

  // Tracks nodes already evaluated for auto-collapse to avoid annoying re-collapsing
  const evaluatedIdsRef = useRef<Set<string>>(new Set());

  // Traditional Context Menu state
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  // Mobile Floating Arc Menu state
  const [floatingMenu, setFloatingMenu] = useState<{ id: string; x: number; y: number } | null>(
    null,
  );

  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const svgElRef = useRef<SVGSVGElement | null>(null);

  // Default Collapse Logic: 5+ children or depth > 3
  useEffect(() => {
    // Fix: Explicitly cast Object.values to NexusObject[] to ensure property 'id' is known
    const allObjects = Object.values(registry) as NexusObject[];
    if (allObjects.length === 0) return;

    const childIds = new Set<string>();
    allObjects.forEach((obj) => {
      if (isContainer(obj)) {
        obj.children_ids.forEach((cid) => childIds.add(cid));
      }
    });

    // Fix: Cast roots result to NexusObject[] to fix inference at line 54
    const roots = allObjects.filter(
      (obj) =>
        (!isLink(obj) || isReified(obj)) &&
        (!childIds.has(obj.id) || (obj as SimpleNote).tags?.includes('__is_root__')) &&
        !(obj as SimpleNote).time_state?.parent_identity_id, // Filter out Time Nodes
    ) as NexusObject[];

    const newCollapsed = new Set(collapsedIds);
    let changed = false;

    const walk = (id: string, depth: number) => {
      // Filter out Time Nodes during walk if encountered (though ideally they aren't walked if not in children)
      // Actually ResponsiveTree follows children_ids. We can't easily block ResponsiveTree from here without
      // altering the registry it sees or modifying ResponsiveTree.
      // But calculating collapsedIds for them is irrelevant if they are hidden.
      // So we just focus on roots here.
      // To strictly hide them in graph, we need to modify ResponsiveTree or filter the children maps there.
      // For now, let's keep the collapse logic consistent.

      if (evaluatedIdsRef.current.has(id)) {
        // Fix: Explicitly cast registry access to handle line 60 and 61 errors
        const node = registry[id] as NexusObject | undefined;
        if (node && isContainer(node)) {
          node.children_ids.forEach((cid) => walk(cid, depth + 1));
        }
        return;
      }

      const node = registry[id] as NexusObject | undefined;
      if (!node) return;

      // Skip Time Nodes logic
      if ((node as SimpleNote).time_state?.parent_identity_id) return;

      evaluatedIdsRef.current.add(id);

      const hasManyChildren = isContainer(node) && node.children_ids.length >= 5;
      const isTooDeep = depth > 3;

      if (hasManyChildren || isTooDeep) {
        newCollapsed.add(id);
        changed = true;
      }

      if (isContainer(node)) {
        node.children_ids.forEach((cid) => walk(cid, depth + 1));
      }
    };

    // Fix: line 94 property 'id' does not exist on type 'unknown'
    roots.forEach((root) => walk(root.id, 1));

    if (changed) {
      queueMicrotask(() => {
        setCollapsedIds(newCollapsed);
      });
    }
  }, [registry, collapsedIds]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const mobile = containerRef.current.clientWidth < 768;
        if (mobile) setOrientation('VERTICAL');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleResetZoom = () => {
    if (svgElRef.current && zoomRef.current && containerRef.current) {
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      const isVertical = orientation === 'VERTICAL';

      const initialX = isVertical ? width / 2 : 200;
      const initialY = isVertical ? height / 2 : height / 2;
      const scale = isVertical ? 0.4 : 0.65;

      const t = d3.zoomIdentity.translate(initialX, initialY).scale(scale);

      d3.select(svgElRef.current).transition().duration(750).call(zoomRef.current.transform, t);
    }
  };

  const toggleOrientation = () => {
    setOrientation((prev) => (prev === 'HORIZONTAL' ? 'VERTICAL' : 'HORIZONTAL'));
  };

  const handleContextMenu = (id: string, x: number, y: number) => {
    setContextMenu({ id, x, y });
    onMenuOpened?.();
  };

  const handleLongPress = (id: string, x: number, y: number) => {
    setFloatingMenu({ id, x, y });
    onMenuOpened?.();
    if (navigator.vibrate) navigator.vibrate(20);
  };

  const contextObject = contextMenu ? registry[contextMenu.id] : null;
  const floatingObject = floatingMenu ? registry[floatingMenu.id] : null;

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative bg-nexus-950 overflow-hidden flex flex-col"
    >
      <TreeHUD
        nodeCount={Object.keys(registry).length}
        orientation={orientation}
        onResetZoom={handleResetZoom}
        onZoomIn={() =>
          svgElRef.current &&
          zoomRef.current &&
          d3.select(svgElRef.current).transition().duration(500).call(zoomRef.current.scaleBy, 1.4)
        }
        onZoomOut={() =>
          svgElRef.current &&
          zoomRef.current &&
          d3.select(svgElRef.current).transition().duration(500).call(zoomRef.current.scaleBy, 0.7)
        }
        onToggleOrientation={toggleOrientation}
      />

      <ResponsiveTree
        registry={registry}
        selectedId={selectedId}
        expandedIds={expandedIds}
        collapsedIds={collapsedIds}
        hoveredId={hoveredId}
        orientation={orientation}
        onSelect={onSelect}
        onToggleExpand={toggleExpand}
        onToggleCollapse={toggleCollapse}
        _onHover={setHoveredId}
        _onViewModeChange={onViewModeChange}
        onContextMenu={handleContextMenu}
        _onLongPress={handleLongPress}
        onDoubleClick={onDrilldown}
        setZoomRef={(z) => (zoomRef.current = z)}
        setSvgRef={(s) => (svgElRef.current = s)}
        onReparent={onReparent}
      />

      {contextObject && contextMenu && (
        <TraditionalContextMenu
          object={contextObject}
          registry={registry}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onInspect={(id) => {
            if (onInspect) onInspect(id);
            else {
              onSelect(id);
              onViewModeChange?.('INSPECTOR');
            }
          }}
          onDrilldown={onDrilldown}
          onAddChild={onAddChild}
          onDelete={(id) => {
            const obj = registry[id];
            if (obj && isLink(obj)) {
              onDeleteLink?.(id);
            } else {
              onDelete?.(id);
            }
          }}
          onReify={onReifyLink}
          onReifyNode={onReifyNode}
          onReifyNodeToLink={onReifyNodeToLink}
          onInvert={onInvertLink}
          onSelectNode={onSelect}
        />
      )}

      {floatingObject && floatingMenu && (
        <FloatingContextualMenu
          object={floatingObject}
          x={floatingMenu.x}
          y={floatingMenu.y}
          onClose={() => setFloatingMenu(null)}
          onInspect={(id) => {
            if (onInspect) onInspect(id);
            else {
              onSelect(id);
              onViewModeChange?.('INSPECTOR');
            }
          }}
          onAddChild={onAddChild}
          onDelete={(id) => {
            const obj = registry[id];
            if (obj && isLink(obj)) {
              onDeleteLink?.(id);
            } else {
              onDelete?.(id);
            }
          }}
          onReify={onReifyLink}
          onInvert={onInvertLink}
        />
      )}
    </div>
  );
};
