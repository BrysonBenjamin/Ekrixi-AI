import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { Share2 } from 'lucide-react';
import { NexusObject, isLink, isReified, NexusType } from '../../../types';
import { DrillNode } from './DrillNode';
import { VisibleNode } from '../DrilldownFeature';

interface DrilldownCanvasProps {
    registry: Record<string, VisibleNode>;
    fullRegistry: Record<string, NexusObject>;
    onDrilldown: (id: string) => void;
    onInspect: (id: string) => void;
    focusId?: string;
}

interface SimulationNode extends d3.SimulationNodeDatum {
    id: string;
    object: VisibleNode;
    x?: number;
    y?: number;
}

// Fixed: Explicitly declare source and target properties to satisfy TypeScript compiler
// even though they are inherited from d3.SimulationLinkDatum.
interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
    id: string;
    source: string | number | SimulationNode;
    target: string | number | SimulationNode;
    verb: string;
    verbInverse: string;
    isReified: boolean;
    type: NexusType;
    originalSourceId: string;
    originalTargetId: string;
}

export const DrilldownCanvas: React.FC<DrilldownCanvasProps> = ({ registry, fullRegistry, onDrilldown, onInspect, focusId }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<SVGSVGElement>(null);
    
    const [nodes, setNodes] = useState<SimulationNode[]>([]);
    const [links, setLinks] = useState<SimulationLink[]>([]);
    const [zoomTransform, setZoomTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null);
    const [contextFocusedId, setContextFocusedId] = useState<string | null>(null);
    
    const positionMap = useRef<Map<string, { x: number, y: number }>>(new Map());
    const simulationRef = useRef<d3.Simulation<SimulationNode, SimulationLink> | null>(null);

    useEffect(() => {
        setContextFocusedId(null);
    }, [focusId]);

    const simData = useMemo(() => {
        const activeNodes: SimulationNode[] = (Object.values(registry) as VisibleNode[]).map(obj => {
            const prevPos = positionMap.current.get(obj.id);
            return {
                id: obj.id,
                object: obj,
                x: prevPos?.x || (Math.random() - 0.5) * 1200,
                y: prevPos?.y || (Math.random() - 0.5) * 1200,
            };
        });

        const activeLinks: SimulationLink[] = (Object.values(fullRegistry) as NexusObject[])
            .filter(obj => 
                isLink(obj) && 
                registry[(obj as any).source_id] && 
                registry[(obj as any).target_id]
            )
            .map(obj => ({
                id: obj.id,
                source: (obj as any).source_id,
                target: (obj as any).target_id,
                originalSourceId: (obj as any).source_id,
                originalTargetId: (obj as any).target_id,
                verb: (obj as any).verb || 'bound to',
                verbInverse: (obj as any).verb_inverse || 'part of',
                isReified: isReified(obj),
                type: obj._type as NexusType
            }));

        return { nodes: activeNodes, links: activeLinks };
    }, [registry, fullRegistry]);

    useEffect(() => {
        if (!simData.nodes.length) {
            setNodes([]);
            setLinks([]);
            return;
        }

        if (simulationRef.current) simulationRef.current.stop();

        const simulation = d3.forceSimulation<SimulationNode>(simData.nodes)
            .force("link", d3.forceLink<SimulationNode, SimulationLink>(simData.links)
                .id(d => d.id)
                .distance(d => d.isReified ? 650 : 500)
                .strength(0.8)
            )
            .force("charge", d3.forceManyBody().strength(-35000))
            .force("collide", d3.forceCollide().radius(380).iterations(4))
            .force("radial", d3.forceRadial<SimulationNode>(d => {
                if (d.id === focusId) return 0;
                const absDepth = Math.abs(d.object.depth);
                return d.object.pathType === 'ancestor' ? absDepth * 600 : absDepth * 900;
            }, 0, 0).strength(1.2))
            .force("centering", d3.forceX().strength(d => d.id === focusId ? 0.6 : 0.05))
            .force("centering-y", d3.forceY().strength(d => d.id === focusId ? 0.6 : 0.05));

        simulation.alpha(1).alphaDecay(0.02).restart();
        simulationRef.current = simulation;

        simulation.on("tick", () => {
            simData.nodes.forEach(node => {
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
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.005, 5])
            .on("zoom", (event) => setZoomTransform(event.transform));

        if (canvasRef.current) {
            d3.select(canvasRef.current).call(zoom as any).on("dblclick.zoom", null);
        }
    }, []);

    const handleBackgroundClick = () => {
        setContextFocusedId(null);
    };

    return (
        <div ref={containerRef} className="w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden bg-nexus-950">
            <svg ref={canvasRef} className="w-full h-full block" onClick={handleBackgroundClick}>
                <g transform={zoomTransform.toString()}>
                    <defs>
                        <pattern id="nexus-grid-major" width="200" height="200" patternUnits="userSpaceOnUse">
                            <path d="M 200 0 L 0 0 0 200" fill="none" stroke="var(--accent-color)" strokeWidth="0.5" opacity="0.08"/>
                        </pattern>
                        <pattern id="nexus-grid-minor" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--ley-color)" strokeWidth="0.25"/>
                        </pattern>
                        
                        <marker id="arrow-downstream" viewBox="0 -5 10 10" refX="32" refY="0" markerWidth="4" markerHeight="4" orient="auto">
                            <path d="M0,-5L10,0L0,5" fill="var(--essence-color)" />
                        </marker>
                        <marker id="arrow-upstream" viewBox="0 -5 10 10" refX="32" refY="0" markerWidth="4" markerHeight="4" orient="auto">
                            <path d="M0,-5L10,0L0,5" fill="var(--arcane-color)" />
                        </marker>
                        <marker id="arrow-lateral" viewBox="0 -5 10 10" refX="32" refY="0" markerWidth="4" markerHeight="4" orient="auto">
                            <path d="M0,-5L10,0L0,5" fill="var(--accent-color)" />
                        </marker>

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
                            
                            if (sourceNode.x === undefined || sourceNode.y === undefined || targetNode.x === undefined || targetNode.y === undefined || isNaN(sourceNode.x) || isNaN(targetNode.x)) return null;
                            
                            // Visual pivoting: We want the focal point to always be the "subject" of its immediate lines
                            // This means for ancestors, we flip the direction so it points OUT from focus to parent.
                            const sourcePath = registry[sourceNode.id]?.pathType;
                            const targetPath = registry[targetNode.id]?.pathType;

                            const isSourceFocus = sourceNode.id === focusId;
                            const isTargetFocus = targetNode.id === focusId;
                            
                            // Determine flow relative to current focus
                            // logic: if target is closer to root/farther from descendants than source, it's Upstream
                            const pointsToAncestor = targetPath === 'ancestor';
                            const pointsFromAncestor = sourcePath === 'ancestor' && isTargetFocus;
                            
                            // We visual flip hierarchical links to point OUT from focus for consistent reading
                            let visualSource = sourceNode;
                            let visualTarget = targetNode;
                            let displayVerb = link.verb;
                            let isUpstream = pointsToAncestor || pointsFromAncestor;
                            let isDownstream = (isSourceFocus || sourcePath === 'descendant') && targetPath === 'descendant';

                            // The Switch logic:
                            // If we are on focus node F, and there is a link connecting F and its parent P.
                            // The original link is P -> F ("governs").
                            // We want to show F -> P ("governed by").
                            if (isTargetFocus && sourcePath === 'ancestor') {
                                visualSource = targetNode;
                                visualTarget = sourceNode;
                                displayVerb = link.verbInverse;
                            } else if (isSourceFocus && targetPath === 'ancestor') {
                                visualSource = sourceNode;
                                visualTarget = targetNode;
                                displayVerb = link.verbInverse;
                            } else if (isTargetFocus && sourcePath === 'descendant') {
                                visualSource = targetNode;
                                visualTarget = sourceNode;
                                displayVerb = link.verb;
                            } else if (isSourceFocus && targetPath === 'descendant') {
                                visualSource = sourceNode;
                                visualTarget = targetNode;
                                displayVerb = link.verb;
                            }

                            const isHierarchical = link.type.includes('HIERARCHICAL');
                            const isLinkReified = link.isReified;
                            const flowColor = isUpstream ? "var(--arcane-color)" : (isDownstream ? "var(--essence-color)" : "var(--accent-color)");
                            const markerId = isUpstream ? 'upstream' : (isDownstream ? 'downstream' : 'lateral');

                            const isDirectlyConnectedToContext = contextFocusedId === sourceNode.id || contextFocusedId === targetNode.id;
                            const isDirectlyConnectedToHover = hoveredId === sourceNode.id || hoveredId === targetNode.id;
                            const isRelevant = hoveredLinkId === link.id || isDirectlyConnectedToHover || isDirectlyConnectedToContext || focusId === sourceNode.id || focusId === targetNode.id;

                            const globalOpacity = contextFocusedId ? (isDirectlyConnectedToContext ? 1 : 0.02) : (isRelevant ? 1 : 0.06);

                            const dx = visualTarget.x! - visualSource.x!;
                            const dy = visualTarget.y! - visualSource.y!;
                            const dr = Math.sqrt(dx * dx + dy * dy) * 1.8;
                            
                            const midX = (visualSource.x! + visualTarget.x!) / 2;
                            const midY = (visualSource.y! + visualTarget.y!) / 2;

                            return (
                                <g 
                                    key={link.id} 
                                    className="link-group transition-all duration-700"
                                    style={{ opacity: globalOpacity }}
                                    onMouseEnter={() => setHoveredLinkId(link.id)}
                                    onMouseLeave={() => setHoveredLinkId(null)}
                                >
                                    <path 
                                        d={`M${visualSource.x},${visualSource.y}A${dr},${dr} 0 0,1 ${visualTarget.x},${visualTarget.y}`}
                                        fill="none"
                                        stroke="transparent"
                                        strokeWidth="60"
                                        className="pointer-events-auto cursor-pointer"
                                    />

                                    <path 
                                        d={`M${visualSource.x},${visualSource.y}A${dr},${dr} 0 0,1 ${visualTarget.x},${visualTarget.y}`}
                                        fill="none"
                                        stroke={flowColor}
                                        strokeWidth={isRelevant ? (isLinkReified ? 8 : 6) : 2}
                                        strokeDasharray={isHierarchical ? "none" : (isRelevant ? "none" : "16,16")}
                                        marker-end={`url(#arrow-${markerId})`}
                                        className="transition-all duration-300"
                                        filter={isLinkReified && isRelevant ? "url(#sigil-glow)" : "none"}
                                    />
                                    
                                    {isRelevant && (
                                        <circle r={isLinkReified ? 7 : 5} fill={flowColor}>
                                            <animateMotion 
                                                dur={isLinkReified ? "2s" : "4s"} 
                                                repeatCount="indefinite" 
                                                path={`M${visualSource.x},${visualSource.y}A${dr},${dr} 0 0,1 ${visualTarget.x},${visualTarget.y}`} 
                                            />
                                        </circle>
                                    )}

                                    {isRelevant && (
                                        <foreignObject 
                                            x={midX - 100} 
                                            y={midY - 40} 
                                            width="200" 
                                            height="80" 
                                            className="overflow-visible pointer-events-none animate-in fade-in zoom-in-95 duration-500"
                                        >
                                            <div className="w-full h-full flex items-center justify-center">
                                                <div 
                                                    className={`
                                                        px-5 py-2.5 rounded-full border shadow-2xl transition-all duration-500 flex items-center gap-3 backdrop-blur-md
                                                        ${isLinkReified ? 'text-white border-white/20' : 'bg-nexus-900 border-nexus-800'}
                                                        ${isDirectlyConnectedToContext ? 'scale-125 ring-4 ring-offset-2 ring-offset-nexus-950 font-black' : 'font-bold'}
                                                    `}
                                                    style={{ 
                                                        backgroundColor: isLinkReified ? flowColor : undefined,
                                                        color: isLinkReified ? undefined : flowColor,
                                                        borderColor: isLinkReified ? undefined : `${flowColor}40`,
                                                        boxShadow: isDirectlyConnectedToContext ? `0 0 30px ${flowColor}40` : undefined,
                                                        // Fix: ringColor is not a standard CSS property, use Tailwind's CSS variable via computed property key
                                                        ['--tw-ring-color' as any]: flowColor
                                                    }}
                                                >
                                                    {isLinkReified && <Share2 size={12} />}
                                                    <span className="text-[10px] font-display uppercase tracking-[0.25em]">
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
                        {nodes.map(node => (
                            <g 
                                key={node.id} 
                                transform={`translate(${node.x || 0},${node.y || 0})`}
                                onMouseEnter={() => setHoveredId(node.id)}
                                onMouseLeave={() => setHoveredId(null)}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setContextFocusedId(node.id);
                                }}
                                onDoubleClick={(e) => { e.stopPropagation(); onDrilldown(node.id); }}
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    onInspect(node.id);
                                    setContextFocusedId(null); 
                                }}
                            >
                                <DrillNode 
                                    object={node.object} 
                                    zoomScale={zoomTransform.k}
                                    fullRegistry={fullRegistry}
                                    isFocus={node.id === focusId || node.id === contextFocusedId}
                                    isHovered={node.id === hoveredId}
                                />
                            </g>
                        ))}
                    </g>
                </g>
            </svg>
            
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.04)_100%)]" />
        </div>
    );
};