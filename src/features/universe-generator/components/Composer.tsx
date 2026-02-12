import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  ArrowUp,
  RotateCw,
  Maximize2,
  Minimize2,
  StickyNote,
  Plus,
  Database,
  X,
  Sparkles,
} from 'lucide-react';
import { NexusObject, isLink, isContainer, SimpleNote } from '../../../types';
import { WeightedContextUnit } from '../../../core/services/ContextAssemblyService';
import { ContextPill } from '../../../components/shared/ContextPill';

interface ComposerProps {
  isLoading: boolean;
  onSend: (text: string, context?: WeightedContextUnit[]) => void;
  variant?: 'footer' | 'center';
  registry: Record<string, NexusObject>;
}

export const Composer: React.FC<ComposerProps> = ({
  isLoading,
  onSend,
  variant = 'footer',
  registry,
}) => {
  const [text, setText] = useState('');
  const [weightedMentions, setWeightedMentions] = useState<WeightedContextUnit[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showContextOverlay, setShowContextOverlay] = useState(false);
  const [atMenu, setAtMenu] = useState<{ query: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!text.trim() || isLoading) return;
    onSend(text.trim(), weightedMentions);
    setText('');
    setWeightedMentions([]);
    setIsExpanded(false);
    setAtMenu(null);
  };

  const handleUpdateMention = (updated: WeightedContextUnit) => {
    setWeightedMentions(weightedMentions.map((m) => (m.id === updated.id ? updated : m)));
  };

  const handleRemoveMention = (id: string, title?: string) => {
    setWeightedMentions(weightedMentions.filter((m) => m.id !== id));
    // Also remove text representation if title is provided
    if (title) {
      const mentionText = `[[${title}]]`;
      if (text.includes(mentionText)) {
        setText(text.replace(mentionText, ''));
      }
    }
  };

  // Sync Text -> Context: If user deletes [[Title]], remove the context pill
  useEffect(() => {
    if (weightedMentions.length === 0) return;

    const activeTitlesInText = new Set<string>();
    // Simple regex to find [[Title]] patterns.
    // Note: This assumes titles don't have nested brackets.
    const matches = text.match(/\[\[(.*?)\]\]/g);
    if (matches) {
      matches.forEach((m) => activeTitlesInText.add(m.slice(2, -2)));
    }

    // Identify mentions that are no longer in text
    const mentionsToRemove = weightedMentions.filter((wm) => {
      const note = registry[wm.id] as SimpleNote;
      if (!note) return false;
      return !activeTitlesInText.has(note.title);
    });

    if (mentionsToRemove.length > 0) {
      setWeightedMentions((prev) =>
        prev.filter((p) => !mentionsToRemove.some((r) => r.id === p.id)),
      );
    }
  }, [text, registry, weightedMentions]);
  // Note: we exclude weightedMentions from dep array to avoid loops,
  // but we need to be careful. Actually, if we only remove, it should be fine.
  // Better implementation: calculate new state and only set if different.

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (atMenu) {
        // Allow selection from menu via keyboard if implemented, otherwise close
        setAtMenu(null);
      } else {
        e.preventDefault();
        handleSend();
      }
    }
  };

  const detectAtTrigger = (val: string, pos: number) => {
    const beforeCursor = val.slice(0, pos);
    const lastAtIndex = beforeCursor.lastIndexOf('@');
    // Ensure we are typing a valid query (no spaces after @ yet)
    if (lastAtIndex !== -1 && !beforeCursor.slice(lastAtIndex).includes(' ')) {
      setAtMenu({ query: beforeCursor.slice(lastAtIndex + 1) });
    } else {
      setAtMenu(null);
    }
  };

  const insertMention = (node: SimpleNote) => {
    if (!textareaRef.current) return;
    const pos = textareaRef.current.selectionStart;
    const beforeCursor = text.slice(0, pos);
    const afterCursor = text.slice(pos);
    const lastAtIndex = beforeCursor.lastIndexOf('@');

    // Insert [[Title]]
    const mentionText = `[[${node.title}]]`;
    const newText = beforeCursor.slice(0, lastAtIndex) + mentionText + ' ' + afterCursor;
    setText(newText);

    // Add to Weighted Mentions with MAX score (10)
    if (!weightedMentions.some((m) => m.id === node.id)) {
      setWeightedMentions((prev) => [...prev, { id: node.id, score: 10 }]);
    }

    setAtMenu(null);
    setTimeout(() => {
      textareaRef.current?.focus();
      // Move cursor after the inserted mention + space
      const newPos = lastAtIndex + mentionText.length + 1;
      textareaRef.current?.setSelectionRange(newPos, newPos);
    }, 0);
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      if (isExpanded) {
        textareaRef.current.style.height = '100%';
      } else {
        const newHeight = Math.min(textareaRef.current.scrollHeight, 200);
        textareaRef.current.style.height = `${Math.max(newHeight, 52)}px`;
      }
    }
  }, [text, isExpanded]);

  const isCenter = variant === 'center';
  const toggleExpand = () => setIsExpanded(!isExpanded);

  const suggestions = useMemo(() => {
    if (!atMenu) return [];
    const q = atMenu.query.replace(/_/g, ' ').toLowerCase();
    const allItems = Object.values(registry) as NexusObject[];

    // Compute basic seniority (depth)
    const parentMap: Record<string, string[]> = {};
    allItems.forEach((obj) => {
      if (isContainer(obj)) {
        obj.children_ids.forEach((cid) => {
          if (!parentMap[cid]) parentMap[cid] = [];
          parentMap[cid].push(obj.id);
        });
      }
    });

    const getDepth = (id: string, visited = new Set<string>()): number => {
      if (visited.has(id)) return 999;
      visited.add(id);
      const parents = parentMap[id] || [];
      if (parents.length === 0) return 0;
      return 1 + Math.min(...parents.map((p) => getDepth(p, new Set(visited))));
    };

    const filtered = allItems
      .filter((n) => !isLink(n) && (n as SimpleNote).title?.toLowerCase().includes(q))
      .map((n) => ({ node: n as SimpleNote, depth: getDepth(n.id) }));

    // Prioritize lower depth (most senior parents)
    return filtered
      .sort((a, b) => a.depth - b.depth)
      .map((f) => f.node)
      .slice(0, 15);
  }, [atMenu, registry]);

  const registrySize = useMemo(
    () => (Object.values(registry) as NexusObject[]).filter((o) => !isLink(o)).length,
    [registry],
  );

  return (
    // ... (imports remain)

    // Inside the component return:
    <div
      className={`
            shrink-0 transition-all duration-500 ease-out w-full
            ${isExpanded ? 'fixed inset-0 bg-nexus-950/95 backdrop-blur-3xl flex items-center justify-center p-8 md:p-16 z-[100]' : 'z-40 relative'}
        `}
    >
      {/* Mention Menu */}
      {atMenu && suggestions.length > 0 && (
        <div
          className={`absolute bottom-full left-0 mb-6 w-full max-w-lg bg-nexus-900 border border-nexus-700 rounded-[40px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.7)] overflow-hidden backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-300 z-[110] ${isExpanded ? 'ml-0' : ''}`}
        >
          <div className="px-8 py-5 border-b border-nexus-800 flex items-center justify-between bg-nexus-950/40">
            <span className="text-xs md:text-[11px] font-display font-black text-nexus-accent uppercase tracking-[0.25em] flex items-center gap-3">
              <Sparkles size={16} /> NEURAL REGISTRY SCRY
            </span>
            <button
              onClick={() => setAtMenu(null)}
              className="p-2 rounded-full hover:bg-white/5 text-nexus-muted hover:text-nexus-text transition-all"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-4 space-y-2 max-h-[450px] overflow-y-auto no-scrollbar">
            {suggestions.map((n) => {
              const node = n as SimpleNote;
              return (
                <button
                  key={node.id}
                  onClick={() => insertMention(node)}
                  className="w-full flex items-center gap-5 px-6 py-4 rounded-[28px] hover:bg-nexus-accent hover:text-white transition-all group text-left border border-transparent hover:border-white/20"
                >
                  <div className="w-12 h-12 rounded-2xl bg-nexus-900 border border-nexus-800 flex items-center justify-center text-[12px] font-black text-nexus-accent group-hover:bg-white group-hover:text-nexus-accent transition-all shadow-sm">
                    {node.category_id?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-black truncate leading-tight">{node.title}</div>
                    <div className="text-[10px] opacity-50 uppercase font-mono font-bold tracking-widest mt-0.5">
                      {node.category_id}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div
        className={`
                relative flex flex-col transition-all duration-300 group pointer-events-auto
                ${
                  isExpanded
                    ? 'w-full max-w-5xl h-[75vh] bg-nexus-900 rounded-[56px] border border-nexus-700 shadow-[0_100px_200px_-50px_rgba(0,0,0,0.8)] overflow-hidden'
                    : isCenter
                      ? 'mx-auto max-w-3xl bg-nexus-900 rounded-[40px] shadow-2xl border border-nexus-800 p-3'
                      : 'mx-auto w-full bg-nexus-900 rounded-[32px] border border-nexus-800 shadow-xl ring-1 ring-nexus-text/5 hover:ring-nexus-accent/20'
                }
            `}
      >
        {/* Context Pills Area */}
        {weightedMentions.length > 0 && (
          <div
            className={`px-10 pt-8 pb-2 flex flex-wrap gap-4 transition-all ${isExpanded ? 'px-14' : ''}`}
          >
            {weightedMentions.map((unit) => (
              <ContextPill
                key={unit.id}
                unit={unit}
                registry={registry}
                onUpdate={handleUpdateMention}
                onRemove={() =>
                  handleRemoveMention(unit.id, (registry[unit.id] as SimpleNote)?.title)
                }
              />
            ))}
          </div>
        )}

        <div className={`w-full flex-1 min-h-0 ${isExpanded ? 'p-14 pb-0' : 'px-10 pt-6 pb-4'}`}>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              detectAtTrigger(e.target.value, e.target.selectionStart);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Manifest your reality... (Use @ to scry registry)"
            className={`
                            w-full bg-transparent border-none focus:ring-0 focus:outline-none resize-none no-scrollbar
                            text-nexus-text placeholder-nexus-muted font-normal leading-relaxed
                            ${isExpanded ? 'h-full text-3xl font-serif italic' : 'min-h-[64px] text-[20px]'}
                        `}
            rows={1}
          />
        </div>

        <div
          className={`flex items-center justify-between ${isExpanded ? 'px-8 pb-8 pt-4' : 'px-5 pb-4 pt-1'}`}
        >
          <div className="flex items-center gap-3">
            <button className="p-3 md:p-2 rounded-xl text-nexus-muted hover:text-nexus-text hover:bg-nexus-800 transition-all">
              <Plus size={18} />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowContextOverlay(!showContextOverlay)}
                className={`flex items-center gap-2 transition-all p-3 md:py-2 md:px-4 rounded-xl text-xs md:text-[10px] font-display font-black uppercase tracking-widest ${showContextOverlay ? 'bg-nexus-accent text-white' : 'text-nexus-muted hover:text-nexus-accent hover:bg-nexus-800'}`}
              >
                <StickyNote size={14} />
                <span>Memory: {registrySize} Units</span>
              </button>

              {showContextOverlay && (
                <div className="absolute bottom-full left-0 mb-4 w-64 bg-nexus-900 border border-nexus-800 rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <Database size={16} className="text-nexus-accent" />
                    <h4 className="text-xs md:text-[10px] font-black uppercase tracking-widest">
                      Active Scry Context
                    </h4>
                  </div>
                  <p className="text-[11px] text-nexus-muted leading-relaxed font-serif italic">
                    The synthesis engine is currently aware of all{' '}
                    <span className="text-nexus-accent font-bold">{registrySize} units</span> in
                    your global registry. Mention them by name or use @ to trigger specific scrying.
                  </p>
                  <button
                    onClick={() => setShowContextOverlay(false)}
                    className="w-full mt-4 py-2 rounded-xl bg-nexus-800 text-[9px] font-black uppercase tracking-widest hover:bg-nexus-700"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {text.length > 0 && (
              <button
                onClick={handleSend}
                disabled={isLoading}
                className={`
                                    flex items-center justify-center w-12 h-12 md:w-10 md:h-10 rounded-full transition-all
                                    ${
                                      !isLoading
                                        ? 'bg-nexus-accent text-white hover:bg-nexus-text hover:scale-105 active:scale-95 shadow-lg shadow-nexus-accent/20'
                                        : 'bg-nexus-800 text-nexus-muted cursor-not-allowed'
                                    }
                                `}
              >
                {isLoading ? (
                  <RotateCw size={18} className="animate-spin" />
                ) : (
                  <ArrowUp size={20} />
                )}
              </button>
            )}
          </div>
        </div>

        {text.length > 0 && (
          <button
            onClick={toggleExpand}
            className="absolute top-4 right-4 text-nexus-muted hover:text-nexus-text p-2 rounded-xl hover:bg-nexus-800 transition-all"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        )}
      </div>
    </div>
  );
};
