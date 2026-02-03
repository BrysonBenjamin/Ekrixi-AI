
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Package, ArrowLeft, Edit3 } from 'lucide-react';
import { NexusObject, isContainer, NexusGraphUtils, NexusType, isLink, ContainerNote, SimpleNote, ContainmentType, DefaultLayout } from '../../types';
import { HierarchyExplorer } from './components/HierarchyExplorer';
import { StructureVisualizer } from '../structure/components/StructureVisualizer';
import { AtomicEditor } from './components/AtomicEditor';
import { generateId } from '../../utils/ids';
import { useTutorial, TutorialStep } from '../../components/shared/tutorial/TutorialSystem';

export interface RefineryBatch {
    id: string;
    name: string;
    timestamp: string;
    items: NexusObject[];
    status: 'pending' | 'processing' | 'committed';
    source: 'SCANNER' | 'IMPORT' | 'MANUAL';
    lastModified?: string;
}

interface RefineryFeatureProps {
    batches: RefineryBatch[];
    onUpdateBatch: (batchId: string, items: NexusObject[]) => void;
    onDeleteBatch: (id: string) => void;
    onCommitBatch: (batchId: string, items: NexusObject[]) => void;
}

type RefineryViewMode = 'STRUCTURE' | 'INSPECTOR' | 'SIMULATION';

interface Toast {
    id: string;
    message: string;
    type: 'error' | 'success' | 'info';
}

