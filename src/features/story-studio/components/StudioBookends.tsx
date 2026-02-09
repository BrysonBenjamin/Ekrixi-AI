import React from 'react';
// Fix: Import StudioBlock from types
import { StudioBlock } from '../types';
import { ManifestoForge } from './manifesto/ManifestoForge';
import { NexusObject } from '../../../types';
import { Activity } from 'lucide-react';

interface StudioBookendsProps {
  registry: Record<string, NexusObject>;
  blocks: StudioBlock[];
  onUpdateBlocks: (blocks: StudioBlock[]) => void;
  onFinalize: (blocks: StudioBlock[]) => void;
  hasSpine?: boolean;
  onJumpToSpine?: () => void;
  isSaving?: boolean;
}

export const StudioBookends: React.FC<StudioBookendsProps> = ({
  registry,
  blocks,
  onUpdateBlocks,
  onFinalize,
  hasSpine,
  onJumpToSpine,
  isSaving,
}) => {
  const [isSeeding, setIsSeeding] = React.useState(false);
  const canSynthesize = blocks.some((b) => b.type === 'THESIS' && b.data.text?.length > 10);

  if (isSeeding) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-8 bg-nexus-950 p-20">
        <div className="relative">
          <div className="w-16 h-16 border-t-2 border-l-2 border-nexus-primary rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Activity className="w-6 h-6 text-nexus-primary animate-pulse" />
          </div>
        </div>
        <p className="text-[10px] font-mono text-nexus-muted uppercase tracking-[0.4em]">
          Generating Blueprint Blocks...
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-nexus-950 animate-in fade-in duration-700 overflow-hidden">
      {/* Main Forge Area */}
      <div className="flex-1 flex flex-col min-w-0 p-10 lg:p-20 overflow-y-auto no-scrollbar relative">
        <div className="max-w-5xl mx-auto w-full">
          <ManifestoForge
            title="Blueprint Forge"
            subtitle="Assembling Manuscript Prerequisites"
            blocks={blocks}
            onUpdateBlocks={onUpdateBlocks}
            registry={registry}
            accentColor="nexus-ruby"
            onRunSynthesis={() => onFinalize(blocks)}
            synthesisLabel="Synthesize Narrative Spine"
            canSynthesize={canSynthesize}
            hasSpine={hasSpine}
            onJumpToSpine={onJumpToSpine}
            onCommitUnit={(unit) => {
              window.dispatchEvent(new CustomEvent('nexus-commit-batch', { detail: [unit] }));
            }}
            onSeedTemplate={(tplBlocks) => {
              onUpdateBlocks(tplBlocks);
            }}
            isSaving={isSaving}
            isSeeding={isSeeding}
            onSetSeeding={setIsSeeding}
          />
        </div>
      </div>
    </div>
  );
};
