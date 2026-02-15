import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Link2, Trash2, Share2, Search, Sparkles, Plus, Compass, GitBranch } from 'lucide-react';
import {
  NexusObject,
  NexusNote,
  NexusLink,
  isLink,
  isReified,
  isContainer,
  isNote,
} from '../../../types';
import { VisibleNode } from '../hooks/useDrilldownRegistry';
import { GraphIntegrityService } from '../../integrity/GraphIntegrityService';
import { isHistoricalSnapshot } from '../../../core/utils/nexus-accessors';

// Sub-components
import { MenuItem } from './context-menu/MenuItem';
import { LinkSearchMenu } from './context-menu/LinkSearchMenu';
import { ReifyPromotionMenu } from './context-menu/ReifyPromotionMenu';
import { ScryEraSelectMenu } from './context-menu/ScryEraSelectMenu';

interface DrilldownContextMenuProps {
  object: NexusObject;
  registry: Record<string, NexusObject>;
  x: number;
  y: number;
  onClose: () => void;
  onInspect: (id: string) => void;
  onDrilldown: (id: string) => void;
  onDelete?: (id: string) => void;
  onReify?: (id: string) => void;
  onReifyNode?: (id: string) => void;
  onReifyNodeToLink?: (nodeId: string, sourceId: string, targetId: string) => void;
  onStartLink: (id: string) => void;
  onEstablishLink?: (
    sourceId: string,
    targetId: string,
    verb: string,
    useTimeAnchor?: boolean,
    sourceTemporalId?: string,
    targetTemporalId?: string,
  ) => void;
  onManifestSnapshot?: (nodeId: string, year: number, month?: number, day?: number) => void;
  simulatedYear?: number;
  simulatedDate?: { year: number; month: number; day: number };
}

type MenuState =
  | 'DEFAULT'
  | 'LINK_SEARCH'
  | 'REIFY_CHOOSE_SOURCE'
  | 'REIFY_CHOOSE_TARGET'
  | 'SCRY_ERA_SELECT';

