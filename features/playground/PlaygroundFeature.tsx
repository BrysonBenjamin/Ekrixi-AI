
import React from 'react';
import { FlaskConical, Hammer, Database, Sparkles, ChevronRight, Package, Terminal, Box } from 'lucide-react';
import { getRefineryDemoBatch } from '../refinery/fixtures/refinery_batch_fixture';
import { getNeonSyndicateBatch } from '../refinery/fixtures/neon_syndicate_fixture';
import { getGaiaFixture } from '../../fixtures/gaia_fixture';
import { NexusObject } from '../../types';

interface PlaygroundFeatureProps {
    onSeedRefinery: (items: NexusObject[], name: string) => void;
    onSeedRegistry: (items: Record<string, NexusObject>) => void;
}

export const PlaygroundFeature: React.FC<PlaygroundFeatureProps> = ({ onSeedRefinery, onSeedRegistry }) => {
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
                            <h1 className="text-4xl font-display font-black text-white tracking-tighter uppercase">Nexus <span className="text-nexus-accent">Playground</span></h1>
                            <p className="text-[10px] text-nexus-muted font-mono uppercase tracking-[0.4em]">Development & Vibe-Coding Sandbox v1.0</p>
                        </div>
                    </div>
                </header>

                {/* Fixture Section */}
                <section className="space-y-8">
                    <div className="flex items-center gap-4 border-b border-nexus-800 pb-4">
                        <Package size={20} className="text-nexus-muted" />
                        <h2 className="text-sm font-display font-black text-nexus-muted uppercase tracking-[0.2em]">Fixture Injection System</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        <FixtureCard 
                            title="Oros: Shattered Realm"
                            desc="A complex hierarchical map featuring floating islands, characters, and semantic hunt-logic. High density tree structure."
                            itemsCount={15}
                            category="High Fantasy"
                            onSeed={() => onSeedRefinery(getRefineryDemoBatch(), "OROS_WORLD_SEVENTH_ERA")}
                        />

                        <FixtureCard 
                            title="Neon Syndicate"
                            desc="Cyberpunk associations focused on semantic links between hackers, illegal tech, and criminal organizations."
                            itemsCount={7}
                            category="Cyberpunk"
                            onSeed={() => onSeedRefinery(getNeonSyndicateBatch(), "SYNDICATE_INTEL_SCRAPE")}
                        />

                        <FixtureCard 
                            title="Gaia Prime"
                            desc="Direct injection of a mature registry. Bio-mechanical planetary super-organism with nested continents and factions."
                            itemsCount={12}
                            category="Bio-Tech"
                            onSeed={() => onSeedRegistry(getGaiaFixture())}
                            actionLabel="Inject to Registry"
                            variant="registry"
                        />
                    </div>
                </section>

                {/* Dev Tools Section */}
                <section className="space-y-8">
                    <div className="flex items-center gap-4 border-b border-nexus-800 pb-4">
                        <Terminal size={20} className="text-nexus-muted" />
                        <h2 className="text-sm font-display font-black text-nexus-muted uppercase tracking-[0.2em]">Causal Prototyping</h2>
                    </div>

                    <div className="p-8 bg-nexus-900/50 border border-nexus-800 rounded-[32px] flex flex-col items-center justify-center text-center space-y-6">
                        <div className="p-4 bg-nexus-800 rounded-full">
                            <Box size={40} className="text-nexus-muted opacity-40" />
                        </div>
                        <h3 className="text-xl font-display font-bold text-nexus-text uppercase">Custom Scry Logic</h3>
                        <p className="text-xs text-nexus-muted font-serif italic max-w-sm">"Use this space to test atomic unit generation and causal reification logic in future versions."</p>
                        <button disabled className="px-8 py-3 rounded-2xl border border-nexus-800 text-nexus-muted text-[10px] font-black uppercase tracking-widest opacity-50">Locked: v5.2 Core Required</button>
                    </div>
                </section>

            </div>
        </div>
    );
};

const FixtureCard = ({ title, desc, itemsCount, category, onSeed, actionLabel = "Send to Refinery", variant = "refinery" }: any) => (
    <div className={`group relative p-8 bg-nexus-900 border rounded-[40px] transition-all duration-500 hover:translate-y-[-4px] shadow-xl hover:shadow-2xl ${variant === 'registry' ? 'border-nexus-essence/30 hover:border-nexus-essence' : 'border-nexus-800 hover:border-nexus-accent'}`}>
        <div className="flex items-start justify-between mb-8">
            <div className="space-y-1">
                <span className={`text-[8px] font-mono font-black px-2 py-0.5 rounded-full border uppercase tracking-widest ${variant === 'registry' ? 'bg-nexus-essence/10 border-nexus-essence/30 text-nexus-essence' : 'bg-nexus-accent/10 border-nexus-accent/30 text-nexus-accent'}`}>
                    {category}
                </span>
                <h3 className="text-2xl font-display font-bold text-nexus-text tracking-tight group-hover:text-white transition-colors">{title}</h3>
            </div>
            <div className="p-3 bg-nexus-950 rounded-2xl border border-nexus-800 text-nexus-muted">
                <Sparkles size={20} className={variant === 'registry' ? 'text-nexus-essence' : 'text-nexus-accent'} />
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
                className={`px-6 py-2.5 rounded-full text-[10px] font-display font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg active:scale-95 ${variant === 'registry' ? 'bg-nexus-essence text-white shadow-nexus-essence/20' : 'bg-nexus-accent text-white shadow-nexus-accent/20'}`}
            >
                {actionLabel} <ChevronRight size={14} />
            </button>
        </div>
    </div>
);
