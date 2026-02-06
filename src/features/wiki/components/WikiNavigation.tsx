import React, { useMemo } from 'react';
import { ArrowLeft, List, Hash } from 'lucide-react';
import {
  NexusObject,
  isLink,
  isContainer,
  isReified,
  SimpleNote,
  SimpleLink,
} from '../../../types';
import { TocItem, WikiConnection } from '../types';

interface WikiNavigationProps {
  registry: Record<string, NexusObject>;
  selectedId: string | null;
  currentObject: NexusObject | null;
  onSelect: (id: string) => void;
  handleScrollToSection: (id: string) => void;
}

export const WikiNavigation: React.FC<WikiNavigationProps> = ({
  registry,
  selectedId,
  currentObject,
  onSelect,
  handleScrollToSection,
}) => {
  const tableOfContents = useMemo(() => {
    if (!currentObject) return [];
    const walk = (node: NexusObject, depth: number, visited: Set<string>, toc: TocItem[]) => {
      if (depth > 2 || visited.has(node.id)) return;
      visited.add(node.id);
      toc.push({
        id: node.id,
        title: (node as SimpleNote).title || (node as SimpleLink).verb,
        depth,
      });
      if (isContainer(node)) {
        node.children_ids.forEach((cid: string) => {
          const child = registry[cid];
          if (child && (!isLink(child) || isReified(child))) walk(child, depth + 1, visited, toc);
        });
      }
    };
    const result: TocItem[] = [];
    walk(currentObject, 0, new Set(), result);
    return result;
  }, [currentObject, registry]);

  const connections = useMemo(() => {
    if (!selectedId) return [];
    return (Object.values(registry) as NexusObject[])
      .filter((obj) => {
        if (!isLink(obj)) return false;
        return (
          (obj as SimpleLink).source_id === selectedId ||
          (obj as SimpleLink).target_id === selectedId
        );
      })
      .map((link) => {
        const isL = isLink(link);
        if (!isL) return null;
        const sLink = link as SimpleLink;
        const isOutgoing = sLink.source_id === selectedId;
        const neighborId = isOutgoing ? sLink.target_id : sLink.source_id;
        const neighbor = registry[neighborId];
        return {
          linkId: link.id,
          verb: isOutgoing ? sLink.verb : sLink.verb_inverse,
          neighbor,
        };
      })
      .filter((conn): conn is WikiConnection => !!conn && !!conn.neighbor);
  }, [selectedId, registry]);

  const isL = isLink(currentObject) && !isReified(currentObject);
  const isStoryActive = currentObject?._type === 'STORY_NOTE'; // Check string literal if enum imports fail, or use generated type

  return (
    <aside className="hidden lg:flex w-80 xl:w-96 border-r border-nexus-800/30 bg-nexus-900/40 flex-col overflow-y-auto no-scrollbar p-10 shrink-0 z-30 backdrop-blur-md">
      <button
        onClick={() => onSelect('')}
        className="flex items-center gap-3 text-nexus-muted hover:text-nexus-accent transition-colors group text-[10px] font-display font-black uppercase tracking-widest mb-16"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Global Registry
      </button>

      <div className="space-y-16">
        {tableOfContents.length > 1 && (
          <nav>
            <h4 className="text-[11px] font-display font-black text-nexus-muted uppercase tracking-[0.4em] mb-10 flex items-center gap-3 opacity-50">
              <List size={16} /> Unit Map
            </h4>
            <ul className="space-y-6">
              {tableOfContents.map((item) => (
                <li key={item.id} style={{ marginLeft: `${item.depth * 16}px` }}>
                  <button
                    onClick={() => handleScrollToSection(item.id)}
                    className="text-sm font-display font-bold text-nexus-text/70 hover:text-nexus-accent transition-all flex items-center gap-3 group text-left w-full uppercase"
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${selectedId === item.id ? (isStoryActive ? 'bg-nexus-ruby' : 'bg-nexus-accent') + ' scale-150 shadow-lg' : 'bg-nexus-800 group-hover:bg-nexus-accent'}`}
                    />
                    {item.title}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {!isL && connections.length > 0 && (
          <div>
            <h4 className="text-[11px] font-display font-black text-nexus-muted uppercase tracking-[0.4em] mb-10 flex items-center gap-3 opacity-50">
              <Hash size={16} /> Logic Streams
            </h4>
            <div className="space-y-4">
              {connections.map((conn) => (
                <button
                  key={conn.linkId}
                  onClick={() => onSelect(conn.neighbor.id)}
                  className="w-full flex flex-col p-5 rounded-3xl bg-nexus-900 border border-nexus-800 hover:border-nexus-accent hover:translate-x-1 transition-all group text-left shadow-lg"
                >
                  <span className="text-[9px] font-display font-black text-nexus-muted uppercase tracking-widest mb-1.5 opacity-60 group-hover:text-nexus-accent">
                    {conn.verb}
                  </span>
                  <span className="text-[13px] font-display font-bold text-nexus-text/90 group-hover:text-nexus-text truncate uppercase">
                    {(conn.neighbor as SimpleNote).title || (conn.neighbor as SimpleLink).verb}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
