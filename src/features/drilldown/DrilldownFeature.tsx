import React, { useMemo } from 'react';
import type { NexusObject } from '../../types';
import { applyTemporalOverride } from '../../core/utils/nexus-accessors';
import { DrilldownCanvas } from './components/DrilldownCanvas';
import { ShieldAlert } from 'lucide-react';
import { IntegrityAssistant } from '../integrity/components/IntegrityAssistant';
import { InspectorPanel } from '../shared/inspector/InspectorPanel';
import { useDrilldownState } from './hooks/useDrilldownState';
import { DrilldownHeader } from './components/DrilldownHeader';
import { DrilldownFooter } from './components/DrilldownFooter';
import { useDrilldownHandlers } from './hooks/useDrilldownHandlers';
import { useDrilldownRegistry } from './hooks/useDrilldownRegistry';
import { useRegistryStore } from '../../store/useRegistryStore';
import { useRegistryIndexes } from './hooks/useRegistryIndexes';

interface DrilldownFeatureProps {
  registry: Record<string, NexusObject>;
  onSelectNote: (id: string) => void;
  onRegistryUpdate?: React.Dispatch<React.SetStateAction<Record<string, NexusObject>>>;
  integrityFocus?: { linkId: string; path?: string[]; mode: 'CENTER' | 'DRILL' } | null;
  onSetIntegrityFocus?: (
    data: { linkId: string; path?: string[]; mode: 'CENTER' | 'DRILL' } | null,
  ) => void;
  onResolveAnomaly?: (linkId: string, action: 'DELETE' | 'REIFY' | 'IGNORE') => void;
  onRemoveBatch?: (ids: string[]) => Promise<void>;
}

export const DrilldownFeature: React.FC<DrilldownFeatureProps> = ({
  registry,
  onSelectNote,
  onRegistryUpdate,
  integrityFocus,
  onSetIntegrityFocus,
  onResolveAnomaly,
}) => {
  const {
    navStack,
    setNavStack,
    simulatedDate,
    setSimulatedDate,
    timelineBounds,
    setTimelineBounds,
    activeTimeOverrides,
    showAuthorNotes,
    setShowAuthorNotes,
    showInspector,
    setShowInspector,
    selectedId,
    setSelectedId,
    isIntegrityOpen,
    setIsIntegrityOpen,
    currentContainerId,
    currentContainer,
    timeInfo,
    handleTimeNav,
    lookupTimeNav,
    handleDrilldown,
  } = useDrilldownState({ registry, integrityFocus });

  const { removeBatch } = useRegistryStore();

  const {
    handleUpdateItem,
    handleReifyLink,
    handleReifyNode,
    handleReifyNodeToLink,
    handleEstablishLink,
    // handleReparent,
    handleDelete,
    handleManifestSnapshot,
  } = useDrilldownHandlers({
    selectedId,
    onRegistryUpdate,
    onRemoveBatch: removeBatch,
    registry,
    simulatedDate,
  });

  const indexes = useRegistryIndexes(registry);

  const { visibleNodesRegistry } = useDrilldownRegistry({
    registry,
    currentContainerId,
    showAuthorNotes,
    activeTimeOverrides,
    indexes,
  });

  const selectedObject = useMemo(() => {
    if (!selectedId) return null;
    const baseObj = registry[selectedId];
    if (!baseObj) return null;

    const overrideId = activeTimeOverrides[selectedId];
    if (overrideId && registry[overrideId]) {
      return applyTemporalOverride(baseObj, registry[overrideId]);
    }
    return baseObj;
  }, [selectedId, registry, activeTimeOverrides]);

  return (
    <div className="flex flex-col h-full bg-nexus-950 relative overflow-hidden">
      <DrilldownHeader
        navStack={navStack}
        registry={registry}
        setNavStack={setNavStack}
        showAuthorNotes={showAuthorNotes}
        setShowAuthorNotes={setShowAuthorNotes}
        simulatedDate={simulatedDate}
        setSimulatedDate={setSimulatedDate}
        timelineBounds={timelineBounds}
        onBoundsChange={setTimelineBounds}
      />
      <main className="flex-1 relative">
        <DrilldownCanvas
          registry={visibleNodesRegistry}
          fullRegistry={registry}
          onDrilldown={handleDrilldown}
          onInspect={(id) => {
            setSelectedId(id);
            setShowInspector(true);
          }}
          focusId={currentContainerId}
          onDelete={(id) => handleDelete(id)}
          onReifyLink={handleReifyLink}
          onReifyNode={handleReifyNode}
          onReifyNodeToLink={handleReifyNodeToLink}
          onEstablishLink={handleEstablishLink}
          onManifestSnapshot={handleManifestSnapshot}
          integrityFocus={integrityFocus}
          getTimeNavigation={lookupTimeNav}
          simulatedDate={simulatedDate}
          indexes={indexes}
        />
        <InspectorPanel
          isOpen={showInspector}
          selectedObject={selectedObject}
          registry={registry}
          onUpdate={(updates) => handleUpdateItem(selectedId!, updates)}
          onUpdateObject={handleUpdateItem}
          onClose={() => setShowInspector(false)}
          onOpenWiki={onSelectNote}
          onSelect={setSelectedId}
        />
      </main>
      <DrilldownFooter
        currentContainer={currentContainer}
        timeInfo={timeInfo}
        registry={registry}
        handleTimeNav={handleTimeNav}
      />

      {/* Integrity Controls - Overlaid */}
      <div className="absolute bottom-10 right-10 pointer-events-none flex flex-col gap-3 z-30">
        <div className="pointer-events-auto flex flex-col gap-3">
          {/* <button
            onClick={() => setIsIntegrityOpen(!isIntegrityOpen)}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg border backdrop-blur-md ${isIntegrityOpen
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
              : 'bg-nexus-800/80 border-nexus-700/50 text-nexus-400 hover:text-amber-400 hover:border-amber-500/40'
              }`}
            title="Integrity Assistant"
          >
            <ShieldAlert size={28} />
          </button> */}
        </div>
      </div>
      {/* <IntegrityAssistant
        isOpen={isIntegrityOpen}
        onClose={() => setIsIntegrityOpen(false)}
        registry={registry}
        onResolve={onResolveAnomaly || (() => { })}
        onFocusAnomaly={onSetIntegrityFocus || (() => { })}
      /> */}
    </div>
  );
};
