import React, { useState, useMemo } from 'react';
import {
  Search,
  Folder,
  FileText,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Boxes,
  Share2,
  Terminal,
  UserCircle2,
  Move,
  Link as LinkIcon,
  AlertCircle,
  Trash2,
  Scissors,
} from 'lucide-react';
import {
  NexusObject,
  isContainer,
  isLink,
  isReified,
  SemanticLink,
  SimpleNote,
  AggregatedSemanticLink,
} from '../../../types';
import { GraphIntegrityService } from '../../integrity/GraphIntegrityService';

interface HierarchyExplorerProps {
  items: NexusObject[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReparent?: (
    sourceId: string,
    targetId: string,
    oldParentId?: string,
    isReference?: boolean,
  ) => void;
  onDeleteReference?: (sourceId: string, parentId: string) => void;
  onDeleteUnit?: (id: string) => void;
}

interface PendingDrop {
  sourceId: string;
  targetId: string;
  oldParentId?: string;
}

interface PendingDelete {
  id: string;
  parentId: string;
}

export const HierarchyExplorer: React.FC<HierarchyExplorerProps> = ({
  items,
  selectedId,
  onSelect,
  onReparent,
  onDeleteReference,
  onDeleteUnit,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [isDraggingOverall, setIsDraggingOverall] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const toggleFolder = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const { roots, registry, reifiedLinksByOrigin } = useMemo(() => {
    const reg: Record<string, NexusObject> = {};
    const byOrigin: Record<string, string[]> = {};

    items.forEach((item) => {
      reg[item.id] = item;
      if (isReified(item)) {
        const sourceId = (item as AggregatedSemanticLink).source_id;
        if (!byOrigin[sourceId]) byOrigin[sourceId] = [];
        byOrigin[sourceId].push(item.id);
      }
    });

    const childIds = new Set<string>();
    items.forEach((item) => {
      if (isContainer(item)) {
        item.children_ids.forEach((id) => childIds.add(id));
      }
    });

    const rootNodes = items.filter((item) => {
      const isExplicitChild = childIds.has(item.id);
      const isManualRoot = 'tags' in item && (item as SimpleNote).tags?.includes('__is_root__');
      const isRelLink = isLink(item) && !isReified(item);

      if (isRelLink) return false;

      // Reified items are only roots if not explicitly parented AND not implicitly parented by their source
      if (isReified(item)) {
        const hasSourceParent =
          'source_id' in item &&
          (item as AggregatedSemanticLink).source_id &&
          reg[(item as AggregatedSemanticLink).source_id];
        return !isExplicitChild && !hasSourceParent;
      }

      return !isExplicitChild || isManualRoot;
    });

    return {
      roots: rootNodes,
      registry: reg,
      reifiedLinksByOrigin: byOrigin,
    };
  }, [items]);

  const handleDragStart = (e: React.DragEvent, id: string, parentId?: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.setData('application/nexus-parent-id', parentId || 'root');
    e.dataTransfer.effectAllowed = 'copyMove';
    setTimeout(() => setIsDraggingOverall(true), 0);
  };

  const handleDragEnd = () => {
    setIsDraggingOverall(false);
    setDragOverId(null);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const item = registry[id];
    // Allow dropping onto any node that isn't a simple link
    if (id === 'root' || (item && !isLink(item))) {
      if (dragOverId !== id) setDragOverId(id);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = e.dataTransfer.getData('text/plain');
    const oldParentId = e.dataTransfer.getData('application/nexus-parent-id') || 'root';

    setIsDraggingOverall(false);
    setDragOverId(null);
    if (sourceId === targetId) return;

    setPendingDrop({ sourceId, targetId, oldParentId });
  };

  const handleExecuteDrop = (isReference: boolean) => {
    if (pendingDrop && onReparent) {
      onReparent(pendingDrop.sourceId, pendingDrop.targetId, pendingDrop.oldParentId, isReference);
      // Auto-expand target if it was a file that became a folder
      setExpandedFolders((prev) => new Set([...prev, pendingDrop.targetId]));
    }
    setPendingDrop(null);
  };

  const isCycle = useMemo(() => {
    if (!pendingDrop || pendingDrop.targetId === 'root') return false;
    return GraphIntegrityService.detectCycle(pendingDrop.targetId, pendingDrop.sourceId, registry);
  }, [pendingDrop, registry]);

  const renderNode = (
    node: NexusObject,
    depth: number = 0,
    context: { parentId?: string; isShadowAttachment?: boolean } = {},
  ) => {
    const { parentId, isShadowAttachment = false } = context;
    const isFolder = isContainer(node);
    const reified = isReified(node);
    const isAuthorNote = 'is_author_note' in node && (node as SimpleNote).is_author_note;
    const isOpen = expandedFolders.has(node.id);
    const isActive = selectedId === node.id;
    const isDraggingOver = dragOverId === node.id;
    const title =
      'title' in node
        ? (node as SimpleNote).title
        : isLink(node)
          ? (node as SemanticLink).verb
          : 'Untitled Unit';

    const incomingReifiedIds = !isShadowAttachment ? reifiedLinksByOrigin[node.id] || [] : [];

    return (
      <React.Fragment
        key={`${node.id}-${parentId || 'root'}-${isShadowAttachment ? 'shadow' : 'main'}`}
      >
        {incomingReifiedIds.map((rid) => {
          const rNode = registry[rid];
          if (!rNode) return null;
          return renderNode(rNode, depth, { parentId, isShadowAttachment: true });
        })}

        <div className="flex flex-col">
          <div
            draggable
            onDragStart={(e) => handleDragStart(e, node.id, parentId)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, node.id)}
            onDrop={(e) => handleDrop(e, node.id)}
            onClick={() => onSelect(node.id)}
            className={`
                            group flex items-center gap-2 px-2 py-3 md:py-2 rounded-xl text-[11px] transition-all cursor-pointer border relative
                            ${
                              isAuthorNote
                                ? isActive
                                  ? 'bg-amber-500/20 text-amber-500 border-amber-500/40 shadow-lg'
                                  : 'text-amber-500/70 border-amber-500/10 hover:bg-amber-500/10 hover:border-amber-500/30'
                                : reified || isShadowAttachment
                                  ? isActive
                                    ? 'bg-nexus-accent/20 text-nexus-accent border-nexus-accent/40 shadow-lg'
                                    : 'text-nexus-muted border-nexus-accent/10 hover:bg-nexus-accent/10 hover:border-nexus-accent/30'
                                  : isActive
                                    ? 'bg-nexus-accent/10 text-nexus-accent border-nexus-accent/30 shadow-sm'
                                    : isDraggingOver
                                      ? 'bg-nexus-accent/30 border-nexus-accent border-dashed animate-pulse'
                                      : 'text-nexus-muted hover:text-nexus-text hover:bg-nexus-800/40 border-transparent'
                            }
                        `}
            style={{ marginLeft: `${depth * 12}px` }}
          >
            <div className="flex items-center gap-1.5 shrink-0">
              {isFolder ? (
                <button
                  onClick={(e) => toggleFolder(e, node.id)}
                  className={`p-0.5 rounded transition-colors ${reified || isShadowAttachment ? 'text-nexus-accent hover:bg-nexus-accent/20' : 'text-nexus-muted hover:bg-nexus-800 group-hover:text-nexus-text'}`}
                >
                  {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
              ) : (
                <div className="w-4 flex justify-center">
                  <div
                    className={`w-1 h-1 rounded-full ${isAuthorNote ? 'bg-amber-500' : reified || isShadowAttachment ? 'bg-nexus-accent shadow-[0_0_5px_var(--accent-color)]' : 'bg-nexus-700'}`}
                  />
                </div>
              )}

              {isAuthorNote ? (
                <UserCircle2
                  size={13}
                  className={isActive ? 'text-amber-500' : 'text-amber-500/60'}
                />
              ) : reified || isShadowAttachment ? (
                <Share2 size={13} className={isActive ? 'text-nexus-accent' : 'text-nexus-muted'} />
              ) : isFolder ? (
                <Folder size={13} className={isActive ? 'text-nexus-accent' : 'text-nexus-500'} />
              ) : (
                <FileText
                  size={13}
                  className={isActive ? 'text-nexus-accent' : 'text-nexus-muted'}
                />
              )}
            </div>

            <span
              className={`truncate font-display font-bold flex-1 ${reified || isShadowAttachment ? 'italic tracking-tight' : ''}`}
            >
              {isAuthorNote && (
                <span className="text-[7px] font-black text-amber-500 mr-1.5 uppercase border border-amber-500/30 px-1 rounded-sm bg-amber-500/5">
                  Meta
                </span>
              )}
              {title}
            </span>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setPendingDelete({ id: node.id, parentId: parentId || 'root' });
              }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 hover:text-red-500 rounded transition-all"
            >
              <Trash2 size={12} />
            </button>
          </div>

          {isFolder && isOpen && (
            <div className="flex flex-col mt-1">
              {node.children_ids.map((cid) => {
                const child = registry[cid];
                return child ? renderNode(child, depth + 1, { parentId: node.id }) : null;
              })}
            </div>
          )}
        </div>
      </React.Fragment>
    );
  };

  if (isCollapsed) {
    return (
      <aside className="w-16 border-r border-nexus-800 bg-nexus-900 flex flex-col items-center py-6 gap-8 shrink-0 z-20 transition-all duration-300">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2.5 hover:bg-nexus-800 rounded-xl text-nexus-muted hover:text-nexus-accent transition-all"
        >
          <ChevronRight size={20} />
        </button>
        <div className="h-px w-6 bg-nexus-800" />
        <div className="flex flex-col gap-6 opacity-30">
          <Boxes size={20} className="text-nexus-muted" />
          <Terminal size={20} className="text-nexus-accent" />
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-full md:w-80 border-r border-nexus-800 bg-nexus-900 flex flex-col overflow-hidden shrink-0 transition-all duration-300 relative z-20 shadow-2xl">
      <div
        className={`p-5 border-b transition-all duration-300 ${dragOverId === 'root' ? 'bg-nexus-accent/10 border-nexus-accent' : 'bg-nexus-900/40 border-nexus-800'}`}
        onDragOver={(e) => handleDragOver(e, 'root')}
        onDrop={(e) => handleDrop(e, 'root')}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Boxes size={16} className="text-nexus-accent" />
            <span
              className={`text-[11px] font-display font-black uppercase tracking-[0.2em] ${dragOverId === 'root' ? 'text-nexus-text' : 'text-nexus-text opacity-70'}`}
            >
              {dragOverId === 'root' ? 'Relocate to Origin' : 'Registry Map'}
            </span>
          </div>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1.5 hover:bg-nexus-800 rounded-lg text-nexus-muted hover:text-nexus-text transition-all"
          >
            <ChevronLeft size={18} />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-nexus-muted" size={13} />
          <input
            type="text"
            placeholder="Search Registry..."
            className="w-full bg-nexus-950 border border-nexus-800 rounded-xl py-2.5 pl-9 pr-4 text-[10px] text-nexus-text outline-none focus:border-nexus-accent transition-all placeholder:text-nexus-muted shadow-inner"
          />
        </div>
      </div>

      <div
        className={`flex-1 overflow-y-auto p-4 space-y-1 no-scrollbar border-b border-nexus-800 relative transition-colors duration-500 ${isDraggingOverall && !dragOverId ? 'bg-nexus-accent/5' : ''}`}
        onDragOver={(e) => handleDragOver(e, 'root')}
        onDrop={(e) => handleDrop(e, 'root')}
      >
        {roots.map((root) => renderNode(root))}
      </div>

      {/* Link Protocol Modal */}
      {pendingDrop && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-nexus-950/40 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="absolute inset-0 cursor-pointer" onClick={() => setPendingDrop(null)} />
          <div className="relative bg-nexus-900 border border-nexus-700 rounded-[32px] shadow-2xl overflow-hidden w-full max-w-[280px] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-nexus-800/50 bg-nexus-950/30">
              <div className="text-[9px] font-display font-black text-nexus-muted uppercase tracking-[0.3em] mb-1">
                Link Protocol
              </div>
              <div className="text-sm font-display font-bold text-white truncate">
                {(registry[pendingDrop.sourceId] as SimpleNote)?.title} →{' '}
                {pendingDrop.targetId === 'root'
                  ? 'Origin'
                  : (registry[pendingDrop.targetId] as SimpleNote)?.title}
              </div>
            </div>
            {isCycle ? (
              <div className="p-6 text-center space-y-4">
                <AlertCircle className="text-red-500 mx-auto" size={24} />
                <div className="text-[11px] font-display font-black text-red-400 uppercase tracking-widest">
                  Cycle Detected
                </div>
                <button
                  onClick={() => setPendingDrop(null)}
                  className="w-full py-3 rounded-2xl bg-nexus-800 text-[10px] font-display font-black uppercase tracking-widest"
                >
                  Dismiss
                </button>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                <button
                  onClick={() => handleExecuteDrop(false)}
                  className="w-full flex items-center gap-4 p-3.5 rounded-2xl hover:bg-white/[0.04] transition-all group text-left border border-transparent hover:border-nexus-800"
                >
                  <div className="p-2 rounded-xl bg-nexus-950 border border-nexus-800 text-nexus-accent group-hover:border-nexus-700">
                    <Move size={18} />
                  </div>
                  <div>
                    <div className="text-[12px] font-display font-bold text-white">
                      Relocate Unit
                    </div>
                    <div className="text-[8px] font-mono uppercase tracking-widest text-nexus-muted">
                      Detaches from current parent
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => handleExecuteDrop(true)}
                  className="w-full flex items-center gap-4 p-3.5 rounded-2xl hover:bg-white/[0.04] transition-all group text-left border border-transparent hover:border-nexus-800"
                >
                  <div className="p-2 rounded-xl bg-nexus-950 border border-nexus-800 text-nexus-essence group-hover:border-nexus-700">
                    <LinkIcon size={18} />
                  </div>
                  <div>
                    <div className="text-[12px] font-display font-bold text-white">
                      Create Reference
                    </div>
                    <div className="text-[8px] font-mono uppercase tracking-widest text-nexus-muted">
                      Multi-parent semantic bind
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setPendingDrop(null)}
                  className="w-full py-3 text-[9px] font-display font-black text-nexus-muted uppercase tracking-widest"
                >
                  Abort
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Protocol Modal */}
      {pendingDelete && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-nexus-950/40 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="absolute inset-0 cursor-pointer" onClick={() => setPendingDelete(null)} />
          <div className="relative bg-nexus-900 border border-nexus-700 rounded-[32px] shadow-2xl overflow-hidden w-full max-w-[280px] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-nexus-800/50 bg-nexus-950/30">
              <div className="text-[9px] font-display font-black text-nexus-muted uppercase tracking-[0.3em] mb-1">
                Delete Protocol
              </div>
              <div className="text-sm font-display font-bold text-white truncate">
                {(registry[pendingDelete.id] as SimpleNote)?.title}
              </div>
            </div>
            <div className="p-3 space-y-2">
              <button
                onClick={() => {
                  onDeleteReference?.(pendingDelete.id, pendingDelete.parentId);
                  setPendingDelete(null);
                }}
                className="w-full flex items-center gap-4 p-3.5 rounded-2xl hover:bg-white/[0.04] transition-all group text-left border border-transparent hover:border-nexus-800"
              >
                <div className="p-2 rounded-xl bg-nexus-950 border border-nexus-800 text-amber-500 group-hover:border-nexus-700">
                  <Scissors size={18} />
                </div>
                <div>
                  <div className="text-[12px] font-display font-bold text-white">
                    Detach Reference
                  </div>
                  <div className="text-[8px] font-mono uppercase tracking-widest text-nexus-muted">
                    Removes only this location
                  </div>
                </div>
              </button>
              <button
                onClick={() => {
                  onDeleteUnit?.(pendingDelete.id);
                  setPendingDelete(null);
                }}
                className="w-full flex items-center gap-4 p-3.5 rounded-2xl hover:bg-white/[0.04] transition-all group text-left border border-transparent hover:border-nexus-800"
              >
                <div className="p-2 rounded-xl bg-nexus-950 border border-nexus-800 text-red-500 group-hover:border-nexus-700">
                  <Trash2 size={18} />
                </div>
                <div>
                  <div className="text-[12px] font-display font-bold text-white">
                    Terminate Unit
                  </div>
                  <div className="text-[8px] font-mono uppercase tracking-widest text-nexus-muted">
                    Full deletion from registry
                  </div>
                </div>
              </button>
              <button
                onClick={() => setPendingDelete(null)}
                className="w-full py-3 text-[9px] font-display font-black text-nexus-muted uppercase tracking-widest"
              >
                Abort
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
