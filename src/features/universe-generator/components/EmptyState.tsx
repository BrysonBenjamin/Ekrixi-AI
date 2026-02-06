import React from 'react';
import { Composer } from './Composer';
import { Map as MapIcon, Users, Shield, Sparkles } from 'lucide-react';
import { BrandLogo } from '../../../components/shared/BrandLogo';
import { NexusObject } from '../../../types';

interface EmptyStateProps {
  onSend: (text: string) => void;
  registry: Record<string, NexusObject>;
}

interface Suggestion {
  icon: React.ElementType;
  label: string;
  description: string;
  prompt: string;
  color: string;
}

const MobileSuggestionCard = ({
  suggestion,
  onClick,
}: {
  suggestion: Suggestion;
  onClick: () => void;
}) => {
  const Icon = suggestion.icon;
  return (
    <button
      onClick={onClick}
      className="group w-full flex items-center gap-4 p-4 rounded-2xl bg-nexus-900/40 backdrop-blur-md border border-nexus-800/50 hover:bg-nexus-800/60 hover:border-nexus-accent/30 transition-all duration-300 text-left active:scale-[0.98]"
    >
      <div
        className={`p-3 rounded-xl bg-gradient-to-br ${suggestion.color} bg-opacity-10 shrink-0 shadow-lg group-hover:scale-110 transition-transform`}
      >
        <Icon size={20} className="text-white opactiy-90" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-display font-bold text-nexus-text tracking-wide group-hover:text-nexus-accent transition-colors">
            {suggestion.label}
          </span>
        </div>
        <p className="text-[11px] text-nexus-muted leading-tight line-clamp-2 font-medium opacity-80">
          {suggestion.description}
        </p>
      </div>
    </button>
  );
};

const DesktopSuggestionChip = ({
  suggestion,
  onClick,
}: {
  suggestion: Suggestion;
  onClick: () => void;
}) => {
  const Icon = suggestion.icon;
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 px-5 py-3 rounded-full border border-nexus-800 bg-nexus-900/50 hover:bg-nexus-800 hover:border-nexus-accent/50 transition-all duration-300"
    >
      <Icon
        size={16}
        className="text-nexus-muted group-hover:text-nexus-accent transition-colors"
      />
      <span className="text-xs font-bold text-nexus-muted group-hover:text-nexus-text uppercase tracking-wider">
        {suggestion.label}
      </span>
    </button>
  );
};

const getSuggestions = (registry: Record<string, NexusObject>): Suggestion[] => {
  const objectKeys = Object.keys(registry);
  const isEmpty = objectKeys.length === 0;

  if (isEmpty) {
    return [
      {
        icon: Users,
        label: 'Init Character',
        description: 'Forge a new protagonist to anchor your narrative timeline.',
        prompt: 'Define a protagonist who exists across three parallel timelines simultaneously.',
        color: 'from-blue-500/20 to-cyan-500/20',
      },
      {
        icon: MapIcon,
        label: 'Map Territory',
        description: 'Construct the logic map for a central location.',
        prompt: 'Construct a logic map for a city built on the rotating rings of a dying sun.',
        color: 'from-emerald-500/20 to-teal-500/20',
      },
      {
        icon: Shield,
        label: 'Secure Faction',
        description: 'Establish a power structure or secret organization.',
        prompt:
          'Establish a secret organization that monitors the dreams of the planetary consciousness.',
        color: 'from-purple-500/20 to-violet-500/20',
      },
    ];
  }

  // Dynamic Suggestions for Populated Registry
  const suggestions: Suggestion[] = [];
  // Filter only objects that behave like Notes (have a title)
  const notes = Object.values(registry).filter(
    (obj): obj is any => 'title' in obj && typeof (obj as any).title === 'string',
  );

  if (notes.length === 0) {
    // Fallback if we have registry items but no notes (e.g. just links?) - treat as cold start
    return [
      {
        icon: Users,
        label: 'Init Character',
        description: 'Forge a new protagonist to anchor your narrative timeline.',
        prompt: 'Define a protagonist who exists across three parallel timelines simultaneously.',
        color: 'from-blue-500/20 to-cyan-500/20',
      },
      // ... duplicates of above, or just return the cold start array?
      // Let's simpler: check keys length at start. If > 0 but no notes, maybe just return generic.
      // Actually, let's just reuse the same cold start array logic if notes.length === 0.
      {
        icon: MapIcon,
        label: 'Map Territory',
        description: 'Construct the logic map for a central location.',
        prompt: 'Construct a logic map for a city built on the rotating rings of a dying sun.',
        color: 'from-emerald-500/20 to-teal-500/20',
      },
      {
        icon: Shield,
        label: 'Secure Faction',
        description: 'Establish a power structure or secret organization.',
        prompt:
          'Establish a secret organization that monitors the dreams of the planetary consciousness.',
        color: 'from-purple-500/20 to-violet-500/20',
      },
    ];
  }

  // 1. Expand Existing Entity
  const randomEntity = notes[Math.floor(Math.random() * notes.length)];
  suggestions.push({
    icon: Sparkles,
    label: 'Deepen Lore',
    description: `Expand the hidden history of ${randomEntity.title}.`,
    prompt: `Reveal a forgotten secret about ${randomEntity.title} that changes their role in the plot.`,
    color: 'from-amber-500/20 to-orange-500/20',
  });

  // 2. Interaction (if > 1 entity)
  if (notes.length > 1) {
    const entityA = notes[Math.floor(Math.random() * notes.length)];
    const entityB = notes.find((e: any) => e.id !== entityA.id) || notes[0];
    suggestions.push({
      icon: Users,
      label: 'Forge Connection',
      description: `Define the relationship between ${entityA.title} and ${entityB.title}.`,
      prompt: `Describe a past conflict where ${entityA.title} and ${entityB.title} were forced to cooperate.`,
      color: 'from-pink-500/20 to-rose-500/20',
    });
  } else {
    // Fallback if only 1 entity
    suggestions.push({
      icon: Users,
      label: 'Create Rival',
      description: `Design a direct antagonist for ${randomEntity.title}.`,
      prompt: `Create a rival character who perfectly counters ${randomEntity.title}'s abilities.`,
      color: 'from-red-500/20 to-rose-500/20',
    });
  }

  // 3. New Context
  suggestions.push({
    icon: MapIcon,
    label: 'Expand World',
    description: 'Add a new location to broaden the narrative scope.',
    prompt: 'Describe a location that is currently forbidden to all characters.',
    color: 'from-indigo-500/20 to-blue-500/20',
  });

  return suggestions;
};