export const DrilldownContextMenu: React.FC<DrilldownContextMenuProps> = ({
  object,
  registry,
  x,
  y,
  onClose,
  onInspect,
  onDrilldown,
  onDelete,
  onReify,
  onReifyNode,
  onReifyNodeToLink,
  onStartLink,
  onEstablishLink,
  onManifestSnapshot,
  simulatedYear,
  simulatedDate,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuState, setMenuState] = useState<MenuState>('DEFAULT');
  const [searchQuery, setSearchQuery] = useState('');
  const [reifySelection, setReifySelection] = useState<{ sourceId?: string; targetId?: string }>(
    {},
  );
  const [useTimeAnchor, setUseTimeAnchor] = useState(true);
  const [scryDate, setScryDate] = useState<{ year: number; month?: number; day?: number }>({
    year: simulatedYear || 2026,
    month: simulatedDate?.month,
    day: simulatedDate?.day,
  });

  const reified = isReified(object);
  const isL = isLink(object) && !reified;

  const getObjectTitle = useCallback(
    (obj: NexusObject): string => {
      if (isNote(obj)) return obj.title;
      if (isLink(obj)) return obj.verb;
      if (reified && 'title' in obj) return (obj as unknown as NexusNote).title || 'Reified Unit';
      return 'Untitled Unit';
    },
    [reified],
  );

  const title = getObjectTitle(object);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const neighbors = useMemo(() => {
    if (isLink(object)) return [];
    return (Object.values(registry) as NexusObject[])
      .filter((l) => isLink(l) && (l.source_id === object.id || l.target_id === object.id))
      .map((l) => {
        const link = l as NexusLink;
        const neighborId = link.source_id === object.id ? link.target_id : link.source_id;
        return registry[neighborId];
      })
      .filter(Boolean);
  }, [object, registry]);

  const isEligibleForNodeReify = useMemo(() => {
    if (isLink(object) || reified || isContainer(object)) return false;
    const parentMap = GraphIntegrityService.buildHierarchyMap(registry);
    return (parentMap[object.id] || []).length > 0;
  }, [object, registry, reified]);

  const isEligibleForCausalPromotion = neighbors.length >= 2 && !isLink(object);

  const handleReifyChoice = (id: string) => {
    if (menuState === 'REIFY_CHOOSE_SOURCE') {
      setReifySelection({ sourceId: id });
      setMenuState('REIFY_CHOOSE_TARGET');
    } else if (menuState === 'REIFY_CHOOSE_TARGET') {
      if (onReifyNodeToLink && reifySelection.sourceId) {
        onReifyNodeToLink(object.id, reifySelection.sourceId, id);
      }
      onClose();
    }
  };

  const isSnapshot = isHistoricalSnapshot(object);

  const resetToDefault = () => setMenuState('DEFAULT');

  return (
    <div
      ref={menuRef}
      className="fixed z-[500] w-[260px] bg-nexus-900/95 backdrop-blur-2xl border border-nexus-700 rounded-[32px] shadow-2xl py-3 animate-in fade-in zoom-in-95 duration-150 pointer-events-auto"
      style={{
        left: Math.min(x, window.innerWidth - 280),
        top: Math.min(y, window.innerHeight - 450),
      }}
    >
      <div className="px-6 py-4 border-b border-nexus-800/50 mb-2">
        <div className="text-[9px] font-display font-black text-nexus-muted uppercase tracking-[0.3em] mb-1 opacity-60">
          {menuState === 'REIFY_CHOOSE_SOURCE'
            ? 'PROMOTION: SELECT ORIGIN'
            : menuState === 'REIFY_CHOOSE_TARGET'
              ? 'PROMOTION: SELECT TERMINAL'
              : menuState === 'SCRY_ERA_SELECT'
                ? 'TEMPORAL MANIFESTATION'
                : reified
                  ? 'Reified Unit'
                  : isL
                    ? 'Logic Stream'
                    : 'Unit Signature'}
        </div>
        <div className="text-[14px] font-display font-black text-nexus-text truncate">{title}</div>
      </div>

      <div className="px-2 space-y-1">
        {menuState === 'DEFAULT' && (
          <>
            {(!isLink(object) || reified) && (
              <MenuItem
                icon={Compass}
                label="Drill Down"
                desc="Refocus graph skeleton"
                onClick={() => {
                  onDrilldown(object.id);
                  onClose();
                }}
                color="text-nexus-accent"
              />
            )}
            <MenuItem
              icon={Search}
              label="Inspect Manifest"
              desc="Full record access"
              onClick={() => {
                onInspect(object.id);
                onClose();
              }}
              color="text-nexus-accent opacity-70"
            />

            {isL ? (
              <MenuItem
                icon={Share2}
                label="Reify Logic"
                desc="Promote connection to unit"
                onClick={() => {
                  onReify?.(object.id);
                  onClose();
                }}
                color="text-amber-500"
              />
            ) : (
              <>
                {isEligibleForCausalPromotion && (
                  <MenuItem
                    icon={Share2}
                    label="Promote to Causal"
                    desc="Convert unit to active link"
                    onClick={() => setMenuState('REIFY_CHOOSE_SOURCE')}
                    color="text-amber-400"
                  />
                )}
                {isEligibleForNodeReify && onReifyNode && (
                  <MenuItem
                    icon={GitBranch}
                    label="Promote Structural"
                    desc="Convert to container unit"
                    onClick={() => {
                      onReifyNode?.(object.id);
                      onClose();
                    }}
                    color="text-amber-500 opacity-70"
                  />
                )}
                <MenuItem
                  icon={Link2}
                  label="Connect"
                  desc="Manual scry link"
                  onClick={() => onStartLink(object.id)}
                  color="text-nexus-essence"
                />
                <MenuItem
                  icon={Plus}
                  label="Search Registry"
                  desc="Find target by name"
                  onClick={() => setMenuState('LINK_SEARCH')}
                  color="text-nexus-essence opacity-70"
                />
              </>
            )}

            {!isSnapshot && (
              <MenuItem
                icon={Sparkles}
                label="Scry Era"
                desc={`Snapshot history`}
                onClick={() => setMenuState('SCRY_ERA_SELECT')}
                color="text-fuchsia-400"
              />
            )}

            <div className="h-px bg-nexus-800/50 my-2 mx-4" />

            <MenuItem
              icon={Trash2}
              label="Terminate"
              desc="Purge from Nexus"
              color="text-red-500"
              onClick={() => {
                if (onDelete) onDelete(object.id);
                onClose();
              }}
            />
          </>
        )}

        {menuState === 'LINK_SEARCH' && (
          <LinkSearchMenu
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onBack={resetToDefault}
            onClose={onClose}
            onSelect={(targetId) => {
              const sourceTemporalId = (object as VisibleNode).activeTemporalId;
              const targetNode = registry[targetId] as VisibleNode;
              onEstablishLink?.(
                object.id,
                targetId,
                'mentions',
                useTimeAnchor,
                sourceTemporalId,
                targetNode?.activeTemporalId,
              );
              onClose();
            }}
            registry={registry}
            excludeId={object.id}
            useTimeAnchor={useTimeAnchor}
            setUseTimeAnchor={setUseTimeAnchor}
            simulatedYear={simulatedYear}
            getObjectTitle={getObjectTitle}
          />
        )}

        {(menuState === 'REIFY_CHOOSE_SOURCE' || menuState === 'REIFY_CHOOSE_TARGET') && (
          <ReifyPromotionMenu
            menuState={menuState}
            onBack={resetToDefault}
            neighbors={neighbors}
            reifySelection={reifySelection}
            handleReifyChoice={handleReifyChoice}
            getObjectTitle={getObjectTitle}
          />
        )}

        {menuState === 'SCRY_ERA_SELECT' && (
          <ScryEraSelectMenu
            scryDate={scryDate}
            setScryDate={setScryDate}
            onBack={resetToDefault}
            onManifest={() => {
              onManifestSnapshot?.(object.id, scryDate.year, scryDate.month, scryDate.day);
              onClose();
            }}
          />
        )}
      </div>
    </div>
  );
};
