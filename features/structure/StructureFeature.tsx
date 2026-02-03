import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    NexusObject, 
    NexusGraphUtils, 
    NexusType, 
    NexusCategory,
    isLink, 
    isContainer,
    isReified,
    ContainmentType,
    DefaultLayout,
    HierarchyType
} from '../../types';
import { StructureVisualizer } from './components/StructureVisualizer';
import { HierarchyExplorer } from '../refinery/components/HierarchyExplorer';
import { Network, UserCircle2, LayoutPanelLeft, Boxes } from 'lucide-react';
import { useTutorial, TutorialStep } from '../../components/shared/tutorial/TutorialSystem';

interface StructureFeatureProps {
    registry: Record<string, NexusObject>;
    onRegistryUpdate: React.Dispatch<React.SetStateAction<Record<string, NexusObject>>>;
    onNavigateToWiki?: (id: string) => void;
}

export const StructureFeature: React.FC<StructureFeatureProps> = ({ registry, onRegistryUpdate, onNavigateToWiki }) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [showAuthorNotes, setShowAuthorNotes] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true);
    const { startTutorial, nextStep, activeTutorial, currentStepIdx } = useTutorial();

    useEffect(() => {
        if (Object.keys(registry).length > 0) {
            const steps: TutorialStep[] = [
                {
                    target: '.node-group',
                    title: 'The Neural Command',
                    content: 'Right-click any unit to open the Neural Command menu.',
                    position: 'right',
                    isInteraction: true
                },
                {
                    target: '.inspect-action',
                    title: 'Unit Inspection',
                    content: 'This will take you to the Library for detailed prose editing.',
                    position: 'right'
                },
                {
                    target: '.link-pill',
                    title: 'Logic Streams',
                    content: 'Right-click a connection stream to explore reification options.',
                    position: 'bottom',
                    isInteraction: true
                },
                {
                    target: '#structure-sidebar',
                    title: 'Neural File System',
                    content: 'Use the sidebar for rapid hierarchical re-organization via drag and drop.',
                    position: 'right'
                }
            ];
            startTutorial('structure_comprehensive_v3', steps);
        }
    }, [registry, startTutorial]);

    const handleMenuOpened = useCallback(() => {
        if (activeTutorial === 'structure_comprehensive_v3' && (currentStepIdx === 0 || currentStepIdx === 2)) {
            nextStep();
        }
    }, [activeTutorial, currentStepIdx, nextStep]);

    const filteredRegistry = useMemo(() => {
        if (showAuthorNotes) return registry;
        const next: Record<string, NexusObject> = {};
        (Object.values(registry) as NexusObject[]).forEach(obj => {
            if (!(obj as any).is_author_note) {
                next[obj.id] = obj;
            }
        });
        return next;
    }, [registry, showAuthorNotes]);

    const handleAddChild = useCallback((parentId: string) => {
        const newNode = NexusGraphUtils.createNode('New Unit', NexusType.SIMPLE_NOTE);
        onRegistryUpdate(prev => {
            const parent = prev[parentId];
            if (!parent || !isContainer(parent)) return prev;
            const { updatedParent, updatedChild, newLink } = NexusGraphUtils.reconcileHierarchy(parent, newNode, NexusType.HIERARCHICAL_LINK);
            return { ...prev, [newNode.id]: updatedChild, [parentId]: updatedParent, ...(newLink ? { [newLink.id]: newLink } : {}) };
        });
        setSelectedId(newNode.id);
    }, [onRegistryUpdate]);

    const handleReifyNode = useCallback((nodeId: string) => {
        onRegistryUpdate(prev => {
            const node = prev[nodeId];
            if (!node || isLink(node) || isReified(node)) return prev;

            const parentMap = NexusGraphUtils.buildParentMap(prev);
            const parentIds = parentMap[nodeId] || [];
            const parentId = parentIds[0]; 
            const childrenIds = isContainer(node) ? node.children_ids : [];
            const childId = childrenIds[0];

            if (!parentId || !childId) return prev;

            const reifiedUnit: NexusObject = {
                ...node,
                _type: NexusType.AGGREGATED_SEMANTIC_LINK,
                is_reified: true,
                source_id: parentId,
                target_id: childId,
                verb: (node as any).gist?.slice(0, 20) || "binds",
                verb_inverse: "bound by",
                containment_type: ContainmentType.FOLDER,
                children_ids: childrenIds.filter(id => id !== childId),
            } as any;

            let nextRegistry = { ...prev, [nodeId]: reifiedUnit };

            // Cleanup old structural links
            Object.keys(nextRegistry).forEach(key => {
                const obj = nextRegistry[key];
                if (isLink(obj) && ((obj.source_id === parentId && obj.target_id === nodeId) || (obj.source_id === nodeId && obj.target_id === childId))) {
                    delete nextRegistry[key];
                }
            });

            return nextRegistry;
        });
    }, [onRegistryUpdate]);

    const handleReifyLink = useCallback((linkId: string) => {
        onRegistryUpdate(prev => {
            const link = prev[linkId];
            if (!link || !isLink(link) || isReified(link)) return prev;
            const source = prev[link.source_id];
            const target = prev[link.target_id];
            if (!source || !target) return prev;

            const reifiedUnit: NexusObject = {
                ...link,
                _type: link._type === NexusType.HIERARCHICAL_LINK ? NexusType.AGGREGATED_HIERARCHICAL_LINK : NexusType.AGGREGATED_SEMANTIC_LINK,
                is_reified: true,
                title: `${(source as any).title} -> ${(target as any).title}`,
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

            return { ...prev, [linkId]: reifiedUnit };
        });
    }, [onRegistryUpdate]);

    const handleDelete = useCallback((id: string) => {
        onRegistryUpdate(prev => {
            const next = { ...prev };
            delete next[id];
            Object.keys(next).forEach(k => {
                const o = next[k];
                if (isLink(o) && (o.source_id === id || o.target_id === id)) delete next[k];
                if (isContainer(o) && o.children_ids.includes(id)) {
                    next[k] = { ...o, children_ids: o.children_ids.filter(cid => cid !== id) } as any;
                }
            });
            return next;
        });
    }, [onRegistryUpdate]);

    const handleReparent = useCallback((sourceId: string, targetId: string, oldParentId?: string) => {
        if (sourceId === targetId) return;
        onRegistryUpdate(prev => {
            let next = { ...prev };
            if (oldParentId && oldParentId !== 'root') {
                const oldParent = next[oldParentId];
                if (oldParent && isContainer(oldParent)) {
                    next[oldParentId] = { ...oldParent, children_ids: oldParent.children_ids.filter(id => id !== sourceId) } as any;
                }
            }
            if (targetId === 'root') return next;
            const targetNode = next[targetId];
            if (!targetNode || isLink(targetNode)) return next;
            if (!isContainer(targetNode)) {
                next[targetId] = { ...targetNode, _type: NexusType.CONTAINER_NOTE, containment_type: ContainmentType.FOLDER, is_collapsed: false, children_ids: [sourceId] } as any;
            } else {
                next[targetId] = { ...targetNode, children_ids: Array.from(new Set([...targetNode.children_ids, sourceId])) } as any;
            }
            const shadowLink = NexusGraphUtils.createShadowLink(targetId, sourceId);
            next[shadowLink.id] = shadowLink;
            return next;
        });
    }, [onRegistryUpdate]);

    return (
        <div className="flex flex-col h-full bg-nexus-950 text-nexus-text overflow-hidden">
            <header className="h-16 border-b border-nexus-800 bg-nexus-900/50 backdrop-blur-xl flex items-center px-6 justify-between shrink-0 z-30 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => setShowSidebar(!showSidebar)} className={`p-2 rounded-lg transition-all ${showSidebar ? 'bg-nexus-accent/10 text-nexus-accent' : 'text-nexus-muted hover:text-nexus-text'}`}>
                        <LayoutPanelLeft size={20} />
                    </button>
                    <div className="p-2 bg-nexus-accent/10 rounded-lg">
                        <Network size={20} className="text-nexus-accent" />
                    </div>
                    <h2 className="text-nexus-text font-display font-black text-lg tracking-tight uppercase">Structure <span className="text-nexus-500">Engine</span></h2>
                </div>
                
                <div className="flex items-center gap-4">
                    <button onClick={() => setShowAuthorNotes(!showAuthorNotes)} className={`px-4 py-2 rounded-xl text-[10px] font-display font-black uppercase tracking-widest transition-all flex items-center gap-2 border ${showAuthorNotes ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'border-nexus-800 text-nexus-muted hover:text-nexus-text'}`}>
                        <UserCircle2 size={16} /> Meta Layers: {showAuthorNotes ? 'ACTIVE' : 'SEQUESTERED'}
                    </button>
                    <div className="text-[10px] font-mono text-nexus-muted tracking-widest uppercase opacity-60">Registry v4.3 // Stable</div>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {showSidebar && (
                    <div id="structure-sidebar" className="h-full border-r border-nexus-800 animate-in slide-in-from-left duration-300">
                        <HierarchyExplorer items={Object.values(filteredRegistry)} selectedId={selectedId} onSelect={setSelectedId} onReparent={handleReparent} />
                    </div>
                )}

                <main className="flex-1 relative overflow-hidden bg-nexus-950">
                    {Object.keys(filteredRegistry).length > 0 ? (
                        <StructureVisualizer 
                            registry={filteredRegistry}
                            selectedId={selectedId}
                            onSelect={setSelectedId}
                            onAddChild={handleAddChild}
                            onDelete={handleDelete}
                            onReparent={handleReparent}
                            onInspect={onNavigateToWiki}
                            onReifyLink={handleReifyLink}
                            onReifyNode={handleReifyNode}
                            onMenuOpened={handleMenuOpened}
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center p-8">
                            <div className="p-12 rounded-[60px] bg-nexus-900 border border-nexus-800 shadow-2xl flex flex-col items-center gap-8 max-w-md text-center">
                                <Boxes size={80} className="text-nexus-muted opacity-20" />
                                <h3 className="text-2xl font-display font-black text-nexus-text uppercase tracking-widest">Registry Void</h3>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};