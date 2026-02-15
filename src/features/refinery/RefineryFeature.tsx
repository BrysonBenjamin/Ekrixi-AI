import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Package,
  ArrowLeft,
  FlaskConical,
  ChevronRight,
  Compass,
  ListTree,
  RotateCcw,
  RotateCw,
} from 'lucide-react';

import { NexusObject, SimpleNote } from '../../types';
import { useMCPScanner } from '../scanner/hooks/useMCPScanner';
import { RefineryOperation } from '../../core/services/MCPScannerClient';
import { RefineryInbox } from './components/RefineryInbox';
import { useSessionStore } from '../../store/useSessionStore';
import { MCPStatusBadge } from '../shared/MCPStatusBadge';
import { HierarchyExplorer } from '../shared/structure/components/HierarchyExplorer';

import { StructureVisualizer } from '../shared/structure/components/StructureVisualizer';
import { RefineryDrilldown } from './components/RefineryDrilldown';
import { InspectorSidebar } from '../shared/inspector/InspectorSidebar';
import { generateId } from '../../utils/ids';
import { useRefineryHandlers } from './hooks/useRefineryHandlers';
import { useRefineryHistory } from './hooks/useRefineryHistory';
import type { RefineryFeatureProps, ViewMode, Toast } from './types';

export type { RefineryBatch } from './types';

