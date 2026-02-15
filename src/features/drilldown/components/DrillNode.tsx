import React, { useMemo } from 'react';
import {
  NexusObject,
  NexusNote,
  NexusLink,
  isContainer,
  isReified,
  isNote,
  isLink,
  isBinaryLink,
  isM2M,
} from '../../../types';
import {
  getCategoryColor,
  getCategoryIconSvg,
} from '../../shared/structure/components/visualizer/NodeTemplates';
import { IntegrityReport } from '../../integrity/GraphIntegrityService';
import { VisibleNode } from '../hooks/useDrilldownRegistry';
import {
  getTimeState,
  getEffectiveDate,
  isHistoricalSnapshot,
  getConnectedNodeIds,
} from '../../../core/utils/nexus-accessors';
import { RegistryIndexes } from '../hooks/useRegistryIndexes';

// Sub-components
import { DrillNodeMicro } from './drill-node/DrillNodeMicro';
import { DrillNodeHeader } from './drill-node/DrillNodeHeader';
import { DrillNodeDetails } from './drill-node/DrillNodeDetails';
import { DrillNodeNavigation } from './drill-node/DrillNodeNavigation';

interface DrillNodeProps {
  object: VisibleNode;
  zoomScale: number;
  fullRegistry: Record<string, NexusObject>;
  indexes: RegistryIndexes;
  isFocus?: boolean;
  isHovered?: boolean;
  integrityReport?: IntegrityReport;
  onLinkClick?: (id: string) => void;
  timeNavigation?: {
    nextId?: string;
    prevId?: string;
    onNext?: () => void;
    onPrev?: () => void;
  } | null;
}

