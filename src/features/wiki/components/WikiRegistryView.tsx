import React from 'react';
import { History, PenTool, MapPin, Users, Share2, ChevronRight } from 'lucide-react';
import { Logo } from '../../../components/shared/Logo';
import { NexusObject, NexusCategory, NexusType, isLink, isReified } from '../../../types';

interface WikiRegistryViewProps {
  registry: Record<string, NexusObject>;
  onSelect: (id: string) => void;
}

export const WikiRegistryView: React.FC<WikiRegistryViewProps> = ({ registry, onSelect }) => {
  return (
    <div className="flex flex-col h-full bg-nexus-950 p-8 pb-32 overflow-y-auto no-scrollbar">
      <header className="mb-20 text-center max-w-4xl mx-auto mt-20">
        <div className="inline-flex p-6 rounded-[32px] bg-nexus-accent/10 border border-nexus-accent/20 mb-8 shadow-2xl shadow-nexus-accent/10 animate-in zoom-in duration-700">
          <Logo size={64} />
        </div>
        <h1 className="text-6xl md:text-8xl font-display font-black text-nexus-text tracking-tighter mb-4 selection:bg-nexus-accent selection:text-white uppercase">
          Neural <span className="text-nexus-accent">Index.</span>
        </h1>
        <p className="text-nexus-muted font-display font-bold uppercase tracking-[0.6em] text-xs opacity-60">
          Global Knowledge Archive v8.0
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 max-w-7xl mx-auto">
        {(Object.values(registry) as NexusObject[])
          .filter((o) => !isLink(o) || isReified(o))
          .map((node: any) => {
            const isStory = node._type === NexusType.STORY_NOTE;
            return (
              <button
                key={node.id}
                onClick={() => onSelect(node.id)}
                className={`group relative bg-nexus-900 border hover:translate-y-[-4px] p-8 rounded-[40px] text-left transition-all duration-500 shadow-xl hover:shadow-2xl flex flex-col h-full overflow-hidden ${isStory ? 'border-nexus-ruby/30 hover:border-nexus-ruby' : 'border-nexus-800/60 hover:border-nexus-accent'}`}
              >
                <div
                  className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl transition-colors ${isStory ? 'bg-nexus-ruby/5 group-hover:bg-nexus-ruby/10' : 'bg-nexus-accent/5 group-hover:bg-nexus-accent/10'}`}
                />
                <div className="flex items-center gap-3 mb-8 relative z-10">
                  <div
                    className={`p-3 rounded-2xl border transition-all shadow-sm ${isStory ? 'bg-nexus-ruby/10 border-nexus-ruby/30 text-nexus-ruby group-hover:bg-nexus-ruby group-hover:text-white' : 'bg-nexus-800 border-nexus-700 text-nexus-accent group-hover:bg-nexus-accent group-hover:text-white'}`}
                  >
                    {isStory ? (
                      <PenTool size={20} />
                    ) : isReified(node) ? (
                      <Share2 size={20} />
                    ) : node.category_id === NexusCategory.LOCATION ? (
                      <MapPin size={20} />
                    ) : (
                      <Users size={20} />
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-display font-black uppercase tracking-widest transition-colors ${isStory ? 'text-nexus-ruby group-hover:text-nexus-ruby' : 'text-nexus-muted group-hover:text-nexus-accent'}`}
                  >
                    {isStory ? 'STORY UNIT' : isReified(node) ? 'REIFIED LOGIC' : node.category_id}
                  </span>
                </div>
                <h3 className="text-2xl font-display font-bold text-nexus-text mb-4 leading-tight relative z-10 uppercase">
                  {node.title || node.verb}
                </h3>
                <p className="text-sm text-nexus-muted italic line-clamp-3 mb-8 font-serif relative z-10">
                  "{node.gist || 'Neural record awaited.'}"
                </p>
                <div className="mt-auto flex items-center justify-between text-[10px] font-display font-black uppercase tracking-widest text-nexus-muted opacity-40 group-hover:opacity-100 transition-opacity relative z-10">
                  <span>Navigate Unit</span>
                  <ChevronRight
                    size={16}
                    className="group-hover:translate-x-2 transition-transform"
                  />
                </div>
              </button>
            );
          })}
        {Object.keys(registry).filter((k) => !isLink(registry[k]) || isReified(registry[k]))
          .length === 0 && (
          <div className="col-span-full py-40 flex flex-col items-center justify-center border-2 border-dashed border-nexus-800 rounded-[64px] opacity-20 text-center">
            <History size={64} className="mb-6" />
            <h3 className="text-xl font-display font-black uppercase tracking-[0.4em]">
              Registry Empty
            </h3>
          </div>
        )}
      </div>
    </div>
  );
};
