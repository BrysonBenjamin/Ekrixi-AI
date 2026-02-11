import React, { useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';
import { NexusObject, isLink } from '../../../types';
import { TreeHUD } from '../../structure/components/visualizer/TreeHUD';
import { ResponsiveTree } from './visualizer/ResponsiveTree';
import { TraditionalContextMenu } from '../../structure/components/visualizer/TraditionalContextMenu';

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
  onViewModeChange?: (mode: 'STRUCTURE' | 'RELATIONS' | 'INSPECTOR' | 'EXPLORER') => void;
  onDrilldown?: (id: string) => void;
  onReparent?: (
    sourceId: string,
    targetId: string,
    oldParentId?: string,
    isReference?: boolean,
  ) => void;
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
  onViewModeChange,
  onDrilldown,
  onReparent,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [orientation, setOrientation] = useState<'HORIZONTAL' | 'VERTICAL'>('HORIZONTAL');

  // Traditional Context Menu state
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const svgElRef = useRef<SVGSVGElement | null>(null);

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
  };

  const contextObject = contextMenu ? registry[contextMenu.id] : null;

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
        hoveredId={hoveredId}
        orientation={orientation}
        onSelect={onSelect}
        onToggleExpand={toggleExpand}
        onHover={setHoveredId}
        onViewModeChange={onViewModeChange}
        onContextMenu={handleContextMenu}
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
            onSelect(id);
            onViewModeChange?.('INSPECTOR');
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
    </div>
  );
};