export const RefineryFeature: React.FC<RefineryFeatureProps> = ({ batches, onUpdateBatch, onDeleteBatch, onCommitBatch }) => {
    const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<RefineryViewMode>('STRUCTURE');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [localQueue, setLocalQueue] = useState<NexusObject[]>([]);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const { startTutorial } = useTutorial();
    
    // Track the last loaded ID to prevent view reset on auto-save
    const lastLoadedIdRef = useRef<string | null>(null);

    // Tutorial Trigger
    useEffect(() => {
        if (activeBatchId && localQueue.length > 0) {
            const steps: TutorialStep[] = [
                {
                    target: '#refinery-explorer',
                    title: 'Neural File System',
                    content: 'Drag and drop units to reparent them. Use Alt+Drag to create semantic logic attachments.',
                    position: 'right'
                },
                {
                    target: '#refinery-view-toggle',
                    title: 'Localized structure',
                    content: 'Toggle the localized structure graph to see how these specific units bind together.',
                    position: 'bottom'
                },
                {
                    target: '#refinery-inspector',
                    title: 'Atomic Inspector',
                    content: 'Modify the atomic essence here—update titles, prose, aliases, and tags.',
                    position: 'left'
                },
                {
                    target: '#refinery-export-btn',
                    title: 'Global Commitment',
                    content: 'Once your mythos is validated, commit it to the global registry.',
                    position: 'bottom'
                }
            ];
            const timer = setTimeout(() => startTutorial('refinery_onboarding', steps), 800);
            return () => clearTimeout(timer);
        }
    }, [activeBatchId]);

    // Load batch only when activeBatchId changes
    useEffect(() => {
        if (activeBatchId && activeBatchId !== lastLoadedIdRef.current) {
            const batch = batches.find(b => b.id === activeBatchId);
            if (batch) {
                const sanitized = batch.items.map(obj => ({
                    ...obj,
                    tags: (obj as any).tags || [],
                    aliases: (obj as any).aliases || [],
                    link_ids: obj.link_ids || []
                }));
                setLocalQueue(sanitized as NexusObject[]);
                setViewMode('STRUCTURE');
                setSelectedId(null);
                lastLoadedIdRef.current = activeBatchId;
            }
        }
    }, [activeBatchId, batches]);

    // Auto-save logic
    useEffect(() => {
        if (activeBatchId && localQueue.length > 0) {
            const timer = setTimeout(() => {
                onUpdateBatch(activeBatchId, localQueue);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [localQueue, activeBatchId, onUpdateBatch]);

    const registry = useMemo(() => {
        const r: Record<string, NexusObject> = {};
        localQueue.forEach(obj => r[obj.id] = obj);
        return r;
    }, [localQueue]);

    const selectedObject = useMemo(() => selectedId ? registry[selectedId] : null, [selectedId, registry]);

    const addToast = useCallback((message: string, type: 'error' | 'success' | 'info' = 'info') => {
        const id = generateId();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const updateObject = (id: string, updates: Partial<NexusObject>) => {
        setLocalQueue(prev => prev.map(obj => obj.id === id ? { ...obj, ...updates } as any : obj));
    };

    const handleReparent = (sourceId: string, targetId: string, oldParentId?: string, isReference: boolean = false) => {
        if (sourceId === targetId) return;
        const parentMap = NexusGraphUtils.buildParentMap(registry);
        if (targetId !== 'root' && NexusGraphUtils.detectCycle(targetId, sourceId, parentMap)) {
            addToast("Cycle Detected: Cannot link a parent into its own descendant.", "error");
            return;
        }

        setLocalQueue(prev => {
            let next = [...prev];
            const sourceNode = registry[sourceId];
            if (!isReference && oldParentId && oldParentId !== 'root') {
                next = next.map(node => {
                    if (node.id === oldParentId && isContainer(node)) {
                        return { ...node, children_ids: node.children_ids.filter(id => id !== sourceId) };
                    }
                    return node;
                });
                next = next.filter(node => {
                    if (isLink(node) && node._type === NexusType.HIERARCHICAL_LINK) {
                        return !(node.source_id === oldParentId && node.target_id === sourceId);
                    }
                    return true;
                });
            }

            if (targetId === 'root') {
                addToast(`Moved '${(sourceNode as any).title}' to root.`, 'success');
                return next;
            }

            const targetNode = registry[targetId];
            if (!targetNode || isLink(targetNode)) return next;

            if (!isContainer(targetNode)) {
                next = next.map(node => {
                    if (node.id === targetId) {
                        const simple = node as SimpleNote;
                        return {
                            ...simple,
                            _type: NexusType.CONTAINER_NOTE,
                            containment_type: ContainmentType.FOLDER,
                            is_collapsed: false,
                            default_layout: DefaultLayout.GRID,
                            children_ids: [sourceId]
                        } as ContainerNote;
                    }
                    return node;
                });
            } else {
                next = next.map(node => {
                    if (node.id === targetId && isContainer(node)) {
                        return { ...node, children_ids: Array.from(new Set([...node.children_ids, sourceId])) };
                    }
                    return node;
                });
            }

            const updatedTargetNode = next.find(n => n.id === targetId)!;
            const shadowLink = NexusGraphUtils.createShadowLink(updatedTargetNode.id, sourceId);
            
            return [...next, shadowLink];
        });
    };

    const handleCreateLink = (sourceId: string, targetId: string, verb: string = 'mentions') => {
        const source = registry[sourceId];
        const target = registry[targetId];
        if (!source || !target) return;
        const { link, updatedSource, updatedTarget } = NexusGraphUtils.createLink(source, target, NexusType.SEMANTIC_LINK, verb);
        setLocalQueue(prev => {
            const next = prev.map(obj => {
                if (obj.id === sourceId) return updatedSource as any;
                if (obj.id === targetId) return updatedTarget as any;
                return obj;
            });
            return [...next, link];
        });
    };

    const handleExitBatch = () => {
        if (activeBatchId) onUpdateBatch(activeBatchId, localQueue);
        lastLoadedIdRef.current = null;
        setActiveBatchId(null);
    };

    if (!activeBatchId) {
        return (
            <div className="flex flex-col h-full bg-nexus-950 p-4 md:p-8 overflow-y-auto no-scrollbar">
                <div className="flex items-end justify-between mb-8 pb-4 border-b border-nexus-800">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-nexus-accent/10 rounded-lg border border-nexus-accent/20">
                                <Package className="text-nexus-accent" size={24} />
                            </div>
                            <h1 className="text-2xl font-display font-black text-nexus-text tracking-tight uppercase tracking-wider">Batch <span className="text-nexus-500">Inbox</span></h1>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {batches.map(batch => (
                        <div 
                            key={batch.id}
                            className="group relative bg-nexus-900 border border-nexus-800 hover:border-nexus-accent/50 hover:bg-nexus-800/40 rounded-3xl p-6 transition-all duration-300 flex flex-col shadow-xl"
                        >
                            <h3 className="text-nexus-text font-display font-bold text-lg mb-6 truncate">{batch.name}</h3>
                            <button 
                                onClick={() => setActiveBatchId(batch.id)}
                                className="mt-auto w-full py-3 rounded-2xl bg-nexus-800 border border-nexus-700 hover:bg-nexus-accent hover:text-white hover:border-nexus-accent text-[10px] font-display font-black uppercase tracking-[0.2em] text-nexus-muted transition-all"
                            >
                                Open Batch
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-nexus-950 overflow-hidden relative">
            <header className="h-16 border-b border-nexus-800 bg-nexus-900/80 backdrop-blur-md flex items-center justify-between px-4 md:px-6 shrink-0 z-30">
                <div className="flex items-center gap-3 md:gap-5">
                    <button onClick={handleExitBatch} className="text-nexus-muted hover:text-nexus-text transition-colors pr-5 border-r border-nexus-800"><ArrowLeft size={18} /></button>
                    <span className="text-[11px] font-display font-black text-nexus-text tracking-[0.2em] uppercase">Refinery <span className="text-nexus-accent">System</span></span>
                </div>
                
                <div className="flex items-center gap-4">
                    <div id="refinery-view-toggle" className="flex bg-nexus-950 border border-nexus-800 rounded-full p-1 shadow-inner">
                        <button onClick={() => setViewMode('STRUCTURE')} className={`px-5 py-1.5 rounded-full text-[9px] font-display font-black uppercase tracking-widest transition-all ${viewMode === 'STRUCTURE' ? 'bg-nexus-accent text-white shadow-lg' : 'text-nexus-muted hover:text-nexus-text'}`}>STRUCTURE</button>
                        <button onClick={() => setViewMode('INSPECTOR')} className={`px-5 py-1.5 rounded-full text-[9px] font-display font-black uppercase tracking-widest transition-all ${viewMode === 'INSPECTOR' ? 'bg-nexus-accent text-white shadow-lg' : 'text-nexus-muted hover:text-nexus-text'}`}>INSPECTOR</button>
                    </div>
                    <button id="refinery-export-btn" onClick={() => onCommitBatch(activeBatchId!, localQueue)} className="px-6 py-2 bg-nexus-accent text-white rounded-full text-[10px] font-display font-black uppercase tracking-[0.15em] shadow-lg shadow-nexus-accent/20 hover:brightness-110 transition-all">EXPORT</button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden relative">
                <div id="refinery-explorer" className="h-full">
                    <HierarchyExplorer 
                        items={localQueue} 
                        selectedId={selectedId} 
                        onSelect={(id) => {
                            setSelectedId(id);
                        }} 
                        onReparent={handleReparent} 
                    />
                </div>

                <main className="flex-1 relative flex flex-col bg-nexus-950 overflow-hidden border-l border-nexus-800/30">
                    {viewMode === 'STRUCTURE' ? (
                        <StructureVisualizer 
                            registry={registry} 
                            selectedId={selectedId} 
                            onSelect={setSelectedId} 
                            onReparent={handleReparent} 
                            onInspect={(id) => {
                                setSelectedId(id);
                                setViewMode('INSPECTOR');
                            }}
                        />
                    ) : (
                        <div id="refinery-inspector" className="flex-1 flex items-center justify-center p-8 overflow-y-auto no-scrollbar bg-nexus-950">
                            {selectedObject ? (
                                <AtomicEditor 
                                    object={selectedObject} 
                                    registry={registry} 
                                    onUpdate={(u) => updateObject(selectedObject.id, u)} 
                                    onCreateLink={handleCreateLink} 
                                />
                            ) : (
                                <div className="text-center opacity-30 animate-pulse flex flex-col items-center gap-6">
                                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-nexus-muted flex items-center justify-center">
                                        <Edit3 size={32} className="text-nexus-muted" />
                                    </div>
                                    <p className="text-[10px] font-display font-black uppercase tracking-[0.4em] text-nexus-text">Establish Scrying Focus</p>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>

            {/* Toasts */}
            <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-[100]">
                {toasts.map(t => (
                    <div key={t.id} className={`px-5 py-3 rounded-2xl border shadow-2xl animate-in slide-in-from-right-4 duration-300 font-display font-bold text-[11px] ${t.type === 'error' ? 'bg-red-500/10 border-red-500 text-red-500 backdrop-blur-xl' : 'bg-nexus-accent/10 border-nexus-accent text-nexus-accent backdrop-blur-xl'}`}>
                        {t.message}
                    </div>
                ))}
            </div>
        </div>
    );
};
