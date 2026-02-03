import React, { useRef, useMemo, useState, useEffect } from 'react';
import * as d3 from 'd3';
import { NexusObject, isLink } from '../../../types';
import { TreeHUD } from './visualizer/TreeHUD';
import { ResponsiveTree } from './visualizer/ResponsiveTree';
import { QuickActionMenu } from './visualizer/QuickActionMenu';
import { FloatingContextualMenu } from './visualizer/FloatingContextualMenu';

interface StructureVisualizerProps {
    registry: Record<string, NexusObject>;
    selectedId: string | null;
    onSelect: (id: string) => void;
    onAddChild?: (parentId: string) => void;
    onDelete?: (id: string) => void;
    onDeleteLink?: (id: string) => void;
    onReifyLink?: (id: string) => void;
    onInvertLink?: (id: string) => void;
    onViewModeChange?: (mode: 'STRUCTURE' | 'RELATIONS' | 'INSPECTOR') => void;
}

export const StructureVisualizer: React.FC<StructureVisualizerProps> = ({ 
    registry, selectedId, onSelect, onAddChild, onDelete, onDeleteLink, onReifyLink, onInvertLink, onViewModeChange 
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [isMobile, setIsMobile] = useState(false);
    const [orientation, setOrientation] = useState<'HORIZONTAL' | 'VERTICAL'>('HORIZONTAL');
    
    // Menu States
    const [menuObjectId, setMenuObjectId] = useState<string | null>(null);
    const [floatingMenu, setFloatingMenu] = useState<{ id: string, x: number, y: number } | null>(null);

    // Zoom/SVG state passed up from child to HUD
    const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
    const svgElRef = useRef<SVGSVGElement | null>(null);

    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                const mobile = containerRef.current.clientWidth < 768;
                setIsMobile(mobile);
                if (mobile) setOrientation('VERTICAL');
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
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
            const initialY = isVertical ? 120 : height / 2;
            const scale = isVertical ? 0.4 : 0.65;
            
            const t = d3.zoomIdentity.translate(initialX, initialY).scale(scale);
            
            d3.select(svgElRef.current)
                .transition()
                .duration(750)
                .call(zoomRef.current.transform, t);
        }
    };

    const toggleOrientation = () => {
        setOrientation(prev => prev === 'HORIZONTAL' ? 'VERTICAL' : 'HORIZONTAL');
    };

    useEffect(() => {
        const timer = setTimeout(handleResetZoom, 300);
        return () => clearTimeout(timer);
    }, [isMobile, orientation]);

    const handleDoubleClick = (id: string) => {
        setMenuObjectId(id);
    };

    const handleLongPress = (id: string, x: number, y: number) => {
        setFloatingMenu({ id, x, y });
        if (navigator.vibrate) navigator.vibrate(20);
    };

    const menuObject = menuObjectId ? registry[menuObjectId] : null;
    const floatingObject = floatingMenu ? registry[floatingMenu.id] : null;

    return (
        <div ref={containerRef} className="w-full h-full relative bg-[#050508] overflow-hidden flex flex-col">
            <TreeHUD 
                nodeCount={Object.keys(registry).length}
                orientation={orientation}
                onResetZoom={handleResetZoom}
                onZoomIn={() => svgElRef.current && zoomRef.current && d3.select(svgElRef.current).transition().duration(500).call(zoomRef.current.scaleBy, 1.4)}
                onZoomOut={() => svgElRef.current && zoomRef.current && d3.select(svgElRef.current).transition().duration(500).call(zoomRef.current.scaleBy, 0.7)}
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
                onDoubleClick={handleDoubleClick}
                onLongPress={handleLongPress}
                setZoomRef={(z) => zoomRef.current = z}
                setSvgRef={(s) => svgElRef.current = s}
            />

            {/* Desktop Full Menu */}
            {menuObject && (
                <QuickActionMenu 
                    object={menuObject}
                    registry={registry}
                    onClose={() => setMenuObjectId(null)}
                    onInspect={(id) => {
                        onSelect(id);
                        onViewModeChange?.('INSPECTOR');
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
                    onSelectNode={onSelect}
                />
            )}

            {/* Mobile Contextual Arc Menu */}
            {floatingObject && floatingMenu && (
                <FloatingContextualMenu 
                    object={floatingObject}
                    x={floatingMenu.x}
                    y={floatingMenu.y}
                    onClose={() => setFloatingMenu(null)}
                    onInspect={(id) => {
                        onSelect(id);
                        onViewModeChange?.('INSPECTOR');
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
