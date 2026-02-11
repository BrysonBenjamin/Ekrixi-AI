import React from 'react';
import { SimulationNode } from '../hooks/useDrilldownSimulation';
import { NexusObject, SemanticLink } from '../../../types';
import { DrillNode } from './DrillNode';
import { IntegrityReport } from '../../integrity/GraphIntegrityService';

interface DrilldownNodeWrapperProps {
  node: SimulationNode;
  fullRegistry: Record<string, NexusObject>;
  integrityFocus?: { linkId: string; path?: string[]; mode: 'CENTER' | 'DRILL' } | null;
  integrityMap: Record<string, IntegrityReport>;
  focusId?: string;
  linkingSourceId: string | null;
  lockedId: string | null;
  hoveredId: string | null;
  dragOverNodeId: string | null;
  zoomScale: number;
  onHover: (id: string | null) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  onDrilldown: (id: string) => void;
  onClick: (e: React.MouseEvent, id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  onInspect: (id: string) => void;
}

export const DrilldownNodeWrapper: React.FC<DrilldownNodeWrapperProps> = ({
  node,
  fullRegistry,
  integrityFocus,
  integrityMap,
  focusId,
  linkingSourceId,
  lockedId,
  hoveredId,
  dragOverNodeId,
  zoomScale,
  onHover,
  onContextMenu,
  onDrilldown,
  onClick,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onInspect,
}) => {
  const isPartOfAnomaly =
    integrityFocus?.path?.includes(node.id) ||
    (integrityFocus &&
      (fullRegistry[integrityFocus.linkId] as SemanticLink).source_id === node.id) ||
    (integrityFocus && (fullRegistry[integrityFocus.linkId] as SemanticLink).target_id === node.id);

  const isNodeFocus =
    node.id === focusId || linkingSourceId === node.id || lockedId === node.id || isPartOfAnomaly;

  return (
    <g
      key={node.id}
      transform={`translate(${node.x || 0},${node.y || 0})`}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      onContextMenu={(e) => onContextMenu(e, node.id)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDrilldown(node.id);
      }}
      onClick={(e) => onClick(e, node.id)}
      onDragOver={(e) => onDragOver(e, node.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, node.id)}
    >
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <g {...({ draggable: 'true' } as any)} onDragStart={(e) => onDragStart(e, node.id)}>
        <DrillNode
          object={node.object}
          zoomScale={zoomScale}
          fullRegistry={fullRegistry}
          isFocus={isNodeFocus || dragOverNodeId === node.id}
          isHovered={node.id === hoveredId}
          integrityReport={integrityMap[node.id]}
          onLinkClick={onInspect}
        />
      </g>
    </g>
  );
};
