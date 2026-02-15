import React from 'react';
import { SimulationLink, SimulationNode } from '../hooks/useDrilldownSimulation';
import { NexusObject, isLink } from '../../../types';
import { VisibleNode } from '../hooks/useDrilldownRegistry';
import { IntegrityReport } from '../../integrity/GraphIntegrityService';
import { isHistoricalSnapshot } from '../../../core/utils/nexus-accessors';

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

  // Extract qualifiers from the original link object
  const linkObj =
    link.id.startsWith('bubbled-') || link.id.includes('-structural-') || link.id.includes('-m2m-')
      ? null
      : ((registry[link.id] as unknown as NexusObject | undefined) ?? null);
  const qualifiers =
    linkObj && isLink(linkObj)
      ? (linkObj as unknown as { qualifiers?: Record<string, string | number | boolean> })
          .qualifiers
      : undefined;
  const hasQualifiers = qualifiers && Object.keys(qualifiers).length > 0;

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

  // TEMPORAL OPACITY LOGIC
  const isTemporalActive = link.isTemporalActive !== false; // Default to true if undefined
  const baseOpacity = isTemporalActive ? (isRedundant ? 0.6 : 0.8) : 0.15; // Dim inactive links

  const globalOpacity = isAnomalyFocus
    ? 1
    : isPartOfAnomalyPath
      ? 0.9
      : isRelevant
        ? Math.max(baseOpacity, 0.4) // Boost visibility if hovered even if inactive
        : baseOpacity;

  const dx = visualTarget.x! - visualSource.x!;
  const dy = visualTarget.y! - visualSource.y!;
  const dr = Math.sqrt(dx * dx + dy * dy) * 1.8;
  const midX = (visualSource.x! + visualTarget.x!) / 2;
  const midY = (visualSource.y! + visualTarget.y!) / 2;

  // Only show arrows for active links to reduce noise on inactive/dim ones
  const showArrow = isTemporalActive && !link.isStructuralLine;

  const isHistoricalContext =
    isHistoricalSnapshot(visualSource.object) || isHistoricalSnapshot(visualTarget.object);

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
        strokeWidth="100" // Hitbox
        className="pointer-events-auto cursor-pointer"
        onContextMenu={(e) => onContextMenu(e, link.id)}
      />

      {/* Flow Animation Path (Active Links Only) */}
      {isTemporalActive && (
        <path
          d={`M${visualSource.x},${visualSource.y}A${dr},${dr} 0 0,1 ${visualTarget.x},${visualTarget.y}`}
          fill="none"
          stroke={flowColor}
          strokeWidth={
            link.isStructuralLine ? 16 : isAnomalyFocus ? 20 : isPartOfAnomalyPath ? 16 : 8
          }
          strokeDasharray={link.isStructuralLine ? 'none' : isHistoricalContext ? '4 4' : 'none'}
          className={`${
            link.isStructuralLine ? 'structural-path-flow opacity-60' : 'link-path-flow'
          } pointer-events-none`}
          filter={link.isStructuralLine ? 'url(#sigil-glow)' : 'none'}
        />
      )}

      {/* Static Underlying Path (Always Visible, includes Arrow) */}
      <path
        d={`M${visualSource.x},${visualSource.y}A${dr},${dr} 0 0,1 ${visualTarget.x},${visualTarget.y}`}
        fill="none"
        stroke={flowColor}
        strokeWidth={link.isStructuralLine ? 8 : 4}
        opacity={isTemporalActive ? 0.3 : 1.0} // If inactive, this is the main visual, keep opacity high relative to the group opacity
        markerEnd={showArrow ? 'url(#arrow-head)' : undefined}
        className="pointer-events-none"
      />

      {(isRelevant || isAnomalyFocus || isPartOfAnomalyPath) &&
        !link.isStructuralLine &&
        isTemporalActive && (
          <foreignObject
            x={midX - 150}
            y={midY - 60}
            width="340"
            height={hasQualifiers ? '160' : '120'}
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
                {hasQualifiers && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(qualifiers!)
                      .slice(0, 4)
                      .map(([k, v]) => (
                        <span
                          key={k}
                          className="text-[9px] px-2 py-0.5 bg-nexus-800/80 border border-nexus-700/50 rounded-full text-nexus-muted font-mono"
                        >
                          {k}: {String(v)}
                        </span>
                      ))}
                    {Object.keys(qualifiers!).length > 4 && (
                      <span className="text-[9px] text-nexus-muted/50 font-mono">
                        +{Object.keys(qualifiers!).length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </foreignObject>
        )}
    </g>
  );
};
