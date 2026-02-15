import React, { useState, useRef } from 'react';
import { NexusNote, NexusObject } from '../../../../types';
import { MarkdownToolbar } from '../../../shared/MarkdownToolbar';
import { useMentions } from '../../hooks/useMentions';

interface NexusProseEditorProps {
  // Identity Node (The Eternal Truth)
  identityNode: NexusNote;

  // The Node currently being edited (could be Identity or a Snapshot)
  activeNode: NexusNote;

  // All available snapshots for this identity (sorted)
  snapshots: NexusNote[];

  // Registry for mentions
  registry: Record<string, NexusObject>;

  // Callbacks
  onSelectSnapshot: (nodeId: string) => void;
  onUpdateProse: (newProse: string) => void;
}

export const NexusProseEditor: React.FC<NexusProseEditorProps> = ({
  identityNode,
  activeNode,
  snapshots,
  registry,
  onSelectSnapshot,
  onUpdateProse,
}) => {
  const [prose, setProse] = useState(activeNode.prose_content || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Mentions Hook
  const { atMenu, suggestions, checkMentionTrigger, insertMention, closeMenu } =
    useMentions(registry);

  // Synchronize prose with activeNode during render
  const [prevActiveNodeId, setPrevActiveNodeId] = useState(activeNode.id);
  const [prevActiveNodeProse, setPrevActiveNodeProse] = useState(activeNode.prose_content);

  if (activeNode.id !== prevActiveNodeId || activeNode.prose_content !== prevActiveNodeProse) {
    setPrevActiveNodeId(activeNode.id);
    setPrevActiveNodeProse(activeNode.prose_content);
    setProse(activeNode.prose_content || '');
  }

  const handleProseChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    const newPos = e.target.selectionStart;
    setProse(newVal);
    onUpdateProse(newVal);
    checkMentionTrigger(newVal, newPos);
  };

  const handleMentionClick = (title: string) => {
    if (!textareaRef.current) return;
    const { newText, newCursorPos } = insertMention(prose, title, 0);

    setProse(newText);
    onUpdateProse(newText);

    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    });
  };

  const isSnapshot = activeNode.id !== identityNode.id;

  return (
    <div className="flex flex-col h-full bg-nexus-950">
      {/* EDITOR CANVAS */}
      <div className="flex-1 relative group flex flex-col">
        {/* Markdown Toolbar - Always Visible */}
        <div className="border-b border-nexus-800/30 bg-nexus-900/10 z-20 relative">
          <MarkdownToolbar
            textareaRef={textareaRef}
            content={prose}
            onUpdate={(val) => {
              setProse(val);
              onUpdateProse(val);
              textareaRef.current?.focus();
            }}
          />
        </div>

        {/* Visual Indicator for Snapshot Mode */}
        {isSnapshot && (
          <div className="absolute top-[40px] left-0 right-0 h-1 bg-nexus-contrast-amber/20 pointer-events-none z-10" />
        )}

        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={prose}
            onChange={handleProseChange}
            className={`
                w-full h-full resize-none bg-transparent p-8 outline-none text-base font-sans leading-relaxed
                ${isSnapshot ? 'text-nexus-contrast-amber selection:bg-nexus-contrast-amber/30' : 'text-nexus-text selection:bg-nexus-accent/30'}
                placeholder-nexus-muted/20
              `}
            placeholder={
              isSnapshot
                ? '# Historical Snapshot Record\nDescribe the state of the entity at this specific point in time...'
                : '# Eternal Identity\nDescribe the core, unchanging truth of this entity...'
            }
            spellCheck={false}
          />

          {/* Mentions Menu */}
          {atMenu && suggestions.length > 0 && (
            <div className="absolute bottom-8 left-8 w-64 bg-nexus-900 border border-nexus-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-in zoom-in-95 backdrop-blur-2xl">
              <div className="px-3 py-2 border-b border-nexus-800 bg-nexus-950/40 text-[9px] font-black text-nexus-accent uppercase tracking-widest">
                Neural Scry
              </div>
              <div className="max-h-48 overflow-y-auto no-scrollbar p-1 space-y-0.5">
                {suggestions.map((n) => (
                  <button
                    key={n.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleMentionClick(n.title);
                    }}
                    className="w-full flex items-center gap-3 p-2 hover:bg-nexus-accent hover:text-white transition-all text-left group rounded-lg"
                  >
                    <div className="w-5 h-5 rounded bg-nexus-950 border border-nexus-800 flex items-center justify-center text-[8px] font-black group-hover:bg-white/20">
                      {n.category_id?.charAt(0)}
                    </div>
                    <div className="text-[10px] font-bold truncate">{n.title}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Status Footer */}
        <div className="absolute bottom-4 right-6 text-[10px] text-nexus-muted font-mono opacity-50 pointer-events-none">
          {prose.length} chars | {isSnapshot ? 'SNAPSHOT MODE' : 'LIVE MODE'}
        </div>
      </div>
    </div>
  );
};
