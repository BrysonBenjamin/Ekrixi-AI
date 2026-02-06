import React, { useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { UniverseGeneratorFeature } from './features/universe-generator/UniverseGeneratorFeature';
import { ScannerFeature } from './features/scanner/ScannerFeature';
import { RefineryFeature, RefineryBatch } from './features/refinery/RefineryFeature';
import { StructureFeature } from './features/structure/StructureFeature';
import { SystemFeature } from './features/system/SystemFeature';
import { WikiFeature } from './features/wiki/WikiFeature';
import { DrilldownFeature } from './features/drilldown/DrilldownFeature';
import { StoryStudioFeature } from './features/story-studio/StoryStudioFeature';
import { PlaygroundFeature } from './features/playground/PlaygroundFeature';
import {
  NexusObject,
  isLink,
  NexusType,
  NexusCategory,
  ContainmentType,
  DefaultLayout,
} from './types';
import { generateId } from './utils/ids';
import { useRegistryStore } from './store/useRegistryStore';
import { useUIStore } from './store/useUIStore';
import { useRefineryStore } from './store/useRefineryStore';
import { useSessionStore } from './store/useSessionStore';
import { IntroOverlay } from './features/universe-generator/components/IntroOverlay';
import { FirstRunOnboarding } from './features/universe-generator/components/FirstRunOnboarding';
import { useLLM } from './features/system/hooks/useLLM';
import gsap from 'gsap';
import { Flip } from 'gsap/all';

gsap.registerPlugin(Flip);

export default function App() {
  const navigate = useNavigate();

  // Store Hooks
  const {
    registry,
    setRegistry,
    upsertObject,
    addBatch: addToRegistry,
    removeObject,
    loadUniverse,
  } = useRegistryStore();
  const {
    theme,
    setTheme,
    selectedNoteId,
    setSelectedNoteId,
    pendingScanText,
    setPendingScanText,
    integrityFocus,
    setIntegrityFocus,
  } = useUIStore();
  const {
    batches: refineryBatches,
    addBatch: addRefineryBatch,
    updateBatchItems,
    removeBatch: deleteRefineryBatch,
  } = useRefineryStore();

  const { activeUniverseId, updateUniverseMeta } = useSessionStore();
  const { requiresUserKey, hasKey } = useLLM();

  // Global Overlay State
  const [showIntro, setShowIntro] = React.useState(() => {
    try {
      // Should only show once per browser session
      return !sessionStorage.getItem('ekrixi_intro_seen');
    } catch {
      return true;
    }
  });
  const [showOnboarding, setShowOnboarding] = React.useState(false);

  const handleIntroComplete = () => {
    // Mark intro as seen
    try {
      sessionStorage.setItem('ekrixi_intro_seen', 'true');
    } catch (e) {
      console.warn('Failed to save intro state', e);
    }

    // Animation: Fly Overlay Logo -> Persistent Top Left Logo
    const overlayLogo = document.querySelector('#intro-logo');
    // We target the logo in the AppShell. It's rendered in DOM because AppShell is below.
    const targetLogo = document.querySelector('[data-flip-id="persistent-logo"]');

    if (overlayLogo && targetLogo) {
      const state = Flip.getState(targetLogo);

      // Ensure target is invisible during flight to avoid double vision
      gsap.set(targetLogo, { opacity: 0 });

      // Animate the Overlay Logo
      Flip.fit(overlayLogo, state, {
        duration: 1.2,
        ease: 'power4.inOut',
        scale: true,
        zIndex: 200, // Very high to fly over everything
        onStart: () => {
          // Fade out the overlay background
          gsap.to('#intro-background', { opacity: 0, duration: 1.0, ease: 'power2.inOut' });
        },
        onComplete: () => {
          // Reveal target, unmount overlay
          gsap.set(targetLogo, { opacity: 1 });
          setShowIntro(false);
        },
      });
    } else {
      // Fallback if target not found (e.g. mobile or different layout)
      gsap.to('#intro-background', { opacity: 0, duration: 0.5 });
      gsap.to(overlayLogo || [], {
        opacity: 0,
        duration: 0.5,
        onComplete: () => setShowIntro(false),
      });
    }
  };

  // Trigger onboarding if intro is done (or skipped) and we still need a key
  useEffect(() => {
    if (!showIntro && requiresUserKey && !hasKey) {
      // Small delay for smooth transition after intro flight
      const timer = setTimeout(() => setShowOnboarding(true), 800);
      return () => clearTimeout(timer);
    }
  }, [showIntro, requiresUserKey, hasKey]);

  // Theme Effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Handle global navigation events (e.g. from Chat links)
  useEffect(() => {
    const handleNexusNavigate = (event: CustomEvent<string>) => {
      const id = event.detail;
      if (id) {
        setSelectedNoteId(id);
        navigate('/library');
      }
    };

    window.addEventListener('nexus-navigate', handleNexusNavigate as EventListener);
    return () => {
      window.removeEventListener('nexus-navigate', handleNexusNavigate as EventListener);
    };
  }, [setSelectedNoteId, navigate]);

  // Session Hydration Effect
  useEffect(() => {
    if (activeUniverseId) {
      loadUniverse(activeUniverseId);
    }
  }, [activeUniverseId, loadUniverse]);

  // Update metadata on registry change
  useEffect(() => {
    if (activeUniverseId) {
      const nodeCount = Object.keys(registry).length;
      updateUniverseMeta(activeUniverseId, { nodeCount });
    }
  }, [registry, activeUniverseId, updateUniverseMeta]);

  // Handlers (Adapters for existing component props)
  const handleUpdateRegistryObject = useCallback(
    (id: string, updates: Partial<NexusObject>) => {
      upsertObject(id, updates);
    },
    [upsertObject],
  );

  const handleBatchToRefinery = (
    items: NexusObject[],
    source: RefineryBatch['source'] = 'SCANNER',
    name?: string,
  ) => {
    const newBatch: RefineryBatch = {
      id: generateId(),
      name: name || `${source}_${new Date().toLocaleTimeString().replace(/:/g, '')}`,
      timestamp: new Date().toISOString(),
      items: items,
      status: 'pending',
      source: source,
    };
    addRefineryBatch(newBatch);
    navigate('/refinery');
  };

  const handleCommitBatch = (batchId: string, items: NexusObject[]) => {
    addToRegistry(items);
    deleteRefineryBatch(batchId);
    navigate('/explore');
  };

  const handleScanLore = (text: string) => {
    setPendingScanText(text);
    navigate('/scanner');
  };

  const handleResolveAnomaly = (linkId: string, action: 'DELETE' | 'REIFY' | 'IGNORE') => {
    if (action === 'DELETE') {
      removeObject(linkId);
    } else if (action === 'REIFY') {
      const link = registry[linkId];
      if (!link || !isLink(link)) return;
      const source = registry[link.source_id];
      const target = registry[link.target_id];
      if (!source || !target) return;

      const reifiedUnit: NexusObject = {
        ...link,
        _type:
          link._type === NexusType.HIERARCHICAL_LINK
            ? NexusType.AGGREGATED_HIERARCHICAL_LINK
            : NexusType.AGGREGATED_SEMANTIC_LINK,
        is_reified: true,
        title: `${(source as any).title || 'Origin'} → ${(target as any).title || 'Terminal'}`,
        gist: `Logic: ${link.verb}`,
        prose_content: `Relationship between ${(source as any).title} and ${(target as any).title}.`,
        category_id: NexusCategory.META,
        children_ids: [],
        containment_type: ContainmentType.FOLDER,
        is_collapsed: false,
        default_layout: DefaultLayout.GRID,
        is_ghost: false,
        aliases: [],
        tags: ['reified'],
      } as any;

      upsertObject(linkId, reifiedUnit);
    }
    setIntegrityFocus(null);
  };

  return (
    <div className="relative h-full w-full">
      {showIntro && <IntroOverlay onComplete={handleIntroComplete} />}
      {showOnboarding && <FirstRunOnboarding onComplete={() => setShowOnboarding(false)} />}
      <AppShell theme={theme}>
        <Routes>
          <Route path="/" element={<Navigate to="/nexus" replace />} />

          <Route
            path="/playground"
            element={
              <PlaygroundFeature
                onSeedRefinery={(items, name) => handleBatchToRefinery(items, 'IMPORT', name)}
                onSeedRegistry={(items) => addToRegistry(items)}
                onSeedManifesto={(blocks) => {
                  window.dispatchEvent(new CustomEvent('nexus-seed-manifesto', { detail: blocks }));
                  navigate('/studio');
                }}
              />
            }
          />

          <Route
            path="/explore"
            element={
              <DrilldownFeature
                registry={registry}
                onRegistryUpdate={setRegistry}
                integrityFocus={integrityFocus}
                onSetIntegrityFocus={setIntegrityFocus}
                onResolveAnomaly={handleResolveAnomaly}
                onSelectNote={(id) => {
                  setSelectedNoteId(id);
                  navigate('/library');
                }}
              />
            }
          />

          <Route
            path="/studio"
            element={
              <StoryStudioFeature
                onCommitBatch={(items) => {
                  addToRegistry(items);
                }}
                registry={registry}
              />
            }
          />

          <Route
            path="/nexus"
            element={
              <UniverseGeneratorFeature
                onScan={handleScanLore}
                registry={registry}
                activeUniverseId={activeUniverseId}
              />
            }
          />

          <Route
            path="/scanner"
            element={
              <ScannerFeature
                onCommitBatch={(items) => handleBatchToRefinery(items, 'SCANNER')}
                registry={registry}
                initialText={pendingScanText}
                onClearPendingText={() => setPendingScanText('')}
              />
            }
          />

          <Route
            path="/refinery"
            element={
              <RefineryFeature
                batches={refineryBatches}
                onUpdateBatch={(id, items) => updateBatchItems(id, items)}
                _onDeleteBatch={(id) => deleteRefineryBatch(id)}
                onCommitBatch={handleCommitBatch}
              />
            }
          />

          <Route
            path="/registry"
            element={
              <StructureFeature
                registry={registry}
                onRegistryUpdate={setRegistry}
                onNavigateToWiki={(id) => {
                  setSelectedNoteId(id);
                  navigate('/library');
                }}
              />
            }
          />

          <Route
            path="/library"
            element={
              <WikiFeature
                registry={registry}
                selectedId={selectedNoteId}
                onSelect={setSelectedNoteId}
                onUpdateObject={handleUpdateRegistryObject}
              />
            }
          />

          <Route
            path="/settings"
            element={
              <SystemFeature
                registry={registry}
                onImport={(data) => setRegistry(data)}
                onClear={() => setRegistry({})}
                theme={theme}
                onThemeChange={setTheme}
              />
            }
          />

          <Route path="*" element={<Navigate to="/nexus" replace />} />
        </Routes>
      </AppShell>
    </div>
  );
}
