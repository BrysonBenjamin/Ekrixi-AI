import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  Sparkles,
  Clock,
  ArrowRight,
  Zap,
  PenTool,
  MapPin,
  Users,
  Share2,
  ChevronRight,
} from 'lucide-react';
import { Logo } from '../../../components/shared/Logo';
import {
  NexusObject,
  NexusCategory,
  NexusType,
  isLink,
  isReified,
  SimpleNote,
  SimpleLink,
} from '../../../types';
import { getTimeState } from '../../../core/utils/nexus-accessors';

interface WikiRegistryViewProps {
  registry: Record<string, NexusObject>;
  onSelect: (id: string) => void;
}

export const WikiRegistryView: React.FC<WikiRegistryViewProps> = ({ registry, onSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<NexusCategory | 'ALL'>('ALL');

  // --- DERIVED DATA ---
  const allNodes = useMemo(() => {
    return (Object.values(registry) as NexusObject[]).filter(
      (o) => !isLink(o) || isReified(o),
    ) as SimpleNote[];
  }, [registry]);

  const recentNodes = useMemo(() => {
    // Sort by last_modified if available, else random/stable sort
    return [...allNodes]
      .sort((a, b) => {
        // Mock sort for now or use actual TS if available
        return (b as any).last_modified?.localeCompare((a as any).last_modified) || 0;
      })
      .slice(0, 5);
  }, [allNodes]);

  const filteredNodes = useMemo(() => {
    return allNodes.filter((node) => {
      const matchSearch = (node.title || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = selectedCategory === 'ALL' || node.category_id === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [allNodes, searchQuery, selectedCategory]);

  return (
    <div className="flex flex-col h-full bg-nexus-950 overflow-hidden">
      {/* 
        ========================================
        HEADER & HERO
        ========================================
      */}
      <div className="flex-none bg-nexus-900/30 border-b border-nexus-800/30 px-8 py-6 backdrop-blur-md z-10">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-nexus-accent/10 rounded-xl border border-nexus-accent/20">
              <Logo size={24} />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-nexus-text tracking-tight leading-none">
                Neural<span className="text-nexus-accent">Index</span>
              </h1>
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-nexus-muted">
                <span>v8.0</span>
                <span className="text-nexus-800">•</span>
                <span>{allNodes.length} Units</span>
              </div>
            </div>
          </div>

          {/* Global Search Bar */}
          <div className="flex-1 max-w-xl mx-12 relative group">
            <div className="absolute inset-0 bg-nexus-accent/5 blur-xl group-hover:bg-nexus-accent/10 transition-colors rounded-full" />
            <div className="relative bg-nexus-950/80 border border-nexus-800/50 rounded-full flex items-center px-4 py-3 shadow-lg group-focus-within:border-nexus-accent/50 transition-colors">
              <Search
                size={18}
                className="text-nexus-muted group-focus-within:text-nexus-accent transition-colors"
              />
              <input
                type="text"
                placeholder="Search the archive..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-sm text-nexus-text placeholder-nexus-muted/50 ml-3 font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-[10px] uppercase font-bold text-nexus-muted hover:text-nexus-text px-2"
                >
                  CLR
                </button>
              )}
              <div className="h-4 w-px bg-nexus-800 mx-2" />
              <div className="flex items-center gap-1 text-[10px] text-nexus-muted font-mono border border-nexus-800 bg-nexus-900/50 rounded px-1.5 py-0.5">
                ⌘K
              </div>
            </div>
          </div>

          {/* User / Meta */}
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 text-xs font-bold text-nexus-muted hover:text-nexus-text transition-colors">
              <Sparkles size={14} className="text-amber-500" />
              <span>What's New</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-nexus-800 border border-nexus-700" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* 
                ========================================
                RECENT DISCOVERIES (Carousel/Grid)
                ========================================
            */}
          {!searchQuery && selectedCategory === 'ALL' && (
            <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-widest text-nexus-muted flex items-center gap-2">
                  <Clock size={16} /> Recent Updates
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {recentNodes.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => onSelect(node.id)}
                    className="group relative bg-nexus-900/40 border border-nexus-800/50 hover:border-nexus-accent/50 rounded-2xl p-5 text-left transition-all hover:bg-nexus-900/80 hover:shadow-xl hover:-translate-y-1 overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-nexus-accent/5 rounded-full blur-2xl group-hover:bg-nexus-accent/10 transition-colors" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="px-2 py-1 bg-nexus-950 rounded text-[9px] font-black uppercase tracking-wider text-nexus-muted group-hover:text-nexus-accent border border-nexus-800 transition-colors">
                          {node.category_id}
                        </div>
                      </div>
                      <h3 className="font-bold text-nexus-text group-hover:text-white transition-colors truncate mb-1">
                        {node.title}
                      </h3>
                      <p className="text-xs text-nexus-muted line-clamp-2 mb-4 h-8 opacity-70">
                        {node.gist || 'No description available.'}
                      </p>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-nexus-accent opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                        <span>OPEN</span>
                        <ArrowRight size={10} />
                      </div>
                    </div>
                  </button>
                ))}
                <button className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-nexus-800/50 hover:border-nexus-accent/50 hover:bg-nexus-accent/5 transition-all text-nexus-muted hover:text-nexus-accent group">
                  <Clock
                    size={24}
                    className="opacity-50 group-hover:scale-110 transition-transform"
                  />
                  <span className="text-xs font-bold uppercase tracking-wider">View History</span>
                </button>
              </div>
            </section>
          )}

          {/* 
                ========================================
                MAIN DISCOVERY GRID
                ========================================
            */}
          <section className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-nexus-800/30 sticky top-0 bg-nexus-950/95 backdrop-blur z-20 pt-4 -mt-4">
              <Filter size={14} className="text-nexus-muted mr-2" />
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${selectedCategory === 'ALL' ? 'bg-nexus-accent text-white shadow-lg shadow-nexus-accent/25' : 'bg-nexus-900 text-nexus-muted hover:bg-nexus-800 hover:text-nexus-text'}`}
              >
                ALL
              </button>
              <div className="w-px h-4 bg-nexus-800 mx-2" />
              {Object.values(NexusCategory).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${selectedCategory === cat ? 'bg-nexus-800 border-nexus-700 text-white' : 'bg-transparent border-transparent text-nexus-muted hover:bg-nexus-900 hover:text-nexus-text'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Grid */}
            {filteredNodes.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center opacity-50">
                <Search size={48} className="mb-4 text-nexus-muted" />
                <h3 className="text-lg font-bold text-nexus-text">No units found</h3>
                <p className="text-sm text-nexus-muted">
                  Try adjusting your filters or search terms.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in slide-in-from-bottom-8 duration-700">
                {filteredNodes.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => onSelect(node.id)}
                    className="group bg-nexus-900/20 border border-nexus-800/40 hover:border-nexus-700 rounded-xl p-0 text-left transition-all hover:bg-nexus-900/60 overflow-hidden flex flex-col"
                  >
                    <div className="p-5 flex-1 relative">
                      <div className="absolute top-4 right-4 text-nexus-muted/20 group-hover:text-nexus-accent/20 transition-colors">
                        <Zap size={48} />
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-nexus-accent shadow-[0_0_8px] shadow-nexus-accent/50" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-nexus-muted group-hover:text-nexus-text transition-colors">
                          {node.category_id}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-nexus-text mb-2 line-clamp-1 group-hover:text-nexus-accent transition-colors">
                        {node.title}
                      </h3>
                      <p className="text-xs text-nexus-muted/80 line-clamp-3 leading-relaxed">
                        {node.gist || 'Awaiting neural description...'}
                      </p>
                    </div>
                    <div className="px-5 py-3 border-t border-nexus-800/30 bg-nexus-900/30 flex items-center justify-between text-[10px] font-mono text-nexus-muted">
                      <span>ID: {node.id.slice(0, 6)}</span>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-nexus-accent font-bold">
                        ACCESS &rarr;
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