export const RefineryFeature: React.FC<RefineryFeatureProps> = ({
  batches,
  onUpdateBatch,
  onCommitBatch,
}) => {
  const { batchId: activeBatchId } = useParams<{ batchId: string }>();
  const activeUniverseId = useSessionStore((state) => state.activeUniverseId);
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'STRUCTURE' | 'EXPLORER'>('STRUCTURE');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [localQueue, setLocalQueue] = useState<NexusObject[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: 'error' | 'success' | 'info' = 'info') => {
    const id = generateId();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const lastLoadedBatchId = useRef<string | null>(null);
  const [drillStack, setDrillStack] = useState<string[]>([]);
  const currentDrillFocusId = drillStack.length > 0 ? drillStack[drillStack.length - 1] : null;

  // MCP integration — fire-and-forget sync
  const { refineBatch, commitBatch, isReady: mcpReady, state: mcpState } = useMCPScanner();

  const syncToMCP = useCallback(
    (ops: RefineryOperation[]) => {
      if (!mcpReady || !activeBatchId) return;
      refineBatch(activeBatchId, ops).catch(() => {
        // MCP sync is best-effort; local state is source of truth
      });
    },
    [mcpReady, activeBatchId, refineBatch],
  );

  // Undo/Redo History
  const { canUndo, canRedo, pushState, undo, redo } = useRefineryHistory();

  // Keyboard Shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
          if (canRedo) {
            e.preventDefault();
            const result = redo(localQueue);
            if (result) {
              setLocalQueue(result.items);
              if (activeBatchId) onUpdateBatch(activeBatchId, result.items);
              syncToMCP(result.ops);
              addToast('Redo', 'info');
            }
          }
        } else {
          if (canUndo) {
            e.preventDefault();
            const result = undo(localQueue);
            if (result) {
              setLocalQueue(result.items);
              if (activeBatchId) onUpdateBatch(activeBatchId, result.items);
              syncToMCP(result.ops);
              addToast('Undo', 'info');
            }
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeBatchId, canUndo, canRedo, localQueue, onUpdateBatch, redo, syncToMCP, undo]);

  useEffect(() => {
    if (activeBatchId && activeBatchId !== lastLoadedBatchId.current) {
      const batch = batches.find((b) => b.id === activeBatchId);
      if (batch) {
        queueMicrotask(() => {
          setLocalQueue(batch.items);
          setDrillStack([]);
        });
        lastLoadedBatchId.current = activeBatchId;
      }
    } else if (!activeBatchId) {
      lastLoadedBatchId.current = null;
    }
  }, [activeBatchId, batches]);

  const registry = useMemo(() => {
    const r: Record<string, NexusObject> = {};
    localQueue.forEach((obj) => (r[obj.id] = obj));
    return r;
  }, [localQueue]);

  const selectedObject = useMemo(() => {
    if (!selectedId) return null;
    return localQueue.find((item) => item.id === selectedId) || null;
  }, [selectedId, localQueue]);

  // ── Extracted handlers (update, addChild, reparent, reify, establish, delete) ──
  const {
    handleUpdateItem,
    handleAddChild,
    handleReparent,
    handleReifyLink,
    handleReifyNode,
    handleReifyNodeToLink,
    handleEstablishLink,
    handleDeleteItem,
  } = useRefineryHandlers({
    localQueue,
    setLocalQueue,
    registry,
    activeBatchId,
    selectedId,
    setSelectedId,
    onUpdateBatch,
    syncToMCP,
    pushState,
    addToast,
  });

  const handleDrilldownAction = (id: string) => {
    setDrillStack((prev) => {
      if (prev.includes(id)) {
        const idx = prev.indexOf(id);
        return prev.slice(0, idx + 1);
      }
      return [...prev, id];
    });
    setActiveView('EXPLORER');
  };

  return (
    <div className="flex flex-col h-full bg-nexus-950 overflow-hidden relative">
      {!activeBatchId ? (
        <RefineryInbox
          batches={batches}
          onSelectBatch={(id) => navigate(`/refinery/${id}`)}
          onNavigateToPlayground={() =>
            window.dispatchEvent(new CustomEvent('nexus-navigate', { detail: 'PLAYGROUND' }))
          }
        />
      ) : (
        <div className="flex flex-col h-full">
          {/* ───── HEADER ───── */}
          <header className="h-16 border-b border-nexus-800 bg-nexus-900 flex items-center justify-between px-6 shrink-0 z-40">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/refinery')}
                className="text-nexus-muted hover:text-nexus-text flex items-center gap-2 font-display font-black text-[10px] uppercase tracking-widest transition-all"
              >
                <ArrowLeft size={16} />
                <span className="hidden sm:inline">Inbox</span>
              </button>

              {/* Batch Selector Dropdown */}
              {batches.length > 1 && (
                <div className="relative">
                  <select
                    value={activeBatchId || ''}
                    onChange={(e) => navigate(`/refinery/${e.target.value}`)}
                    className="appearance-none bg-nexus-950 border border-nexus-800 rounded-full px-4 py-1.5 text-[10px] font-display font-black uppercase tracking-widest text-nexus-text cursor-pointer hover:border-nexus-600 transition-colors pr-8"
                  >
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <ChevronRight
                    size={12}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-nexus-muted pointer-events-none"
                  />
                </div>
              )}

              {/* Breadcrumb */}
              {drillStack.length > 0 && (
                <div className="hidden md:flex items-center gap-1 text-[9px] font-mono text-nexus-muted">
                  <button
                    onClick={() => setDrillStack([])}
                    className="hover:text-nexus-text transition-colors"
                  >
                    Root
                  </button>
                  {drillStack.map((id) => (
                    <React.Fragment key={id}>
                      <ChevronRight size={10} className="opacity-30" />
                      <button
                        onClick={() => {
                          const idx = drillStack.indexOf(id);
                          setDrillStack((prev) => prev.slice(0, idx + 1));
                        }}
                        className="hover:text-nexus-accent transition-colors truncate max-w-[100px]"
                      >
                        {(registry[id] as SimpleNote)?.title || id.slice(0, 6)}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 mr-2 border-r border-nexus-800 pr-3">
                <button
                  disabled={!canUndo}
                  onClick={() => {
                    const result = undo(localQueue);
                    if (result) {
                      setLocalQueue(result.items);
                      if (activeBatchId) onUpdateBatch(activeBatchId, result.items);
                      syncToMCP(result.ops);
                      addToast('Undo', 'info');
                    }
                  }}
                  className={`p-1.5 rounded-md transition-colors ${canUndo ? 'text-nexus-text hover:bg-nexus-800' : 'text-nexus-800 cursor-not-allowed'}`}
                  title="Undo (Ctrl+Z)"
                >
                  <RotateCcw size={14} />
                </button>
                <button
                  disabled={!canRedo}
                  onClick={() => {
                    const result = redo(localQueue);
                    if (result) {
                      setLocalQueue(result.items);
                      if (activeBatchId) onUpdateBatch(activeBatchId, result.items);
                      syncToMCP(result.ops);
                      addToast('Redo', 'info');
                    }
                  }}
                  className={`p-1.5 rounded-md transition-colors ${canRedo ? 'text-nexus-text hover:bg-nexus-800' : 'text-nexus-800 cursor-not-allowed'}`}
                  title="Redo (Ctrl+Shift+Z)"
                >
                  <RotateCw size={14} />
                </button>
              </div>
              <MCPStatusBadge status={mcpState.status} compact />
              <button
                onClick={async () => {
                  if (!activeBatchId) return;
                  await commitBatch(activeBatchId, activeUniverseId || 'default');
                  addToast('Batch committed to Registry.', 'success');
                  // Optional: navigate back to inbox or clear state
                }}
                className="bg-nexus-accent text-white px-6 py-2 rounded-full font-display font-black text-[10px] uppercase tracking-widest shadow-lg shadow-nexus-accent/20 hover:brightness-110 active:scale-95 transition-all"
              >
                Commit
              </button>
            </div>
          </header>

          {/* ───── THREE-PANEL BODY ───── */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* LEFT: Hierarchy Sidebar */}
            <div
              className={`
                ${selectedId ? 'hidden md:flex' : 'flex'} 
                flex-col h-full shrink-0 z-20 transition-all duration-300 relative shadow-2xl
                w-full md:w-auto
              `}
            >
              <HierarchyExplorer
                items={localQueue}
                selectedId={selectedId}
                onSelect={(id) => {
                  setSelectedId(id);
                }}
                onReparent={handleReparent}
                onDeleteUnit={handleDeleteItem}
              />
            </div>

            {/* CENTER: Canvas */}
            <main
              className={`
                ${!selectedId ? 'hidden md:block' : 'block'} 
                flex-1 bg-[#050508] relative overflow-hidden h-full min-w-0
              `}
            >
              {/* Mobile "Back" Header */}
              <div className="md:hidden h-12 bg-nexus-900 border-b border-nexus-800 flex items-center px-4 shrink-0">
                <button
                  onClick={() => {
                    setSelectedId(null);
                  }}
                  className="flex items-center gap-2 text-xs font-bold text-nexus-muted hover:text-nexus-text"
                >
                  <ArrowLeft size={14} /> Back to List
                </button>
              </div>

              {/* Canvas Mode Toggle (inline, top-right) */}
              <div className="absolute top-4 right-4 z-30">
                <div className="flex bg-nexus-950/80 backdrop-blur-sm border border-nexus-800 rounded-full p-0.5 shadow-lg">
                  <button
                    onClick={() => setActiveView('STRUCTURE')}
                    className={`px-3 py-1 rounded-full text-[8px] font-display font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${activeView === 'STRUCTURE' ? 'bg-nexus-accent/20 text-nexus-accent' : 'text-nexus-muted hover:text-nexus-text'}`}
                  >
                    <ListTree size={10} /> Tree
                  </button>
                  <button
                    onClick={() => setActiveView('EXPLORER')}
                    className={`px-3 py-1 rounded-full text-[8px] font-display font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${activeView === 'EXPLORER' ? 'bg-nexus-accent/20 text-nexus-accent' : 'text-nexus-muted hover:text-nexus-text'}`}
                  >
                    <Compass size={10} /> Semantic
                  </button>
                </div>
              </div>

              {activeView === 'EXPLORER' ? (
                <RefineryDrilldown
                  registry={registry}
                  focusId={currentDrillFocusId}
                  navStack={drillStack}
                  onNavigateStack={(id) => {
                    setDrillStack((prev) => {
                      const existingIdx = prev.indexOf(id);
                      if (existingIdx !== -1) return prev.slice(0, existingIdx + 1);
                      return [...prev, id];
                    });
                  }}
                  onResetStack={() => setDrillStack([])}
                  onSelect={setSelectedId}
                  onViewModeChange={(mode: ViewMode) => {
                    if (mode === 'INSPECTOR') setSelectedId(selectedId);
                  }}
                  onReifyLink={handleReifyLink}
                  onReifyNode={handleReifyNode}
                  onReifyNodeToLink={handleReifyNodeToLink}
                  onReparent={handleReparent}
                  onEstablishLink={handleEstablishLink}
                  onDelete={handleDeleteItem}
                />
              ) : (
                <StructureVisualizer
                  registry={registry}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onAddChild={handleAddChild}
                  onViewModeChange={(mode: ViewMode) => {
                    if (mode === 'INSPECTOR') setSelectedId(selectedId);
                  }}
                  onDrilldown={handleDrilldownAction}
                  onDelete={handleDeleteItem}
                  onDeleteLink={handleDeleteItem}
                  onReifyLink={handleReifyLink}
                  onReifyNode={handleReifyNode}
                  onReifyNodeToLink={handleReifyNodeToLink}
                  onReparent={handleReparent}
                />
              )}
            </main>

            {/* RIGHT: Inspector (always visible on desktop when item selected) */}
            <aside
              className={`
                hidden md:block shrink-0 h-full overflow-hidden transition-all duration-300
                ${selectedObject ? 'w-[380px]' : 'w-0'}
              `}
            >
              {selectedObject && (
                <InspectorSidebar
                  object={selectedObject}
                  registry={registry}
                  onUpdate={(updates) => handleUpdateItem(selectedId!, updates)}
                  onClose={() => setSelectedId(null)}
                  onDelete={handleDeleteItem}
                  onSelect={setSelectedId}
                  embedded
                />
              )}
            </aside>
          </div>
        </div>
      )}

      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-[1000]">
        <MCPStatusBadge status={mcpState.status} compact />
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-2 rounded-xl border text-[10px] font-black shadow-2xl animate-in slide-in-from-right duration-300 ${t.type === 'error' ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-nexus-accent/10 border-nexus-accent text-nexus-accent'}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
};
