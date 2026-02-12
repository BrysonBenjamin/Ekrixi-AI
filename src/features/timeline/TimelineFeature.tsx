import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NexusObject, SimpleNote } from '../../types';
import { TimeDimensionService } from '../../core/services/TimeDimensionService';
import { ArrowLeft, Calendar, History, ShieldCheck, Compass, GitCommit } from 'lucide-react';

interface TimelineFeatureProps {
  registry: Record<string, NexusObject>;
  onSelect?: (id: string) => void;
}

export const TimelineFeature: React.FC<TimelineFeatureProps> = ({ registry, onSelect }) => {
  const { nodeId } = useParams<{ nodeId: string }>();
  const navigate = useNavigate();

  // -- INDEX MODE: List all entities with history
  const historicalEntities = useMemo(() => {
    if (nodeId) return [];
    return Object.values(registry)
      .filter(
        (node) =>
          (node._type === 'SIMPLE_NOTE' || node._type === 'STORY_NOTE') &&
          !(node as SimpleNote).time_data?.base_node_id,
      )
      .map((node) => ({
        node: node as SimpleNote,
        stack: TimeDimensionService.getTimeStack(registry, node.id),
      }))
      .filter((item) => item.stack.length > 0)
      .sort((a, b) => b.stack.length - a.stack.length);
  }, [registry, nodeId]);

  const baseNodeId = useMemo(() => {
    if (!nodeId || !registry[nodeId]) return null;
    const node = registry[nodeId] as SimpleNote;
    return node.time_data?.base_node_id || nodeId;
  }, [nodeId, registry]);

  const timeStack = useMemo(() => {
    if (!baseNodeId) return [];
    return TimeDimensionService.getTimeStack(registry, baseNodeId);
  }, [baseNodeId, registry]);

  const baseNode = baseNodeId ? registry[baseNodeId] : null;

  // --- RENDER INDEX VIEW ---
  if (!nodeId) {
    return (
      <div className="flex flex-col h-full bg-nexus-950 text-nexus-text overflow-hidden font-sans">
        <header className="h-16 border-b border-nexus-800 bg-nexus-900/60 backdrop-blur-xl flex items-center px-8 justify-between shrink-0 z-30">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-indigo-400">
              <History size={20} />
              <h1 className="text-lg font-display font-black uppercase tracking-widest text-nexus-text">
                Temporal Registry
              </h1>
            </div>
          </div>
          <div className="px-4 py-1.5 rounded-full bg-nexus-800 border border-nexus-700 text-nexus-muted text-xs font-bold uppercase tracking-widest">
            {historicalEntities.length} Timelines Active
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {historicalEntities.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-50">
                <History size={48} className="mb-4 text-nexus-muted" />
                <p className="text-nexus-muted font-display uppercase tracking-widest">
                  No historical records found
                </p>
              </div>
            ) : (
              historicalEntities.map(({ node, stack }) => (
                <button
                  key={node.id}
                  onClick={() => navigate(`/timeline/${node.id}`)}
                  className="flex flex-col text-left bg-nexus-900 border border-nexus-800 rounded-2xl p-6 hover:border-indigo-500/50 hover:shadow-[0_0_30px_rgba(99,102,241,0.1)] transition-all group"
                >
                  <div className="flex items-center justify-between w-full mb-4">
                    <div className="px-2 py-1 bg-indigo-500/10 text-indigo-300 text-[10px] font-black uppercase tracking-widest rounded">
                      {stack.length} States
                    </div>
                    <ArrowLeft
                      size={16}
                      className="text-nexus-muted group-hover:text-indigo-400 transition-colors rotate-180"
                    />
                  </div>

                  <h3 className="text-xl font-display font-bold mb-2 group-hover:text-white transition-colors">
                    {node.title}
                  </h3>
                  <p className="text-sm text-nexus-muted line-clamp-2 mb-6 font-serif italic">
                    {node.gist || 'No abstract available.'}
                  </p>

                  <div className="mt-auto pt-4 border-t border-nexus-800 group-hover:border-nexus-700 w-full flex justify-between items-center text-[10px] font-mono text-nexus-muted uppercase tracking-wider">
                    <span>Earliest: {stack[0].time_data?.year}</span>
                    <span>Latest: {stack[stack.length - 1].time_data?.year}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </main>
      </div>
    );
  }

  // --- (Original specific node view) ---
  if (!baseNode) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-nexus-950 text-nexus-muted">
        <ShieldCheck size={48} className="mb-4 opacity-50" />
        <h2 className="text-xl font-display font-black uppercase tracking-widest">
          Timeline Not Found
        </h2>
        <button
          onClick={() => navigate('/timeline')}
          className="mt-6 px-6 py-2 bg-nexus-800 rounded-xl hover:bg-nexus-700 transition-colors uppercase tracking-widest text-xs font-bold"
        >
          Return to Registry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-nexus-950 text-nexus-text overflow-hidden font-sans">
      {/* Header */}
      <header className="h-16 border-b border-nexus-800 bg-nexus-900/60 backdrop-blur-xl flex items-center px-8 justify-between shrink-0 z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/timeline')}
            className="p-2 rounded-xl hover:bg-nexus-800 text-nexus-muted hover:text-nexus-text transition-colors"
            title="Back to Registry"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2 text-indigo-400 mb-0.5">
              <History size={14} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                Chronology Trace
              </span>
            </div>
            <h1 className="text-lg font-display font-black uppercase tracking-widest">
              {(baseNode as SimpleNote).title || 'Untitled Entity'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold flex items-center gap-2">
            <GitCommit size={14} />
            <span>{timeStack.length} Time States</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 md:p-12 relative">
        <div className="absolute left-12 md:left-20 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-nexus-800 to-transparent" />

        <div className="max-w-4xl mx-auto space-y-12 pb-24">
          {/* Base Node (The Soul) */}
          <div className="relative pl-12 md:pl-20">
            <div className="absolute left-[-5px] md:left-[3px] top-6 w-3 h-3 rounded-full bg-nexus-accent shadow-[0_0_15px_rgba(6,182,212,0.6)] z-10" />

            <div className="bg-nexus-900 border border-nexus-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden group hover:border-nexus-accent/50 transition-all">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Compass size={64} />
              </div>
              <div className="relative z-10">
                <span className="inline-block px-2 py-1 bg-nexus-accent/10 text-nexus-accent text-[9px] font-black uppercase tracking-widest rounded mb-2">
                  Immutable Base
                </span>
                <h2 className="text-2xl font-display font-black mb-2">
                  {(baseNode as SimpleNote).title}
                </h2>
                <p className="text-nexus-muted font-serif italic leading-relaxed max-w-2xl">
                  {(baseNode as SimpleNote).gist}
                </p>

                <div className="mt-6 flex gap-4">
                  <button
                    onClick={() => {
                      if (onSelect) onSelect(baseNode.id);
                      else navigate('/explore');
                    }}
                    className="px-4 py-2 rounded-lg bg-nexus-800 hover:bg-nexus-700 text-[10px] font-black uppercase tracking-widest transition-colors"
                  >
                    Open in Drilldown
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Time Stack */}
          {timeStack.map((node, index) => {
            const sn = node as SimpleNote;
            return (
              <div key={node.id} className="relative pl-12 md:pl-20">
                <div className="absolute left-[-4px] md:left-[4px] top-6 w-2.5 h-2.5 rounded-full bg-nexus-800 border border-indigo-500/50 z-10" />

                <div className="bg-nexus-900/50 border border-nexus-800/50 rounded-2xl p-6 hover:bg-nexus-900 hover:border-indigo-500/30 transition-all group">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2 text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">
                          <Calendar size={12} />
                          <span className="text-xs font-bold font-mono">{sn.time_data?.year}</span>
                        </div>
                        {index === 0 && (
                          <span className="text-[9px] font-bold text-nexus-muted uppercase tracking-widest">
                            Earliest Known State
                          </span>
                        )}
                        {index === timeStack.length - 1 && (
                          <span className="text-[9px] font-bold text-nexus-muted uppercase tracking-widest">
                            Latest Known State
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-display font-bold mb-2 group-hover:text-indigo-200 transition-colors">
                        {sn.title}
                      </h3>
                      <p className="text-sm text-nexus-muted/80 leading-relaxed max-w-2xl">
                        {sn.gist || 'No description available for this time state.'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (onSelect) onSelect(node.id);
                        else navigate('/explore');
                      }}
                      className="p-2 rounded-lg bg-nexus-800/50 hover:bg-indigo-500/20 text-nexus-muted hover:text-indigo-300 transition-all opacity-0 group-hover:opacity-100"
                      title="Inspect this State"
                    >
                      <ArrowLeft size={16} className="rotate-180" />
                    </button>
                  </div>

                  {/* Simple Diff / Changes Indicator (Placeholder for now) */}
                  {/* 
                                    <div className="mt-4 pt-4 border-t border-nexus-800/50 flex gap-4 text-[10px] text-nexus-muted uppercase tracking-widest">
                                        <span>+ Modified Content</span>
                                    </div>
                                    */}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};
