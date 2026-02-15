import React, { useState } from 'react';
import { FixtureRegistry } from '../services/FixtureRegistry';
import { PlaygroundFixture } from '../types/fixtures';
import { useRegistryStore } from '../../../store/useRegistryStore';
import { Database, Play, Info, AlertTriangle } from 'lucide-react';

interface FixtureSelectorProps {
  onSimulate: (fixture: PlaygroundFixture) => void;
}

export const FixtureSelector: React.FC<FixtureSelectorProps> = ({ onSimulate }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { activeUniverseId } = useRegistryStore();
  const fixtures = FixtureRegistry.getAllFixtures();

  const handleSeed = async (fixture: PlaygroundFixture) => {
    if (!activeUniverseId) {
      alert('No active universe found. Please load a universe first.');
      return;
    }

    if (!fixture.seed) {
      alert('This fixture does not support persistent seeding.');
      return;
    }

    if (confirm(`Manifest "${fixture.name}" into the database? This will create new records.`)) {
      try {
        const primaryId = await fixture.seed(activeUniverseId);
        alert(`Fixture manifested! Primary ID: ${primaryId}`);
      } catch (err) {
        console.error('Seeding failed:', err);
        alert('Failed to manifest fixture. Check console.');
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-black uppercase text-nexus-muted tracking-[0.2em]">
          Fixture Laboratory
        </h3>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-nexus-800 text-nexus-muted font-mono">
          {fixtures.length} available
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {fixtures.map((fixture) => (
          <div
            key={fixture.id}
            className={`group p-4 rounded-2xl border transition-all ${
              selectedId === fixture.id
                ? 'bg-nexus-900 border-nexus-accent shadow-lg shadow-nexus-accent/10'
                : 'bg-nexus-950 border-nexus-800/50 hover:border-nexus-700'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded font-mono ${
                      fixture.category === 'Temporal'
                        ? 'bg-nexus-ruby/20 text-nexus-ruby border border-nexus-ruby/30'
                        : fixture.category === 'Relational'
                          ? 'bg-nexus-accent/20 text-nexus-accent border border-nexus-accent/30'
                          : 'bg-nexus-muted/20 text-nexus-muted border border-nexus-muted/30'
                    }`}
                  >
                    {fixture.category}
                  </span>
                  <h4 className="text-sm font-bold text-nexus-text group-hover:text-nexus-accent transition-colors">
                    {fixture.name}
                  </h4>
                </div>
                <p className="text-[11px] text-nexus-muted/80 leading-relaxed line-clamp-2">
                  {fixture.description}
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-4 pt-4 border-t border-nexus-800/30">
              <button
                onClick={() => {
                  setSelectedId(fixture.id);
                  onSimulate(fixture);
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-nexus-800 hover:bg-nexus-700 text-nexus-text text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95"
              >
                <Play size={12} fill="currentColor" />
                Simulate
              </button>

              {fixture.seed && (
                <button
                  onClick={() => handleSeed(fixture)}
                  className="px-4 flex items-center justify-center bg-nexus-950 border border-nexus-ruby/30 text-nexus-ruby hover:bg-nexus-ruby hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95"
                  title="Manifest to Database"
                >
                  <Database size={12} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {fixtures.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-nexus-800 rounded-2xl opacity-40">
          <AlertTriangle size={24} className="mb-2" />
          <span className="text-xs italic">No fixtures registered</span>
        </div>
      )}
    </div>
  );
};
