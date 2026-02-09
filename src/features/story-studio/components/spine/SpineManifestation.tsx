import React from 'react';
import {
  Activity,
  TrendingUp,
  Wand2,
  Sparkles,
  GitBranch,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';
import { StudioBlock } from '../../types';
import { NexusObject } from '../../../../types';
import { StoryInput } from '../shared/StoryInput';

interface SpineManifestationProps {
  blocks: StudioBlock[];
  handleManifestFromBlueprint: () => void;
  onBackToManifesto?: () => void;
  handleSmartSpineGeneration: (text: string) => void;
  registry: Record<string, NexusObject>;
  isRegeneration?: boolean;
  onCancel?: () => void;
}

export const SpineManifestation: React.FC<SpineManifestationProps> = ({
  blocks,
  handleManifestFromBlueprint,
  onBackToManifesto,
  handleSmartSpineGeneration,
  registry,
  isRegeneration,
  onCancel,
}) => {
  // If we have blocks but no spine items, offer to manifest from blueprint
  if (blocks.length > 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-nexus-950 p-8">
        <div className="w-full max-w-2xl flex flex-col items-center gap-8 animate-in fade-in zoom-in-95 duration-500">
          <div className="p-6 bg-nexus-900 border border-nexus-800 rounded-[32px] text-center w-full shadow-2xl space-y-6">
            <div className="flex justify-center">
              <div className="p-4 bg-nexus-ruby/10 rounded-full border border-nexus-ruby/20">
                <GitBranch size={48} className="text-nexus-ruby" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-display font-black text-nexus-text uppercase tracking-tight">
                {isRegeneration ? 'Regenerate Spine' : 'Blueprint Ready'}
              </h2>
              <p className="text-nexus-muted font-serif italic">
                {isRegeneration
                  ? 'Existing chapters found. Regenerating will purge all current story notes.'
                  : `${blocks.length} Protocol Blocks loaded. Ready to manifest narrative spine.`}
              </p>
            </div>

            {isRegeneration && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-4 text-left">
                <AlertTriangle size={24} className="text-red-500 shrink-0" />
                <div className="text-[10px] font-mono text-red-500 uppercase tracking-widest leading-relaxed">
                  Warning: This action is destructive. All current chapter prose and scenes will be
                  permanently deleted.
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={handleManifestFromBlueprint}
                className={`w-full py-4 ${isRegeneration ? 'bg-red-500' : 'bg-nexus-ruby'} text-white rounded-2xl font-display font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-3`}
              >
                {isRegeneration ? <RotateCw size={18} /> : <Sparkles size={18} />}
                {isRegeneration ? 'Reset & Regenerate' : 'Manifest Chapters'}
              </button>
              {isRegeneration && onCancel && (
                <button
                  onClick={onCancel}
                  className="w-full py-3 bg-nexus-900 border border-nexus-800 text-nexus-text rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-nexus-800 transition-all"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => onBackToManifesto && onBackToManifesto()}
                className="text-xs text-nexus-muted hover:text-nexus-text uppercase tracking-widest font-bold py-2"
              >
                Return to Forge
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const suggestions = [
    {
      label: "Hero's Journey",
      description: 'Classic monomyth structure.',
      prompt: "Create a Hero's Journey story about a cybernetic monk seeking a lost archive.",
      icon: Wand2,
    },
    {
      label: 'Save The Cat',
      description: 'Screenwriting pacing validation.',
      prompt: 'Outline a thriller using Save the Cat! beats set on a colonized Mars.',
      icon: Activity,
    },
    {
      label: 'Fichtean Curve',
      description: 'Crisis-driven narrative loop.',
      prompt: 'Generate a Fichtean Curve mystery where every clue makes things worse.',
      icon: TrendingUp,
    },
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center bg-nexus-950 p-8">
      <div className="w-full max-w-4xl flex flex-col items-center gap-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center space-y-6">
          <div className="flex items-center justify-center mb-4">
            <div className="p-4 bg-nexus-ruby/10 rounded-2xl border border-nexus-ruby/20 shadow-[0_0_30px_rgba(225,29,72,0.1)]">
              <GitBranch size={48} className="text-nexus-ruby" />
            </div>
          </div>
          <h1 className="text-6xl font-display font-black text-nexus-text tracking-tighter">
            Story <span className="text-nexus-ruby">Spine.</span>
          </h1>
          <p className="text-xl text-nexus-muted font-serif italic max-w-2xl mx-auto">
            Initiate a narrative protocol. Define your premise, and Ekrixi will construct the
            structural blocks and chapter sequence.
          </p>
        </div>

        <div className="w-full max-w-3xl">
          <StoryInput
            isLoading={false}
            onSend={handleSmartSpineGeneration}
            registry={registry}
            placeholder="Manifest your narrative... Use @ to link Characters or Lore."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl px-4">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSmartSpineGeneration(s.prompt)}
              className="group flex flex-col gap-3 p-6 bg-nexus-900/40 border border-nexus-800/50 rounded-3xl hover:bg-nexus-800 hover:border-nexus-ruby/30 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <s.icon
                  size={18}
                  className="text-nexus-muted group-hover:text-nexus-ruby transition-colors"
                />
                <span className="text-xs font-black uppercase tracking-widest text-nexus-text">
                  {s.label}
                </span>
              </div>
              <p className="text-[11px] text-nexus-muted font-medium opacity-80 group-hover:opacity-100 transition-opacity">
                {s.description}
              </p>
            </button>
          ))}
        </div>

        {/* Note: Manual entry button removed for clean split, can re-add if needed or user needs way to start empty */}
      </div>
    </div>
  );
};
