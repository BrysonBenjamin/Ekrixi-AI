import React, { useState, useMemo, useCallback } from 'react';
import {
  NexusObject,
  NexusGraphUtils,
  NexusType,
  NexusCategory,
  isLink,
  isContainer,
  ContainmentType,
  DefaultLayout,
  HierarchyType,
  isReified,
  SimpleNote,
  ContainerNote,
} from '../../types';
import { GraphIntegrityService } from '../integrity/GraphIntegrityService';
import { StructureVisualizer } from './components/StructureVisualizer';
import { HierarchyExplorer } from '../refinery/components/HierarchyExplorer';
import { UserCircle2, LayoutPanelLeft } from 'lucide-react';
import { useTutorial } from '../../components/shared/tutorial/TutorialSystem';
import { InspectorPanel } from '../shared/inspector/InspectorPanel';

interface StructureFeatureProps {
  registry: Record<string, NexusObject>;
  onRegistryUpdate: React.Dispatch<React.SetStateAction<Record<string, NexusObject>>>;
  onNavigateToWiki?: (id: string) => void;
}

export const StructureFeature: React.FC<StructureFeatureProps> = ({
  registry,
  onRegistryUpdate,
  onNavigateToWiki,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAuthorNotes, setShowAuthorNotes] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showInspector, setShowInspector] = useState(false);

  useTutorial();

  const selectedObject = useMemo(() => {
    return selectedId ? registry[selectedId] : null;
  }, [selectedId, registry]);

  const handleUpdateItem = useCallback(
    (updates: Partial<NexusObject>) => {
      if (!selectedId) return;
      onRegistryUpdate((prev) => {
        const item = prev[selectedId];
        if (!item) return prev;
        return {
          ...prev,
          [selectedId]: {
            ...item,
            ...updates,
            last_modified: new Date().toISOString(),
          } as NexusObject,
        };
      });
    },
    [selectedId, onRegistryUpdate],
  );

  const filteredRegistry = useMemo(() => {
    const next: Record<string, NexusObject> = {};
    const all = Object.values(registry) as NexusObject[];

    // 1. First pass: Filter Nodes
    all.forEach((obj) => {
      if (isLink(obj) && !isReified(obj)) return;
      const sn = obj as SimpleNote;
      const isStory = sn._type === NexusType.STORY_NOTE;
      const isAuthor = sn.is_author_note;

      // Strictly exclude Story units from Structural views
      if (!isStory && (!isAuthor || showAuthorNotes)) {
        next[obj.id] = obj;
      }
    });

    // 2. Second pass: Filter Links
    all.forEach((obj) => {
      if (!isLink(obj)) return;

      const source = registry[obj.source_id];
      const target = registry[obj.target_id];

      // Logic: Hide links if they are story transitions or connect to story nodes
      const isStoryLink =
        source?._type === NexusType.STORY_NOTE || target?._type === NexusType.STORY_NOTE;
      if (isStoryLink) return;

      // Also hide if either endpoint is currently hidden (e.g., hidden Author Notes)
      if (!next[obj.source_id] || !next[obj.target_id]) return;

      next[obj.id] = obj;
    });

    return next;
  }, [registry, showAuthorNotes]);

  const handleAddChild = useCallback(
    (parentId: string) => {
      const newNode = NexusGraphUtils.createNode('New Unit', NexusType.SIMPLE_NOTE);
      onRegistryUpdate((prev) => {
        const parent = prev[parentId];
        if (!parent || (isLink(parent) && !isReified(parent))) return prev;

        // Omni-container logic: Promote any leaf node to container status upon child addition
        const updatedParent: NexusObject = isContainer(parent)
          ? ({ ...parent, children_ids: [...parent.children_ids, newNode.id] } as ContainerNote)
          : ({
              ...parent,
              _type:
                parent._type === NexusType.STORY_NOTE
                  ? NexusType.STORY_NOTE
                  : NexusType.CONTAINER_NOTE,
              children_ids: [newNode.id],
              containment_type: ContainmentType.FOLDER,
              is_collapsed: false,
              default_layout: DefaultLayout.GRID,
            } as NexusObject);

        const { link, updatedSource, updatedTarget } = NexusGraphUtils.createLink(
          updatedParent,
          newNode,
          NexusType.HIERARCHICAL_LINK,
          'contains',
        );
        return {
          ...prev,
          [newNode.id]: updatedTarget,
          [parentId]: updatedSource,
          [link.id]: link,
        };
      });
      setSelectedId(newNode.id);
    },
    [onRegistryUpdate],
  );

  const handleReifyLink = useCallback(
    (linkId: string) => {
      onRegistryUpdate((prev) => {
        const link = prev[linkId];
        if (!link || !isLink(link) || isReified(link)) return prev;
        const source = prev[link.source_id];
        const target = prev[link.target_id];
        if (!source || !target) return prev;

        const reifiedUnit: NexusObject = {
          ...link,
          _type:
            link._type === NexusType.HIERARCHICAL_LINK
              ? NexusType.AGGREGATED_HIERARCHICAL_LINK
              : NexusType.AGGREGATED_SEMANTIC_LINK,
          is_reified: true,
          title: `${(source as SimpleNote).title || 'Origin'} → ${(target as SimpleNote).title || 'Terminal'}`,
          gist: `Logic: ${link.verb}`,
          prose_content: `Relationship between ${(source as SimpleNote).title} and ${(target as SimpleNote).title}.`,
          category_id: NexusCategory.META,
          children_ids: [],
          containment_type: ContainmentType.FOLDER,
          is_collapsed: false,
          default_layout: DefaultLayout.GRID,
          is_ghost: false,
          aliases: [],
          tags: ['reified'],
        } as NexusObject;

        if (reifiedUnit._type === NexusType.AGGREGATED_HIERARCHICAL_LINK) {
          (reifiedUnit as { hierarchy_type: HierarchyType }).hierarchy_type =
            HierarchyType.PARENT_OF;
        }
        return { ...prev, [linkId]: reifiedUnit };
      });
    },
    [onRegistryUpdate],
  );

  const handleReifyNode = useCallback(
    (nodeId: string) => {
      onRegistryUpdate((prev) => {
        const node = prev[nodeId];
        if (!node || isLink(node) || isContainer(node)) return prev;
        const updatedNode: NexusObject = {
          ...(node as SimpleNote),
          _type: NexusType.CONTAINER_NOTE,
          containment_type: ContainmentType.FOLDER,
          is_collapsed: false,
          default_layout: DefaultLayout.GRID,
          children_ids: [],
          tags: [...((node as SimpleNote).tags || []), 'promoted-logic'],
        };
        return { ...prev, [nodeId]: updatedNode };
      });
    },
    [onRegistryUpdate],
  );

  const handleReifyNodeToLink = useCallback(
    (nodeId: string, sourceId: string, targetId: string) => {
      onRegistryUpdate((prev) => {
        const node = prev[nodeId];
        if (!node || isLink(node)) return prev;
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          const l = next[key];
          if (isLink(l)) {
            if (
              (l.source_id === nodeId && l.target_id === sourceId) ||
              (l.source_id === sourceId && l.target_id === nodeId)
            )
              delete next[key];
            if (
              (l.source_id === nodeId && l.target_id === targetId) ||
              (l.source_id === targetId && l.target_id === nodeId)
            )
              delete next[key];
          }
        });
        const reifiedUnit: NexusObject = {
          ...(node as SimpleNote),
          _type: NexusType.AGGREGATED_SEMANTIC_LINK,
          is_reified: true,
          source_id: sourceId,
          target_id: targetId,
          verb: 'governs',
          verb_inverse: 'governed by',
          containment_type: ContainmentType.FOLDER,
          children_ids: [],
          is_collapsed: false,
          default_layout: DefaultLayout.GRID,
        };
        next[nodeId] = reifiedUnit;
        return next;
      });
    },
    [onRegistryUpdate],
  );

  const handleDeleteUnit = useCallback(
    (id: string) => {
      onRegistryUpdate((prev) => {
        const next = { ...prev };
        delete next[id];
        Object.keys(next).forEach((k) => {
          const o = next[k];
          if (isLink(o) && (o.source_id === id || o.target_id === id)) delete next[k];
          if (isContainer(o)) {
            const cn = o as ContainerNote;
            next[k] = { ...cn, children_ids: cn.children_ids.filter((cid) => cid !== id) };
          }
        });
        return next;
      });
    },
    [onRegistryUpdate],
  );

  const handleReparent = useCallback(
    (sourceId: string, targetId: string, oldParentId?: string, isReference: boolean = false) => {
      if (sourceId === targetId) return;
      const target = registry[targetId];
      if (target && isContainer(target) && target.children_ids.includes(sourceId)) return;

      onRegistryUpdate((prev) => {
        if (targetId !== 'root' && GraphIntegrityService.detectCycle(targetId, sourceId, prev))
          return prev;
        let next = { ...prev };
        if (!isReference && oldParentId) {
          if (oldParentId === 'root') {
            const node = next[sourceId];
            if (node) {
              const sn = node as SimpleNote;
              next[sourceId] = {
                ...sn,
                tags: (sn.tags || []).filter((t: string) => t !== '__is_root__'),
              };
            }
          } else {
            const op = next[oldParentId];
            if (op && isContainer(op)) {
              const cn = op as ContainerNote;
              next[oldParentId] = {
                ...cn,
                children_ids: cn.children_ids.filter((id) => id !== sourceId),
              };
            }
            Object.keys(next).forEach((k) => {
              const o = next[k];
              if (
                isLink(o) &&
                o._type === NexusType.HIERARCHICAL_LINK &&
                o.source_id === oldParentId &&
                o.target_id === sourceId
              )
                delete next[k];
            });
          }
        }
        if (targetId === 'root') {
          const node = next[sourceId];
          if (node) {
            const sn = node as SimpleNote;
            next[sourceId] = {
              ...sn,
              tags: Array.from(new Set([...(sn.tags || []), '__is_root__'])),
            };
          }
          return next;
        }
        const targetNode = next[targetId];
        if (!targetNode || isLink(targetNode)) return next;

        // Promote to container if not already one
        if (!isContainer(targetNode)) {
          next[targetId] = {
            ...targetNode,
            _type:
              targetNode._type === NexusType.STORY_NOTE
                ? NexusType.STORY_NOTE
                : NexusType.CONTAINER_NOTE,
            children_ids: [sourceId],
            containment_type: ContainmentType.FOLDER,
            is_collapsed: false,
            default_layout: DefaultLayout.GRID,
          } as NexusObject;
        } else {
          const cn = targetNode as ContainerNote;
          next[targetId] = {
            ...cn,
            children_ids: Array.from(new Set([...cn.children_ids, sourceId])),
          };
        }

        const shadowLink = NexusGraphUtils.createShadowLink(targetId, sourceId);
        next[shadowLink.id] = shadowLink;
        return next;
      });
    },
    [onRegistryUpdate, registry],
  );

  return (
    <div className="flex flex-col h-full bg-nexus-950 text-nexus-text overflow-hidden">
      <header className="h-16 border-b border-nexus-800 bg-nexus-900/50 backdrop-blur-xl flex items-center px-6 justify-between shrink-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className={`p-2 rounded-lg transition-all ${showSidebar ? 'bg-nexus-accent/10 text-nexus-accent' : 'text-nexus-muted hover:text-nexus-text'}`}
          >
            <LayoutPanelLeft size={20} />
          </button>
          <h2 className="text-nexus-text font-display font-black text-lg tracking-tight uppercase">
            Structure <span className="text-nexus-500">Engine</span>
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowAuthorNotes(!showAuthorNotes)}
            className={`px-4 py-2 rounded-xl text-[10px] font-display font-black uppercase tracking-widest transition-all flex items-center gap-2 border ${showAuthorNotes ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'border-nexus-800 text-nexus-muted hover:text-nexus-text'}`}
          >
            <UserCircle2 size={16} /> Meta Layers: {showAuthorNotes ? 'ACTIVE' : 'SEQUESTERED'}
          </button>
        </div>
      </header>
      <div className="flex-1 flex overflow-hidden">
        {showSidebar && (
          <div
            id="structure-sidebar"
            className="h-full border-r border-nexus-800 animate-in slide-in-from-left duration-300"
          >
            <HierarchyExplorer
              items={Object.values(filteredRegistry)}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onReparent={handleReparent}
              onDeleteUnit={handleDeleteUnit}
            />
          </div>
        )}
        <main className="flex-1 relative overflow-hidden bg-nexus-950">
          <StructureVisualizer
            registry={filteredRegistry}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              setShowInspector(true);
            }}
            onAddChild={handleAddChild}
            onDelete={handleDeleteUnit}
            onReparent={handleReparent}
            onInspect={onNavigateToWiki}
            onReifyLink={handleReifyLink}
            onReifyNode={handleReifyNode}
            onReifyNodeToLink={handleReifyNodeToLink}
          />
          <InspectorPanel
            isOpen={showInspector}
            selectedObject={selectedObject}
            registry={registry}
            onUpdate={handleUpdateItem}
            onClose={() => setShowInspector(false)}
            onOpenWiki={onNavigateToWiki}
          />
        </main>
      </div>
    </div>
  );
};
