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
import { useAuth } from './core/auth/AuthContext';
import { LoginFeature } from './features/auth/LoginFeature';
import { SurveyPopup } from './features/survey/components/SurveyPopup';
import { TimelineFeature } from './features/timeline/TimelineFeature';
import {
  NexusObject,
  isLink,
  NexusType,
  NexusCategory,
  ContainmentType,
  DefaultLayout,
} from './types';
import { generateId } from './utils/ids';
import { dbFixtures } from './core/services/dbFixtures';
import { useRegistryStore } from './store/useRegistryStore';
import { useUIStore } from './store/useUIStore';
import { useRefineryStore } from './store/useRefineryStore';
import { useSessionStore } from './store/useSessionStore';
import { IntroOverlay } from './features/universe-generator/components/IntroOverlay';
import { useLLM } from './features/system/hooks/useLLM';
import gsap from 'gsap';
import { Flip } from 'gsap/all';

gsap.registerPlugin(Flip);

export default function App(): React.ReactNode {
  const navigate = useNavigate();

  // Store Hooks
  const {
    registry,
    setRegistry,
    upsertObject,
    addBatch: addToRegistry,
    removeObject,
    loadUniverse,
    resetUniverse,
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

  const { activeUniverseId, updateUniverseMeta, initializeUniversesListener } = useSessionStore();
  const { user: firebaseUser, loading: authLoading } = useAuth();

  // Initialize Universes Listener
  useEffect(() => {
    // We should only listen if Firebase Auth is NOT loading and we have a valid user object from Firebase
    if (authLoading || !firebaseUser?.uid) return;

    const unsubscribe = initializeUniversesListener();
    return () => unsubscribe();
  }, [initializeUniversesListener, authLoading, firebaseUser?.uid]);

  // Global Overlay State
  const [showIntro, setShowIntro] = React.useState(() => {
    try {
      // Should only show once per browser session
      return !sessionStorage.getItem('ekrixi_intro_seen');
    } catch {
      return true;
    }
  });

  const handleIntroComplete = () => {
    // Mark intro as seen
    try {
      sessionStorage.setItem('ekrixi_intro_seen', 'true');
    } catch (e) {
      console.warn('Failed to save intro state', e);
    }

    // Animation: Fly Overlay Logo -> Persistent Top Left Logo
    const overlayLogo = document.querySelector('#intro-logo');
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
      // Fallback if target not found
      gsap.to('#intro-background', { opacity: 0, duration: 0.5 });
      gsap.to(overlayLogo || [], {
        opacity: 0,
        duration: 0.5,
        onComplete: () => setShowIntro(false),
      });
    }
  };

  // Theme Effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Handle global navigation events
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
    if (activeUniverseId && firebaseUser?.uid && !authLoading) {
      const nodeCount = Object.keys(registry).length;
      updateUniverseMeta(activeUniverseId, { nodeCount });
    }
  }, [registry, activeUniverseId, updateUniverseMeta, firebaseUser?.uid, authLoading]);

  // Handlers
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
        title: `${('title' in source ? (source as any).title : 'Origin') || 'Origin'} → ${('title' in target ? (target as any).title : 'Terminal') || 'Terminal'}`,
        gist: `Logic: ${link.verb}`,
        prose_content: `Relationship between ${'title' in source ? (source as any).title : 'Origin'} and ${'title' in target ? (target as any).title : 'Terminal'}.`,
        category_id: NexusCategory.META,
        children_ids: [],
        containment_type: ContainmentType.FOLDER,
        is_collapsed: false,
        default_layout: DefaultLayout.GRID,
        is_ghost: false,
        aliases: [],
        tags: ['reified'],
      } as NexusObject;

      upsertObject(linkId, reifiedUnit);
    }
    setIntegrityFocus(null);
  };

  return (
    <div className="relative h-full w-full">
      {showIntro && <IntroOverlay onComplete={handleIntroComplete} />}
      <SurveyPopup />
      <AppShell>
        <Routes>
          <Route path="/login" element={<LoginFeature />} />
          <Route path="/" element={<Navigate to="/nexus" replace />} />

          <Route
            path="/playground"
            element={
              <ProtectedRoute>
                <PlaygroundFeature
                  onSeedRefinery={(items, name) => handleBatchToRefinery(items, 'IMPORT', name)}
                  onSeedRegistry={(items) => addToRegistry(items)}
                  onSeedManifesto={(blocks) => {
                    window.dispatchEvent(
                      new CustomEvent('nexus-seed-manifesto', { detail: blocks }),
                    );
                    navigate('/studio');
                  }}
                  onSeedTimeline={() => {
                    if (activeUniverseId) {
                      dbFixtures.seedTimelineScenario(activeUniverseId);
                      // Optional: Navigate to timeline or show toast
                      navigate('/timeline');
                    }
                  }}
                  onSeedWar={() => {
                    if (activeUniverseId) {
                      dbFixtures.seedWarScenario(activeUniverseId);
                      navigate('/explore');
                    }
                  }}
                />
              </ProtectedRoute>
            }
          />

          <Route
            path="/explore"
            element={
              <ProtectedRoute>
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
              </ProtectedRoute>
            }
          />

          <Route
            path="/timeline"
            element={
              <ProtectedRoute>
                <TimelineFeature
                  registry={registry}
                  onSelect={(id) => {
                    navigate('/explore');
                    setSelectedNoteId(id);
                  }}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/timeline/:nodeId"
            element={
              <ProtectedRoute>
                <TimelineFeature
                  registry={registry}
                  onSelect={(id) => {
                    // Navigate back to Drilldown focused on this ID
                    // We need a way to pass this state, or just navigate to /explore and let it handle it via URL or state
                    // Drilldown uses internal state for navStack.
                    // We might need to expose a way to set deep link.
                    // For now, let's just use navigate('/explore') and maybe set a global state or search param?
                    // Currently navigate('/explore') resets stack? No, Drilldown uses internal state.
                    // But Drilldown handles `integrityFocus` prop.
                    // Let's just navigate to explore, and maybe Drilldown should read from URL params?
                    // Implementing full deep linking is out of scope.
                    // But the prop `onSelect` in TimelineFeature navigates to /explore currently.
                    // We can improve this later.
                    navigate('/explore');
                    // We might want to set selectedNoteId too, but Drilldown handles that internally?
                    // Let's just update the selected note so Drilldown *might* pick it up if it reads it.
                    setSelectedNoteId(id);
                  }}
                />
              </ProtectedRoute>
            }
          />

          <Route
            path="/studio"
            element={
              <ProtectedRoute>
                <StoryStudioFeature
                  onCommitBatch={(items) => {
                    addToRegistry(items);
                  }}
                  registry={registry}
                />
              </ProtectedRoute>
            }
          />

          <Route
            path="/nexus"
            element={
              <ProtectedRoute>
                <UniverseGeneratorFeature
                  onScan={handleScanLore}
                  registry={registry}
                  activeUniverseId={activeUniverseId}
                />
              </ProtectedRoute>
            }
          />

          <Route
            path="/scanner"
            element={
              <ProtectedRoute>
                <ScannerFeature
                  onCommitBatch={(items) => handleBatchToRefinery(items, 'SCANNER')}
                  registry={registry}
                  initialText={pendingScanText}
                  onClearPendingText={() => setPendingScanText('')}
                />
              </ProtectedRoute>
            }
          />

          <Route
            path="/refinery"
            element={
              <ProtectedRoute>
                <RefineryFeature
                  batches={refineryBatches}
                  onUpdateBatch={(id, items) => updateBatchItems(id, items)}
                  _onDeleteBatch={(id) => deleteRefineryBatch(id)}
                  onCommitBatch={handleCommitBatch}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/refinery/:batchId"
            element={
              <ProtectedRoute>
                <RefineryFeature
                  batches={refineryBatches}
                  onUpdateBatch={(id, items) => updateBatchItems(id, items)}
                  _onDeleteBatch={(id) => deleteRefineryBatch(id)}
                  onCommitBatch={handleCommitBatch}
                />
              </ProtectedRoute>
            }
          />

          <Route
            path="/registry"
            element={
              <ProtectedRoute>
                <StructureFeature
                  registry={registry}
                  onRegistryUpdate={setRegistry}
                  onNavigateToWiki={(id) => {
                    setSelectedNoteId(id);
                    navigate('/library');
                  }}
                />
              </ProtectedRoute>
            }
          />

          <Route
            path="/library"
            element={
              <ProtectedRoute>
                <WikiFeature
                  registry={registry}
                  selectedId={selectedNoteId}
                  onSelect={setSelectedNoteId}
                  onUpdateObject={handleUpdateRegistryObject}
                />
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SystemFeature
                  registry={registry}
                  onImport={(data) => setRegistry(data)}
                  onClear={() => resetUniverse()}
                  theme={theme}
                  onThemeChange={setTheme}
                />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/nexus" replace />} />
        </Routes>
      </AppShell>
    </div>
  );
}
// Protected Route Component (Moved outside App to prevent remounting)
const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  const { user, loading } = useAuth();
  const { requiresUserKey, hasKey } = useLLM();

  if (loading) return null;

  if (!user || (requiresUserKey && !hasKey)) {
    return <Navigate to="/login" replace />;
  }

  return children;
};
