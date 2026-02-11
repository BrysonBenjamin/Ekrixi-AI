import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { Link2, X } from 'lucide-react';
import { NexusObject, isContainer, NexusObject as NexusObjectBase } from '../../../types';
import { VisibleNode } from '../DrilldownFeature';
import { DrilldownContextMenu } from './DrilldownContextMenu';
import { GraphIntegrityService } from '../../integrity/GraphIntegrityService';
import { useDrilldownSimulation } from '../hooks/useDrilldownSimulation';
import { DrilldownLink } from './DrilldownLink';
import { DrilldownNodeWrapper } from './DrilldownNodeWrapper';

interface DrilldownCanvasProps {
  registry: Record<string, VisibleNode>;
  fullRegistry: Record<string, NexusObject>;
  onDrilldown: (id: string) => void;
  onInspect: (id: string) => void;
  focusId?: string;
  onDelete?: (id: string) => void;
  onReifyLink?: (id: string) => void;
  onReifyNode?: (id: string) => void;
  onReifyNodeToLink?: (nodeId: string, sourceId: string, targetId: string) => void;
  onEstablishLink?: (sourceId: string, targetId: string, verb: string) => void;
  onReparent?: (sourceId: string, targetId: string, oldParentId?: string) => void;
  integrityFocus?: { linkId: string; path?: string[]; mode: 'CENTER' | 'DRILL' } | null;
}

export const DrilldownCanvas: React.FC<DrilldownCanvasProps> = ({
  registry,
  fullRegistry,
  onDrilldown,
  onInspect,
  focusId,
  onDelete,
  onReifyLink,
  onReifyNode,
  onReifyNodeToLink,
  onEstablishLink,
  onReparent,
  integrityFocus,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<SVGSVGElement>(null);

  const [zoomTransform, setZoomTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null);
  const [lockedId, setLockedId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [linkingSourceId, setLinkingSourceId] = useState<string | null>(null);
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);

  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const integrityMap = useMemo(
    () => GraphIntegrityService.getRegistryIntegrityMap(fullRegistry),
    [fullRegistry],
  );

  const { nodes, links, simulationRef } = useDrilldownSimulation({
    registry,
    fullRegistry,
    focusId,
  });

  useEffect(() => {
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.005, 5])
      .on('zoom', (event) => setZoomTransform(event.transform));
    zoomRef.current = zoom;
    if (canvasRef.current)
      d3.select(canvasRef.current)
        .call(zoom as any)
        .on('dblclick.zoom', null);
  }, []);

  const activeFilterId = lockedId || hoveredId;

  // Node Drag Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    const parent = (Object.values(fullRegistry) as NexusObject[]).find(
      (o) => isContainer(o) && o.children_ids.includes(id),
    );
    e.dataTransfer.setData('application/nexus-parent-id', parent?.id || 'root');
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverNodeId(null);
    const sourceId = e.dataTransfer.getData('text/plain');
    const oldParentId = e.dataTransfer.getData('application/nexus-parent-id');
    if (sourceId && sourceId !== targetId && onReparent) {
      onReparent(sourceId, targetId, oldParentId);
    }
  };

  const handleNodeClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (linkingSourceId) {
      if (linkingSourceId !== id && onEstablishLink)
        onEstablishLink(linkingSourceId, id, 'mentions');
      setLinkingSourceId(null);
    } else {
      setLockedId(lockedId === id ? null : id);
    }
    setContextMenu(null);
  };

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ id, x: e.clientX, y: e.clientY });
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden bg-nexus-950"
    >
      <style>{`
                @keyframes directionalFlow {
                    from { stroke-dashoffset: 60; }
                    to { stroke-dashoffset: 0; }
                }
                .link-path-flow {
                    stroke-dasharray: 20, 10;
                    animation: directionalFlow 1.5s linear infinite;
                }
                .structural-path-flow {
                    stroke-dasharray: 30, 5;
                    animation: directionalFlow 0.8s linear infinite;
                }
            `}</style>

      {linkingSourceId && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 duration-500">
          <div className="px-6 py-3 bg-nexus-accent text-white rounded-full font-display font-black text-[10px] uppercase tracking-[0.4em] shadow-2xl flex items-center gap-4">
            <Link2 size={16} /> Establish Connection Origin:{' '}
            {(registry[linkingSourceId] as any).title}
            <button
              onClick={() => setLinkingSourceId(null)}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
      <svg
        ref={canvasRef}
        className="w-full h-full block"
        onClick={() => {
          setContextMenu(null);
          setLockedId(null);
          setLinkingSourceId(null);
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <g transform={zoomTransform.toString()}>
          <defs>
            <pattern id="nexus-grid-major" width="200" height="200" patternUnits="userSpaceOnUse">
              <path
                d="M 200 0 L 0 0 0 200"
                fill="none"
                stroke="var(--accent-color)"
                strokeWidth="0.5"
                opacity="0.08"
              />
            </pattern>
            <pattern id="nexus-grid-minor" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="var(--ley-color)"
                strokeWidth="0.25"
              />
            </pattern>
            <filter id="sigil-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="15" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <rect x="-40000" y="-40000" width="80000" height="80000" fill="url(#nexus-grid-minor)" />
          <rect x="-40000" y="-40000" width="80000" height="80000" fill="url(#nexus-grid-major)" />

          <g className="links-layer">
            {links.map((link) => (
              <DrilldownLink
                key={link.id}
                link={link}
                registry={registry}
                fullRegistry={fullRegistry}
                focusId={focusId}
                integrityFocus={integrityFocus}
                integrityMap={integrityMap}
                hoveredLinkId={hoveredLinkId}
                activeFilterId={activeFilterId}
                onHover={setHoveredLinkId}
                onContextMenu={handleContextMenu}
              />
            ))}
          </g>

          <g className="nodes-layer">
            {nodes.map((node) => (
              <DrilldownNodeWrapper
                key={node.id}
                node={node}
                fullRegistry={fullRegistry}
                integrityFocus={integrityFocus}
                integrityMap={integrityMap}
                focusId={focusId}
                linkingSourceId={linkingSourceId}
                lockedId={lockedId}
                hoveredId={hoveredId}
                dragOverNodeId={dragOverNodeId}
                zoomScale={zoomTransform.k}
                onHover={setHoveredId}
                onContextMenu={handleContextMenu}
                onDrilldown={onDrilldown}
                onClick={handleNodeClick}
                onDragStart={handleDragStart}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverNodeId(node.id);
                }}
                onDragLeave={() => setDragOverNodeId(null)}
                onDrop={handleDrop}
                onInspect={onInspect}
              />
            ))}
          </g>
        </g>
      </svg>
      {contextMenu &&
        (() => {
          const originalId = contextMenu.id.replace(/-structural-[st]$/, '');
          const object = fullRegistry[originalId];

          if (!object) return null;

          return (
            <DrilldownContextMenu
              object={object}
              registry={fullRegistry}
              x={contextMenu.x}
              y={contextMenu.y}
              onClose={() => setContextMenu(null)}
              onInspect={onInspect}
              onDrilldown={onDrilldown}
              onDelete={onDelete}
              onReify={onReifyLink}
              onReifyNode={onReifyNode}
              onReifyNodeToLink={onReifyNodeToLink}
              onStartLink={(id) => {
                setLinkingSourceId(id);
                setContextMenu(null);
              }}
              onEstablishLink={onEstablishLink}
            />
          );
        })()}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.04)_100%)]" />
    </div>
  );
};
