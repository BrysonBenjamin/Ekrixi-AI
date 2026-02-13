import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Box,
  ArrowRight,
  History as HistoryIcon,
  Fingerprint,
  Target,
  Compass,
  ShieldCheck,
  Activity,
  PenTool,
  Anchor,
  GitMerge,
} from 'lucide-react';
import {
  NexusObject,
  isLink,
  isReified,
  NexusCategory,
  NexusType,
  SimpleNote,
  SemanticLink,
  HierarchyType,
  NexusElement,
  HierarchicalLink,
} from '../../../types';
import { MarkdownToolbar } from '../../shared/MarkdownToolbar';
import { ThinkingProcessViewer } from '../../../components/shared/ThinkingProcessViewer';
import {
  ArangoSearchService,
  GovernedSearchResult,
} from '../../../core/services/ArangoSearchService';
import { TimeDimensionService } from '../../../core/services/TimeDimensionService';
import { SnapshotPicker } from './components/SnapshotPicker';

interface InspectorSidebarProps {
  object: NexusObject;
  registry: Record<string, NexusObject>;
  onUpdate: (updates: Partial<NexusObject>) => void;
  onClose: () => void;
  onOpenWiki?: (id: string) => void;
  onSelect?: (id: string) => void;
}

export const InspectorSidebar: React.FC<InspectorSidebarProps> = ({
  object,
  registry,
  onUpdate,
  onClose,
  onOpenWiki,
  onSelect,
}) => {
  const navigate = useNavigate();
  const isL = isLink(object);
  const reified = isReified(object);
  const isStory = object._type === NexusType.STORY_NOTE;
  const title =
    ('title' in object ? (object as SimpleNote).title : null) ||
    (isL && 'verb' in object ? (object as SemanticLink).verb : 'Untitled');
  const proseRef = useRef<HTMLTextAreaElement>(null);

  // -- GOVERNANCE SIMULATION STATE --
  const [simulationResults, setSimulationResults] = useState<GovernedSearchResult[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  const runSimulation = async () => {
    setIsSimulating(true);
    setSimulationResults([]); // Clear previous
    try {
      const results = await ArangoSearchService.performGovernedGraphSearch([]);
      setSimulationResults(results);
    } catch (err) {
      console.error('Governance Trace Failed', err);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-nexus-900 font-sans">
      <header className="h-20 border-b border-nexus-800 flex items-center justify-between px-4 md:px-8 shrink-0 bg-nexus-900/80 backdrop-blur-xl z-20">
        <div className="flex items-center gap-4">
          <div
            className={`p-3 rounded-2xl border ${isL ? 'bg-nexus-arcane/10 border-nexus-arcane/30 text-nexus-arcane' : isStory ? 'bg-nexus-ruby/10 border-nexus-ruby/30 text-nexus-ruby' : 'bg-nexus-accent/10 border-nexus-accent/30 text-nexus-accent'}`}
          >
            {isL ? (
              <Fingerprint size={24} />
            ) : isStory ? (
              <PenTool size={24} />
            ) : (
              <Target size={24} />
            )}
          </div>
          <div>
            <h2 className="text-sm font-display font-black text-nexus-text uppercase tracking-[0.3em]">
              {isL
                ? reified
                  ? 'Reified Audit'
                  : 'Stream Audit'
                : isStory
                  ? 'Story Audit'
                  : 'Unit Audit'}
            </h2>
            <p className="text-[10px] text-nexus-muted font-mono uppercase tracking-widest mt-1">
              {isL ? `Logic: ${title}` : `Status: Editing Manifest`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Timeline Button */}
          {!isL && (
            <button
              onClick={() => {
                const baseId =
                  ('time_data' in object && object.time_data?.base_node_id) || object.id;
                navigate(`/timeline/${baseId}`);
              }}
              className="p-2 text-nexus-muted hover:text-nexus-text transition-colors"
              title="View Timeline"
            >
              <HistoryIcon size={20} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 text-nexus-muted hover:text-nexus-text transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8 pb-48">
        {/* --- GOVERNED SEARCH PROTOTYPE --- */}
        <div className="p-6 bg-nexus-950 border border-nexus-800 rounded-[32px] shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-nexus-arcane/10 rounded-xl text-nexus-arcane">
                <HistoryIcon size={16} />
              </div>
              <h3 className="text-[10px] font-display font-black text-nexus-text uppercase tracking-widest">
                Governance Simulation
              </h3>
            </div>
            <button
              onClick={runSimulation}
              disabled={isSimulating}
              className="text-[10px] bg-nexus-accent/10 hover:bg-nexus-accent/20 text-nexus-accent px-3 py-1 rounded-full font-bold transition-colors disabled:opacity-50"
            >
              {isSimulating ? 'Running...' : 'Run Trace'}
            </button>
          </div>

          {simulationResults.length > 0 && (
            <div className="space-y-2 mt-4">
              {simulationResults.map((res, i) => (
                <ThinkingProcessViewer key={i} result={res} />
              ))}
            </div>
          )}
        </div>

        <div className="p-6 bg-nexus-950 border border-nexus-800 rounded-[32px] shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
            <Activity size={100} />
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div
              className={`p-2 rounded-xl ${isStory ? 'bg-nexus-ruby/10 text-nexus-ruby' : 'bg-nexus-accent/10 text-nexus-accent'}`}
            >
              <Box size={16} />
            </div>
            <h3 className="text-[10px] font-display font-black text-nexus-text uppercase tracking-widest">
              Structural Anchor
            </h3>
          </div>

          {!isL ? (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[9px] font-display font-black text-nexus-muted uppercase tracking-widest ml-1">
                  Designation
                </label>
                <input
                  value={'title' in object ? (object as SimpleNote).title : ''}
                  onChange={(e) => onUpdate({ title: e.target.value } as Partial<NexusObject>)}
                  className="w-full bg-nexus-900 border border-nexus-800 rounded-xl px-4 py-3 text-xs font-bold text-nexus-text focus:border-nexus-accent outline-none shadow-inner"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-display font-black text-nexus-muted uppercase tracking-widest ml-1">
                  Category Signature
                </label>
                <select
                  value={'category_id' in object ? (object as SimpleNote).category_id : ''}
                  disabled={isStory}
                  onChange={(e) =>
                    onUpdate({
                      category_id: e.target.value as NexusCategory,
                    } as Partial<NexusObject>)
                  }
                  className={`w-full bg-nexus-900 border border-nexus-800 rounded-xl px-4 py-3 text-[10px] font-black uppercase text-nexus-text focus:border-nexus-accent outline-none tracking-widest cursor-pointer ${isStory ? 'opacity-50 grayscale' : ''}`}
                >
                  {Object.values(NexusCategory).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {isStory && (
                  <p className="text-[7px] font-mono text-nexus-muted uppercase tracking-widest mt-1 ml-1">
                    Narrative units are locked to the Story category.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-display font-black text-nexus-muted uppercase tracking-widest ml-1">
                  Mass Weighting
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.1"
                    value={
                      ('internal_weight' in object
                        ? (object as NexusElement).internal_weight
                        : 1) || 1
                    }
                    onChange={(e) =>
                      onUpdate({
                        internal_weight: parseFloat(e.target.value),
                      } as Partial<NexusObject>)
                    }
                    className="flex-1 accent-nexus-accent"
                  />
                  <span className="text-[10px] font-mono font-bold text-nexus-accent w-8 text-right">
                    {(
                      ('internal_weight' in object
                        ? (object as NexusElement).internal_weight
                        : 1) || 1
                    ).toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-4 p-4 bg-nexus-900/50 border border-nexus-800 rounded-2xl">
                <div className="flex-1 min-w-0 text-center">
                  <div className="text-[7px] font-black text-nexus-muted uppercase mb-1">
                    Origin
                  </div>
                  <div className="text-[9px] font-bold text-nexus-text truncate px-2">
                    {isLink(object) && 'title' in (registry[object.source_id] || {})
                      ? (registry[object.source_id] as SimpleNote).title
                      : 'Unknown'}
                  </div>
                </div>
                <ArrowRight size={14} className="text-nexus-accent opacity-30" />
                <div className="flex-1 min-w-0 text-center">
                  <div className="text-[7px] font-black text-nexus-muted uppercase mb-1">
                    Terminal
                  </div>
                  <div className="text-[9px] font-bold text-nexus-text truncate px-2">
                    {isLink(object) && 'title' in (registry[object.target_id] || {})
                      ? (registry[object.target_id] as SimpleNote).title
                      : 'Unknown'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-display font-black text-nexus-muted uppercase tracking-widest ml-1">
                    Active Verb
                  </label>
                  <input
                    value={isLink(object) && 'verb' in object ? (object as SemanticLink).verb : ''}
                    onChange={(e) => onUpdate({ verb: e.target.value } as Partial<NexusObject>)}
                    className="w-full bg-nexus-900 border border-nexus-800 rounded-xl px-4 py-3 text-xs font-bold text-nexus-text focus:border-nexus-accent outline-none"
                    placeholder="Logic..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-display font-black text-nexus-muted uppercase tracking-widest ml-1">
                    Inverse
                  </label>
                  <input
                    value={
                      isLink(object) && 'verb_inverse' in object
                        ? (object as SemanticLink).verb_inverse
                        : ''
                    }
                    onChange={(e) =>
                      onUpdate({ verb_inverse: e.target.value } as Partial<NexusObject>)
                    }
                    className="w-full bg-nexus-900 border border-nexus-800 rounded-xl px-4 py-3 text-xs font-bold text-nexus-text focus:border-nexus-accent outline-none"
                    placeholder="Reciprocal..."
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-nexus-800/50 space-y-5">
                <div className="flex items-center gap-3">
                  <GitMerge size={14} className="text-nexus-arcane" />
                  <h4 className="text-[9px] font-display font-black text-nexus-text uppercase tracking-widest">
                    Logic Parameters
                  </h4>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-display font-black text-nexus-muted uppercase tracking-widest ml-1">
                      Link Type
                    </label>
                    <select
                      value={object._type}
                      onChange={(e) =>
                        onUpdate({ _type: e.target.value as NexusType } as Partial<NexusObject>)
                      }
                      className="w-full bg-nexus-900 border border-nexus-800 rounded-xl px-3 py-2 text-[9px] font-bold text-nexus-text focus:border-nexus-accent outline-none"
                    >
                      <option value={NexusType.SEMANTIC_LINK}>SEMANTIC</option>
                      <option value={NexusType.HIERARCHICAL_LINK}>HIERARCHICAL</option>
                      <option value={NexusType.AGGREGATED_SEMANTIC_LINK}>REIFIED SEMANTIC</option>
                      <option value={NexusType.AGGREGATED_HIERARCHICAL_LINK}>
                        REIFIED HIERARCHY
                      </option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[8px] font-display font-black text-nexus-muted uppercase tracking-widest ml-1">
                      Hierarchy
                    </label>
                    <select
                      value={(object as HierarchicalLink).hierarchy_type || ''}
                      disabled={object._type === NexusType.SEMANTIC_LINK}
                      onChange={(e) =>
                        onUpdate({
                          hierarchy_type: e.target.value as HierarchyType,
                        } as Partial<NexusObject>)
                      }
                      className="w-full bg-nexus-900 border border-nexus-800 rounded-xl px-3 py-2 text-[9px] font-bold text-nexus-text focus:border-nexus-accent outline-none disabled:opacity-30"
                    >
                      <option value="">NONE</option>
                      <option value={HierarchyType.PARENT_OF}>PARENT OF</option>
                      <option value={HierarchyType.PART_OF}>PART OF</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[8px] font-display font-black text-nexus-muted uppercase tracking-widest">
                      Resonace Weight
                    </label>
                    <span className="text-[9px] font-mono font-bold text-nexus-arcane">
                      {(
                        ('internal_weight' in object
                          ? (object as NexusElement).internal_weight
                          : 1) || 1
                      ).toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.05"
                    value={
                      ('internal_weight' in object
                        ? (object as NexusElement).internal_weight
                        : 1) || 1
                    }
                    onChange={(e) =>
                      onUpdate({
                        internal_weight: parseFloat(e.target.value),
                      } as Partial<NexusObject>)
                    }
                    className="w-full bg-nexus-900 accent-nexus-arcane"
                  />
                </div>

                <div className="space-y-3 pt-4 border-t border-nexus-800/30">
                  <div className="flex items-center gap-2">
                    <Anchor size={12} className="text-nexus-ruby opacity-60" />
                    <span className="text-[8px] font-display font-black text-nexus-muted uppercase tracking-widest">
                      Temporal Anchors
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[7px] font-mono font-bold text-nexus-muted/60 uppercase">
                        Era Year
                      </label>
                      <input
                        type="number"
                        value={(object as SimpleNote).time_data?.year || ''}
                        onChange={(e) =>
                          onUpdate({
                            time_data: {
                              ...((object as SimpleNote).time_data || {}),
                              year: parseInt(e.target.value) || 0,
                            },
                          } as Partial<NexusObject>)
                        }
                        className="w-full bg-nexus-900 border border-nexus-800 rounded-lg px-3 py-2 text-[10px] font-mono text-nexus-ruby outline-none focus:border-nexus-ruby/50"
                        placeholder="Year..."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[7px] font-mono font-bold text-nexus-muted/60 uppercase">
                        Reification
                      </label>
                      <button
                        onClick={() =>
                          onUpdate({
                            is_reified: !reified,
                          } as Partial<NexusObject>)
                        }
                        className={`w-full py-2 rounded-lg border text-[8px] font-black uppercase transition-all ${
                          reified
                            ? 'bg-nexus-ruby/10 border-nexus-ruby/40 text-nexus-ruby'
                            : 'bg-nexus-800 border-nexus-700 text-nexus-muted'
                        }`}
                      >
                        {reified ? 'Unit Promoted' : 'Logical Only'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[7px] font-mono font-bold text-nexus-muted/60 uppercase">
                        Month
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={(object as SimpleNote).time_data?.month || ''}
                        onChange={(e) =>
                          onUpdate({
                            time_data: {
                              ...((object as SimpleNote).time_data || {}),
                              month: parseInt(e.target.value) || undefined,
                            },
                          } as Partial<NexusObject>)
                        }
                        className="w-full bg-nexus-900 border border-nexus-800 rounded-lg px-3 py-2 text-[10px] font-mono text-nexus-ruby outline-none focus:border-nexus-ruby/50"
                        placeholder="MM"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[7px] font-mono font-bold text-nexus-muted/60 uppercase">
                        Day
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={(object as SimpleNote).time_data?.day || ''}
                        onChange={(e) =>
                          onUpdate({
                            time_data: {
                              ...((object as SimpleNote).time_data || {}),
                              day: parseInt(e.target.value) || undefined,
                            },
                          } as Partial<NexusObject>)
                        }
                        className="w-full bg-nexus-900 border border-nexus-800 rounded-lg px-3 py-2 text-[10px] font-mono text-nexus-ruby outline-none focus:border-nexus-ruby/50"
                        placeholder="DD"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-nexus-800/30">
                    <div className="space-y-1">
                      <SnapshotPicker
                        label="Source Snapshot"
                        baseNodeId={
                          isL
                            ? (registry[(object as SemanticLink).source_id] as SimpleNote)
                                ?.time_data?.base_node_id || (object as SemanticLink).source_id
                            : ''
                        }
                        selectedSnapshotId={(object as SimpleNote).time_data?.anchored_source_id}
                        registry={registry}
                        onSelect={(id) =>
                          onUpdate({
                            time_data: {
                              ...((object as SimpleNote).time_data || {}),
                              anchored_source_id: id,
                            },
                          } as Partial<NexusObject>)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <SnapshotPicker
                        label="Target Snapshot"
                        baseNodeId={
                          isL
                            ? (registry[(object as SemanticLink).target_id] as SimpleNote)
                                ?.time_data?.base_node_id || (object as SemanticLink).target_id
                            : ''
                        }
                        selectedSnapshotId={(object as SimpleNote).time_data?.anchored_target_id}
                        registry={registry}
                        onSelect={(id) =>
                          onUpdate({
                            time_data: {
                              ...((object as SimpleNote).time_data || {}),
                              anchored_target_id: id,
                            },
                          } as Partial<NexusObject>)
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* --- TEMPORAL LINEAGE PROTOYPE --- */}
        <div className="p-6 bg-nexus-950 border border-nexus-800 rounded-[32px] shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-fuchsia-500/10 rounded-xl text-fuchsia-500">
              <HistoryIcon size={16} />
            </div>
            <h3 className="text-[10px] font-display font-black text-nexus-text uppercase tracking-widest">
              Temporal Lineage
            </h3>
          </div>

          <div className="space-y-2">
            <div className="max-h-[200px] overflow-y-auto no-scrollbar space-y-1">
              {[
                ...(TimeDimensionService.getTimeStack(
                  registry,
                  ('time_data' in object && object.time_data?.base_node_id) || object.id,
                ) || []),
                registry[('time_data' in object && object.time_data?.base_node_id) || object.id],
              ]
                .filter(Boolean)
                .sort((a, b) => {
                  // Sort by time: Base (0) -> Oldest -> Newest
                  const getScore = (n: NexusObject) => {
                    if (!('time_data' in n) || !n.time_data?.base_node_id) return -1; // Base is always first
                    return (
                      (n.time_data.year || 0) * 10000 +
                      (n.time_data.month || 0) * 100 +
                      (n.time_data.day || 0)
                    );
                  };
                  return getScore(a) - getScore(b);
                })
                // Deduplicate by ID just in case
                .filter((n, i, self) => i === self.findIndex((t) => t.id === n.id))
                .map((snapshot) => {
                  const isCurrent = snapshot.id === object.id;
                  const isBase = !('time_data' in snapshot) || !snapshot.time_data?.base_node_id;
                  const dateStr = isBase
                    ? 'TIMELESS BASE'
                    : `ERA: ${snapshot.time_data?.year || '????'}.${snapshot.time_data?.month || '??'}.${snapshot.time_data?.day || '??'}`;

                  return (
                    <button
                      key={snapshot.id}
                      onClick={() => onSelect?.(snapshot.id)}
                      disabled={isCurrent}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                        isCurrent
                          ? 'bg-fuchsia-500/10 border-fuchsia-500/50 text-fuchsia-400 cursor-default'
                          : 'bg-nexus-900 border-nexus-800 text-nexus-muted hover:bg-nexus-800 hover:text-nexus-text hover:border-nexus-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${isCurrent ? 'bg-fuchsia-500 animate-pulse' : 'bg-nexus-700'}`}
                        />
                        <span className="text-[9px] font-mono font-bold uppercase tracking-widest truncate">
                          {dateStr}
                        </span>
                      </div>
                      {isCurrent && (
                        <span className="text-[8px] font-black uppercase text-fuchsia-500 tracking-widest">
                          Active
                        </span>
                      )}
                    </button>
                  );
                })}

              {!TimeDimensionService.getTimeStack(
                registry,
                ('time_data' in object && object.time_data?.base_node_id) || object.id,
              )?.length && (
                <div className="p-4 text-center text-[9px] text-nexus-muted font-mono uppercase tracking-widest opacity-50 italic">
                  No temporal manifestations recorded.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 bg-nexus-950 border border-nexus-800 rounded-[32px] shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-nexus-arcane/10 rounded-xl text-nexus-arcane">
              <Compass size={16} />
            </div>
            <h3 className="text-[10px] font-display font-black text-nexus-text uppercase tracking-widest">
              Neural Abstract
            </h3>
          </div>
          <textarea
            value={'gist' in object ? (object as SimpleNote).gist : ''}
            onChange={(e) => onUpdate({ gist: e.target.value } as Partial<NexusObject>)}
            className="w-full h-28 bg-nexus-900 border border-nexus-800 rounded-2xl p-4 text-[13px] text-nexus-text/90 font-serif italic outline-none focus:border-nexus-accent resize-none no-scrollbar leading-relaxed"
            placeholder="Establish the core essence..."
          />
        </div>

        <div className="p-6 bg-nexus-950 border border-nexus-800 rounded-[32px] shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-nexus-essence/10 rounded-xl text-nexus-essence">
                <ShieldCheck size={16} />
              </div>
              <h3 className="text-[10px] font-display font-black text-nexus-text uppercase tracking-widest">
                Manifest Records
              </h3>
            </div>
            <div className="text-[8px] font-mono text-nexus-muted uppercase tracking-widest opacity-40">
              Sync Protocol 4.1
            </div>
          </div>

          <div className="space-y-3">
            <MarkdownToolbar
              textareaRef={proseRef}
              content={'prose_content' in object ? (object as SimpleNote).prose_content || '' : ''}
              onUpdate={(val) => onUpdate({ prose_content: val } as Partial<NexusObject>)}
            />
            <textarea
              ref={proseRef}
              value={'prose_content' in object ? (object as SimpleNote).prose_content || '' : ''}
              onChange={(e) => onUpdate({ prose_content: e.target.value } as Partial<NexusObject>)}
              spellCheck={false}
              className="w-full h-80 bg-nexus-900 border border-nexus-800 rounded-2xl p-6 text-[13px] text-nexus-text font-mono outline-none focus:border-nexus-accent resize-none no-scrollbar leading-[1.8] shadow-inner selection:bg-nexus-accent/30 tracking-tight"
              placeholder="# Chronicling deep causality..."
            />
          </div>
        </div>
      </main>

      <footer className="absolute inset-x-0 bottom-0 p-8 border-t border-nexus-800 bg-nexus-950 z-30 flex flex-col gap-6">
        <button
          onClick={() => {
            if (onOpenWiki && object.id) {
              onOpenWiki(object.id);
            } else {
              onClose();
            }
          }}
          className={`
                        w-full py-4 rounded-2xl text-[10px] font-display font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-[0.98]
                        ${
                          onOpenWiki
                            ? 'bg-nexus-accent text-white shadow-nexus-accent/20 hover:bg-nexus-accent/90'
                            : 'bg-nexus-800 text-nexus-muted hover:text-nexus-text hover:bg-nexus-700'
                        }
                    `}
        >
          {onOpenWiki ? (
            <>
              <ArrowRight size={16} /> Open Full Entry
            </>
          ) : (
            <>
              <X size={16} /> Close Inspector
            </>
          )}
        </button>

        <div className="flex items-center gap-4 opacity-70">
          <div className="w-10 h-10 rounded-full bg-nexus-900 border border-nexus-800 flex items-center justify-center text-nexus-accent shrink-0 shadow-lg">
            <HistoryIcon size={20} />
          </div>
          <div>
            <div className="text-[10px] font-display font-black text-nexus-text uppercase tracking-widest">
              The Chronicler
            </div>
            <div className="text-[8px] text-nexus-muted font-mono uppercase tracking-[0.2em] opacity-60">
              Scry Protocol Active
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
