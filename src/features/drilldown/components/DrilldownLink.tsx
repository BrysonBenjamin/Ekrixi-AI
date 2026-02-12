import React from 'react';
import { SimulationLink, SimulationNode } from '../hooks/useDrilldownSimulation';
import { NexusObject } from '../../../types';
import { VisibleNode } from '../hooks/useDrilldownRegistry';
import { IntegrityReport } from '../../integrity/GraphIntegrityService';

interface DrilldownLinkProps {
  link: SimulationLink;
  registry: Record<string, VisibleNode>;
  fullRegistry: Record<string, NexusObject>;
  focusId?: string;
  integrityFocus?: { linkId: string; path?: string[]; mode: 'CENTER' | 'DRILL' } | null;
  integrityMap: Record<string, IntegrityReport>;
  hoveredLinkId: string | null;
  activeFilterId: string | null;
  onHover: (id: string | null) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
}

export const DrilldownLink: React.FC<DrilldownLinkProps> = ({
  link,
  registry,
  focusId,
  integrityFocus,
  integrityMap,
  hoveredLinkId,
  activeFilterId,
  onHover,
  onContextMenu,
}) => {
  const sourceNode = link.source as SimulationNode;
  const targetNode = link.target as SimulationNode;

  if (
    sourceNode.x === undefined ||
    sourceNode.y === undefined ||
    targetNode.x === undefined ||
    targetNode.y === undefined ||
    isNaN(sourceNode.x)
  ) {
    return null;
  }

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
  let isUpstream = targetPath === 'ancestor' || (sourcePath === 'ancestor' && isTargetFocus);
  let isDownstream = (isSourceFocus || sourcePath === 'descendant') && targetPath === 'descendant';

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
      className={`link-group ${isAnomalyFocus ? 'animate-pulse' : ''}`}
      style={{ opacity: globalOpacity }}
      onMouseEnter={() => onHover(link.id)}
      onMouseLeave={() => onHover(null)}
    >
      <path
        d={`M${visualSource.x},${visualSource.y}A${dr},${dr} 0 0,1 ${visualTarget.x},${visualTarget.y}`}
        fill="none"
        stroke="transparent"
        strokeWidth="100"
        className="pointer-events-auto cursor-pointer"
        onContextMenu={(e) => onContextMenu(e, link.id)}
      />

      {/* Flow Animation Path */}
      <path
        d={`M${visualSource.x},${visualSource.y}A${dr},${dr} 0 0,1 ${visualTarget.x},${visualTarget.y}`}
        fill="none"
        stroke={flowColor}
        strokeWidth={
          link.isStructuralLine ? 16 : isAnomalyFocus ? 20 : isPartOfAnomalyPath ? 16 : 8
        }
        className={`${
          link.isStructuralLine ? 'structural-path-flow opacity-60' : 'link-path-flow'
        } pointer-events-none`}
        filter={link.isStructuralLine ? 'url(#sigil-glow)' : 'none'}
      />

      {/* Static Underlying Path for clarity */}
      <path
        d={`M${visualSource.x},${visualSource.y}A${dr},${dr} 0 0,1 ${visualTarget.x},${visualTarget.y}`}
        fill="none"
        stroke={flowColor}
        strokeWidth={link.isStructuralLine ? 8 : 4}
        opacity="0.3"
        className="pointer-events-none"
      />

      {(isRelevant || isAnomalyFocus || isPartOfAnomalyPath) && !link.isStructuralLine && (
        <foreignObject
          x={midX - 150}
          y={midY - 60}
          width="300"
          height="120"
          className="overflow-visible pointer-events-auto"
        >
          <div className="w-full h-full flex items-center justify-center">
            <div
              onContextMenu={(e) => onContextMenu(e, link.id)}
              className={`px-8 py-4 rounded-full border shadow-2xl flex items-center gap-4 backdrop-blur-md cursor-pointer bg-nexus-900 border-nexus-800 ${
                isAnomalyFocus ? 'ring-4 ring-red-500/20' : ''
              }`}
              style={{
                color: flowColor,
                textDecoration: isRedundant && !isAnomalyFocus ? 'line-through' : 'none',
              }}
            >
              <span className="text-[14px] font-display font-black uppercase tracking-[0.3em]">
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
};
