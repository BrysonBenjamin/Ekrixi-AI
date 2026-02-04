
import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { isLink, isReified, isContainer, NexusObject, NexusType } from '../../../../types';
import { GraphIntegrityService } from '../../../integrity/GraphIntegrityService';
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
    onContextMenu?: (id: string, x: number, y: number) => void;
    onLongPress?: (id: string, x: number, y: number) => void;
    onViewModeChange?: (mode: 'STRUCTURE' | 'RELATIONS' | 'INSPECTOR') => void;
    setZoomRef: (zoom: d3.ZoomBehavior<SVGSVGElement, unknown>) => void;
    setSvgRef: (svg: SVGSVGElement | null) => void;
}

export const ResponsiveTree: React.FC<ResponsiveTreeProps> = ({ 
    registry, selectedId, expandedIds, hoveredId, orientation, 
    onSelect, onToggleExpand, onHover, onContextMenu, onLongPress, onViewModeChange,
    setZoomRef, setSvgRef
}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const currentTransformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
    const isVertical = orientation === 'VERTICAL';

    const integrityMap = useMemo(() => GraphIntegrityService.getRegistryIntegrityMap(registry), [registry]);

    const zoomBehavior = useMemo(() => {
        return d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 4])
            .on("zoom", (event) => {
                currentTransformRef.current = event.transform;
                if (svgRef.current) d3.select(svgRef.current).select("g.main-container").attr("transform", event.transform);
            });
    }, []);

    useEffect(() => {
        setZoomRef(zoomBehavior);
        setSvgRef(svgRef.current);
    }, [zoomBehavior, setZoomRef, setSvgRef]);

    const hierarchyData = useMemo(() => {
        const allObjects = Object.values(registry) as NexusObject[];
        const roots = allObjects.filter(o => {
            if (isLink(o) && !isReified(o)) return false;
            const inContainer = allObjects.some(p => isContainer(p) && p.children_ids.includes(o.id));
            return !inContainer || (o as any).tags?.includes('__is_root__');
        });

        const buildTree = (node: NexusObject, visited: Set<string> = new Set()): any => {
            if (!node || visited.has(node.id)) return null;
            visited.add(node.id);
            return {
                id: node.id, name: (node as any).title || 'Untitled', category: (node as any).category_id,
                reified: isReified(node), gist: (node as any).gist || '',
                children: isContainer(node) ? node.children_ids.map(cid => registry[cid]).filter(n => !!n).map(c => buildTree(c, new Set(visited))).filter(Boolean) : []
            };
        };
        return { id: "VIRTUAL_ROOT", name: "NEXUS_ROOT", children: roots.map(r => buildTree(r)).filter(Boolean) };
    }, [registry]);

    useEffect(() => {
        if (!svgRef.current) return;
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();
        svg.call(zoomBehavior as any).on("dblclick.zoom", null);
        
        const mainG = svg.append("g").attr("class", "main-container").attr("transform", currentTransformRef.current.toString());
        const root = d3.hierarchy(hierarchyData);
        const treeLayout = d3.tree().nodeSize(isVertical ? [320, 480] : [140, 560]);
        treeLayout(root);

        const getX = (d: any) => isVertical ? d.x : d.y;
        const getY = (d: any) => isVertical ? d.y : d.x;

        const links = root.links().filter(l => l.source.data.id !== "VIRTUAL_ROOT");
        const lineLayer = mainG.append("g").attr("class", "line-layer");
        const linkGroups = lineLayer.selectAll("g.link-group").data(links, (d: any) => `${d.source.data.id}-${d.target.data.id}`).join("g").attr("class", "link-group");

        linkGroups.append("path")
            .attr("d", (d: any) => isVertical ? d3.linkVertical()({ source: [d.source.x, d.source.y], target: [d.target.x, d.target.y] } as any) : d3.linkHorizontal()({ source: [d.source.y, d.source.x], target: [d.target.y, d.target.x] } as any))
            .attr("fill", "none")
            .attr("stroke", (d: any) => {
              const l = (Object.values(registry) as NexusObject[]).find(o => isLink(o) && o.source_id === d.source.data.id && o.target_id === d.target.data.id);
              const conflict = l ? integrityMap[l.id]?.status : 'APPROVED';
              return conflict === 'REDUNDANT' ? '#ef4444' : conflict === 'IMPLIED' ? '#f59e0b' : 'var(--accent-500)';
            })
            .attr("stroke-opacity", 0.4)
            .attr("stroke-width", isVertical ? 3 : 2)
            .attr("stroke-dasharray", (d: any) => {
                const l = (Object.values(registry) as NexusObject[]).find(o => isLink(o) && o.source_id === d.source.data.id && o.target_id === d.target.data.id);
                return integrityMap[l?.id || '']?.status === 'IMPLIED' ? '6,3' : 'none';
            });

        linkGroups.each(function(d: any) {
            const midX = isVertical ? (d.source.x + d.target.x) / 2 : (d.source.y + d.target.y) / 2;
            const midY = isVertical ? (d.source.y + d.target.y) / 2 : (d.source.x + d.target.x) / 2;
            const linkObj = (Object.values(registry) as NexusObject[]).find(o => isLink(o) && o.source_id === d.source.data.id && o.target_id === d.target.data.id);
            const conflict = linkObj ? integrityMap[linkObj.id]?.status : 'APPROVED';
            const linkId = linkObj ? linkObj.id : null;
            
            d3.select(this).append("foreignObject")
                .attr("width", 160).attr("height", 40).attr("x", midX - 80).attr("y", midY - 20).style("overflow", "visible")
                .html(() => createLinkPillHTML(linkObj ? (linkObj as any).verb : "contains", linkObj ? isReified(linkObj) : false, selectedId === linkId, conflict))
                .on("click", (e) => {
                    e.stopPropagation();
                    if (linkId) onSelect(linkId);
                })
                .on("contextmenu", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (linkId && onContextMenu) onContextMenu(linkId, e.clientX, e.clientY);
                });
        });

        const nodeLayer = mainG.append("g").attr("class", "node-layer");
        const nodeGroups = nodeLayer.selectAll("g.node-group").data(root.descendants().filter(d => d.data.id !== "VIRTUAL_ROOT")).join("g").attr("class", "node-group")
            .attr("transform", d => `translate(${getX(d) - 130},${getY(d) - 27})`);

        nodeGroups.each(function(d: any) {
            d3.select(this).selectAll("foreignObject").data([d]).join("foreignObject").attr("width", 260).attr("height", expandedIds.has(d.data.id) ? 200 : 54).style("overflow", "visible")
              .html(() => createNodeHTML(d, selectedId === d.data.id, hoveredId === d.data.id, expandedIds.has(d.data.id)))
              .on("contextmenu", (e) => { e.preventDefault(); e.stopPropagation(); onContextMenu?.(d.data.id, e.clientX, e.clientY); });
        });

        svg.on("click", (e) => {
            const t = e.target as HTMLElement;
            const expand = t.closest('.expand-trigger');
            const pill = t.closest('.node-pill');
            if (expand) onToggleExpand(expand.getAttribute('data-id')!);
            else if (pill) onSelect((d3.select(pill.closest('.node-group') as any).datum() as any).data.id);
        });

    }, [hierarchyData, registry, selectedId, expandedIds, hoveredId, orientation, integrityMap]);

    return <svg ref={svgRef} className="w-full h-full block cursor-grab active:cursor-grabbing outline-none" />;
};
