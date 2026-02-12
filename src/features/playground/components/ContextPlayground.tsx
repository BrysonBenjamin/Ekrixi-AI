import React, { useState } from 'react';
import {
  WeightedContextUnit,
  ContextAssemblyService,
} from '../../../core/services/ContextAssemblyService';
import { dbFixtures } from '../../../core/services/dbFixtures';
import { ThinkingProcessViewer } from '../../../components/shared/ThinkingProcessViewer';
import { ContextPill } from '../../../components/shared/ContextPill';
import { useRegistryStore } from '../../../store/useRegistryStore';
import { NexusObject, NexusType, SimpleNote, NexusCategory } from '../../../types';

export const ContextPlayground: React.FC = () => {
  const { registry } = useRegistryStore();
  const [weightedMentions, setWeightedMentions] = useState<WeightedContextUnit[]>([]);
  const [lastAssemblyTrace, setLastAssemblyTrace] = useState<any>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState('');

  // --- Mock Data Init (If Registry is empty/loading) ---
  // In a real scenario, registry comes from FireStore.
  // This fallback ensures the playgrounchecd works even if the user hasn't loaded data.
  const displayRegistry = Object.keys(registry).length > 0 ? registry : MOCK_REGISTRY;

  const handleAddMention = (id: string) => {
    if (weightedMentions.some((m) => m.id === id)) return;
    setWeightedMentions([...weightedMentions, { id, score: 5 }]); // Defualt score 5
  };

  const handleUpdateMention = (updated: WeightedContextUnit) => {
    setWeightedMentions(weightedMentions.map((m) => (m.id === updated.id ? updated : m)));
  };

  const handleRemoveMention = (id: string) => {
    setWeightedMentions(weightedMentions.filter((m) => m.id !== id));
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
                    + {(node as SimpleNote).title || node.id}
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
            <h3 className="text-xs font-bold uppercase text-nexus-muted tracking-widest mb-3">
              Test Fixtures
            </h3>
            <button
              onClick={() => {
                const universeId = useRegistryStore.getState().activeUniverseId;
                if (universeId) {
                  dbFixtures.seedTimelineScenario(universeId);
                  alert(
                    'Timeline Scenario Seeded! Go to Timeline view to see "The Eternal City of Aethelgard".',
                  );
                } else {
                  alert(
                    'No active universe found. Please go to Settings and load/create a universe first.',
                  );
                }
              }}
              className="w-full py-3 bg-nexus-800 text-nexus-muted hover:text-white font-bold uppercase tracking-widest rounded-xl hover:bg-nexus-700 transition-all text-xs border border-nexus-700 hover:border-nexus-600"
            >
              Load Timeline Demo Data
            </button>
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
                  node: { id: 'Context_Block', title: 'Context Assembly' } as any,
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

// --- MOCK DATA ---
const MOCK_REGISTRY: Record<string, NexusObject> = {
  'Units/HERO': {
    id: 'Units/HERO',
    _type: NexusType.SIMPLE_NOTE,
    title: 'Aleron (Protagonist)',
    gist: 'The chosen one who seeks the Nexus Core.',
    category_id: NexusCategory.CHARACTER,
    link_ids: ['Units/SWORD'],
  } as any,
  'Units/SWORD': {
    id: 'Units/SWORD',
    title: 'Vorpal Blade',
    _type: NexusType.SIMPLE_NOTE,
    gist: 'A magical sword that glows blue when orcs are near.',
    category_id: NexusCategory.ITEM,
  } as any,
  'Units/VILLAGE': {
    id: 'Units/VILLAGE',
    title: 'Riverwood',
    _type: NexusType.SIMPLE_NOTE,
    gist: 'A small hamlet near the river.',
    category_id: NexusCategory.LOCATION,
  } as any,
  'Units/KING': {
    id: 'Units/KING',
    title: 'King Theoden',
    _type: NexusType.SIMPLE_NOTE,
    gist: 'The ruler of the realm, currently possessed.',
    category_id: NexusCategory.CHARACTER,
  } as any,
};
