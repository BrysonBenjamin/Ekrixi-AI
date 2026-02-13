import React from 'react';
import {
  FlaskConical,
  Hammer,
  Database,
  Sparkles,
  ChevronRight,
  Package,
  Terminal,
  BookOpen,
  PenTool,
  Globe,
  History,
  LucideIcon,
} from 'lucide-react';
import { dbFixtures } from '../../core/services/dbFixtures';
import { NexusObject } from '../../types';
import { StudioBlock } from '../story-studio/types';
import { ContextPlayground } from './components/ContextPlayground';

interface PlaygroundFeatureProps {
  onSeedRefinery: (items: NexusObject[], name: string) => void;
  onSeedRegistry: (items: NexusObject[]) => void;
  onSeedManifesto?: (blocks: StudioBlock[]) => void;
  onSeedTimeline?: () => void;
  onSeedWar?: () => void;
  onSeedTriangleWar?: () => void;
  onSeedFractalWar?: () => void;
}

export const PlaygroundFeature: React.FC<PlaygroundFeatureProps> = ({
  onSeedRefinery,
  onSeedRegistry,
  onSeedManifesto,
  onSeedTimeline,
  onSeedWar,
  onSeedTriangleWar,
  onSeedFractalWar,
}) => {
  return (
    <div className="h-full w-full bg-nexus-950 overflow-y-auto no-scrollbar p-8 md:p-12 font-sans">
      <div className="max-w-5xl mx-auto space-y-16">
        {/* Header */}
        <header className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-nexus-accent/10 border border-nexus-accent/30 rounded-2xl text-nexus-accent">
              <FlaskConical size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-display font-black text-white tracking-tighter uppercase">
                Nexus <span className="text-nexus-accent">Playground</span>
              </h1>
              <p className="text-[10px] text-nexus-muted font-mono uppercase tracking-[0.4em]">
                Development & Vibe-Coding Sandbox v1.2
              </p>
            </div>
          </div>
        </header>

        {/* Fixture Section */}
        <section className="space-y-8">
          <div className="flex items-center gap-4 border-b border-nexus-800 pb-4">
            <Package size={20} className="text-nexus-muted" />
            <h2 className="text-sm font-display font-black text-nexus-muted uppercase tracking-[0.2em]">
              Dramaturgical Injection System
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* NEW/PROMOTED FIXTURES AT TOP */}
            <FixtureCard
              title="Timestamp: Aethelgard"
              desc="Historical timeline of a city across 3 eras (Foundation, Golden Age, Ruin). Tests time-travel navigation."
              itemsCount={4}
              category="Timeline Logic"
              icon={History}
              onSeed={() => onSeedTimeline?.()}
              actionLabel="Seed Timeline"
              variant="registry"
              theme="cyan"
            />

            <FixtureCard
              title="Scenario: The Variance War"
              desc="Two sovereign states (Earth vs Moon) with a reified war connection. Tests multi-node temporal states."
              itemsCount={12}
              category="Complex Timeline"
              icon={History}
              onSeed={() => onSeedWar?.()}
              actionLabel="Seed War"
              variant="registry"
              theme="ruby"
            />

            <FixtureCard
              title="Arrows: Triangle War"
              desc="Three countries (A, B, C) with a reified war and simple treaties. Tests temporal link arrows and multi-era navigation."
              itemsCount={15}
              category="Navigation Test"
              icon={History}
              onSeed={() => onSeedTriangleWar?.()}
              actionLabel="Seed Triangle War"
              variant="registry"
              theme="cyan"
            />

            <FixtureCard
              title="Fractal: Unification Era"
              desc="Recursive Tier 3 containers (Century -> War -> Battle). Tests infinite nesting and fractal state inheritance."
              itemsCount={4}
              category="Recursive Graph"
              icon={History}
              onSeed={() => onSeedFractalWar?.()}
              actionLabel="Seed Fractal Graph"
              variant="registry"
              theme="ruby"
            />

            <FixtureCard
              title="Manifesto: Memory Thief"
              desc="Protocol blocks for a high-fidelity 'Save the Cat' story. Seeds the writing forge with thesis, arc delta, and latent world units."
              itemsCount={5}
              category="Drafting Blocks"
              icon={PenTool}
              theme="ruby"
              onSeed={() => onSeedManifesto?.(dbFixtures.getManifestoBatch())}
              actionLabel="Seed Story Forge"
            />

            <FixtureCard
              title="Manuscript: Resonance"
              desc="Already completed manuscript hierarchy (Polished). Includes chapters, scenes, and embedded drafting history."
              itemsCount={6}
              category="Completed Work"
              icon={BookOpen}
              theme="ruby"
              onSeed={() =>
                onSeedRefinery(dbFixtures.getManuscriptBatch(), 'GAIA_RESONANCE_POLISHED')
              }
            />

            <FixtureCard
              title="Kernel: Gaia Prime (v2)"
              desc="Comprehensive expanded planetary lore. Multiple regions, nested organizations, and bio-tech character scry-nodes."
              itemsCount={14}
              category="World Building"
              icon={Globe}
              onSeed={() => onSeedRefinery(dbFixtures.getGaiaPrimeBatch(), 'GAIA_CORE_EXPANDED')}
            />

            <FixtureCard
              title="World: Oros Shattered"
              desc="Classic Oros hierarchical map featuring floating islands and semantic hunt-logic."
              itemsCount={15}
              category="High Fantasy"
              onSeed={() => onSeedRefinery(dbFixtures.getOrosBatch(), 'OROS_WORLD_SEVENTH_ERA')}
            />

            <FixtureCard
              title="Syndicate Intel"
              desc="Cyberpunk associations focused on semantic links between hackers, illegal tech, and criminal organizations."
              itemsCount={7}
              category="Cyberpunk"
              onSeed={() =>
                onSeedRefinery(dbFixtures.getSyndicateBatch(), 'SYNDICATE_INTEL_SCRAPE')
              }
            />

            <FixtureCard
              title="Inject: Deep Lore"
              desc="Direct injection of Gaia fixture to the global registry (bypassing refinery)."
              itemsCount={12}
              category="Internal Dev"
              icon={Database}
              onSeed={() => onSeedRegistry(dbFixtures.getGaiaPrimeBatch())}
              actionLabel="Inject to Registry"
              variant="registry"
            />
          </div>
        </section>

        {/* Causal Prototyping Section */}
        <section className="space-y-8">
          <div className="flex items-center gap-4 border-b border-nexus-800 pb-4">
            <Terminal size={20} className="text-nexus-muted" />
            <h2 className="text-sm font-display font-black text-nexus-muted uppercase tracking-[0.2em]">
              Causal Prototyping
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-8">
            <div className="p-1 bg-nexus-800/20 border border-nexus-800 rounded-[40px] overflow-hidden shadow-2xl">
              <ContextPlayground />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

interface FixtureCardProps {
  title: string;
  desc: string;
  itemsCount: number;
  category: string;
  onSeed: () => void;
  actionLabel?: string;
  variant?: 'refinery' | 'registry';
  icon?: LucideIcon;
  theme?: 'cyan' | 'ruby';
}

const FixtureCard: React.FC<FixtureCardProps> = ({
  title,
  desc,
  itemsCount,
  category,
  onSeed,
  actionLabel = 'Send to Refinery',
  variant = 'refinery',
  icon: Icon = Sparkles,
  theme = 'cyan',
}) => {
  const accentClass = theme === 'ruby' ? 'text-nexus-ruby' : 'text-nexus-accent';
  const bgAccent = theme === 'ruby' ? 'bg-nexus-ruby/10' : 'bg-nexus-accent/10';

  return (
    <div
      className={`group relative p-8 bg-nexus-900 border rounded-[40px] transition-all duration-500 hover:translate-y-[-4px] shadow-xl hover:shadow-2xl ${variant === 'registry' ? 'border-nexus-essence/30 hover:border-nexus-essence' : 'border-nexus-800 hover:border-nexus-accent'} ${theme === 'ruby' ? 'hover:border-nexus-ruby/50' : ''}`}
    >
      <div className="flex items-start justify-between mb-8">
        <div className="space-y-1">
          <span
            className={`text-[8px] font-mono font-black px-2 py-0.5 rounded-full border uppercase tracking-widest ${variant === 'registry' ? 'bg-nexus-essence/10 border-nexus-essence/30 text-nexus-essence' : `${bgAccent} border-transparent ${accentClass}`}`}
          >
            {category}
          </span>
          <h3 className="text-2xl font-display font-bold text-nexus-text tracking-tight group-hover:text-white transition-colors">
            {title}
          </h3>
        </div>
        <div className="p-3 bg-nexus-950 rounded-2xl border border-nexus-800 text-nexus-muted group-hover:text-white transition-colors">
          <Icon size={20} className={variant === 'registry' ? 'text-nexus-essence' : accentClass} />
        </div>
      </div>

      <p className="text-sm text-nexus-muted leading-relaxed font-serif italic mb-10 opacity-70 group-hover:opacity-100 transition-opacity">
        "{desc}"
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-mono font-black text-nexus-muted uppercase tracking-widest">
          <Hammer size={14} /> {itemsCount} Units
        </div>
        <button
          onClick={onSeed}
          className={`px-6 py-2.5 rounded-full text-[10px] font-display font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg active:scale-95 ${variant === 'registry' ? 'bg-nexus-essence text-white shadow-nexus-essence/20' : theme === 'ruby' ? 'bg-nexus-ruby text-white shadow-nexus-ruby/20' : 'bg-nexus-accent text-white shadow-nexus-accent/20'}`}
        >
          {actionLabel} <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};
