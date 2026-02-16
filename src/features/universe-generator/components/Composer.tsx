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
    if (title) {
      const mentionText = `[[${title}]]`;
      if (text.includes(mentionText)) {
        setText(text.replace(mentionText, ''));
      }
    }
  };

  useEffect(() => {
    if (weightedMentions.length === 0) return;

    const activeTitlesInText = new Set<string>();
    const matches = text.match(/\[\[(.*?)\]\]/g);
    if (matches) {
      matches.forEach((m) => activeTitlesInText.add(m.slice(2, -2)));
    }

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (atMenu) {
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

    const mentionText = `[[${node.title}]]`;
    const newText = beforeCursor.slice(0, lastAtIndex) + mentionText + ' ' + afterCursor;
    setText(newText);

    if (!weightedMentions.some((m) => m.id === node.id)) {
      setWeightedMentions((prev) => [...prev, { id: node.id, score: 10 }]);
    }

    setAtMenu(null);
    setTimeout(() => {
      textareaRef.current?.focus();
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
        textareaRef.current.style.height = `${Math.max(newHeight, 36)}px`;
      }
    }
  }, [text, isExpanded]);

  const isCenter = variant === 'center';
  const toggleExpand = () => setIsExpanded(!isExpanded);

  const suggestions = useMemo(() => {
    if (!atMenu) return [];
    const q = atMenu.query.replace(/_/g, ' ').toLowerCase();
    const allItems = Object.values(registry) as NexusObject[];

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
    <div
      className={`
            shrink-0 transition-all duration-500 ease-out w-full
            ${isExpanded ? 'fixed inset-0 bg-nexus-950/95 backdrop-blur-3xl flex items-center justify-center p-8 md:p-16 z-[100]' : 'z-40 relative'}
        `}
    >
      {/* Mention Menu - Compact */}
      {atMenu && suggestions.length > 0 && (
        <div
          className={`absolute bottom-full left-0 mb-3 w-full max-w-md bg-nexus-900/95 backdrop-blur-xl border border-nexus-700/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 z-[110]`}
        >
          <div className="px-4 py-3 border-b border-nexus-800/50 flex items-center justify-between bg-nexus-950/40">
            <span className="text-[9px] font-display font-black text-nexus-accent uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={12} /> Registry Search
            </span>
            <button
              onClick={() => setAtMenu(null)}
              className="p-1 rounded-lg hover:bg-nexus-800/50 text-nexus-muted hover:text-nexus-text transition-all"
            >
              <X size={14} />
            </button>
          </div>
          <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto no-scrollbar">
            {suggestions.map((n) => {
              const node = n as SimpleNote;
              return (
                <button
                  key={node.id}
                  onClick={() => insertMention(node)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-nexus-accent hover:text-white transition-all group text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-nexus-900 border border-nexus-800 flex items-center justify-center text-[9px] font-black text-nexus-accent group-hover:bg-white group-hover:text-nexus-accent transition-all">
                    {node.category_id?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate leading-tight">{node.title}</div>
                    <div className="text-[8px] opacity-50 uppercase font-mono font-bold tracking-wider mt-0.5">
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
                      ? 'mx-auto max-w-3xl bg-nexus-900/80 backdrop-blur-sm rounded-3xl shadow-xl border border-nexus-800/50 p-2'
                      : 'mx-auto w-full max-w-3xl bg-nexus-900/80 backdrop-blur-sm rounded-2xl border border-nexus-800/50 shadow-lg hover:border-nexus-700/50 transition-all'
                }
            `}
      >
        {/* Context Pills - Compact */}
        {weightedMentions.length > 0 && (
          <div
            className={`px-4 pt-3 pb-1 flex flex-wrap gap-2 transition-all ${isExpanded ? 'px-8 pt-6' : ''}`}
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

        <div className={`w-full flex-1 min-h-0 ${isExpanded ? 'p-10' : 'px-3 pt-2 pb-1.5'}`}>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              detectAtTrigger(e.target.value, e.target.selectionStart);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Message AI... (Use @ for registry)"
            className={`
                            w-full bg-transparent border-none focus:ring-0 focus:outline-none resize-none no-scrollbar
                            text-nexus-text placeholder-nexus-muted/50 font-normal leading-relaxed
                            ${isExpanded ? 'h-full text-2xl font-serif italic' : 'min-h-[36px] text-[14px]'}
                        `}
            rows={1}
          />
        </div>

        <div
          className={`flex items-center justify-between ${isExpanded ? 'px-8 pb-8 pt-3' : 'px-3 pb-2 pt-1'}`}
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowContextOverlay(!showContextOverlay)}
                className={`flex items-center gap-1.5 transition-all p-2 rounded-lg text-[8px] font-display font-black uppercase tracking-wider ${showContextOverlay ? 'bg-nexus-accent text-white' : 'text-nexus-muted hover:text-nexus-accent hover:bg-nexus-800/50'}`}
              >
                <StickyNote size={12} />
                <span className="hidden sm:inline">{registrySize}</span>
              </button>

              {showContextOverlay && (
                <div className="absolute bottom-full left-0 mb-2 w-56 bg-nexus-900/95 backdrop-blur-xl border border-nexus-800 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-2 duration-200 z-50">
                  <div className="flex items-center gap-2 mb-3">
                    <Database size={14} className="text-nexus-accent" />
                    <h4 className="text-[9px] font-black uppercase tracking-wider">
                      Memory Context
                    </h4>
                  </div>
                  <p className="text-[10px] text-nexus-muted leading-relaxed">
                    AI aware of <span className="text-nexus-accent font-bold">{registrySize}</span>{' '}
                    registry units. Use @ to reference specific entities.
                  </p>
                  <button
                    onClick={() => setShowContextOverlay(false)}
                    className="w-full mt-3 py-1.5 rounded-lg bg-nexus-800 text-[8px] font-black uppercase tracking-wider hover:bg-nexus-700 transition-all"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {text.length > 0 && (
              <button
                onClick={handleSend}
                disabled={isLoading}
                className={`
                                    flex items-center justify-center w-9 h-9 rounded-full transition-all
                                    ${
                                      !isLoading
                                        ? 'bg-nexus-accent text-white hover:brightness-110 hover:scale-105 active:scale-95 shadow-lg shadow-nexus-accent/20'
                                        : 'bg-nexus-800 text-nexus-muted cursor-not-allowed'
                                    }
                                `}
              >
                {isLoading ? (
                  <RotateCw size={16} className="animate-spin" />
                ) : (
                  <ArrowUp size={16} />
                )}
              </button>
            )}
          </div>
        </div>

        {text.length > 0 && !isExpanded && (
          <button
            onClick={toggleExpand}
            className="absolute top-2 right-2 text-nexus-muted hover:text-nexus-text p-1.5 rounded-lg hover:bg-nexus-800/50 transition-all opacity-0 group-hover:opacity-100"
            title="Expand"
          >
            <Maximize2 size={12} />
          </button>
        )}

        {isExpanded && (
          <button
            onClick={toggleExpand}
            className="absolute top-4 right-4 text-nexus-muted hover:text-nexus-text p-2 rounded-xl hover:bg-nexus-800 transition-all"
            title="Collapse"
          >
            <Minimize2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
};
