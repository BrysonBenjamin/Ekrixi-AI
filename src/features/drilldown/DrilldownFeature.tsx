import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  NexusObject,
  isContainer,
  isLink,
  isReified,
  NexusGraphUtils,
  NexusType,
  NexusCategory,
  ContainmentType,
  DefaultLayout,
  SimpleNote,
  SimpleLink,
  ContainerNote,
  StoryNote,
} from '../../types';
import { DrilldownCanvas } from './components/DrilldownCanvas';
import { ChevronRight, Home, Orbit, Compass, UserCircle2, Zap, ShieldAlert } from 'lucide-react';
import { useTutorial, TutorialStep } from '../../components/shared/tutorial/TutorialSystem';
import { IntegrityAssistant } from '../integrity/components/IntegrityAssistant';

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

export type VisibleNode = NexusObject & {
  depth: number;
  pathType: 'descendant' | 'ancestor' | 'lateral' | 'focus';
  isParentPath?: boolean;
};

export const DrilldownFeature: React.FC<DrilldownFeatureProps> = ({
  registry,
  onSelectNote,
  onRegistryUpdate,
  integrityFocus,
  onSetIntegrityFocus,
  onResolveAnomaly,
}) => {
  const [navStack, setNavStack] = useState<string[]>([]);
  const [showAuthorNotes, setShowAuthorNotes] = useState(false);
  const [isIntegrityOpen, setIsIntegrityOpen] = useState(false);

  const { startTutorial } = useTutorial();
  const currentContainerId = navStack[navStack.length - 1];
  const currentContainer = currentContainerId ? registry[currentContainerId] : null;

  useEffect(() => {
    if (integrityFocus && integrityFocus.mode === 'DRILL' && registry[integrityFocus.linkId]) {
      const link = registry[integrityFocus.linkId] as SimpleLink;
      if (link.source_id) {
        queueMicrotask(() => {
          setNavStack([link.source_id]);
        });
      }
    }
  }, [integrityFocus, registry]);

  const visibleNodesRegistry = useMemo(() => {
    const subRegistry: Record<string, VisibleNode> = {};
    const queue: { id: string; depth: number; pathType: VisibleNode['pathType'] }[] = [];

    if (!currentContainerId) {
      const allChildIds = new Set<string>();
      (Object.values(registry) as NexusObject[]).forEach((obj) => {
        if (isContainer(obj)) {
          obj.children_ids.forEach((cid) => allChildIds.add(cid));
        }
      });
      const roots = (Object.values(registry) as NexusObject[]).filter(
        (obj) => (!isLink(obj) || isReified(obj)) && !allChildIds.has(obj.id),
      );
      roots.forEach((root) => queue.push({ id: root.id, depth: 0, pathType: 'focus' }));
    } else {
      queue.push({ id: currentContainerId, depth: 0, pathType: 'focus' });
    }

    const visited = new Map<string, number>();
    // Hard-coded performance limit to avoid visual and computational bloat
    const MAX_DRILLDOWN_NODES = 40;
    let nodeCount = 0;

    while (queue.length > 0 && nodeCount < MAX_DRILLDOWN_NODES) {
      const { id, depth, pathType } = queue.shift()!;
      if (depth > 2) continue;
      if (visited.has(id) && visited.get(id)! <= depth) continue;

      const obj = registry[id];
      if (!obj) continue;

      // 1. Strictly exclude Story units (Book, Chapter, Scene, Beat)
      if (obj._type === NexusType.STORY_NOTE) continue;

      // 2. Exclude Reified Links (Aggregated Links) that connect to Story units
      if (isReified(obj)) {
        const source = registry[(obj as SimpleLink).source_id];
        const target = registry[(obj as SimpleLink).target_id];
        const isConnectedToStory =
          source?._type === NexusType.STORY_NOTE || target?._type === NexusType.STORY_NOTE;
        if (isConnectedToStory) continue;
      }

      // 3. Exclude Author units unless toggled
      if ((obj as SimpleNote).is_author_note && !showAuthorNotes) continue;

      // Safe access to children_ids to prevent crashes
      const childrenIds = (isContainer(obj) ? obj.children_ids : []) || [];

      const isNode = !isLink(obj) || isReified(obj);
      if (isNode) {
        visited.set(id, depth);
        subRegistry[id] = {
          ...obj,
          depth,
          pathType,
          isParentPath: pathType === 'ancestor',
        } as VisibleNode;
        nodeCount++;
      }

      if (isContainer(obj)) {
        childrenIds.forEach((childId) => {
          queue.push({
            id: childId,
            depth: depth + 1,
            pathType: pathType === 'focus' || pathType === 'descendant' ? 'descendant' : 'lateral',
          });
        });
      }

      if (isReified(obj)) {
        const sId = (obj as any).source_id;
        const tId = (obj as any).target_id;
        if (sId)
          queue.push({
            id: sId,
            depth: depth + 1,
            pathType: pathType === 'focus' || pathType === 'ancestor' ? 'ancestor' : 'lateral',
          });
        if (tId)
          queue.push({
            id: tId,
            depth: depth + 1,
            pathType: pathType === 'focus' || pathType === 'descendant' ? 'descendant' : 'lateral',
          });
      }

      (Object.values(registry) as NexusObject[]).forEach((l) => {
        if (isLink(l)) {
          if (l.source_id === id) {
            if (isReified(l)) {
              queue.push({
                id: l.id,
                depth: depth + 1,
                pathType:
                  pathType === 'focus' || pathType === 'descendant' ? 'descendant' : 'lateral',
              });
            }
            queue.push({
              id: l.target_id,
              depth: depth + 1,
              pathType:
                pathType === 'focus' || pathType === 'descendant' ? 'descendant' : 'lateral',
            });
          } else if (l.target_id === id) {
            if (isReified(l)) {
              queue.push({
                id: l.id,
                depth: depth + 1,
                pathType: pathType === 'focus' || pathType === 'ancestor' ? 'ancestor' : 'lateral',
              });
            }
            queue.push({
              id: l.source_id,
              depth: depth + 1,
              pathType: pathType === 'focus' || pathType === 'ancestor' ? 'ancestor' : 'lateral',
            });
          }
        }
      });
    }
    return subRegistry;
  }, [registry, currentContainerId, showAuthorNotes]);

  const handleDrilldown = useCallback(
    (id: string) => {
      // Allow drilling into ANY node to focus the graph on it
      setNavStack((prev) => {
        if (prev.includes(id)) {
          const idx = prev.indexOf(id);
          return prev.slice(0, idx + 1);
        }
        return [...prev, id];
      });
    },
    [registry],
  );

  const handleReifyLink = useCallback(
    (linkId: string) => {
      if (!onRegistryUpdate) return;
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
        return { ...prev, [linkId]: reifiedUnit };
      });
    },
    [onRegistryUpdate],
  );

  const handleReifyNode = useCallback(
    (nodeId: string) => {
      if (!onRegistryUpdate) return;
      onRegistryUpdate((prev) => {
        const node = prev[nodeId];
        if (!node || isLink(node) || isContainer(node)) return prev;
        const updatedNode: NexusObject = {
          ...node,
          _type: NexusType.CONTAINER_NOTE,
          containment_type: ContainmentType.FOLDER,
          is_collapsed: false,
          default_layout: DefaultLayout.GRID,
          children_ids: [],
          tags: [...(node.tags || []), 'promoted-logic'],
        } as NexusObject;
        return { ...prev, [nodeId]: updatedNode };
      });
    },
    [onRegistryUpdate],
  );

  const handleReifyNodeToLink = useCallback(
    (nodeId: string, sourceId: string, targetId: string) => {
      if (!onRegistryUpdate) return;
      onRegistryUpdate((prev) => {
        const node = prev[nodeId];
        const sNode = prev[sourceId];
        const tNode = prev[targetId];
        if (!node || !sNode || !tNode) return prev;

        const next = { ...prev };

        // Delete original links between node and neighbors
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
          ...node,
          _type: NexusType.AGGREGATED_SEMANTIC_LINK,
          is_reified: true,
          source_id: sourceId,
          target_id: targetId,
          verb: 'relates',
          verb_inverse: 'related to',
          containment_type: ContainmentType.FOLDER,
          children_ids: [],
          is_collapsed: false,
          default_layout: DefaultLayout.GRID,
        } as NexusObject;

        next[nodeId] = reifiedUnit;
        return next;
      });
    },
    [onRegistryUpdate],
  );

  const handleEstablishLink = useCallback(
    (sourceId: string, targetId: string, verb: string = 'binds') => {
      if (!onRegistryUpdate) return;
      onRegistryUpdate((prev) => {
        const source = prev[sourceId];
        const target = prev[targetId];
        if (!source || !target) return prev;
        const { link, updatedSource, updatedTarget } = NexusGraphUtils.createLink(
          source,
          target,
          NexusType.SEMANTIC_LINK,
          verb,
        );
        return {
          ...prev,
          [sourceId]: updatedSource,
          [targetId]: updatedTarget,
          [link.id]: link,
        };
      });
    },
    [onRegistryUpdate],
  );

  const handleReparent = useCallback(
    (sourceId: string, targetId: string, oldParentId?: string, isReference: boolean = false) => {
      if (sourceId === targetId || !onRegistryUpdate) return;
      const target = registry[targetId];
      if (target && isContainer(target) && target.children_ids.includes(sourceId)) return;

      onRegistryUpdate((prev) => {
        // Detect cycles
        let current: string | null = targetId;
        while (current && current !== 'root') {
          if (current === sourceId) return prev; // Cycle detected
          const parent = Object.values(prev).find(
            (o) => isContainer(o) && o.children_ids.includes(current!),
          );
          current = parent ? parent.id : null;
        }

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

  const handleDelete = useCallback(
    (id: string) => {
      if (!onRegistryUpdate) return;
      onRegistryUpdate((prev) => {
        const next = { ...prev };
        delete next[id];
        Object.keys(next).forEach((k) => {
          const o = next[k];
          if (isLink(o) && (o.source_id === id || o.target_id === id)) delete next[k];
          if (isContainer(o) && o.children_ids.includes(id)) {
            const container = o as ContainerNote;
            next[k] = {
              ...container,
              children_ids: container.children_ids.filter((cid) => cid !== id),
            };
          }
        });
        return next;
      });
    },
    [onRegistryUpdate],
  );

  return (
    <div className="flex flex-col h-full bg-nexus-950 relative overflow-hidden">
      <header className="h-14 border-b border-nexus-800 bg-nexus-900/60 backdrop-blur-xl flex items-center px-6 justify-between shrink-0 z-30 shadow-lg">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setNavStack([])}
            className={`p-2 rounded-lg transition-all flex items-center gap-2 ${!currentContainerId ? 'bg-nexus-accent/10 text-nexus-accent' : 'text-nexus-muted hover:text-nexus-text'}`}
          >
            <Home size={16} />
            <span className="text-[10px] font-display font-black uppercase tracking-widest hidden sm:inline">
              Origin
            </span>
          </button>
          {navStack.map((id, idx) => (
            <React.Fragment key={id}>
              <ChevronRight size={12} className="text-nexus-muted opacity-30 shrink-0" />
              <button
                onClick={() => setNavStack(navStack.slice(0, idx + 1))}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-display font-black uppercase tracking-widest transition-all border ${idx === navStack.length - 1 ? 'bg-nexus-accent/5 border-nexus-accent/20 text-nexus-accent' : 'border-transparent text-nexus-muted hover:text-nexus-text'}`}
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
            <UserCircle2 size={14} /> Author's Notes: {showAuthorNotes ? 'VISIBLE' : 'HIDDEN'}
          </button>
        </div>
      </header>
      <main className="flex-1 relative">
        <DrilldownCanvas
          registry={visibleNodesRegistry}
          fullRegistry={registry}
          onDrilldown={handleDrilldown}
          onInspect={onSelectNote}
          focusId={currentContainerId}
          onDelete={handleDelete}
          onReifyLink={handleReifyLink}
          onReifyNode={handleReifyNode}
          onReifyNodeToLink={handleReifyNodeToLink}
          onEstablishLink={handleEstablishLink}
          onReparent={handleReparent}
          integrityFocus={integrityFocus}
        />
      </main>
      <footer className="absolute bottom-8 left-8 right-8 pointer-events-none flex justify-between items-end z-20">
        <div className="p-8 bg-nexus-900/80 backdrop-blur-2xl border border-nexus-800 rounded-[40px] pointer-events-auto shadow-[0_32px_64px_var(--shadow-color)] max-w-xl group hover:border-nexus-accent/30 transition-all duration-500">
          <div className="flex items-center gap-4 mb-3">
            <div className="p-2 bg-nexus-accent/10 rounded-xl">
              <Compass size={20} className="text-nexus-accent" />
            </div>
            <span className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.4em]">
              Current Scry
            </span>
          </div>
          <h2 className="text-4xl font-display font-black text-nexus-text tracking-tighter leading-none mb-4 group-hover:text-nexus-accent transition-colors">
            {currentContainer ? (currentContainer as any).title : 'World Registry'}
          </h2>
          <h2 className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.2em] mb-4 opacity-50">
            Conceptual Map
          </h2>
          <p className="text-sm text-nexus-muted font-serif italic max-w-sm line-clamp-2 leading-relaxed opacity-70">
            {currentContainer
              ? (currentContainer as any).gist
              : 'Tracing scion lines and causality from the origin point of the sector.'}
          </p>
        </div>
        <div className="pointer-events-auto flex flex-col gap-3">
          <button
            onClick={() => setIsIntegrityOpen(!isIntegrityOpen)}
            className="w-14 h-14 rounded-2xl bg-nexus-900 border border-nexus-800 flex items-center justify-center text-nexus-accent hover:border-nexus-accent hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all group self-end"
          >
            <ShieldAlert
              size={28}
              className={
                isIntegrityOpen
                  ? 'rotate-90 text-nexus-accent'
                  : 'text-nexus-muted group-hover:text-nexus-accent transition-all'
              }
            />
          </button>
          <div className="px-5 py-3 bg-nexus-900/80 backdrop-blur-xl border border-nexus-800 rounded-2xl flex items-center gap-4 shadow-xl">
            <Zap size={14} className="text-nexus-accent animate-pulse" />
            <span className="text-[9px] font-display font-black text-nexus-muted uppercase tracking-widest">
              {Object.keys(visibleNodesRegistry).length} Neural Signatures Active
            </span>
          </div>
        </div>
      </footer>
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
