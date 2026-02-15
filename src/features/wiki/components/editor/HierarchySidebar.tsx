import React from 'react';
import {
  ChevronRight,
  ChevronUp,
  CornerDownRight,
  Network,
  Plus,
  ArrowLeftCircle,
  FolderOpen,
} from 'lucide-react';
import {
  NexusObject,
  NexusNote,
  NexusCategory,
  SimpleNote,
  isContainer,
  isLink,
} from '../../../../types';

interface HierarchySidebarProps {
  currentNode: NexusObject;
  registry: Record<string, NexusObject>;
  incomingLinks: NexusObject[]; // Pre-computed backlinks

  onSelect: (id: string) => void;
  onAddChild: () => void;
}

export const HierarchySidebar: React.FC<HierarchySidebarProps> = ({
  currentNode,
  registry,
  incomingLinks,
  onSelect,
  onAddChild,
}) => {
  // 1. Resolve Parent(s)
  // For now, we look for nodes that contain this node in their children_ids
  // This is an expensive scan O(N) unless we have a parent index.
  // For MVP, we'll scan OR rely on the fact that usually we navigate down.
  // TODO: Add useParentIndex if this becomes slow.
  const parents = Object.values(registry).filter(
    (obj) => isContainer(obj) && obj.children_ids.includes(currentNode.id),
  ) as NexusNote[];

  // 2. Resolve Children
  const childrenIds = isContainer(currentNode) ? currentNode.children_ids : [];
  const children = childrenIds.map((id) => registry[id] as NexusNote).filter(Boolean); // Filter out ghosts

  return (
    <div className="flex flex-col gap-6">
      {/* 
        ------------------------------------
        PARENTS
        ------------------------------------
      */}
      <div className="space-y-2">
        <h4 className="text-[9px] font-black uppercase tracking-widest text-nexus-muted opacity-60 pl-2">
          Superior Context (Parents)
        </h4>
        {parents.length === 0 ? (
          <div className="px-3 py-2 text-xs text-nexus-muted italic opacity-40">Top-level Root</div>
        ) : (
          parents.map((parent) => (
            <button
              key={parent.id}
              onClick={() => onSelect(parent.id)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-nexus-800/50 text-left group transition-colors"
            >
              <CornerDownRight size={14} className="text-nexus-muted rotate-180" />
              <span className="text-xs font-bold text-nexus-text group-hover:text-nexus-accent truncate">
                {parent.title}
              </span>
            </button>
          ))
        )}
      </div>

      <div className="w-full h-px bg-nexus-800/30" />

      {/* 
        ------------------------------------
        CHILDREN
        ------------------------------------
      */}
      <div className="flex-1 min-h-[100px] flex flex-col space-y-2">
        <div className="flex items-center justify-between pr-2">
          <h4 className="text-[9px] font-black uppercase tracking-widest text-nexus-muted opacity-60 pl-2">
            Inferior Context (Children)
          </h4>
          <button
            onClick={onAddChild}
            className="text-nexus-accent hover:text-white p-1 rounded hover:bg-nexus-nexus-800 transition-colors"
            title="Add Child Node"
          >
            <Plus size={12} />
          </button>
        </div>

        <div className="space-y-1">
          {children.length === 0 ? (
            <div className="px-3 py-8 text-xs text-nexus-muted italic opacity-40 text-center border-2 border-dashed border-nexus-800/30 rounded-xl">
              No Children
            </div>
          ) : (
            children.map((child) => (
              <button
                key={child.id}
                onClick={() => onSelect(child.id)}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-nexus-800/50 text-left group transition-colors"
              >
                {isContainer(child) && child.children_ids.length > 0 ? (
                  <FolderOpen size={12} className="text-nexus-muted/70" />
                ) : (
                  <div className="w-3" />
                )}
                <span className="text-xs text-nexus-text group-hover:text-nexus-accent truncate">
                  {child.title}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="w-full h-px bg-nexus-800/30" />

      {/* 
        ------------------------------------
        BACKLINKS
        ------------------------------------
      */}
      <div className="space-y-2">
        <h4 className="text-[9px] font-black uppercase tracking-widest text-nexus-muted opacity-60 pl-2">
          Inbox (Backlinks)
        </h4>
        <div className="space-y-1">
          {incomingLinks.length === 0 ? (
            <div className="px-3 py-2 text-xs text-nexus-muted italic opacity-40">
              No incoming links
            </div>
          ) : (
            incomingLinks.map((link) => {
              if (!isLink(link)) return null;

              // Resolving the source node name
              // Typically links store source_id
              const sourceNode = registry[link.source_id] as NexusNote;
              if (!sourceNode) return null;

              return (
                <button
                  key={link.id}
                  onClick={() => onSelect(sourceNode.id)} // Navigate to Source
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-nexus-800/50 text-left group transition-colors"
                >
                  <ArrowLeftCircle size={12} className="text-nexus-muted/50" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-nexus-text group-hover:text-nexus-accent truncate">
                      {sourceNode.title}
                    </div>
                    <div className="text-[9px] text-nexus-muted truncate">
                      via "{link.verb || 'related'}"
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
