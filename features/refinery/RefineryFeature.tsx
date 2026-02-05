import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Package, ArrowLeft, Edit3, Orbit, AlertCircle, FlaskConical, ChevronRight, X, Compass, ListTree } from 'lucide-react';
import { NexusObject, isContainer, NexusType, isLink, ContainerNote, ContainmentType, DefaultLayout, isReified, NexusCategory, HierarchyType, NexusGraphUtils } from '../../types';
import { GraphIntegrityService } from '../integrity/GraphIntegrityService';
import { HierarchyExplorer } from './components/HierarchyExplorer';
import { StructureVisualizer } from './components/StructureVisualizer';
import { RefineryInspector } from './components/RefineryInspector';
import { RefineryDrilldown } from './components/RefineryDrilldown';
import { generateId } from '../../utils/ids';

export interface RefineryBatch {
    id: string;
    name: string;
    timestamp: string;
    items: NexusObject[];
    status: 'pending' | 'processing' | 'committed';
    source: 'SCANNER' | 'IMPORT' | 'MANUAL';
}

interface RefineryFeatureProps {
    batches: RefineryBatch[];
    onUpdateBatch: (batchId: string, items: NexusObject[]) => void;
    onDeleteBatch: (id: string) => void;
    onCommitBatch: (batchId: string, items: NexusObject[]) => void;
}