export const DrillNode: React.FC<DrillNodeProps> = ({
  object,
  zoomScale,
  fullRegistry,
  indexes,
  isFocus,
  isHovered,
  integrityReport,
  onLinkClick,
  timeNavigation,
}) => {
  const isLODDetailed = zoomScale > 0.45 || isFocus || isHovered;
  const isLODMicro = zoomScale < 0.15 && !isHovered && !isFocus;

  const nexusObj = object as NexusObject;
  const reified = isReified(nexusObj);

  // Optimized Property Access via Indexes
  const category = isNote(nexusObj) ? nexusObj.category_id : 'CONCEPT';
  const isStateNode = category === 'STATE';
  const isParentPath = object.pathType === 'ancestor';
  const isAuthorNote = isNote(nexusObj) && nexusObj.is_ghost;

  const isReifiedTarget = useMemo(() => {
    const incoming = indexes.linksByTarget.get(nexusObj.id) || [];
    return incoming.some((l) => isReified(l));
  }, [indexes, nexusObj.id]);

  let categoryColor = getCategoryColor(category);
  if (isAuthorNote) categoryColor = '#f59e0b';
  if (reified) categoryColor = 'var(--accent-color)';

  const logicColor = isParentPath
    ? 'var(--arcane-color)'
    : object.pathType === 'descendant'
      ? 'var(--essence-color)'
      : 'var(--accent-color)';

  const color =
    isFocus || isParentPath || object.pathType === 'descendant' ? logicColor : categoryColor;

  const iconSvg = isAuthorNote
    ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
    : isStateNode
      ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`
      : getCategoryIconSvg(category, color, reified);

  const isC = isContainer(nexusObj);

  const title = useMemo(() => {
    if (isNote(nexusObj)) return nexusObj.title;
    if (isLink(nexusObj)) return nexusObj.verb;
    return nexusObj.id.slice(0, 8);
  }, [nexusObj]);

  const reifiedContext = useMemo(() => {
    if (!reified) return null;

    if (isM2M(nexusObj)) {
      // M2M hub: show global verb + participant count
      const hub = nexusObj as unknown as {
        global_verb: string;
        participants: { node_id: string; role_id: string; verb: string }[];
      };
      const participantNames = hub.participants.map((p) => {
        const pObj = fullRegistry[p.node_id];
        return pObj && isNote(pObj) ? pObj.title : p.role_id;
      });
      return {
        sourceName: participantNames[0] || 'Unknown',
        targetName: `+${hub.participants.length - 1} more`,
        verb: hub.global_verb,
        isM2M: true,
        participantCount: hub.participants.length,
      };
    }

    // Binary reified link
    if (isBinaryLink(nexusObj)) {
      const linkLike = nexusObj as unknown as NexusLink;
      const source = fullRegistry[linkLike.source_id];
      const target = fullRegistry[linkLike.target_id];

      const getTitle = (obj: NexusObject | undefined) => {
        if (!obj) return 'Unknown';
        if (isNote(obj)) return obj.title;
        return obj.id.slice(0, 8);
      };

      return {
        sourceName: getTitle(source),
        targetName: getTitle(target),
        verb: linkLike.verb,
        isM2M: false,
        participantCount: 2,
      };
    }

    return null;
  }, [reified, nexusObj, fullRegistry]);

  const timeState = getTimeState(nexusObj);
  const effectiveDate = getEffectiveDate(nexusObj);
  const isSnapshot = isHistoricalSnapshot(nexusObj);
  const createdAt = isNote(nexusObj) ? nexusObj.created_at : undefined;
  const tags = isNote(nexusObj) ? nexusObj.tags : [];
  const childrenCount =
    (isContainer(nexusObj) && (nexusObj as NexusNote).children_ids?.length) || 0;
  const gist = isNote(nexusObj) ? nexusObj.gist : 'Fragment resolved from global neural memory.';

  if (isLODMicro) {
    return (
      <DrillNodeMicro
        iconSvg={iconSvg}
        color={color}
        isAuthorNote={isAuthorNote}
        reified={reified}
        integrityReport={integrityReport}
      />
    );
  }

  return (
    <foreignObject
      width={isLODDetailed ? '1000' : '800'}
      height={isLODDetailed ? (reified ? '850' : '750') : '280'}
      x={isLODDetailed ? '-500' : '-400'}
      y={isLODDetailed ? (reified ? '-425' : '-375') : '-140'}
      className="overflow-visible"
    >
      <div
        className={`
          w-full h-full flex flex-col rounded-[72px] border-[4px] transition-[transform,box-shadow,border-color,background-color] duration-300 pointer-events-auto cursor-pointer group relative
          ${isFocus ? 'ring-[32px] ring-nexus-accent/15 z-50 shadow-[0_80px_200px_-50px_rgba(0,0,0,0.5)]' : 'shadow-[0_40px_100px_rgba(0,0,0,0.4)]'}
          ${isC || reified ? 'border-dashed' : 'border-solid'}
          ${reified && reifiedContext?.isM2M ? 'bg-nexus-900 ring-4 ring-amber-500/15 border-double' : reified ? 'bg-nexus-900 ring-4 ring-nexus-accent/10' : isAuthorNote ? 'bg-nexus-900 border-amber-500' : 'bg-nexus-900'}
        `}
        style={{
          borderColor: isFocus ? 'var(--accent-color)' : isHovered ? color : `${color}80`,
          transform: isFocus
            ? 'scale(1.15)'
            : isHovered
              ? 'scale(1.06)'
              : isReifiedTarget
                ? 'scale(1.08)'
                : 'scale(1)',
        }}
      >
        <div className="flex flex-row items-center w-full min-h-0">
          <DrillNodeHeader
            iconSvg={iconSvg}
            color={color}
            title={title}
            category={isAuthorNote ? "Author's Note" : category}
            isFocus={!!isFocus}
            isAuthorNote={isAuthorNote}
            reified={reified}
            isSnapshot={isSnapshot}
            effectiveDate={effectiveDate}
            timeState={timeState}
            createdAt={createdAt}
            mass={nexusObj.total_subtree_mass || 0.0}
            integrityReport={integrityReport}
          />
          {timeNavigation && <DrillNodeNavigation timeNavigation={timeNavigation} />}
        </div>

        {isLODDetailed && (
          <DrillNodeDetails
            gist={gist}
            tags={tags}
            fullRegistry={fullRegistry}
            onLinkClick={onLinkClick}
            isAuthorNote={isAuthorNote}
            reifiedContext={reifiedContext}
            integrityReport={integrityReport}
            childrenCount={childrenCount}
            objectId={nexusObj.id}
          />
        )}

        {/* Inline Tags for LOD Micro-Detailed */}
        {!isLODDetailed && tags.length > 0 && (
          <div className="flex flex-wrap gap-3 px-12 pb-12">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-black uppercase tracking-widest text-nexus-accent/60 px-3 py-1 bg-nexus-accent/5 rounded-lg border border-nexus-accent/10"
              >
                #{tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-[10px] font-black text-nexus-muted opacity-40">
                + {tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </foreignObject>
  );
};
