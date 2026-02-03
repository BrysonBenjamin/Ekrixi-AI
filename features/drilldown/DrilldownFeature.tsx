
import React, { useState, useMemo, useEffect } from 'react';
import { NexusObject, isContainer, isLink, isReified } from '../../types';
import { DrilldownCanvas } from './components/DrilldownCanvas';
import { ChevronRight, Home, Layout, Zap, Orbit, Compass, UserCircle2 } from 'lucide-react';
import { useTutorial, TutorialStep } from '../../components/shared/tutorial/TutorialSystem';

interface DrilldownFeatureProps {
    registry: Record<string, NexusObject>;
    onSelectNote: (id: string) => void;
}

export type VisibleNode = NexusObject & {
    depth: number;
    pathType: 'descendant' | 'ancestor' | 'lateral' | 'focus';
    isParentPath?: boolean; 
};

export const DrilldownFeature: React.FC<DrilldownFeatureProps> = ({ registry, onSelectNote }) => {
    const [navStack, setNavStack] = useState<string[]>([]);
    const [showAuthorNotes, setShowAuthorNotes] = useState(false);
    const { startTutorial } = useTutorial();
    const currentContainerId = navStack[navStack.length - 1];
    const currentContainer = currentContainerId ? registry[currentContainerId] : null;

    useEffect(() => {
        if (Object.keys(registry).length > 0) {
            const tutorialSteps: TutorialStep[] = [
                {
                    target: '.node-group',
                    title: 'Isolate Connections',
                    content: 'Right-click any signature to isolate its causal lines and connected pills.',
                    position: 'right'
                },
                {
                    target: '.node-group',
                    title: 'Shift Scry Focus',
                    content: 'Left-click a node to refocus the graph. Double-click containers to drill into their children.',
                    position: 'bottom'
                }
            ];
            const timer = setTimeout(() => startTutorial('drilldown_onboarding', tutorialSteps), 1500);
            return () => clearTimeout(timer);
        }
    }, [registry]);

    const visibleNodesRegistry = useMemo(() => {
        const subRegistry: Record<string, VisibleNode> = {};
        const queue: { id: string; depth: number; pathType: VisibleNode['pathType'] }[] = [];
        
        if (!currentContainerId) {
            const allChildIds = new Set<string>();
            (Object.values(registry) as NexusObject[]).forEach(obj => {
                if (isContainer(obj)) {
                    obj.children_ids.forEach(cid => allChildIds.add(cid));
                }
            });

            const roots = (Object.values(registry) as NexusObject[]).filter(obj => 
                (!isLink(obj) || isReified(obj)) && !allChildIds.has(obj.id)
            );

            roots.forEach(root => queue.push({ id: root.id, depth: 0, pathType: 'focus' }));
        } else {
            queue.push({ id: currentContainerId, depth: 0, pathType: 'focus' });
        }

        const visited = new Map<string, number>();

        while (queue.length > 0) {
            const { id, depth, pathType } = queue.shift()!;
            if (depth > 2) continue; 
            if (visited.has(id) && visited.get(id)! <= depth) continue;

            const obj = registry[id];
            if (!obj) continue;

            // Visibility filter for Author's Notes
            if ((obj as any).is_author_note && !showAuthorNotes) continue;

            const isNode = !isLink(obj) || isReified(obj);
            if (isNode) {
                visited.set(id, depth);
                subRegistry[id] = { 
                    ...obj, 
                    depth, 
                    pathType, 
                    isParentPath: pathType === 'ancestor' 
                } as VisibleNode;
            }

            // Descendants (Downstream)
            if (isContainer(obj)) {
                obj.children_ids.forEach(childId => {
                    queue.push({ 
                        id: childId, 
                        depth: depth + 1, 
                        pathType: (pathType === 'focus' || pathType === 'descendant') ? 'descendant' : 'lateral' 
                    });
                });
            }

            // Relationships & Ancestors (Upstream Logic)
            (Object.values(registry) as NexusObject[]).forEach(l => {
                if (isLink(l)) {
                    if (l.source_id === id) {
                        queue.push({ 
                            id: l.target_id, 
                            depth: depth + 1, 
                            pathType: (pathType === 'focus' || pathType === 'descendant') ? 'descendant' : 'lateral' 
                        });
                    } else if (l.target_id === id) {
                        queue.push({ 
                            id: l.source_id, 
                            depth: depth + 1, 
                            pathType: (pathType === 'focus' || pathType === 'ancestor') ? 'ancestor' : 'lateral' 
                        });
                    }
                }
            });
        }

        return subRegistry;
    }, [registry, currentContainerId, showAuthorNotes]);

    const handleDrilldown = (id: string) => {
        const obj = registry[id];
        if (isContainer(obj)) {
            setNavStack(prev => [...prev, id]);
        } else {
            onSelectNote(id);
        }
    };

    const handleRefocus = (id: string) => {
        if (id === currentContainerId) return;
        setNavStack(prev => {
            const existingIdx = prev.indexOf(id);
            if (existingIdx !== -1) return prev.slice(0, existingIdx + 1);
            return [...prev, id];
        });
    };

    const resetToRoot = () => setNavStack([]);

    return (
        <div className="flex flex-col h-full bg-nexus-950 relative overflow-hidden">
            <header className="h-14 border-b border-nexus-800 bg-nexus-900/60 backdrop-blur-xl flex items-center px-6 justify-between shrink-0 z-30 shadow-lg">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                    <button 
                        onClick={resetToRoot} 
                        className={`p-2 rounded-lg transition-all flex items-center gap-2 ${!currentContainerId ? 'bg-nexus-accent/10 text-nexus-accent' : 'text-nexus-muted hover:text-nexus-text'}`}
                    >
                        <Home size={16} />
                        <span className="text-[10px] font-display font-black uppercase tracking-widest hidden sm:inline">Origin</span>
                    </button>
                    
                    {navStack.map((id, idx) => (
                        <React.Fragment key={id}>
                            <ChevronRight size={12} className="text-nexus-muted opacity-30 shrink-0" />
                            <button 
                                onClick={() => handleRefocus(id)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-display font-black uppercase tracking-widest transition-all whitespace-nowrap border ${idx === navStack.length - 1 ? 'bg-nexus-accent/5 border-nexus-accent/20 text-nexus-accent' : 'border-transparent text-nexus-muted hover:text-nexus-text'}`}
                            >
                                {(registry[id] as any)?.title}
                            </button>
                        </React.Fragment>
                    ))}
                </div>
                
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setShowAuthorNotes(!showAuthorNotes)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-display font-black uppercase tracking-widest transition-all flex items-center gap-2 border ${showAuthorNotes ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'border-nexus-800 text-nexus-muted hover:text-nexus-text'}`}
                    >
                        <UserCircle2 size={14} />
                        Author's Notes: {showAuthorNotes ? 'VISIBLE' : 'HIDDEN'}
                    </button>
                    <div className="flex items-center gap-4 text-[10px] font-mono text-nexus-muted tracking-[0.2em] uppercase opacity-40">
                        <span className="hidden md:block">Registry Depth: {navStack.length}</span>
                        <Orbit size={14} className="animate-spin-slow" />
                    </div>
                </div>
            </header>

            <main className="flex-1 relative">
                <DrilldownCanvas 
                    registry={visibleNodesRegistry} 
                    fullRegistry={registry}
                    onDrilldown={handleDrilldown}
                    onInspect={handleRefocus}
                    focusId={currentContainerId}
                />
            </main>

            <footer className="absolute bottom-8 left-8 right-8 pointer-events-none flex justify-between items-end z-20">
                <div className="p-8 bg-nexus-900/80 backdrop-blur-2xl border border-nexus-800 rounded-[40px] pointer-events-auto shadow-[0_32px_64px_var(--shadow-color)] max-w-xl group hover:border-nexus-accent/30 transition-all duration-500">
                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-2 bg-nexus-accent/10 rounded-xl">
                            <Compass size={20} className="text-nexus-accent" />
                        </div>
                        <span className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.4em]">Current Scry</span>
                    </div>
                    <h2 className="text-4xl font-display font-black text-nexus-text tracking-tighter leading-none mb-4 group-hover:text-nexus-accent transition-colors">
                        {currentContainer ? (currentContainer as any).title : 'World Registry'}
                    </h2>
                    <p className="text-sm text-nexus-muted font-serif italic max-w-sm line-clamp-2 leading-relaxed opacity-70">
                        {currentContainer ? (currentContainer as any).gist : 'Tracing scion lines and causality from the origin point of the sector.'}
                    </p>
                </div>
                
                <div className="pointer-events-auto flex flex-col gap-3">
                     <div className="px-5 py-3 bg-nexus-900/80 backdrop-blur-xl border border-nexus-800 rounded-2xl flex items-center gap-4 shadow-xl">
                        <Zap size={14} className="text-nexus-accent animate-pulse" />
                        <span className="text-[9px] font-display font-black text-nexus-muted uppercase tracking-widest">
                            {Object.keys(visibleNodesRegistry).length} Neural Signatures Active
                        </span>
                     </div>
                </div>
            </footer>
        </div>
    );
};
