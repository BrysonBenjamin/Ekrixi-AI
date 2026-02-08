import React, { useState, useMemo } from 'react';
import { Search, Database, ChevronRight, Globe, Box, Share2, MapPin, Users } from 'lucide-react';
import { NexusObject, NexusCategory, isLink, isReified, NexusType } from '../../../types';
import ReactMarkdown from 'react-markdown';

interface LocalizedWorldWikiProps {
  registry: Record<string, NexusObject>;
  mentions: Set<string>;
}

export const LocalizedWorldWiki: React.FC<LocalizedWorldWikiProps> = ({ registry, mentions }) => {
  const [search, setSearch] = useState('');
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);

  const nodes = useMemo(() => {
    const all = Object.values(registry) as NexusObject[];
    return all
      .filter((o) => {
        if (isLink(o) && !isReified(o)) return false;
        if (o._type === NexusType.STORY_NOTE) return false;

        const title = 'title' in o ? (o as any).title : '';
        const gist = 'gist' in o ? (o as any).gist : '';

        return (
          title?.toLowerCase().includes(search.toLowerCase()) ||
          gist?.toLowerCase().includes(search.toLowerCase())
        );
      })
      .sort((a, b) => {
        const aInMentions = mentions.has(a.id);
        const bInMentions = mentions.has(b.id);
        if (aInMentions && !bInMentions) return -1;
        if (!aInMentions && bInMentions) return 1;
        return 0;
      });
  }, [registry, search, mentions]);

  const focusedNode = focusNodeId ? (registry[focusNodeId] as NexusObject) : null;

  if (focusedNode) {
    return (
      <div className="h-full flex flex-col bg-nexus-950 animate-in fade-in slide-in-from-right-4 duration-300">
        <header className="h-14 border-b border-nexus-800 flex items-center px-6 justify-between bg-nexus-900/40">
          <button
            onClick={() => setFocusNodeId(null)}
            className="text-[10px] font-black text-nexus-muted hover:text-nexus-accent uppercase tracking-widest flex items-center gap-2"
          >
            <Globe size={14} /> Back to Library
          </button>
          <div className="px-3 py-1 bg-nexus-accent/10 border border-nexus-accent/30 rounded-full text-[9px] font-black text-nexus-accent uppercase">
            {'category_id' in focusedNode ? (focusedNode as any).category_id : 'CONCEPT'}
          </div>
        </header>
        <div className="flex-1 overflow-y-auto no-scrollbar p-8 space-y-8">
          <div className="space-y-4">
            <h2 className="text-3xl font-display font-black text-nexus-text uppercase tracking-tight leading-none">
              {'title' in focusedNode ? (focusedNode as any).title : 'Unit'}
            </h2>
            <div className="pl-6 border-l-2 border-nexus-accent/30 py-1">
              <p className="text-base font-serif italic text-nexus-muted leading-relaxed">
                "{'gist' in focusedNode ? (focusedNode as any).gist : ''}"
              </p>
            </div>
          </div>
          <div className="prose prose-sm prose-invert max-w-none wiki-content border-t border-nexus-800 pt-8">
            <ReactMarkdown>
              {'prose_content' in focusedNode ? (focusedNode as any).prose_content || '' : ''}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-nexus-900/20 font-sans">
      <div className="p-4 border-b border-nexus-800 bg-nexus-950/40 shrink-0">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nexus-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search World Bank..."
            className="w-full bg-nexus-950 border border-nexus-800 rounded-xl pl-10 pr-4 py-3 text-xs text-nexus-text outline-none focus:border-nexus-accent transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
        {nodes.length === 0 ? (
          <div className="py-20 text-center opacity-20">
            <Database size={40} className="mx-auto mb-4" />
            <p className="text-xs font-black uppercase tracking-widest">Registry Vault Empty</p>
          </div>
        ) : (
          nodes.map((node) => {
            const isMentioned = mentions.has(node.id);
            const title = 'title' in node ? (node as any).title : 'Unit';
            const gist = 'gist' in node ? (node as any).gist : '';
            const categoryId =
              'category_id' in node ? (node as any).category_id : NexusCategory.CONCEPT;
            return (
              <button
                key={node.id}
                onClick={() => setFocusNodeId(node.id)}
                className={`w-full text-left p-5 rounded-[28px] border transition-all group relative overflow-hidden ${isMentioned ? 'bg-nexus-accent/5 border-nexus-accent shadow-lg ring-1 ring-nexus-accent/20' : 'bg-nexus-950 border-nexus-800 hover:border-nexus-700'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CategoryIcon cat={categoryId} reified={isReified(node)} />
                    <span
                      className={`text-[8px] font-mono font-black uppercase tracking-widest ${isMentioned ? 'text-nexus-accent' : 'text-nexus-muted'}`}
                    >
                      {isMentioned ? 'Sync: Active' : categoryId}
                    </span>
                  </div>
                  <ChevronRight
                    size={14}
                    className="text-nexus-muted group-hover:text-nexus-text group-hover:translate-x-1 transition-all"
                  />
                </div>
                <div className="text-sm font-display font-bold text-nexus-text uppercase truncate mb-1">
                  {title}
                </div>
                <p className="text-[10px] text-nexus-muted italic line-clamp-1 font-serif">
                  "{gist}"
                </p>
              </button>
            );
          })
        )}
      </div>

      <footer className="p-4 border-t border-nexus-800 bg-nexus-950 flex items-center justify-between opacity-50 shrink-0">
        <span className="text-[9px] font-mono uppercase tracking-widest">Registry Sync: 100%</span>
        <Globe size={14} className="text-nexus-accent animate-spin-slow" />
      </footer>
    </div>
  );
};

const CategoryIcon = ({ cat, reified }: { cat: NexusCategory; reified: boolean }) => {
  if (reified) return <Share2 size={12} className="text-nexus-accent" />;
  switch (cat) {
    case NexusCategory.LOCATION:
      return <MapPin size={12} className="text-nexus-accent" />;
    case NexusCategory.CHARACTER:
      return <Users size={12} className="text-purple-400" />;
    default:
      return <Box size={12} className="text-slate-500" />;
  }
};
