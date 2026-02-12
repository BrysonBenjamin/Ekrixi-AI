import React, { useMemo, useCallback } from 'react';
import { NexusObject, isLink } from '../../types';
import { DrilldownCanvas } from './components/DrilldownCanvas';
import { ShieldAlert } from 'lucide-react';
import { IntegrityAssistant } from '../integrity/components/IntegrityAssistant';
import { InspectorPanel } from '../shared/inspector/InspectorPanel';
import { useDrilldownState } from './hooks/useDrilldownState';
import { DrilldownHeader } from './components/DrilldownHeader';
import { DrilldownFooter } from './components/DrilldownFooter';
import { useDrilldownHandlers } from './hooks/useDrilldownHandlers';
import { useDrilldownRegistry } from './hooks/useDrilldownRegistry';

interface DrilldownFeatureProps {
  registry: Record<string, NexusObject>;
  onSelectNote: (id: string) => void;
  onRegistryUpdate?: React.Dispatch<React.SetStateAction<Record<string, NexusObject>>>;
  integrityFocus?: { linkId: string; path?: string[]; mode: 'CENTER' | 'DRILL' } | null;
  onSetIntegrityFocus?: (
    data: { linkId: string; path?: string[]; mode: 'CENTER' | 'DRILL' } | null,
  ) => void;
  onResolveAnomaly?: (linkId: string, action: 'DELETE' | 'REIFY' | 'IGNORE') => void;
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

  const {
    handleUpdateItem,
    handleReifyLink,
    handleReifyNode,
    handleReifyNodeToLink,
    handleEstablishLink,
    handleReparent,
    handleDelete,
  } = useDrilldownHandlers({ selectedId, onRegistryUpdate, registry });

  const { visibleNodesRegistry } = useDrilldownRegistry({
    registry,
    currentContainerId,
    showAuthorNotes,
    activeTimeOverrides,
  });

  const selectedObject = useMemo(() => {
    return selectedId ? registry[selectedId] : null;
  }, [selectedId, registry]);

  return (
    <div className="flex flex-col h-full bg-nexus-950 relative overflow-hidden">
      <DrilldownHeader
        navStack={navStack}
        registry={registry}
        setNavStack={setNavStack}
        showAuthorNotes={showAuthorNotes}
        setShowAuthorNotes={setShowAuthorNotes}
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
          onReparent={handleReparent}
          integrityFocus={integrityFocus}
          getTimeNavigation={lookupTimeNav}
        />
        <InspectorPanel
          isOpen={showInspector}
          selectedObject={selectedObject}
          registry={registry}
          onUpdate={handleUpdateItem}
          onClose={() => setShowInspector(false)}
          onOpenWiki={onSelectNote}
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
          <button
            onClick={() => setIsIntegrityOpen(!isIntegrityOpen)}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg border backdrop-blur-md ${
              isIntegrityOpen
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                : 'bg-nexus-800/80 border-nexus-700/50 text-nexus-400 hover:text-amber-400 hover:border-amber-500/40'
            }`}
            title="Integrity Assistant"
          >
            <ShieldAlert size={28} />
          </button>
        </div>
      </div>
      <IntegrityAssistant
        isOpen={isIntegrityOpen}
        onClose={() => setIsIntegrityOpen(false)}
        registry={registry}
        onResolve={onResolveAnomaly || (() => {})}
        onFocusAnomaly={onSetIntegrityFocus || (() => {})}
      />
    </div>
  );
};
