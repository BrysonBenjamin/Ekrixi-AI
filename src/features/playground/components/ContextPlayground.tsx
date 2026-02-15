import React, { useState } from 'react';
import {
  WeightedContextUnit,
  ContextAssemblyService,
} from '../../../core/services/ContextAssemblyService';
import { ThinkingProcessStep } from '../../../core/services/ArangoSearchService';
import { dbFixtures } from '../../../core/services/dbFixtures';
import { ThinkingProcessViewer } from '../../../components/shared/ThinkingProcessViewer';
import { ContextPill } from '../../../components/shared/ContextPill';
import { useRegistryStore } from '../../../store/useRegistryStore';
import { NexusType, NexusNote, NexusCategory, NexusObject } from '../../../types';
import { FixtureSelector } from './FixtureSelector';
import { PlaygroundFixture } from '../types/fixtures';

// --- MOCK DATA ---
const mockNote = (partial: Partial<NexusNote>): NexusNote =>
  ({
    id: partial.id || 'mock',
    internal_weight: 1,
    total_subtree_mass: 1,
    created_at: new Date().toISOString(),
    last_modified: new Date().toISOString(),
    link_ids: [],
    aliases: [],
    tags: [],
    prose_content: '',
    is_ghost: false,
    _type: NexusType.SIMPLE_NOTE,
    category_id: NexusCategory.CONCEPT,
    title: 'Mock',
    gist: '',
    ...partial,
  }) as NexusNote;

export const ContextPlayground: React.FC = () => {
  const { registry } = useRegistryStore();
  const [simulatedRegistry, setSimulatedRegistry] = useState<Record<string, NexusObject> | null>(
    null,
  );
  const [weightedMentions, setWeightedMentions] = useState<WeightedContextUnit[]>([]);
  const [lastAssemblyTrace, setLastAssemblyTrace] = useState<ThinkingProcessStep[] | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState('');

  // --- State Resolution ---
  // If we have a simulated registry, use it. Otherwise use the real one.
  const displayRegistry = simulatedRegistry || (Object.keys(registry).length > 0 ? registry : {});

  const handleAddMention = (id: string) => {
    if (weightedMentions.some((m) => m.id === id)) return;
    setWeightedMentions([...weightedMentions, { id, score: 10 }]); // Default score 10
  };

  const handleUpdateMention = (updated: WeightedContextUnit) => {
    setWeightedMentions(weightedMentions.map((m) => (m.id === updated.id ? updated : m)));
  };

  const handleRemoveMention = (id: string) => {
    setWeightedMentions(weightedMentions.filter((m) => m.id !== id));
  };

  const handleSimulate = (fixture: PlaygroundFixture) => {
    setSimulatedRegistry(fixture.getObjects());
    setWeightedMentions([]); // Reset mentions for new scenario
    setLastAssemblyTrace(null);
    setGeneratedPrompt('');
  };

  const runAssembly = () => {
    const result = ContextAssemblyService.assembleWorldContext(
      displayRegistry,
      weightedMentions,
      'Test Intent',
    );
    setLastAssemblyTrace(result.thinking_process);
    setGeneratedPrompt(result.contextString);
  };

  return (
    <div className="p-8 bg-nexus-900 h-full overflow-y-auto text-nexus-text font-sans">
      <h1 className="text-2xl font-display font-black uppercase tracking-widest mb-8 text-nexus-accent">
        Context Engineering Playground
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* --- LEFT: INPUT SIMULATOR --- */}
        <div className="space-y-6">
          <div className="p-6 bg-nexus-950 border border-nexus-800 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase text-nexus-muted tracking-widest">
                Chat Input Simulation
              </h2>
              <div className="text-[10px] bg-nexus-800 px-2 py-1 rounded text-nexus-muted">
                {weightedMentions.length} active units
              </div>
            </div>

            {/* Pill Container */}
            <div className="min-h-[60px] p-4 bg-nexus-900 border border-nexus-800 rounded-xl mb-4 flex flex-wrap gap-2 items-start">
              {weightedMentions.length === 0 && (
                <div className="text-nexus-muted italic text-xs w-full text-center py-2 opacity-50">
                  No context selected. Click below to add.
                </div>
              )}
              {weightedMentions.map((unit) => (
                <ContextPill
                  key={unit.id}
                  unit={unit}
                  registry={displayRegistry}
                  onUpdate={handleUpdateMention}
                  onRemove={() => handleRemoveMention(unit.id)}
                />
              ))}
            </div>

            {/* Add Buttons (Mock @mention menu) */}
            <div className="flex flex-wrap gap-2">
              {Object.values(displayRegistry)
                .slice(0, 6)
                .map((node) => (
                  <button
                    key={node.id}
                    onClick={() => handleAddMention(node.id)}
                    className="px-3 py-1.5 rounded-lg border border-nexus-700 bg-nexus-900 hover:bg-nexus-800 text-xs font-bold text-nexus-muted hover:text-nexus-text transition-colors"
                  >
                    + {(node as NexusNote).title || node.id}
                  </button>
                ))}
            </div>
          </div>

          <button
            onClick={runAssembly}
            className="w-full py-4 bg-nexus-accent text-white font-black uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-nexus-accent/20 hover:bg-nexus-accent/90 transition-all active:scale-[0.99]"
          >
            Generate Prompt Context
          </button>

          <div className="pt-6 border-t border-nexus-800">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-bold uppercase text-nexus-muted tracking-widest">
                Scenario Laboratory
              </h3>
              {simulatedRegistry && (
                <button
                  onClick={() => setSimulatedRegistry(null)}
                  className="text-[10px] text-nexus-ruby hover:text-white font-bold uppercase transition-colors"
                >
                  Reset to Real DB
                </button>
              )}
            </div>

            <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              <FixtureSelector onSimulate={handleSimulate} />
            </div>
          </div>
        </div>

        {/* --- RIGHT: OUTPUT VISUALIZATION --- */}
        <div className="space-y-6">
          {/* Thinking Process */}
          {lastAssemblyTrace && (
            <div className="p-6 bg-nexus-950 border border-nexus-800 rounded-2xl shadow-xl">
              <h2 className="text-xs font-bold uppercase text-nexus-muted tracking-widest mb-4">
                Pipeline Audit (Thinking Process)
              </h2>
              <ThinkingProcessViewer
                result={{
                  node: mockNote({ id: 'Context_Block', title: 'Context Assembly' }),
                  score: 1.0,
                  is_filtered_out: false,
                  thinking_process: lastAssemblyTrace,
                }}
              />
            </div>
          )}

          {/* Final Prompt String */}
          {generatedPrompt && (
            <div className="p-6 bg-nexus-950 border border-nexus-800 rounded-2xl shadow-xl">
              <h2 className="text-xs font-bold uppercase text-nexus-muted tracking-widest mb-4">
                Final LLM Input String
              </h2>
              <pre className="bg-black/50 p-4 rounded-xl text-[11px] font-mono text-nexus-text/80 leading-relaxed whitespace-pre-wrap border border-white/5">
                {generatedPrompt}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
