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

export const PlaygroundFeature: React.FC = () => {
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
