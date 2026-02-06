import React from 'react';
// Fix: Import StudioBlock from types
import { StudioBlock } from '../types';
import { ManifestoForge } from './ManifestoForge';
import { NexusObject } from '../../../types';

interface StudioBookendsProps {
  registry: Record<string, NexusObject>;
  blocks: StudioBlock[];
  onUpdateBlocks: (blocks: StudioBlock[]) => void;
  onFinalize: (blocks: StudioBlock[]) => void;
  hasSpine?: boolean;
  onJumpToSpine?: () => void;
}

export const StudioBookends: React.FC<StudioBookendsProps> = ({
  registry,
  blocks,
  onUpdateBlocks,
  onFinalize,
  hasSpine,
  onJumpToSpine,
}) => {
  const canSynthesize = blocks.some((b) => b.type === 'THESIS' && b.data.text?.length > 10);

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
          />
        </div>
      </div>
    </div>
  );
};
