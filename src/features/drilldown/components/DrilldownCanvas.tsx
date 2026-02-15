import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { Link2, X } from 'lucide-react';
import { NexusObject, isContainer, NexusNote } from '../../../types';
import { VisibleNode } from '../hooks/useDrilldownRegistry';
import { DrilldownContextMenu } from './DrilldownContextMenu';
import { GraphIntegrityService } from '../../integrity/GraphIntegrityService';
import { useDrilldownSimulation } from '../hooks/useDrilldownSimulation';
import { DrilldownLink } from './DrilldownLink';
import { DrilldownNodeWrapper } from './DrilldownNodeWrapper';
import { RegistryIndexes } from '../hooks/useRegistryIndexes';

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
  onEstablishLink?: (
    sourceId: string,
    targetId: string,
    verb: string,
    useTimeAnchor?: boolean,
    sourceTemporalId?: string,
    targetTemporalId?: string,
  ) => void;
  onManifestSnapshot?: (nodeId: string, year: number, month?: number, day?: number) => void;
  // onReparent?: (sourceId: string, targetId: string, oldParentId?: string) => void; // Unused
  integrityFocus?: { linkId: string; path?: string[]; mode: 'CENTER' | 'DRILL' } | null;
  getTimeNavigation?: (id: string) => {
    nextId?: string;
    prevId?: string;
    onNext?: () => void;
    onPrev?: () => void;
  } | null;
  simulatedDate?: { year: number; month: number; day: number };
  indexes: RegistryIndexes;
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

  onManifestSnapshot,
  integrityFocus,
  getTimeNavigation,
  simulatedDate,
  indexes,
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

  const { nodes, links } = useDrilldownSimulation({
    registry,
    fullRegistry,
    focusId,
    simulatedDate,
    indexes,
  });

  useEffect(() => {
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.005, 5])
      .on('zoom', (event) => setZoomTransform(event.transform));
    zoomRef.current = zoom;
    if (canvasRef.current) d3.select(canvasRef.current).call(zoom).on('dblclick.zoom', null);
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
    if (sourceId && sourceId !== targetId) {
      // onReparent intentionally removed for V2 refactor
      console.warn('Reparenting temporarily disabled in Drilldown V2');
    }
  };

  const handleNodeClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (linkingSourceId) {
      if (linkingSourceId !== id && onEstablishLink) {
        const sourceTemporalId = registry[linkingSourceId]?.activeTemporalId;
        const targetTemporalId = registry[id]?.activeTemporalId;
        onEstablishLink(linkingSourceId, id, 'mentions', true, sourceTemporalId, targetTemporalId);
      }
      setLinkingSourceId(null);
    } else {
      setLockedId(lockedId === id ? null : id);
    }
    setContextMenu(null);
  };

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    // Context Menu Smarts:
    // If we right-clicked a link, we need to find the "Best" link ID if there are overlapping ones.
    // The visual link ID might be specific, but let's check if there's a better candidate in the simulation based on time.

    // 1. Identify if 'id' is a link
    const clickedLink = links.find((l) => l.id === id);
    let selectedId = id;

    if (clickedLink && simulatedDate) {
      // Find all links active between these two nodes
      const overlappingLinks = links.filter(
        (l) =>
          (l.source as any).id === (clickedLink.source as any).id &&
          (l.target as any).id === (clickedLink.target as any).id,
      );

      if (overlappingLinks.length > 1) {
        // Logic: Default to the closest one to the current year rounded down
        const currentYear = simulatedDate.year;

        const bestLink = overlappingLinks.reduce((best, current) => {
          const bestObj = fullRegistry[best.id];
          const currentObj = fullRegistry[current.id];

          const bestStart = (bestObj as any)?.time_state?.effective_date?.year || -Infinity;
          const currentStart = (currentObj as any)?.time_state?.effective_date?.year || -Infinity;

          // We want max start date that is <= currentYear
          const bestDiff = currentYear - bestStart;
          const currentDiff = currentYear - currentStart;

          if (currentDiff < 0) return best; // Current is in future, ignore
          if (bestDiff < 0) return current; // Best was active in future, current is valid now

          return currentDiff < bestDiff ? current : best;
        });

        if (bestLink) selectedId = bestLink.id;
      }
    }

    setContextMenu({ id: selectedId, x: e.clientX, y: e.clientY });
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
            {(registry[linkingSourceId] as NexusNote).title}
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
            <pattern id="nexus-grid-major" width="1000" height="1000" patternUnits="userSpaceOnUse">
              <path
                d="M 1000 0 L 0 0 0 1000"
                fill="none"
                stroke="var(--accent-color)"
                strokeWidth="2"
                opacity="0.1"
              />
            </pattern>
            <pattern id="nexus-grid-minor" width="200" height="200" patternUnits="userSpaceOnUse">
              <path d="M 200 0 L 0 0 0 200" fill="none" stroke="var(--ley-color)" strokeWidth="1" />
            </pattern>
            <filter id="sigil-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="15" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <marker
              id="arrow-head"
              viewBox="0 -5 10 10"
              refX="28" // Push arrow back a bit from node center
              refY="0"
              markerWidth="8"
              markerHeight="8"
              orient="auto"
            >
              <path d="M0,-5L10,0L0,5" fill="var(--accent-color)" opacity="0.8" />
            </marker>
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
                timeNavigation={getTimeNavigation?.(node.id)}
                indexes={indexes}
              />
            ))}
          </g>
        </g>
      </svg>
      {contextMenu &&
        (() => {
          const originalId = contextMenu.id.replace(/-structural-[st]$/, '');
          const baseObj = fullRegistry[originalId];
          const activeId = registry[originalId]?.activeTemporalId || originalId;
          const object = fullRegistry[activeId] || baseObj;

          if (!object) return null;

          return (
            <DrilldownContextMenu
              object={object}
              registry={registry as any}
              x={contextMenu.x}
              y={contextMenu.y}
              onClose={() => setContextMenu(null)}
              onInspect={onInspect}
              onDrilldown={onDrilldown}
              onDelete={onDelete}
              onReify={onReifyLink}
              onReifyNode={onReifyNode}
              onReifyNodeToLink={onReifyNodeToLink}
              onStartLink={setLinkingSourceId}
              onEstablishLink={onEstablishLink}
              // onReparent={onReparent}
              onManifestSnapshot={onManifestSnapshot}
              simulatedYear={simulatedDate?.year}
            />
          );
        })()}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.04)_100%)]" />
    </div>
  );
};
