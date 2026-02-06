import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { Link2, X } from 'lucide-react';
import { NexusObject, isLink, isReified, NexusType, isContainer } from '../../../types';
import { DrillNode } from './DrillNode';
import { VisibleNode } from '../DrilldownFeature';
import { DrilldownContextMenu } from './DrilldownContextMenu';
import { GraphIntegrityService } from '../../integrity/GraphIntegrityService';

interface SimulationNode extends d3.SimulationNodeDatum {
  id: string;
  object: VisibleNode;
  x?: number;
  y?: number;
}

interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
  id: string;
  source: string | number | SimulationNode;
  target: string | number | SimulationNode;
  verb: string;
  verbInverse?: string;
  isReified: boolean;
  isStructuralLine?: boolean;
  type: NexusType;
  originalSourceId?: string;
  originalTargetId?: string;
}

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

  const [nodes, setNodes] = useState<SimulationNode[]>([]);
  const [links, setLinks] = useState<SimulationLink[]>([]);
  const [zoomTransform, setZoomTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null);
  const [lockedId, setLockedId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [linkingSourceId, setLinkingSourceId] = useState<string | null>(null);
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);

  const positionMap = useRef<Map<string, { x: number; y: number }>>(new Map());
  const simulationRef = useRef<d3.Simulation<SimulationNode, SimulationLink> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const integrityMap = useMemo(
    () => GraphIntegrityService.getRegistryIntegrityMap(fullRegistry),
    [fullRegistry],
  );

  const simData = useMemo(() => {
    const activeNodes: SimulationNode[] = (Object.values(registry) as VisibleNode[]).map((obj) => ({
      id: obj.id,
      object: obj,
    }));

    const activeLinks: SimulationLink[] = [];
    // ... existing links logic ...
    (Object.values(fullRegistry) as NexusObject[]).forEach((obj) => {
      if (!isLink(obj)) return;
      const sId = (obj as any).source_id;
      const tId = (obj as any).target_id;

      if (isReified(obj) && registry[obj.id] && registry[sId] && registry[tId]) {
        activeLinks.push({
          id: `${obj.id}-structural-s`,
          source: sId,
          target: obj.id,
          verb: obj.verb,
          isReified: true,
          isStructuralLine: true,
          type: obj._type as NexusType,
        });
        activeLinks.push({
          id: `${obj.id}-structural-t`,
          source: obj.id,
          target: tId,
          verb: obj.verb,
          isReified: true,
          isStructuralLine: true,
          type: obj._type as NexusType,
        });
      } else if (registry[sId] && registry[tId]) {
        activeLinks.push({
          id: obj.id,
          source: sId,
          target: tId,
          verb: (obj as any).verb || 'bound to',
          verbInverse: (obj as any).verb_inverse || 'part of',
          isReified: false,
          isStructuralLine: false,
          type: obj._type as NexusType,
          originalSourceId: sId,
          originalTargetId: tId,
        });
      }
    });

    return { nodes: activeNodes, links: activeLinks };
  }, [registry, fullRegistry]);

  useEffect(() => {
    if (!simData.nodes.length) {
      queueMicrotask(() => {
        setNodes([]);
        setLinks([]);
      });
      return;
    }

    // Initialize positions from ref safely inside effect
    simData.nodes.forEach((node, idx) => {
      const prevPos = positionMap.current.get(node.id);
      if (prevPos) {
        node.x = prevPos.x;
        node.y = prevPos.y;
      } else {
        node.x = ((idx * 100) % 1200) - 600;
        node.y = ((idx * 100 * 0.7) % 1200) - 600;
      }
    });

    if (simulationRef.current) simulationRef.current.stop();

    const simulation = d3
      .forceSimulation<SimulationNode>(simData.nodes)
      .force(
        'link',
        d3
          .forceLink<SimulationNode, SimulationLink>(simData.links)
          .id((d) => d.id)
          .distance((d) => (d.isStructuralLine ? 400 : 650))
          .strength((d) => (d.isStructuralLine ? 1.0 : 0.6)),
      )
      .force('charge', d3.forceManyBody().strength(-45000))
      .force('collide', d3.forceCollide().radius(400).iterations(4))
      .force(
        'radial',
        d3
          .forceRadial<SimulationNode>(
            (d) => {
              if (d.id === focusId) return 0;
              const absDepth = Math.abs(d.object.depth);
              return d.object.pathType === 'ancestor' ? absDepth * 600 : absDepth * 900;
            },
            0,
            0,
          )
          .strength(1.2),
      )
      .force(
        'centering',
        d3.forceX().strength((d) => (d.id === focusId ? 0.6 : 0.05)),
      )
      .force(
        'centering-y',
        d3.forceY().strength((d) => (d.id === focusId ? 0.6 : 0.05)),
      );

    simulation.alpha(1).alphaDecay(0.02).restart();
    simulationRef.current = simulation;

    simulation.on('tick', () => {
      simData.nodes.forEach((node) => {
        if (node.x !== undefined && node.y !== undefined) {
          positionMap.current.set(node.id, { x: node.x, y: node.y });
        }
      });
      setNodes([...simData.nodes]);
      setLinks([...simData.links]);
    });

    return () => simulation.stop();
  }, [simData, focusId]);

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
            {links.map((link: SimulationLink) => {
              const sourceNode = link.source as SimulationNode;
              const targetNode = link.target as SimulationNode;
              if (
                sourceNode.x === undefined ||
                sourceNode.y === undefined ||
                targetNode.x === undefined ||
                targetNode.y === undefined ||
                isNaN(sourceNode.x)
              )
                return null;

              const isAnomalyFocus = integrityFocus?.linkId === link.id;
              const isPartOfAnomalyPath =
                integrityFocus?.path &&
                integrityFocus.path.includes(sourceNode.id) &&
                integrityFocus.path.includes(targetNode.id);
              const sourcePath = registry[sourceNode.id]?.pathType;
              const targetPath = registry[targetNode.id]?.pathType;
              const isSourceFocus = sourceNode.id === focusId;
              const isTargetFocus = targetNode.id === focusId;

              let visualSource = sourceNode;
              let visualTarget = targetNode;
              let displayVerb = link.verb;
              let isUpstream =
                targetPath === 'ancestor' || (sourcePath === 'ancestor' && isTargetFocus);
              let isDownstream =
                (isSourceFocus || sourcePath === 'descendant') && targetPath === 'descendant';

              if (isTargetFocus && sourcePath === 'ancestor') {
                visualSource = targetNode;
                visualTarget = sourceNode;
                displayVerb = link.verbInverse || link.verb;
              } else if (isSourceFocus && targetPath === 'ancestor') {
                visualSource = sourceNode;
                visualTarget = targetNode;
                displayVerb = link.verbInverse || link.verb;
              } else if (isTargetFocus && sourcePath === 'descendant') {
                visualSource = targetNode;
                visualTarget = sourceNode;
                displayVerb = link.verb;
              }

              const conflict = integrityMap[link.id]?.status || 'APPROVED';
              const isRedundant = conflict === 'REDUNDANT';
              const isImplied = conflict === 'IMPLIED';

              const baseFlowColor = isUpstream
                ? 'var(--arcane-color)'
                : isDownstream
                  ? 'var(--essence-color)'
                  : 'var(--accent-color)';
              const flowColor = isAnomalyFocus
                ? '#ef4444'
                : isPartOfAnomalyPath
                  ? '#06b6d4'
                  : isRedundant
                    ? '#ef4444'
                    : isImplied
                      ? '#f59e0b'
                      : baseFlowColor;

              const isRelevant =
                isAnomalyFocus ||
                isPartOfAnomalyPath ||
                hoveredLinkId === link.id ||
                activeFilterId === sourceNode.id ||
                activeFilterId === targetNode.id ||
                focusId === sourceNode.id ||
                focusId === targetNode.id;
              const globalOpacity = isAnomalyFocus
                ? 1
                : isPartOfAnomalyPath
                  ? 0.9
                  : isRelevant
                    ? isRedundant
                      ? 0.6
                      : 0.8
                    : 0.2;

              const dx = visualTarget.x! - visualSource.x!;
              const dy = visualTarget.y! - visualSource.y!;
              const dr = Math.sqrt(dx * dx + dy * dy) * 1.8;
              const midX = (visualSource.x! + visualTarget.x!) / 2;
              const midY = (visualSource.y! + visualTarget.y!) / 2;

              return (
                <g
                  key={link.id}
                  className={`link-group transition-all duration-700 ${isAnomalyFocus ? 'animate-pulse' : ''}`}
                  style={{ opacity: globalOpacity }}
                  onMouseEnter={() => setHoveredLinkId(link.id)}
                  onMouseLeave={() => setHoveredLinkId(null)}
                >
                  <path
                    d={`M${visualSource.x},${visualSource.y}A${dr},${dr} 0 0,1 ${visualTarget.x},${visualTarget.y}`}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="100"
                    className="pointer-events-auto cursor-pointer"
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!link.isStructuralLine)
                        setContextMenu({ id: link.id, x: e.clientX, y: e.clientY });
                    }}
                  />

                  {/* Flow Animation Path */}
                  <path
                    d={`M${visualSource.x},${visualSource.y}A${dr},${dr} 0 0,1 ${visualTarget.x},${visualTarget.y}`}
                    fill="none"
                    stroke={flowColor}
                    strokeWidth={
                      link.isStructuralLine
                        ? 10
                        : isAnomalyFocus
                          ? 14
                          : isPartOfAnomalyPath
                            ? 10
                            : 4
                    }
                    className={`${link.isStructuralLine ? 'structural-path-flow opacity-60' : 'link-path-flow'} pointer-events-none transition-all duration-300`}
                    filter={link.isStructuralLine ? 'url(#sigil-glow)' : 'none'}
                  />

                  {/* Static Underlying Path for clarity */}
                  <path
                    d={`M${visualSource.x},${visualSource.y}A${dr},${dr} 0 0,1 ${visualTarget.x},${visualTarget.y}`}
                    fill="none"
                    stroke={flowColor}
                    strokeWidth={link.isStructuralLine ? 4 : 2}
                    opacity="0.3"
                    className="pointer-events-none"
                  />

                  {(isRelevant || isAnomalyFocus || isPartOfAnomalyPath) &&
                    !link.isStructuralLine && (
                      <foreignObject
                        x={midX - 100}
                        y={midY - 40}
                        width="200"
                        height="80"
                        className="overflow-visible pointer-events-auto animate-in fade-in zoom-in-95 duration-500"
                      >
                        <div className="w-full h-full flex items-center justify-center">
                          <div
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setContextMenu({ id: link.id, x: e.clientX, y: e.clientY });
                            }}
                            className={`px-5 py-2.5 rounded-full border shadow-2xl transition-all duration-500 flex items-center gap-3 backdrop-blur-md cursor-pointer bg-nexus-900 border-nexus-800 ${isAnomalyFocus ? 'ring-4 ring-red-500/20' : ''}`}
                            style={{
                              color: flowColor,
                              textDecoration:
                                isRedundant && !isAnomalyFocus ? 'line-through' : 'none',
                            }}
                          >
                            <span className="text-[10px] font-display font-black uppercase tracking-[0.25em]">
                              {isAnomalyFocus
                                ? 'ANOMALY: '
                                : isPartOfAnomalyPath
                                  ? 'CAUSAL PATH: '
                                  : isRedundant
                                    ? '[REDUNDANT] '
                                    : isImplied
                                      ? '[IMPLIED] '
                                      : ''}
                              {displayVerb}
                            </span>
                          </div>
                        </div>
                      </foreignObject>
                    )}
                </g>
              );
            })}
          </g>

          <g className="nodes-layer">
            {nodes.map((node) => {
              const isPartOfAnomaly =
                integrityFocus?.path?.includes(node.id) ||
                (integrityFocus &&
                  (fullRegistry[integrityFocus.linkId] as any).source_id === node.id) ||
                (integrityFocus &&
                  (fullRegistry[integrityFocus.linkId] as any).target_id === node.id);
              const isNodeFocus =
                node.id === focusId ||
                linkingSourceId === node.id ||
                lockedId === node.id ||
                isPartOfAnomaly;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x || 0},${node.y || 0})`}
                  onMouseEnter={() => setHoveredId(node.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setContextMenu({ id: node.id, x: e.clientX, y: e.clientY });
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onDrilldown(node.id);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (linkingSourceId) {
                      if (linkingSourceId !== node.id && onEstablishLink)
                        onEstablishLink(linkingSourceId, node.id, 'mentions');
                      setLinkingSourceId(null);
                    } else {
                      setLockedId(lockedId === node.id ? null : node.id);
                    }
                    setContextMenu(null);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverNodeId(node.id);
                  }}
                  onDragLeave={() => setDragOverNodeId(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverNodeId(null);
                    const sourceId = e.dataTransfer.getData('text/plain');
                    const oldParentId = e.dataTransfer.getData('application/nexus-parent-id');
                    if (sourceId && sourceId !== node.id && onReparent) {
                      onReparent(sourceId, node.id, oldParentId);
                    }
                  }}
                >
                  {/* Fix: cast draggable attribute to any to allow it on SVGGElement props in React */}
                  <g
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', node.id);
                      const parent = (Object.values(fullRegistry) as NexusObject[]).find(
                        (o) => isContainer(o) && o.children_ids.includes(node.id),
                      );
                      e.dataTransfer.setData('application/nexus-parent-id', parent?.id || 'root');
                    }}
                    {...({ draggable: 'true' } as any)}
                  >
                    <DrillNode
                      object={node.object}
                      zoomScale={zoomTransform.k}
                      fullRegistry={fullRegistry}
                      isFocus={isNodeFocus || dragOverNodeId === node.id}
                      isHovered={node.id === hoveredId}
                      integrityReport={integrityMap[node.id]}
                      onLinkClick={onInspect}
                    />
                  </g>
                </g>
              );
            })}
          </g>
        </g>
      </svg>
      {contextMenu && (
        <DrilldownContextMenu
          object={fullRegistry[contextMenu.id]}
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
      )}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.04)_100%)]" />
    </div>
  );
};
