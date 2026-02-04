
import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { isLink, isReified, isContainer, NexusObject } from '../../../../types';
import { createNodeHTML, createLinkPillHTML } from './NodeTemplates';

interface ResponsiveTreeProps {
    registry: Record<string, NexusObject>;
    selectedId: string | null;
    expandedIds: Set<string>;
    hoveredId: string | null;
    orientation: 'HORIZONTAL' | 'VERTICAL';
    onSelect: (id: string) => void;
    onToggleExpand: (id: string) => void;
    onHover: (id: string | null) => void;
    onDoubleClick?: (id: string) => void;
    onLongPress?: (id: string, x: number, y: number) => void;
    onViewModeChange?: (mode: 'STRUCTURE' | 'RELATIONS' | 'INSPECTOR') => void;
    setZoomRef: (zoom: d3.ZoomBehavior<SVGSVGElement, unknown>) => void;
    setSvgRef: (svg: SVGSVGElement | null) => void;
}

export const ResponsiveTree: React.FC<ResponsiveTreeProps> = ({ 
    registry, selectedId, expandedIds, hoveredId, orientation, 
    onSelect, onToggleExpand, onHover, onDoubleClick, onLongPress, onViewModeChange,
    setZoomRef, setSvgRef
}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const currentTransformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
    const holdTimerRef = useRef<any>(null);
    const isVertical = orientation === 'VERTICAL';

    const zoomBehavior = useMemo(() => {
        return d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 4])
            .on("zoom", (event) => {
                currentTransformRef.current = event.transform;
                if (svgRef.current) {
                    d3.select(svgRef.current).select("g.main-container").attr("transform", event.transform);
                }
            });
    }, []);

    useEffect(() => {
        setZoomRef(zoomBehavior);
        setSvgRef(svgRef.current);
    }, [zoomBehavior, setZoomRef, setSvgRef]);

    const hierarchyData = useMemo(() => {
        const allObjects = (Object.values(registry) as NexusObject[]);
        
        const roots = allObjects.filter((o: NexusObject) => {
            if (isLink(o) && !isReified(o)) return false;
            // Root if no container has it OR if it has the manual root tag
            const inContainer = allObjects.some((p: NexusObject) => isContainer(p) && p.children_ids.includes(o.id));
            const isManualRoot = (o as any).tags?.includes('__is_root__');
            return !inContainer || isManualRoot;
        });

        const buildTree = (node: NexusObject, visited: Set<string> = new Set()): any => {
            if (!node || visited.has(node.id)) return null;
            visited.add(node.id);

            return {
                id: node.id,
                name: (node as any).title || 'Untitled',
                category: (node as any).category_id,
                reified: isReified(node),
                gist: (node as any).gist || 'No summary available.',
                children: isContainer(node) 
                    ? node.children_ids.map(cid => registry[cid]).filter((n): n is NexusObject => !!n).map(c => buildTree(c, new Set(visited))).filter(Boolean)
                    : []
            };
        };

        return { id: "VIRTUAL_ROOT", name: "NEXUS_ROOT", children: roots.map(r => buildTree(r)).filter(Boolean) };
    }, [registry]);

    useEffect(() => {
        if (!svgRef.current) return;
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();
        svg.call(zoomBehavior as any).on("dblclick.zoom", null);
        
        const mainG = svg.append("g")
            .attr("class", "main-container")
            .attr("transform", currentTransformRef.current.toString());

        const root = d3.hierarchy(hierarchyData);
        
        const treeLayout = d3.tree().nodeSize(
            isVertical ? [320, 480] : [140, 560]
        );
        treeLayout(root);

        const getX = (d: any) => isVertical ? d.x : d.y;
        const getY = (d: any) => isVertical ? d.y : d.x;

        const links = root.links().filter(l => l.source.data.id !== "VIRTUAL_ROOT");

        const lineLayer = mainG.append("g").attr("class", "line-layer");
        const linkGroups = lineLayer.selectAll("g.link-group")
            .data(links, (d: any) => `${d.source.data.id}-${d.target.data.id}`)
            .join("g")
            .attr("class", "link-group");

        linkGroups.append("path")
            .attr("d", (d: any) => {
                const s = d.source;
                const t = d.target;
                if (isVertical) {
                    return d3.linkVertical()({ source: [s.x, s.y], target: [t.x, t.y] } as any);
                } else {
                    return d3.linkHorizontal()({ source: [s.y, s.x], target: [t.y, t.x] } as any);
                }
            })
            .attr("fill", "none")
            .attr("stroke", isVertical ? "rgba(99, 102, 241, 0.4)" : "rgba(99, 102, 241, 0.2)")
            .attr("stroke-width", isVertical ? 3 : 2)
            .attr("stroke-dasharray", isVertical ? "none" : "4,2");

        linkGroups.each(function(d: any) {
            const s = d.source;
            const t = d.target;
            const pillW = 160;
            const pillH = 40;

            const midX = isVertical ? (s.x + t.x) / 2 : (s.y + t.y) / 2;
            const midY = isVertical ? (s.y + t.y) / 2 : (s.x + t.x) / 2;

            const linkObj = (Object.values(registry) as NexusObject[]).find((o: NexusObject) => 
                isLink(o) && o.source_id === s.data.id && o.target_id === t.data.id
            );

            const verb = linkObj ? (linkObj as any).verb : "contains";
            const isLinkReified = linkObj ? isReified(linkObj) : false;
            const linkId = linkObj ? linkObj.id : null;
            
            const fo = d3.select(this).append("foreignObject")
                .attr("width", pillW)
                .attr("height", pillH)
                .attr("x", midX - pillW / 2)
                .attr("y", midY - pillH / 2)
                .style("overflow", "visible")
                .html(() => createLinkPillHTML(verb, isLinkReified, selectedId === linkId));

            fo.on("mousedown touchstart", (e) => {
                const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
                const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
                if (linkId && onLongPress) {
                    holdTimerRef.current = setTimeout(() => onLongPress(linkId, clientX, clientY), 500);
                }
            });

            fo.on("contextmenu", (e) => {
                e.preventDefault();
                e.stopPropagation();
                const clientX = e.clientX;
                const clientY = e.clientY;
                if (linkId && onLongPress) {
                    onLongPress(linkId, clientX, clientY);
                }
            });

            const clearTimer = () => { if(holdTimerRef.current) clearTimeout(holdTimerRef.current); };
            fo.on("mouseup touchend mouseleave touchmove", clearTimer);

            fo.on("click", (e) => {
                e.stopPropagation();
                if (linkId) onSelect(linkId);
            });

            fo.on("dblclick", (e) => {
                e.stopPropagation();
                if (linkId && onDoubleClick) {
                    onDoubleClick(linkId);
                } else if (linkId) {
                    onSelect(linkId);
                    onViewModeChange?.('INSPECTOR');
                }
            });
        });

        const nodeLayer = mainG.append("g").attr("class", "node-layer");
        const nodeGroups = nodeLayer.selectAll("g.node-group")
            .data(root.descendants().filter(d => d.data.id !== "VIRTUAL_ROOT"), (d: any) => d.data.id)
            .join("g")
            .attr("class", "node-group")
            .attr("transform", d => `translate(${getX(d) - 130},${getY(d) - 27})`);

        nodeGroups.each(function(d: any) {
            const isExpanded = expandedIds.has(d.data.id);
            const foHeight = isExpanded ? 200 : 54;
            
            const fo = d3.select(this).selectAll("foreignObject").data([d]).join("foreignObject")
              .attr("width", 260)
              .attr("height", foHeight)
              .style("overflow", "visible")
              .html(() => createNodeHTML(d, selectedId === d.data.id, hoveredId === d.data.id, isExpanded));

            fo.on("mousedown touchstart", (e) => {
                const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
                const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
                if (onLongPress) {
                    holdTimerRef.current = setTimeout(() => onLongPress(d.data.id, clientX, clientY), 500);
                }
            });

            fo.on("contextmenu", (e) => {
                e.preventDefault();
                e.stopPropagation();
                const clientX = e.clientX;
                const clientY = e.clientY;
                if (onLongPress) {
                    onLongPress(d.data.id, clientX, clientY);
                }
            });

            const clearTimer = () => { if(holdTimerRef.current) clearTimeout(holdTimerRef.current); };
            fo.on("mouseup touchend mouseleave touchmove", clearTimer);
        });

        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const expandBtn = target.closest('.expand-trigger');
            const inspectBtn = target.closest('.inspect-trigger');
            const pill = target.closest('.node-pill');

            if (expandBtn) {
                e.stopPropagation();
                const id = expandBtn.getAttribute('data-id');
                if (id) onToggleExpand(id);
            } else if (inspectBtn) {
                e.stopPropagation();
                const id = inspectBtn.getAttribute('data-id');
                if (id) {
                    onSelect(id);
                    onViewModeChange?.('INSPECTOR');
                }
            } else if (pill) {
                e.stopPropagation();
                const nodeData = d3.select(pill.closest('.node-group') as any).datum() as any;
                if (nodeData) onSelect(nodeData.data.id);
            }
        };

        const handleDblClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const pill = target.closest('.node-pill');
            if (pill) {
                e.stopPropagation();
                const nodeData = d3.select(pill.closest('.node-group') as any).datum() as any;
                if (nodeData) {
                    if (onDoubleClick) {
                        onDoubleClick(nodeData.data.id);
                    } else {
                        onSelect(nodeData.data.id);
                        onViewModeChange?.('INSPECTOR');
                    }
                }
            }
        };

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const pill = target.closest('.node-pill');
            if (pill) {
                const nodeData = d3.select(pill.closest('.node-group') as any).datum() as any;
                if (nodeData) onHover(nodeData.data.id);
            }
        };

        svg.on("click", handleClick);
        svg.on("dblclick", handleDblClick);
        svg.on("mouseover", handleMouseOver);
        svg.on("mouseout", () => onHover(null));

        return () => {
            svg.on("click", null);
            svg.on("dblclick", null);
            svg.on("mouseover", null);
            svg.on("mouseout", null);
        };
    }, [hierarchyData, registry, selectedId, expandedIds, hoveredId, orientation, isVertical, zoomBehavior, onSelect, onToggleExpand, onHover, onDoubleClick, onLongPress, onViewModeChange]);

    return <svg ref={svgRef} className="w-full h-full block cursor-grab active:cursor-grabbing outline-none" />;
};
