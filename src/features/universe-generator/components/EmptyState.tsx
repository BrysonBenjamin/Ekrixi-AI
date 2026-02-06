import React from 'react';
import { Composer } from './Composer';
import { Map as MapIcon, Users, Shield, Sparkles } from 'lucide-react';
import { Logo } from '../../../components/shared/Logo';
import { NexusObject } from '../../../types';

interface EmptyStateProps {
  onSend: (text: string) => void;
  registry: Record<string, NexusObject>;
}

const SuggestionChip = ({
  icon: Icon,
  label,
  onClick,
}: {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="flex items-center gap-4 px-8 py-5 rounded-[24px] border border-nexus-800 bg-nexus-900 shadow-xl text-nexus-muted hover:bg-nexus-accent hover:text-white hover:border-nexus-accent transition-all duration-500 text-sm font-display font-bold tracking-widest whitespace-nowrap active:scale-95"
  >
    {Icon && <Icon size={18} className="shrink-0" />}
    <span>{label}</span>
  </button>
);

export const EmptyState: React.FC<EmptyStateProps> = ({ onSend, registry }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden bg-nexus-950">
      {/* Subtle Ambience */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[15%] left-[20%] w-[600px] h-[600px] bg-nexus-accent/5 rounded-full blur-[140px] animate-pulse-slow"></div>
        <div className="absolute bottom-[15%] right-[20%] w-[600px] h-[600px] bg-nexus-arcane/5 rounded-full blur-[140px] animate-pulse-slow delay-1000"></div>
      </div>

      <div className="w-full max-w-4xl z-10 flex flex-col gap-16 animate-in fade-in slide-in-from-bottom-12 duration-1000 items-center">
        {/* Header */}
        <div className="space-y-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Logo size={48} />
            <span className="text-xs font-display font-black text-nexus-muted tracking-[0.4em] uppercase">
              Ekrixi AI Core
            </span>
          </div>
          <h1 className="text-6xl md:text-8xl font-display font-black text-nexus-text tracking-tighter pb-4 leading-[1.1] selection:bg-nexus-accent selection:text-white">
            Universe <span className="text-nexus-accent">Synthesizer.</span>
          </h1>
          <p className="text-nexus-muted text-lg max-w-2xl mx-auto font-serif italic font-medium">
            Enter the weaving protocol to manifest legendary timelines and divine hierarchies with
            Ekrixi AI.
          </p>
        </div>

        {/* Input Area */}
        <div className="w-full">
          <Composer isLoading={false} onSend={onSend} variant="center" registry={registry} />
        </div>

        {/* Suggestions */}
        <div className="flex flex-wrap gap-4 justify-center w-full max-w-4xl px-4">
          <SuggestionChip
            icon={MapIcon}
            label="MAP_REGISTRY"
            onClick={() =>
              onSend('Construct a logic map for a city built on the rotating rings of a dying sun.')
            }
          />
          <SuggestionChip
            icon={Users}
            label="INIT_CHARACTER"
            onClick={() =>
              onSend(
                'Define a protagonist who exists across three parallel timelines simultaneously.',
              )
            }
          />
          <SuggestionChip
            icon={Shield}
            label="SECURE_FACTION"
            onClick={() =>
              onSend(
                'Establish a secret organization that monitors the dreams of the planetary consciousness.',
              )
            }
          />
        </div>

        <div className="mt-12 flex flex-col items-center gap-3 opacity-30">
          <Sparkles size={20} className="text-nexus-accent" />
          <p className="text-[10px] font-mono font-black uppercase tracking-[0.6em] text-nexus-muted">
            Ekrixi Kernel v5.2 Active // Registry Scry Enabled
          </p>
        </div>
      </div>
    </div>
  );
};
