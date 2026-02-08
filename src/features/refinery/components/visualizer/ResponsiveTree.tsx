import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { isLink, isReified, isContainer, NexusObject } from '../../../../types';
import { createNodeHTML, createLinkPillHTML } from './NodeTemplates';

interface TreeData {
  id: string;
  name: string;
  category?: string;
  reified: boolean;
  gist: string;
  children: TreeData[];
}

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
  onDoubleClick?: (id: string) => void;
  onViewModeChange?: (mode: 'STRUCTURE' | 'RELATIONS' | 'INSPECTOR') => void;
  setZoomRef: (zoom: d3.ZoomBehavior<SVGSVGElement, unknown>) => void;
  setSvgRef: (svg: SVGSVGElement | null) => void;
  onReparent?: (sourceId: string, targetId: string, oldParentId?: string) => void;
}

export const ResponsiveTree: React.FC<ResponsiveTreeProps> = ({
  registry,
  selectedId,
  expandedIds,
  hoveredId,
  orientation,
  onSelect,
  onToggleExpand,
  onHover,
  onContextMenu,
  onDoubleClick,
  onViewModeChange,
  setZoomRef,
  setSvgRef,
  onReparent,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const currentTransformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const isVertical = orientation === 'VERTICAL';
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);

  const zoomBehavior = useMemo(() => {
    return d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        currentTransformRef.current = event.transform;
        if (svgRef.current) {
          d3.select(svgRef.current).select('g.main-container').attr('transform', event.transform);
        }
      });
  }, []);

  useEffect(() => {
    setZoomRef(zoomBehavior);
    setSvgRef(svgRef.current);
  }, [zoomBehavior, setZoomRef, setSvgRef]);

  const hierarchyData = useMemo(() => {
    const allObjects = Object.values(registry) as NexusObject[];

    const roots = allObjects.filter((o: NexusObject) => {
      if (isLink(o) && !isReified(o)) return false;
      const inContainer = allObjects.some(
        (p: NexusObject) => isContainer(p) && p.children_ids.includes(o.id),
      );

      // Implicit parenting for reified units: if it has a source node, it will be rendered as a child of that source
      if (isReified(o) && (o as any).source_id && !inContainer) return false;

      const isManualRoot = 'tags' in o && (o as any).tags?.includes('__is_root__');
      return !inContainer || isManualRoot;
    });

    const buildTree = (node: NexusObject, visited: Set<string> = new Set()): TreeData | null => {
      if (!node || visited.has(node.id)) return null;
      visited.add(node.id);

      const explicitChildren = isContainer(node)
        ? node.children_ids.map((cid) => registry[cid]).filter((n): n is NexusObject => !!n)
        : [];

      // Find reified units that originate from this node and have no explicit container parent
      const implicitLogicChildren = allObjects.filter((o) => {
        return (
          isReified(o) &&
          (o as any).source_id === node.id &&
          !allObjects.some((p) => isContainer(p) && p.children_ids.includes(o.id))
        );
      });

      const allMergedChildren = [...explicitChildren, ...implicitLogicChildren];

      return {
        id: node.id,
        name: 'title' in node ? (node as any).title || 'Untitled' : 'Untitled',
        category: 'category_id' in node ? (node as any).category_id : undefined,
        reified: isReified(node),
        gist: 'gist' in node ? (node as any).gist || '' : 'No summary available.',
        children: allMergedChildren
          .map((c) => buildTree(c, new Set(visited)))
          .filter((n): n is TreeData => !!n),
      };
    };

    return {
      id: 'VIRTUAL_ROOT',
      name: 'NEXUS_ROOT',
      children: roots.map((r) => buildTree(r)).filter(Boolean),
    };
  }, [registry]);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.call(zoomBehavior as any).on('dblclick.zoom', null);

    const mainG = svg
      .append('g')
      .attr('class', 'main-container')
      .attr('transform', currentTransformRef.current.toString());

    const root = d3.hierarchy<TreeData>(hierarchyData);

    const treeLayout = d3.tree<TreeData>().nodeSize(isVertical ? [320, 480] : [140, 560]);
    treeLayout(root);

    const getX = (d: d3.HierarchyPointNode<TreeData>) => (isVertical ? d.x : d.y);
    const getY = (d: d3.HierarchyPointNode<TreeData>) => (isVertical ? d.y : d.x);

    const links = root.links().filter((l) => l.source.data.id !== 'VIRTUAL_ROOT');

    const lineLayer = mainG.append('g').attr('class', 'line-layer');
    const linkGroups = lineLayer
      .selectAll('g.link-group')
      .data(links, (d) => {
        const link = d as d3.HierarchyPointLink<TreeData>;
        return `${link.source.data.id}-${link.target.data.id}`;
      })
      .join('g')
      .attr('class', 'link-group');

    linkGroups
      .append('path')
      .attr('d', (d) => {
        const s = d.source;
        const t = d.target;
        if (isVertical) {
          return d3.linkVertical()({ source: [s.x, s.y], target: [t.x, t.y] } as any);
        } else {
          return d3.linkHorizontal()({ source: [s.y, s.x], target: [t.y, t.x] } as any);
        }
      })
      .attr('fill', 'none')
      .attr('stroke', isVertical ? 'rgba(99, 102, 241, 0.4)' : 'rgba(99, 102, 241, 0.2)')
      .attr('stroke-width', isVertical ? 3 : 2)
      .attr('stroke-dasharray', isVertical ? 'none' : '4,2');

    linkGroups.each(function (d) {
      const s = d.source;
      const t = d.target;
      const pillW = 160;
      const pillH = 40;

      const midX = isVertical ? (s.x + t.x) / 2 : (s.y + t.y) / 2;
      const midY = isVertical ? (s.y + t.y) / 2 : (s.x + t.x) / 2;

      const linkObj = (Object.values(registry) as NexusObject[]).find(
        (o: NexusObject) => isLink(o) && o.source_id === s.data.id && o.target_id === t.data.id,
      );

      const verb = linkObj && 'verb' in linkObj ? linkObj.verb : 'contains';
      const isLinkReified = linkObj ? isReified(linkObj) : false;
      const linkId = linkObj ? linkObj.id : null;

      const fo = d3
        .select(this)
        .append('foreignObject')
        .attr('width', pillW)
        .attr('height', pillH)
        .attr('x', midX - pillW / 2)
        .attr('y', midY - pillH / 2)
        .style('overflow', 'visible')
        .html(() => createLinkPillHTML(verb, isLinkReified, selectedId === linkId));

      fo.on('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (linkId && onContextMenu) {
          onContextMenu(linkId, e.clientX, e.clientY);
        }
      });

      fo.on('click', (e) => {
        e.stopPropagation();
        if (linkId) onSelect(linkId);
      });

      fo.on('dblclick', (e) => {
        e.stopPropagation();
        if (linkId && onDoubleClick) {
          onDoubleClick(linkId);
        } else if (linkId) {
          onSelect(linkId);
          onViewModeChange?.('INSPECTOR');
        }
      });
    });

    const nodeLayer = mainG.append('g').attr('class', 'node-layer');
    const nodeGroups = nodeLayer
      .selectAll('g.node-group')
      .data(
        root.descendants().filter((d) => d.data.id !== 'VIRTUAL_ROOT'),
        (d) => (d as d3.HierarchyPointNode<TreeData>).data.id,
      )
      .join('g')
      .attr('class', 'node-group')
      .attr('transform', (d) => `translate(${getX(d) - 130},${getY(d) - 27})`);

    nodeGroups.each(function (d) {
      const isExpanded = expandedIds.has(d.data.id);
      const foHeight = isExpanded ? 200 : 54;
      const isDraggingOver = dragOverNodeId === d.data.id;

      const fo = d3
        .select(this)
        .selectAll<SVGForeignObjectElement, d3.HierarchyPointNode<TreeData>>('foreignObject')
        .data([d])
        .join('foreignObject')
        .attr('width', 260)
        .attr('height', foHeight)
        .style('overflow', 'visible')
        .html(() =>
          createNodeHTML(
            d as any,
            selectedId === d.data.id,
            hoveredId === d.data.id || isDraggingOver,
            isExpanded,
          ),
        );

      fo.on('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onContextMenu) {
          onContextMenu(d.data.id, e.clientX, e.clientY);
        }
      });

      fo.attr('draggable', 'true')
        .on('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', d.data.id);
          const parent = (Object.values(registry) as NexusObject[]).find(
            (o) => isContainer(o) && o.children_ids.includes(d.data.id),
          );
          e.dataTransfer.setData('application/nexus-parent-id', parent?.id || 'root');
        })
        .on('dragover', (e) => {
          e.preventDefault();
          setDragOverNodeId(d.data.id);
        })
        .on('dragleave', () => {
          setDragOverNodeId(null);
        })
        .on('drop', (e) => {
          e.preventDefault();
          setDragOverNodeId(null);
          const sourceId = e.dataTransfer.getData('text/plain');
          const oldParentId = e.dataTransfer.getData('application/nexus-parent-id');
          if (sourceId && sourceId !== d.data.id && onReparent) {
            onReparent(sourceId, d.data.id, oldParentId);
          }
        });
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
        const nodeGroup = pill.closest('.node-group');
        const nodeData = nodeGroup
          ? (d3.select(nodeGroup).datum() as d3.HierarchyPointNode<TreeData>)
          : null;
        if (nodeData) onSelect(nodeData.data.id);
      }
    };

    const handleDblClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const pill = target.closest('.node-pill');
      if (pill) {
        e.stopPropagation();
        const nodeGroup = pill.closest('.node-group');
        const nodeData = nodeGroup
          ? (d3.select(nodeGroup).datum() as d3.HierarchyPointNode<TreeData>)
          : null;
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
        const nodeGroup = pill.closest('.node-group');
        const nodeData = nodeGroup
          ? (d3.select(nodeGroup).datum() as d3.HierarchyPointNode<TreeData>)
          : null;
        if (nodeData) onHover(nodeData.data.id);
      }
    };

    svg.on('click', handleClick);
    svg.on('dblclick', handleDblClick);
    svg.on('mouseover', handleMouseOver);
    svg.on('mouseout', () => onHover(null));

    return () => {
      svg.on('click', null);
      svg.on('dblclick', null);
      svg.on('mouseover', null);
      svg.on('mouseout', null);
    };
  }, [
    hierarchyData,
    registry,
    selectedId,
    expandedIds,
    hoveredId,
    orientation,
    isVertical,
    zoomBehavior,
    onSelect,
    onToggleExpand,
    onHover,
    onDoubleClick,
    onContextMenu,
    onViewModeChange,
    dragOverNodeId,
    onReparent,
  ]);

  return (
    <svg
      ref={svgRef}
      className="w-full h-full block cursor-grab active:cursor-grabbing outline-none"
    />
  );
};
