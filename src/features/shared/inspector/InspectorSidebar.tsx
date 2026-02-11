import React, { useRef } from 'react';
import {
  X,
  Box,
  Save,
  ArrowRight,
  History,
  Fingerprint,
  Target,
  Compass,
  ShieldCheck,
  Activity,
  PenTool,
} from 'lucide-react';
import { NexusObject, isLink, isReified, NexusCategory, NexusType } from '../../../types';
import { MarkdownToolbar } from '../../shared/MarkdownToolbar';

interface InspectorSidebarProps {
  object: NexusObject;
  registry: Record<string, NexusObject>;
  onUpdate: (updates: Partial<NexusObject>) => void;
  onClose: () => void;
  onOpenWiki?: (id: string) => void;
}

export const InspectorSidebar: React.FC<InspectorSidebarProps> = ({
  object,
  registry,
  onUpdate,
  onClose,
  onOpenWiki,
}) => {
  const isL = isLink(object);
  const reified = isReified(object);
  const isStory = object._type === NexusType.STORY_NOTE;
  const title =
    ('title' in object ? (object as any).title : null) ||
    (isL && 'verb' in object ? (object as any).verb : 'Untitled');
  const proseRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-nexus-900 font-sans">
      <header className="h-20 border-b border-nexus-800 flex items-center justify-between px-4 md:px-8 shrink-0 bg-nexus-900/80 backdrop-blur-xl z-20">
        <div className="flex items-center gap-4">
          <div
            className={`p-3 rounded-2xl border ${isL ? 'bg-nexus-arcane/10 border-nexus-arcane/30 text-nexus-arcane' : isStory ? 'bg-nexus-ruby/10 border-nexus-ruby/30 text-nexus-ruby' : 'bg-nexus-accent/10 border-nexus-accent/30 text-nexus-accent'}`}
          >
            {isL ? (
              <Fingerprint size={24} />
            ) : isStory ? (
              <PenTool size={24} />
            ) : (
              <Target size={24} />
            )}
          </div>
          <div>
            <h2 className="text-sm font-display font-black text-nexus-text uppercase tracking-[0.3em]">
              {isL
                ? reified
                  ? 'Reified Audit'
                  : 'Stream Audit'
                : isStory
                  ? 'Story Audit'
                  : 'Unit Audit'}
            </h2>
            <p className="text-[10px] text-nexus-muted font-mono uppercase tracking-widest mt-1">
              {isL ? `Logic: ${title}` : `Status: Editing Manifest`}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-nexus-muted hover:text-nexus-text transition-colors"
        >
          <X size={20} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8 pb-48">
        <div className="p-6 bg-nexus-950 border border-nexus-800 rounded-[32px] shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
            <Activity size={100} />
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div
              className={`p-2 rounded-xl ${isStory ? 'bg-nexus-ruby/10 text-nexus-ruby' : 'bg-nexus-accent/10 text-nexus-accent'}`}
            >
              <Box size={16} />
            </div>
            <h3 className="text-[10px] font-display font-black text-nexus-text uppercase tracking-widest">
              Structural Anchor
            </h3>
          </div>

          {!isL ? (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[9px] font-display font-black text-nexus-muted uppercase tracking-widest ml-1">
                  Designation
                </label>
                <input
                  value={'title' in object ? (object as any).title : ''}
                  onChange={(e) => onUpdate({ title: e.target.value } as Partial<NexusObject>)}
                  className="w-full bg-nexus-900 border border-nexus-800 rounded-xl px-4 py-3 text-xs font-bold text-nexus-text focus:border-nexus-accent outline-none shadow-inner"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-display font-black text-nexus-muted uppercase tracking-widest ml-1">
                  Category Signature
                </label>
                <select
                  value={'category_id' in object ? (object as any).category_id : ''}
                  disabled={isStory}
                  onChange={(e) =>
                    onUpdate({
                      category_id: e.target.value as NexusCategory,
                    } as Partial<NexusObject>)
                  }
                  className={`w-full bg-nexus-900 border border-nexus-800 rounded-xl px-4 py-3 text-[10px] font-black uppercase text-nexus-text focus:border-nexus-accent outline-none tracking-widest cursor-pointer ${isStory ? 'opacity-50 grayscale' : ''}`}
                >
                  {Object.values(NexusCategory).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {isStory && (
                  <p className="text-[7px] font-mono text-nexus-muted uppercase tracking-widest mt-1 ml-1">
                    Narrative units are locked to the Story category.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-4 p-4 bg-nexus-900/50 border border-nexus-800 rounded-2xl">
                <div className="flex-1 min-w-0 text-center">
                  <div className="text-[7px] font-black text-nexus-muted uppercase mb-1">
                    Origin
                  </div>
                  <div className="text-[9px] font-bold text-nexus-text truncate px-2">
                    {isLink(object) && 'title' in (registry[object.source_id] || {})
                      ? (registry[object.source_id] as any).title
                      : 'Unknown'}
                  </div>
                </div>
                <ArrowRight size={14} className="text-nexus-accent opacity-30" />
                <div className="flex-1 min-w-0 text-center">
                  <div className="text-[7px] font-black text-nexus-muted uppercase mb-1">
                    Terminal
                  </div>
                  <div className="text-[9px] font-bold text-nexus-text truncate px-2">
                    {isLink(object) && 'title' in (registry[object.target_id] || {})
                      ? (registry[object.target_id] as any).title
                      : 'Unknown'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-display font-black text-nexus-muted uppercase tracking-widest ml-1">
                    Active Verb
                  </label>
                  <input
                    value={isLink(object) && 'verb' in object ? (object as any).verb : ''}
                    onChange={(e) => onUpdate({ verb: e.target.value } as Partial<NexusObject>)}
                    className="w-full bg-nexus-900 border border-nexus-800 rounded-xl px-4 py-3 text-xs font-bold text-nexus-text focus:border-nexus-accent outline-none"
                    placeholder="Logic..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-display font-black text-nexus-muted uppercase tracking-widest ml-1">
                    Inverse
                  </label>
                  <input
                    value={
                      isLink(object) && 'verb_inverse' in object ? (object as any).verb_inverse : ''
                    }
                    onChange={(e) =>
                      onUpdate({ verb_inverse: e.target.value } as Partial<NexusObject>)
                    }
                    className="w-full bg-nexus-900 border border-nexus-800 rounded-xl px-4 py-3 text-xs font-bold text-nexus-text focus:border-nexus-accent outline-none"
                    placeholder="Reciprocal..."
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-nexus-950 border border-nexus-800 rounded-[32px] shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-nexus-arcane/10 rounded-xl text-nexus-arcane">
              <Compass size={16} />
            </div>
            <h3 className="text-[10px] font-display font-black text-nexus-text uppercase tracking-widest">
              Neural Abstract
            </h3>
          </div>
          <textarea
            value={'gist' in object ? (object as any).gist : ''}
            onChange={(e) => onUpdate({ gist: e.target.value } as Partial<NexusObject>)}
            className="w-full h-28 bg-nexus-900 border border-nexus-800 rounded-2xl p-4 text-[13px] text-nexus-text/90 font-serif italic outline-none focus:border-nexus-accent resize-none no-scrollbar leading-relaxed"
            placeholder="Establish the core essence..."
          />
        </div>

        <div className="p-6 bg-nexus-950 border border-nexus-800 rounded-[32px] shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-nexus-essence/10 rounded-xl text-nexus-essence">
                <ShieldCheck size={16} />
              </div>
              <h3 className="text-[10px] font-display font-black text-nexus-text uppercase tracking-widest">
                Manifest Records
              </h3>
            </div>
            <div className="text-[8px] font-mono text-nexus-muted uppercase tracking-widest opacity-40">
              Sync Protocol 4.1
            </div>
          </div>

          <div className="space-y-3">
            <MarkdownToolbar
              textareaRef={proseRef}
              content={'prose_content' in object ? (object as any).prose_content || '' : ''}
              onUpdate={(val) => onUpdate({ prose_content: val } as Partial<NexusObject>)}
            />
            <textarea
              ref={proseRef}
              value={'prose_content' in object ? (object as any).prose_content || '' : ''}
              onChange={(e) => onUpdate({ prose_content: e.target.value } as Partial<NexusObject>)}
              spellCheck={false}
              className="w-full h-80 bg-nexus-900 border border-nexus-800 rounded-2xl p-6 text-[13px] text-nexus-text font-mono outline-none focus:border-nexus-accent resize-none no-scrollbar leading-[1.8] shadow-inner selection:bg-nexus-accent/30 tracking-tight"
              placeholder="# Chronicling deep causality..."
            />
          </div>
        </div>
      </main>

      <footer className="absolute inset-x-0 bottom-0 p-8 border-t border-nexus-800 bg-nexus-950 z-30 flex flex-col gap-6">
        <button
          onClick={() => {
            if (onOpenWiki && object.id) {
              onOpenWiki(object.id);
            } else {
              onClose();
            }
          }}
          className={`
                        w-full py-4 rounded-2xl text-[10px] font-display font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-[0.98]
                        ${
                          onOpenWiki
                            ? 'bg-nexus-accent text-white shadow-nexus-accent/20 hover:bg-nexus-accent/90'
                            : 'bg-nexus-800 text-nexus-muted hover:text-nexus-text hover:bg-nexus-700'
                        }
                    `}
        >
          {onOpenWiki ? (
            <>
              <ArrowRight size={16} /> Open Full Entry
            </>
          ) : (
            <>
              <X size={16} /> Close Inspector
            </>
          )}
        </button>

        <div className="flex items-center gap-4 opacity-70">
          <div className="w-10 h-10 rounded-full bg-nexus-900 border border-nexus-800 flex items-center justify-center text-nexus-accent shrink-0 shadow-lg">
            <History size={20} />
          </div>
          <div>
            <div className="text-[10px] font-display font-black text-nexus-text uppercase tracking-widest">
              The Chronicler
            </div>
            <div className="text-[8px] text-nexus-muted font-mono uppercase tracking-[0.2em] opacity-60">
              Scry Protocol Active
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