export const EmptyState: React.FC<EmptyStateProps> = ({ onSend, registry }) => {
  const suggestions = React.useMemo(() => getSuggestions(registry), [registry]);

  return (
    <div className="min-h-full w-full flex flex-col items-center p-8 relative bg-nexus-950">
      {/* Subtle Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[15%] left-[20%] w-[600px] h-[600px] bg-nexus-accent/5 rounded-full blur-[140px] animate-pulse-slow"></div>
        <div className="absolute bottom-[15%] right-[20%] w-[600px] h-[600px] bg-nexus-arcane/5 rounded-full blur-[140px] animate-pulse-slow delay-1000"></div>
      </div>

      <div className="hidden md:flex my-auto w-full max-w-4xl z-10 flex-col gap-16 animate-in fade-in slide-in-from-bottom-12 duration-1000 items-center">
        {/* DESKTOP CONTENT */}
        {/* Header */}
        <div className="space-y-6 text-center">
          <div
            className="flex items-center justify-center mb-6 hero-logo-target"
            data-flip-id="hero-logo"
          >
            <BrandLogo className="h-16 md:h-20 w-auto" />
          </div>
          <h1 className="text-5xl md:text-8xl font-display font-black text-nexus-text tracking-tighter pb-4 leading-[1.1] selection:bg-nexus-accent selection:text-white">
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
          {suggestions.map((s, i) => (
            <DesktopSuggestionChip key={i} suggestion={s} onClick={() => onSend(s.prompt)} />
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center gap-3 opacity-30">
          <Sparkles size={20} className="text-nexus-accent" />
          <p className="text-[10px] font-mono font-black uppercase tracking-[0.6em] text-nexus-muted">
            Ekrixi Kernel v5.2 Active // Registry Scry Enabled
          </p>
        </div>
      </div>

      {/* MOBILE CONTENT (Gemini Style) */}
      <div className="flex md:hidden flex-col w-full h-full z-10 pt-10 pb-0 justify-between">
        <div className="space-y-2 animate-in slide-in-from-left-4 duration-700">
          <h2 className="text-4xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-nexus-text to-nexus-muted tracking-tighter">
            Hello, <br />
            <span className="text-nexus-accent">Traveler.</span>
          </h2>
          <p className="text-xl text-nexus-muted/60 font-medium">What reality shall we weave?</p>
        </div>

        <div className="flex-1 flex flex-col justify-center gap-3 py-6 overflow-y-auto w-full max-w-sm">
          {suggestions.map((s, i) => (
            <MobileSuggestionCard key={i} suggestion={s} onClick={() => onSend(s.prompt)} />
          ))}
        </div>

        <div className="w-full pb-4 animate-in slide-in-from-bottom-8 duration-700 delay-100">
          <Composer isLoading={false} onSend={onSend} variant="center" registry={registry} />
        </div>
      </div>
    </div>
  );
};
