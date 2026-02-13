import React, { useMemo } from 'react';
import { NexusObject, isContainer, isReified } from '../../../types';
import {
  getCategoryColor,
  getCategoryIconSvg,
} from '../../refinery/components/visualizer/NodeTemplates';
import { Layers, Hash, ArrowRight, Activity, ArrowUp, ArrowDown } from 'lucide-react';
import { IntegrityBadge } from '../../integrity/components/IntegrityBadge';
import { IntegrityReport } from '../../integrity/GraphIntegrityService';
import { NexusMarkdown } from '../../../components/shared/NexusMarkdown';
import { VisibleNode } from '../hooks/useDrilldownRegistry';

interface DrillNodeProps {
  object: VisibleNode;
  zoomScale: number;
  fullRegistry: Record<string, NexusObject>;
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
  isFocus,
  isHovered,
  integrityReport,
  onLinkClick,
  timeNavigation,
}) => {
  const isLODDetailed = zoomScale > 0.45 || isFocus || isHovered;
  const isLODMicro = zoomScale < 0.15 && !isHovered && !isFocus;

  const nexusObj = object as NexusObject;
  // const depth = object.depth; // unused
  const reified = isReified(nexusObj);
  const category = (object as any).category_id || 'CONCEPT';
  const isStateNode = category === 'STATE';
  const isParentPath = object.pathType === 'ancestor';
  const isAuthorNote = (object as any).is_author_note;

  const isReifiedTarget = useMemo(() => {
    return (Object.values(fullRegistry) as NexusObject[]).some(
      (obj) => isReified(obj) && (obj as any).target_id === nexusObj.id,
    );
  }, [fullRegistry, nexusObj.id]);

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
    if ((object as any).title) return (object as any).title;
    if ((object as any).verb) return (object as any).verb;
    return nexusObj.id.slice(0, 8);
  }, [object, nexusObj.id]);

  const reifiedContext = useMemo(() => {
    if (!reified) return null;
    const source = fullRegistry[(nexusObj as any).source_id];
    const target = fullRegistry[(nexusObj as any).target_id];
    return {
      sourceName: (source as any)?.title || 'Origin',
      targetName: (target as any)?.title || 'Terminal',
      verb: (nexusObj as any).verb,
    };
  }, [reified, nexusObj, fullRegistry]);

  if (isLODMicro) {
    return (
      <foreignObject
        width="120"
        height="120"
        x="-60"
        y="-60"
        className="overflow-visible pointer-events-none"
      >
        <div
          className={`w-20 h-20 rounded-full border-[5px] flex items-center justify-center transition-transform duration-700 shadow-[0_10px_30px_rgba(0,0,0,0.8)] ${isAuthorNote ? 'bg-nexus-900 border-amber-500' : reified ? 'bg-nexus-900 border-nexus-accent shadow-[0_0_20px_var(--accent-color)]' : 'bg-nexus-900'}`}
          style={{ borderColor: color, opacity: 1 }}
        >
          <div dangerouslySetInnerHTML={{ __html: iconSvg }} className="scale-[2.2]" />
          {integrityReport && integrityReport.status !== 'APPROVED' && (
            <div className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 flex items-center justify-center border-2 border-nexus-900 text-[10px] text-white">
              !
            </div>
          )}
        </div>
      </foreignObject>
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
                    ${reified ? 'bg-nexus-900 ring-4 ring-nexus-accent/10' : isAuthorNote ? 'bg-nexus-900 border-amber-500' : 'bg-nexus-900'}
                `}
        style={{
          borderColor: isFocus ? 'var(--accent-color)' : isHovered ? color : `${color}80`,
          opacity: 1,
          transform: isFocus
            ? 'scale(1.15)'
            : isHovered
              ? 'scale(1.06)'
              : isReifiedTarget
                ? 'scale(1.08)'
                : 'scale(1)',
        }}
      >
        <div className="flex items-center gap-10 p-12 flex-1 min-h-0 relative z-10">
          <div
            className={`w-28 h-28 rounded-[36px] flex items-center justify-center shrink-0 border-[4px] transition-transform duration-500 group-hover:-rotate-6 ${isFocus || isHovered ? 'bg-nexus-950 border-nexus-accent shadow-xl' : 'bg-nexus-950 border-nexus-800'}`}
            style={{ borderColor: isFocus ? 'var(--accent-color)' : `${color}cc` }}
          >
            <div dangerouslySetInnerHTML={{ __html: iconSvg }} className="scale-[3.5]" />
          </div>

          <div className="flex-1 min-w-0 text-left py-4 flex flex-col justify-center">
            <div
              className={`text-[48px] font-display font-black uppercase tracking-tight leading-[1] transition-colors break-words ${isFocus ? 'text-nexus-accent' : isAuthorNote ? 'text-amber-500' : reified ? 'text-nexus-accent' : 'text-nexus-text'}`}
            >
              {title}
            </div>
            <div className="flex items-center gap-6 mt-5">
              <span
                className={`px-5 py-2 rounded-2xl border text-[14px] font-display font-black uppercase tracking-[0.25em] ${isAuthorNote ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.1)]' : reified ? 'bg-nexus-accent/10 border-nexus-accent/30 text-nexus-accent' : 'bg-nexus-800 border-nexus-700 text-nexus-muted'}`}
              >
                {isAuthorNote ? "Author's Note" : reified ? 'REIFIED LOGIC UNIT' : category}
              </span>

              {/* Temporal Snapshot Indicator */}
              {((object as any).time_state ||
                (object as any).time_data?.year !== undefined ||
                (object as any).created_at) && (
                <div
                  className={`flex items-center gap-3 px-4 py-2 rounded-2xl border text-[12px] font-mono uppercase tracking-widest transition-all ${
                    (object as any).time_state?.parent_identity_id ||
                    (object as any).time_data?.base_node_id
                      ? 'bg-nexus-accent/10 border-nexus-accent/40 text-nexus-accent shadow-[0_0_15px_rgba(var(--accent-rgb),0.1)]'
                      : 'bg-nexus-950/50 border-nexus-800 text-nexus-muted opacity-60'
                  }`}
                >
                  <Activity
                    size={14}
                    className={
                      (object as any).time_state?.parent_identity_id ? 'animate-pulse' : ''
                    }
                  />
                  {(object as any).time_state ? (
                    <>
                      {/* New Time State Display */}
                      {(object as any).time_state.effective_date.year}
                      {(object as any).time_state.valid_until && (
                        <span className="opacity-70">
                          {' '}
                          - {(object as any).time_state.valid_until.year}
                        </span>
                      )}
                    </>
                  ) : (object as any).time_data?.year ? (
                    <>
                      {/* Legacy Time Data Display */}
                      {(object as any).time_data.month && (
                        <span className="opacity-70">
                          {new Date(2000, (object as any).time_data.month - 1, 1).toLocaleString(
                            'default',
                            { month: 'short' },
                          )}
                          {(object as any).time_data.day
                            ? ` ${(object as any).time_data.day}, `
                            : ' '}
                        </span>
                      )}
                      ERA: {(object as any).time_data.year}
                    </>
                  ) : (object as any).created_at ? (
                    `ORIGIN: ${new Date((object as any).created_at).getFullYear()}`
                  ) : (
                    'ORIGIN'
                  )}
                  {((object as any).time_state?.parent_identity_id ||
                    (object as any).time_data?.base_node_id) && (
                    <span className="ml-1 opacity-80 text-[10px] bg-nexus-accent text-white px-2 py-0.5 rounded-md font-black shadow-[0_0_10px_rgba(var(--accent-rgb),0.5)]">
                      {(object as any).time_state?.is_canonical ? 'CANON' : 'SNAP'}
                    </span>
                  )}
                </div>
              )}

              {/* Internal Mass Indicator */}
              <div className="flex items-center gap-3 px-4 py-2 bg-nexus-950/50 rounded-2xl border border-nexus-800/80 text-[12px] font-mono text-nexus-muted uppercase tracking-widest">
                <div className="w-2 h-2 rounded-full bg-nexus-accent shadow-[0_0_10px_var(--accent-color)] opacity-40" />
                MASS: {(nexusObj as any).total_subtree_mass || 0.0}
              </div>

              {integrityReport && integrityReport.status !== 'APPROVED' && (
                <IntegrityBadge status={integrityReport.status} variant="minimal" />
              )}
            </div>

            {/* Inline Tags for LOD Micro-Detailed */}
            {!isLODDetailed && ((nexusObj as any).tags?.length || 0) > 0 && (
              <div className="flex flex-wrap gap-3 mt-6">
                {(nexusObj as any).tags?.slice(0, 3).map((tag: string) => (
                  <span
                    key={tag}
                    className="text-[10px] font-black uppercase tracking-widest text-nexus-accent/60 px-3 py-1 bg-nexus-accent/5 rounded-lg border border-nexus-accent/10"
                  >
                    #{tag}
                  </span>
                ))}
                {((nexusObj as any).tags?.length || 0) > 3 && (
                  <span className="text-[10px] font-black text-nexus-muted opacity-40">
                    +{(nexusObj as any).tags?.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Time Navigation Arrows */}
          {timeNavigation && (
            <div className="flex flex-col gap-3 ml-6">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  timeNavigation.onPrev?.();
                }}
                disabled={!timeNavigation.prevId}
                className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all ${timeNavigation.prevId ? 'bg-nexus-800 border-nexus-700 hover:bg-nexus-accent hover:text-white cursor-pointer' : 'opacity-20 border-transparent cursor-not-allowed'}`}
                title="Previous Era (Past)"
              >
                <ArrowUp size={24} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  timeNavigation.onNext?.();
                }}
                disabled={!timeNavigation.nextId}
                className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all ${timeNavigation.nextId ? 'bg-nexus-800 border-nexus-700 hover:bg-nexus-accent hover:text-white cursor-pointer' : 'opacity-20 border-transparent cursor-not-allowed'}`}
                title="Next Era (Future)"
              >
                <ArrowDown size={24} />
              </button>
            </div>
          )}
        </div>

        {isLODDetailed && (
          <div className="px-14 pb-16 border-t border-nexus-800 pt-12 animate-in fade-in slide-in-from-top-4 duration-700 relative z-10 flex flex-col gap-10">
            {integrityReport && integrityReport.status !== 'APPROVED' && (
              <div className="mb-0">
                <IntegrityBadge
                  status={integrityReport.status}
                  reason={integrityReport.reason}
                  isCycle={integrityReport.isCycle}
                />
              </div>
            )}

            <div className="relative">
              <div className="mb-4 text-[12px] font-display font-black text-nexus-accent uppercase tracking-[0.4em] opacity-40">
                LORE REACTION GIST
              </div>
              <NexusMarkdown
                content={`"${(object as any).gist || 'Fragment resolved from global neural memory.'}"`}
                registry={fullRegistry}
                onLinkClick={onLinkClick}
                className={`[&_p]:font-serif [&_p]:italic [&_p]:font-medium [&_p]:text-[24px] [&_p]:leading-[1.5] [&_p]:m-0 ${isAuthorNote ? '[&_p]:text-amber-200/90' : '[&_p]:text-nexus-text/90'}`}
              />

              {/* Tags in Detailed View */}
              {((nexusObj as any).tags?.length || 0) > 0 && (
                <div className="flex flex-wrap gap-4 mt-10 p-6 bg-nexus-950/30 rounded-[32px] border border-nexus-800/40">
                  {(nexusObj as any).tags?.map((tag: string) => (
                    <span
                      key={tag}
                      className="px-5 py-2.5 rounded-2xl bg-nexus-900 border border-nexus-800 text-[11px] font-black text-nexus-muted uppercase tracking-widest hover:border-nexus-accent hover:text-nexus-text transition-all cursor-default"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {reifiedContext && (
              <div className="p-8 bg-nexus-950 border border-nexus-800 rounded-[40px] flex items-center justify-between gap-6 shadow-inner">
                <div className="flex-1 min-w-0 text-center">
                  <div className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest mb-1 opacity-50">
                    Origin
                  </div>
                  <div className="text-[14px] font-bold text-nexus-text truncate">
                    {reifiedContext.sourceName}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2 shrink-0 px-4">
                  <Activity size={20} className="text-nexus-accent animate-pulse" />
                  <div className="text-[12px] font-display font-black text-nexus-accent uppercase tracking-[0.2em] italic">
                    {reifiedContext.verb}
                  </div>
                  <ArrowRight size={16} className="text-nexus-accent opacity-50" />
                </div>
                <div className="flex-1 min-w-0 text-center">
                  <div className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest mb-1 opacity-50">
                    Terminal
                  </div>
                  <div className="text-[14px] font-bold text-nexus-text truncate">
                    {reifiedContext.targetName}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-4 px-6 py-3 rounded-2xl bg-nexus-800 border border-nexus-700 text-[14px] font-display font-black text-nexus-muted uppercase tracking-widest">
                  <Layers size={20} className="opacity-40" />{' '}
                  {isC || reified ? (object as any).children_ids?.length || 0 : 0} Connections
                </div>
              </div>
              <div className="flex items-center gap-3 text-[14px] font-mono text-nexus-muted font-bold">
                <Hash size={18} className="opacity-30" /> {nexusObj.id.slice(0, 8)}
              </div>
            </div>
          </div>
        )}
      </div>
    </foreignObject>
  );
};