export const RefineryFeature: React.FC<RefineryFeatureProps> = ({ batches, onUpdateBatch, onDeleteBatch, onCommitBatch }) => {
    const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
    const [activeView, setActiveView] = useState<'STRUCTURE' | 'EXPLORER'>('STRUCTURE');
    const [showInspector, setShowInspector] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [localQueue, setLocalQueue] = useState<NexusObject[]>([]);
    const [toasts, setToasts] = useState<any[]>([]);
    
    const lastLoadedBatchId = useRef<string | null>(null);
    const [drillStack, setDrillStack] = useState<string[]>([]);
    const currentDrillFocusId = drillStack.length > 0 ? drillStack[drillStack.length - 1] : null;

    useEffect(() => {
        if (activeBatchId && activeBatchId !== lastLoadedBatchId.current) {
            const batch = batches.find(b => b.id === activeBatchId);
            if (batch) {
                setLocalQueue(batch.items);
                setDrillStack([]);
                setShowInspector(false);
                lastLoadedBatchId.current = activeBatchId;
            }
        } else if (!activeBatchId) {
            lastLoadedBatchId.current = null;
        }
    }, [activeBatchId, batches]);

    const registry = useMemo(() => {
        const r: Record<string, NexusObject> = {};
        localQueue.forEach(obj => r[obj.id] = obj);
        return r;
    }, [localQueue]);

    const selectedObject = useMemo(() => {
        if (!selectedId) return null;
        return localQueue.find(item => item.id === selectedId) || null;
    }, [selectedId, localQueue]);

    const addToast = (message: string, type: 'error' | 'success' | 'info' = 'info') => {
        const id = generateId();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };

    const handleUpdateItem = useCallback((id: string, updates: Partial<NexusObject>) => {
        const nextQueue = localQueue.map(item => {
            if (item.id === id) {
                return { ...item, ...updates, last_modified: new Date().toISOString() } as any;
            }
            return item;
        });
        setLocalQueue(nextQueue);
        if (activeBatchId) onUpdateBatch(activeBatchId, nextQueue);
    }, [localQueue, activeBatchId, onUpdateBatch]);

    const handleAddChild = useCallback((parentId: string) => {
        const newNode = NexusGraphUtils.createNode('New Unit', NexusType.SIMPLE_NOTE);
        const parent = localQueue.find(i => i.id === parentId);
        if (!parent || isLink(parent)) return;

        // Upgrade parent to container if it isn't one
        const updatedParent = isContainer(parent) 
            ? { ...parent, children_ids: [...parent.children_ids, newNode.id] }
            : { 
                ...parent, 
                _type: parent._type === NexusType.STORY_NOTE ? NexusType.STORY_NOTE : NexusType.CONTAINER_NOTE, 
                children_ids: [newNode.id], 
                containment_type: ContainmentType.FOLDER, 
                is_collapsed: false, 
                default_layout: DefaultLayout.GRID 
              } as any;

        const hierarchyLink = {
            id: generateId(),
            _type: NexusType.HIERARCHICAL_LINK,
            source_id: parentId,
            target_id: newNode.id,
            verb: 'contains',
            verb_inverse: 'part of',
            hierarchy_type: HierarchyType.PARENT_OF,
            created_at: new Date().toISOString(),
            last_modified: new Date().toISOString(),
            link_ids: [],
            internal_weight: 1.0,
            total_subtree_mass: 0
        };

        const nextQueue = [...localQueue.filter(i => i.id !== parentId), updatedParent, newNode, hierarchyLink];
        setLocalQueue(nextQueue);
        setSelectedId(newNode.id);
        setShowInspector(true);
        if (activeBatchId) onUpdateBatch(activeBatchId, nextQueue);
        addToast("Sub-unit established.", "success");
    }, [localQueue, activeBatchId, onUpdateBatch]);

    const handleReparent = useCallback((sourceId: string, targetId: string, oldParentId?: string, isReference: boolean = false) => {
        if (sourceId === targetId) return;
        if (targetId !== 'root' && GraphIntegrityService.detectCycle(targetId, sourceId, registry)) {
            addToast("Cycle Detected: Operation Aborted.", "error");
            return;
        }

        let nextQueue = [...localQueue];

        // 1. Remove from old parent
        if (!isReference && oldParentId) {
            if (oldParentId === 'root') {
                nextQueue = nextQueue.map(i => i.id === sourceId ? { ...i, tags: (i as any).tags?.filter((t: string) => t !== '__is_root__') || [] } as any : i);
            } else {
                nextQueue = nextQueue.map(i => {
                    if (i.id === oldParentId && isContainer(i)) {
                        return { ...i, children_ids: i.children_ids.filter(id => id !== sourceId) } as any;
                    }
                    return i;
                });
                // Remove the old hierarchical link
                nextQueue = nextQueue.filter(i => !(isLink(i) && i._type === NexusType.HIERARCHICAL_LINK && i.source_id === oldParentId && i.target_id === sourceId));
            }
        }

        // 2. Add to new target
        if (targetId === 'root') {
            nextQueue = nextQueue.map(i => i.id === sourceId ? { ...i, tags: Array.from(new Set([...((i as any).tags || []), '__is_root__'])) } as any : i);
        } else {
            nextQueue = nextQueue.map(i => {
                if (i.id === targetId) {
                    if (isContainer(i)) return { ...i, children_ids: Array.from(new Set([...i.children_ids, sourceId])) } as any;
                    return { 
                        ...i, 
                        _type: i._type === NexusType.STORY_NOTE ? NexusType.STORY_NOTE : NexusType.CONTAINER_NOTE, 
                        children_ids: [sourceId], 
                        containment_type: ContainmentType.FOLDER, 
                        is_collapsed: false, 
                        default_layout: DefaultLayout.GRID 
                    } as any;
                }
                return i;
            });
            const shadowLink = NexusGraphUtils.createShadowLink(targetId, sourceId);
            nextQueue.push(shadowLink);
        }

        setLocalQueue(nextQueue);
        if (activeBatchId) onUpdateBatch(activeBatchId, nextQueue);
        addToast("Unit Relocated.", "success");
    }, [localQueue, registry, activeBatchId, onUpdateBatch]);

    const handleReifyLink = useCallback((linkId: string) => {
        const nextQueue = localQueue.map(item => {
            if (item.id !== linkId || !isLink(item) || isReified(item)) return item;
            const source = localQueue.find(i => i.id === item.source_id);
            const target = localQueue.find(i => i.id === item.target_id);
            
            return {
                ...item,
                _type: item._type === NexusType.HIERARCHICAL_LINK ? NexusType.AGGREGATED_HIERARCHICAL_LINK : NexusType.AGGREGATED_SEMANTIC_LINK,
                is_reified: true,
                title: `${(source as any)?.title || 'Origin'} → ${(target as any)?.title || 'Terminal'}`,
                gist: `Logic: ${item.verb}`,
                category_id: NexusCategory.META,
                children_ids: [],
                containment_type: ContainmentType.FOLDER,
                is_collapsed: false,
                default_layout: DefaultLayout.GRID,
                last_modified: new Date().toISOString()
            } as any;
        });
        setLocalQueue(nextQueue);
        if (activeBatchId) onUpdateBatch(activeBatchId, nextQueue);
        addToast("Link promoted to logic unit.", "success");
    }, [localQueue, activeBatchId, onUpdateBatch]);

    const handleReifyNode = useCallback((nodeId: string) => {
        const nextQueue = localQueue.map(item => {
            if (item.id !== nodeId || isLink(item) || isContainer(item)) return item;
            return {
                ...item,
                _type: NexusType.CONTAINER_NOTE,
                containment_type: ContainmentType.FOLDER,
                is_collapsed: false,
                default_layout: DefaultLayout.GRID,
                children_ids: [],
                last_modified: new Date().toISOString()
            } as any;
        });
        setLocalQueue(nextQueue);
        if (activeBatchId) onUpdateBatch(activeBatchId, nextQueue);
        addToast("Unit promoted to structural container.", "success");
    }, [localQueue, activeBatchId, onUpdateBatch]);

    const handleReifyNodeToLink = useCallback((nodeId: string, sourceId: string, targetId: string) => {
        const node = localQueue.find(i => i.id === nodeId);
        if (!node || isLink(node)) return;

        const filteredQueue = localQueue.filter(item => {
            if (isLink(item)) {
                const isSBridge = (item.source_id === nodeId && item.target_id === sourceId) || (item.source_id === sourceId && item.target_id === nodeId);
                const isTBridge = (item.source_id === nodeId && item.target_id === targetId) || (item.source_id === targetId && item.target_id === nodeId);
                return !isSBridge && !isTBridge;
            }
            return true;
        });

        const nextQueue = filteredQueue.map(item => {
            if (item.id === nodeId) {
                return {
                    ...item,
                    _type: NexusType.AGGREGATED_SEMANTIC_LINK,
                    is_reified: true,
                    source_id: sourceId,
                    target_id: targetId,
                    verb: "governs",
                    verb_inverse: "governed by",
                    containment_type: ContainmentType.FOLDER,
                    children_ids: [],
                    is_collapsed: false,
                    default_layout: DefaultLayout.GRID,
                    last_modified: new Date().toISOString()
                } as any;
            }
            return item;
        });

        setLocalQueue(nextQueue);
        if (activeBatchId) onUpdateBatch(activeBatchId, nextQueue);
        addToast("Unit promoted to Causal Stream.", "success");
    }, [localQueue, activeBatchId, onUpdateBatch]);

    const handleDeleteItem = useCallback((id: string) => {
        const nextQueue = localQueue.filter(item => item.id !== id);
        setLocalQueue(nextQueue);
        if (activeBatchId) onUpdateBatch(activeBatchId, nextQueue);
        
        if (selectedId === id) {
            setSelectedId(null);
            setShowInspector(false);
        }
        addToast("Unit Purged from Batch.", "info");
    }, [localQueue, selectedId, activeBatchId, onUpdateBatch]);

    const handleDrilldownAction = (id: string) => {
        setDrillStack(prev => {
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
                <div className="p-8 md:p-12 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-12">
                        <h1 className="text-4xl font-display font-black uppercase text-nexus-text tracking-tighter">Refinery <span className="text-nexus-accent">Inbox</span></h1>
                        <div className="flex items-center gap-4 text-[10px] font-mono font-black text-nexus-muted uppercase tracking-widest opacity-40">
                             Intel Ready: {batches.length} BATCHES
                        </div>
                    </div>

                    {batches.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-700">
                            <div className="p-10 bg-nexus-900 rounded-[64px] border border-nexus-800 shadow-2xl relative">
                                <Package size={80} className="text-nexus-muted opacity-20" />
                                <div className="absolute -top-4 -right-4 w-12 h-12 bg-nexus-accent rounded-2xl flex items-center justify-center text-white shadow-lg animate-bounce">
                                    <FlaskConical size={24} />
                                </div>
                            </div>
                            <div className="text-center space-y-3">
                                <h3 className="text-2xl font-display font-bold text-nexus-text uppercase">Extraction Buffer Empty</h3>
                                <p className="text-sm text-nexus-muted font-serif italic max-w-sm mx-auto opacity-70">
                                    "No unprocessed scry data found. Use the Playground to inject development fixtures or the Scanner for lore extraction."
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <button disabled className="px-8 py-4 bg-nexus-900 border border-nexus-800 rounded-3xl text-[10px] font-black uppercase tracking-widest text-nexus-muted opacity-50">Open Scanner</button>
                                <div className="text-nexus-accent animate-pulse px-2 flex items-center"><ChevronRight /></div>
                                <div className="p-1 rounded-3xl bg-nexus-accent/10 border border-nexus-accent/20">
                                     <button onClick={() => window.dispatchEvent(new CustomEvent('nexus-navigate', { detail: 'PLAYGROUND' }))} className="px-8 py-4 bg-nexus-accent text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-nexus-accent/20 hover:brightness-110 transition-all active:scale-95">Go to Playground</button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {batches.map(b => (
                                <button 
                                    key={b.id} 
                                    onClick={() => setActiveBatchId(b.id)} 
                                    className="group p-8 bg-nexus-900 border border-nexus-800 rounded-[40px] text-left hover:border-nexus-accent hover:translate-y-[-4px] transition-all duration-500 shadow-xl"
                                >
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-3 bg-nexus-950 rounded-2xl border border-nexus-800 text-nexus-muted group-hover:text-nexus-accent transition-colors">
                                            <Package size={20} />
                                        </div>
                                        <div className="text-[10px] font-mono font-black text-nexus-muted uppercase tracking-widest opacity-40">{b.source}</div>
                                    </div>
                                    <div className="text-xl font-display font-bold text-nexus-text mb-2 truncate group-hover:text-nexus-accent transition-colors">{b.name}</div>
                                    <div className="text-[10px] text-nexus-muted uppercase font-black tracking-widest">{b.items.length} Structural Units</div>
                                    <div className="mt-8 flex items-center justify-between text-[9px] font-black text-nexus-muted uppercase tracking-widest opacity-30 group-hover:opacity-100 transition-opacity">
                                        <span>Initialize Scry</span>
                                        <ChevronRight size={14} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col h-full">
                    <header className="h-16 border-b border-nexus-800 bg-nexus-900 flex items-center justify-between px-6 shrink-0 z-40">
                        <div className="flex items-center gap-6">
                            <button onClick={() => setActiveBatchId(null)} className="text-nexus-muted hover:text-nexus-text flex items-center gap-3 font-display font-black text-[10px] uppercase tracking-widest transition-all">
                                <ArrowLeft size={16}/> Back to Inbox
                            </button>
                            
                            <div className="flex bg-nexus-950 border border-nexus-800 rounded-full p-1 shadow-inner">
                                <button 
                                    onClick={() => setActiveView('STRUCTURE')}
                                    className={`px-4 py-1.5 rounded-full text-[9px] font-display font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeView === 'STRUCTURE' ? 'bg-nexus-accent text-white shadow-lg' : 'text-nexus-muted hover:text-nexus-text'}`}
                                >
                                    <ListTree size={12} /> H-Tree
                                </button>
                                <button 
                                    onClick={() => setActiveView('EXPLORER')}
                                    className={`px-4 py-1.5 rounded-full text-[9px] font-display font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeView === 'EXPLORER' ? 'bg-nexus-accent text-white shadow-lg' : 'text-nexus-muted hover:text-nexus-text'}`}
                                >
                                    <Compass size={12} /> Oracle
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <span className="hidden md:flex text-[10px] font-black uppercase text-nexus-essence items-center gap-2 bg-nexus-essence/5 border border-nexus-essence/20 px-3 py-1.5 rounded-full">
                                <AlertCircle size={12}/> Integrity Shield Active
                            </span>
                            <button onClick={() => onCommitBatch(activeBatchId!, localQueue)} className="bg-nexus-accent text-white px-8 py-2 rounded-full font-display font-black text-[10px] uppercase tracking-widest shadow-lg shadow-nexus-accent/20 hover:brightness-110 active:scale-95 transition-all">COMMIT TO REGISTRY</button>
                        </div>
                    </header>
                    <div className="flex-1 flex overflow-hidden relative">
                        <HierarchyExplorer 
                            items={localQueue} 
                            selectedId={selectedId} 
                            onSelect={setSelectedId} 
                            onReparent={handleReparent}
                            onDeleteUnit={handleDeleteItem}
                        />
                        <main className="flex-1 bg-[#050508] relative overflow-hidden">
                             {activeView === 'EXPLORER' ? (
                                <RefineryDrilldown 
                                    registry={registry}
                                    focusId={currentDrillFocusId}
                                    navStack={drillStack}
                                    onNavigateStack={(id) => {
                                        setDrillStack(prev => {
                                            const existingIdx = prev.indexOf(id);
                                            if (existingIdx !== -1) return prev.slice(0, existingIdx + 1);
                                            return [...prev, id];
                                        });
                                    }}
                                    onResetStack={() => setDrillStack([])}
                                    onSelect={setSelectedId}
                                    onViewModeChange={(mode: any) => {
                                        if (mode === 'INSPECTOR') setShowInspector(true);
                                    }}
                                    onReifyLink={handleReifyLink}
                                    onReifyNode={handleReifyNode}
                                    onReifyNodeToLink={handleReifyNodeToLink}
                                />
                             ) : (
                                <StructureVisualizer 
                                    registry={registry} 
                                    selectedId={selectedId} 
                                    onSelect={setSelectedId}
                                    onAddChild={handleAddChild}
                                    onViewModeChange={(mode: any) => {
                                        if (mode === 'INSPECTOR') setShowInspector(true);
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

                             <div className={`
                                fixed inset-y-0 right-0 w-[420px] bg-nexus-900 border-l border-nexus-800 shadow-[-20px_0_60px_rgba(0,0,0,0.5)] z-[500]
                                transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)
                                ${showInspector && selectedId ? 'translate-x-0' : 'translate-x-full'}
                             `}>
                                {selectedObject && (
                                    <RefineryInspector 
                                        object={selectedObject}
                                        registry={registry}
                                        onUpdate={(updates) => handleUpdateItem(selectedId!, updates)}
                                        onClose={() => setShowInspector(false)}
                                    />
                                )}
                             </div>
                        </main>
                    </div>
                </div>
            )}

            <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-[1000]">
                {toasts.map(t => <div key={t.id} className={`px-4 py-2 rounded-xl border text-[10px] font-black shadow-2xl animate-in slide-in-from-right duration-300 ${t.type === 'error' ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-nexus-accent/10 border-nexus-accent text-nexus-accent'}`}>{t.message}</div>)}
            </div>
        </div>
    );
};