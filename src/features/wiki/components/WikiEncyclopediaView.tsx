import React from 'react';
import { Sparkles, Save, RotateCw, Wand2 } from 'lucide-react';
import { Logo } from '../../../components/shared/Logo';
import { WikiArtifact, NexusObject, SimpleNote } from '../../../types';
import { NexusMarkdown } from '../../../components/shared/NexusMarkdown';
import { TimeDimensionService } from '../../../core/services/TimeDimensionService';

interface WikiEncyclopediaViewProps {
  currentArtifact: WikiArtifact | null;
  currentObject: NexusObject;
  isGenerating: boolean;
  handleCommitToRegistry: () => void;
  handleGenerateEncyclopedia: () => void;
  registry: Record<string, NexusObject>;
  onSelect: (id: string) => void;
  onBack: () => void;
}

export const WikiEncyclopediaView: React.FC<WikiEncyclopediaViewProps> = ({
  currentArtifact,
  currentObject,
  isGenerating,
  handleCommitToRegistry,
  handleGenerateEncyclopedia,
  registry,
  onSelect,
  // onBack is unused
}) => {
  const note = currentObject as SimpleNote;
  const themeColor = note.theme_color;
  const displayContent = currentArtifact?.content || note.encyclopedia_content;

  return (
    <div className="animate-in fade-in zoom-in-95 duration-1000">
      {displayContent ? (
        <div className="space-y-12">
          <div className="flex items-center justify-between bg-nexus-accent/10 border border-nexus-accent/20 rounded-[32px] p-6 shadow-xl animate-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-nexus-accent/20 rounded-2xl">
                {currentArtifact ? (
                  <Sparkles className="text-nexus-accent" size={24} />
                ) : (
                  <Wand2 className="text-nexus-accent" size={24} />
                )}
              </div>
              <div>
                <h4 className="text-sm font-display font-black text-nexus-text uppercase tracking-widest">
                  {currentArtifact ? 'Neural Draft Manifested' : 'Chronicle Record Synchronized'}
                </h4>
                <p className="text-[10px] text-nexus-muted font-mono uppercase tracking-widest">
                  {currentArtifact
                    ? 'Global Graph Context Integrated'
                    : note.weaving_protocol
                      ? 'Reified via Weaver Protocol'
                      : 'Static Definition Anchored'}
                </p>
              </div>
            </div>
            {currentArtifact && (
              <button
                onClick={handleCommitToRegistry}
                className="px-8 py-3 bg-nexus-accent text-white rounded-2xl text-[10px] font-display font-black uppercase tracking-[0.2em] hover:brightness-110 transition-all shadow-xl shadow-nexus-accent/20 flex items-center gap-3"
              >
                <Save size={16} /> Commit to Chronicle
              </button>
            )}
          </div>

          <div className="bg-nexus-900/20 border border-nexus-800 rounded-[64px] p-12 md:p-20 shadow-inner overflow-hidden">
            <NexusMarkdown
              content={displayContent}
              color={themeColor}
              registry={registry}
              onLinkClick={onSelect}
            />
          </div>

          {/* Chronicle Timeline (Temporal Anchors) */}
          {(() => {
            const timeStack = TimeDimensionService.getTimeStack(registry, note.id);
            if (timeStack.length > 0) {
              return (
                <div className="mt-12 px-8">
                  <h3 className="text-nexus-muted text-xs font-display font-black uppercase tracking-[0.3em] mb-6 pl-4 border-l-2 border-nexus-accent/30">
                    Chronicle Timeline
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {timeStack.map((stateNode) => (
                      <div
                        key={stateNode.id}
                        onClick={() => onSelect(stateNode.id)}
                        className="group flex items-center justify-between p-6 bg-nexus-900/40 border border-nexus-800/60 rounded-3xl hover:bg-nexus-900 hover:border-nexus-accent/50 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-6">
                          <div className="text-nexus-accent font-mono font-bold text-lg w-16 text-right">
                            {stateNode.time_state?.effective_date?.year ||
                              stateNode.time_data?.year}
                          </div>
                          <div className="h-8 w-[2px] bg-nexus-800 group-hover:bg-nexus-accent/50 transition-colors" />
                          <div>
                            <div className="text-nexus-text font-bold text-sm group-hover:text-nexus-accent transition-colors">
                              {stateNode.title}
                            </div>
                            <div className="text-nexus-muted text-xs truncate max-w-[300px] opacity-60">
                              {stateNode.gist}
                            </div>
                          </div>
                        </div>
                        <div className="text-nexus-muted/40 group-hover:text-nexus-accent transition-colors">
                          <RotateCw size={16} className="rotate-[-90deg]" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
            return null;
          })()}

          <div className="flex justify-center pt-10">
            <button
              onClick={handleGenerateEncyclopedia}
              disabled={isGenerating}
              className="text-nexus-muted hover:text-nexus-accent transition-all flex items-center gap-3 text-[10px] font-display font-black uppercase tracking-widest"
            >
              <RotateCw size={14} className={isGenerating ? 'animate-spin' : ''} />
              {note.encyclopedia_content ? 'Re-Weave Synthesis' : 'Initiate Weave'}
            </button>
          </div>
        </div>
      ) : (
        <div className="py-40 flex flex-col items-center justify-center text-center space-y-12 bg-nexus-900 border border-nexus-800 rounded-[64px] p-16 shadow-2xl backdrop-blur-xl">
          <div className="p-10 rounded-full bg-nexus-accent/10 border border-nexus-accent/20 flex items-center justify-center relative">
            <Logo size={96} />
            <div className="absolute inset-0 bg-nexus-accent/20 rounded-full animate-pulse blur-2xl -z-10" />
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl font-display font-black text-nexus-text tracking-tighter uppercase">
              Neural Record Void
            </h2>
            <p className="text-nexus-muted max-w-sm mx-auto font-serif italic text-lg opacity-70 leading-relaxed">
              "Initiate the Weaver protocol to manifest a definitive entry from the collective graph
              memory."
            </p>
          </div>
          <button
            onClick={handleGenerateEncyclopedia}
            disabled={isGenerating}
            className="bg-nexus-accent text-white px-12 py-5 rounded-3xl font-display font-black text-xs uppercase tracking-[0.4em] transition-all hover:brightness-110 shadow-2xl shadow-nexus-accent/30 flex items-center gap-4 active:scale-95"
          >
            {isGenerating ? <RotateCw size={18} className="animate-spin" /> : <Wand2 size={18} />}
            {isGenerating ? 'Synchronizing Graph...' : 'Initiate Weaving Protocol'}
          </button>
        </div>
      )}
    </div>
  );
};
