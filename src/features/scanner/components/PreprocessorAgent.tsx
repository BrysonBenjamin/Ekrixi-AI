import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  Plus,
  X,
  List,
  ChevronRight,
  AtSign,
  Target,
  MousePointer2,
  Wand2,
  Database,
  Hash,
  UserCircle2,
  Trash2,
  RotateCw,
  Repeat,
  Check,
  MousePointerClick,
  ArrowLeft,
  Calendar,
  History,
  Link,
  Unlink,
} from 'lucide-react';
import { EntitySeed } from '../ScannerFeature';
import { NexusCategory, NexusObject, SimpleNote } from '../../../types';
import { generateId } from '../../../utils/ids';
import { useLLM } from '../../system/hooks/useLLM';
import { GEMINI_MODELS } from '../../../core/llm';
import { safeParseJson } from '../../../utils/json';
import { TimeDimensionService } from '../../../core/services/TimeDimensionService';

interface PreprocessorAgentProps {
  text: string;
  registry?: Record<string, NexusObject>;
  onFinalize: (seeds: EntitySeed[]) => void;
  onCancel: () => void;
}

export const PreprocessorAgent: React.FC<PreprocessorAgentProps> = ({
  text,
  registry = {},
  onFinalize,
  onCancel,
}) => {
  const { generateContent, isReady } = useLLM();
  const [seeds, setSeeds] = useState<EntitySeed[]>([]);
  const [activeSeedId, setActiveSeedId] = useState<string | null>(null);
  const [highlights, setHighlights] = useState<Array<{ text: string; type: string }>>([]);
  const [isAkaMode, setIsAkaMode] = useState(false);
  const [isExpanding, setIsExpanding] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [manualAliasInput, setManualAliasInput] = useState('');
  const [selectionMenu, setSelectionMenu] = useState<{ x: number; y: number; text: string } | null>(
    null,
  );

  // Time Inherited Nodes Logic
  const [potentialBaseNode, setPotentialBaseNode] = useState<SimpleNote | null>(null);

  const workbenchRef = useRef<HTMLDivElement>(null);

  // Initial detection pass
  useEffect(() => {
    const detectInitial = async () => {
      if (!isReady || !text) return;

      try {
        const response = await generateContent({
          model: GEMINI_MODELS.FLASH,
          systemInstruction:
            'Identify ALL common nouns and proper nouns in the text. Return a JSON list of strings.',
          generationConfig: {
            responseMimeType: 'application/json',
          },
          contents: [{ role: 'user', parts: [{ text: text.slice(0, 20000) }] }],
        });
        try {
          const result = await response.response;
          const entities = safeParseJson(result.text() || '[]', []);
          if (Array.isArray(entities)) {
            console.log('Scanner detected entities:', entities);
            setHighlights(entities.map((e: string) => ({ text: String(e), type: 'CANDIDATE' })));
          } else {
            console.error('Scanner failed to parse entities array:', entities);
          }
        } catch (e) {
          console.error('Malformed entities JSON', e);
        }
      } catch (err) {
        console.error('Initial detection failed', err);
      } finally {
        setIsLoading(false);
      }
    };
    detectInitial();
  }, [text, isReady, generateContent]);

  const activeSeed = useMemo(() => seeds.find((s) => s.id === activeSeedId), [seeds, activeSeedId]);

  // Check for existing Base Node when active seed title changes
  useEffect(() => {
    if (activeSeed && registry) {
      const base = TimeDimensionService.findBaseNode(registry, activeSeed.title);
      setPotentialBaseNode(base);
    } else {
      setPotentialBaseNode(null);
    }
  }, [activeSeed?.title, registry]);

  const handleTextClick = (entityText: string) => {
    if (isAkaMode && activeSeedId) {
      setSeeds((prev) =>
        prev.map((s) =>
          s.id === activeSeedId
            ? { ...s, aliases: Array.from(new Set([...s.aliases, entityText])) }
            : s,
        ),
      );
      return;
    }

    const existing = seeds.find((s) => s.title.toLowerCase() === entityText.toLowerCase());
    if (existing) {
      setActiveSeedId(existing.id);
    } else {
      createAnchor(entityText);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    if (selectedText && selectedText.length > 1) {
      setSelectionMenu({
        x: e.clientX,
        y: e.clientY,
        text: selectedText,
      });
    } else {
      setSelectionMenu(null);
    }
  };

  const createAnchor = (title: string) => {
    const newSeed: EntitySeed = {
      id: generateId(),
      title: title,
      aliases: [],
      gist: '',
      category: NexusCategory.CONCEPT,
      isManual: true,
      isAuthorNote: false,
      suggestedChildren: [],
    };
    setSeeds((prev) => [...prev, newSeed]);
    setActiveSeedId(newSeed.id);
    setSelectionMenu(null);
  };

  const addAsAlias = (title: string) => {
    if (!activeSeedId) return;
    setSeeds((prev) =>
      prev.map((s) =>
        s.id === activeSeedId ? { ...s, aliases: Array.from(new Set([...s.aliases, title])) } : s,
      ),
    );
    setSelectionMenu(null);
  };

  const deleteSeed = (id: string) => {
    setSeeds((prev) => prev.filter((s) => s.id !== id));
    if (activeSeedId === id) setActiveSeedId(null);
  };

  const promoteAlias = (seedId: string, alias: string) => {
    setSeeds((prev) =>
      prev.map((s) => {
        if (s.id !== seedId) return s;
        const oldTitle = s.title;
        return {
          ...s,
          title: alias,
          aliases: Array.from(new Set([...s.aliases.filter((a) => a !== alias), oldTitle])),
        };
      }),
    );
  };

  const addManualAlias = () => {
    if (!activeSeedId || !manualAliasInput.trim()) return;
    setSeeds((prev) =>
      prev.map((s) =>
        s.id === activeSeedId
          ? { ...s, aliases: Array.from(new Set([...s.aliases, manualAliasInput.trim()])) }
          : s,
      ),
    );
    setManualAliasInput('');
  };

  const handleExpansion = async (seedId: string) => {
    const target = seeds.find((s) => s.id === seedId);
    if (!target) return;
    setIsExpanding(seedId);
    try {
      const response = await generateContent({
        model: GEMINI_MODELS.FLASH,
        systemInstruction: `Suggest organizational sub-containers for "${target.title}". 
                - FOCUS ON CONTAINERS: Large subfolders for hierarchy.
                - MANDATORY: Include one 'Author's Note' (isAuthorNote: true).
                - Return JSON list of {title, category, gist, isAuthorNote}.`,
        generationConfig: {
          responseMimeType: 'application/json',
        },
        contents: [
          { role: 'user', parts: [{ text: `Original Context Fragment: ${text.slice(0, 5000)}` }] },
        ],
      });
      try {
        const result = await response.response;
        const suggestions = safeParseJson(result.text() || '[]', []);
        if (Array.isArray(suggestions)) {
          const sanitized = suggestions.map(
            (s: {
              title: string;
              category?: NexusCategory;
              gist: string;
              isAuthorNote?: boolean;
            }) => ({
              ...s,
              category: s.category || NexusCategory.CONCEPT,
              isAuthorNote: !!s.isAuthorNote,
            }),
          );
          setSeeds((prev) =>
            prev.map((s) => (s.id === seedId ? { ...s, suggestedChildren: sanitized } : s)),
          );
        }
      } catch (e) {
        console.error('Malformed expansion suggestions JSON', e);
      }
    } catch (err) {
      console.error('Expansion failed', err);
    } finally {
      setIsExpanding(null);
    }
  };

  const updateSeed = (id: string, updates: Partial<EntitySeed>) => {
    setSeeds((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const attachTimeState = (seedId: string, baseId: string, baseTitle: string, year: number) => {
    updateSeed(seedId, {
      timeData: {
        baseId,
        baseTitle,
        year,
      },
    });
  };

  const detachTimeState = (seedId: string) => {
    updateSeed(seedId, { timeData: undefined });
  };

  const removeSuggestion = (seedId: string, index: number) => {
    setSeeds((prev) =>
      prev.map((s) => {
        if (s.id !== seedId) return s;
        const next = [...s.suggestedChildren];
        next.splice(index, 1);
        return { ...s, suggestedChildren: next };
      }),
    );
  };

  const renderTextWithHighlights = () => {
    const sortedHighlights = [...highlights].sort((a, b) => b.text.length - a.text.length);
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    const regexString =
      sortedHighlights.length > 0
        ? `(${sortedHighlights.map((h) => h.text.replace(new RegExp('[-/\\\\^$*+?.()|[\\]{}]', 'g'), '\\$&')).join('|')})`
        : null;

    if (!regexString) return [text];

    const regex = new RegExp(regexString, 'gi');
    const matches = [...text.matchAll(regex)];

    matches.forEach((match, i) => {
      const index = match.index!;
      const matchText = match[0];
      parts.push(text.slice(lastIndex, index));
      const isSeeded = seeds.some((s) => s.title.toLowerCase() === matchText.toLowerCase());
      const isAliasOfActive = activeSeed?.aliases.some(
        (a) => a.toLowerCase() === matchText.toLowerCase(),
      );

      parts.push(
        <span
          key={i}
          onClick={() => handleTextClick(matchText)}
          className={`
                        cursor-pointer transition-all px-1.5 py-0.5 rounded font-bold border-b-2
                        ${
                          isAliasOfActive
                            ? 'bg-nexus-arcane/20 border-nexus-arcane text-nexus-text shadow-[0_0_10px_var(--arcane-color)]'
                            : isSeeded
                              ? 'bg-nexus-accent/20 border-nexus-accent text-nexus-text shadow-[0_0_10px_var(--glow-color)]'
                              : 'border-nexus-700/50 text-nexus-text/80 hover:bg-nexus-800/40'
                        }
                        ${isAkaMode ? 'ring-2 ring-nexus-arcane ring-offset-2 ring-offset-nexus-950 scale-105' : ''}
                    `}
        >
          {matchText}
        </span>,
      );
      lastIndex = index + matchText.length;
    });
    parts.push(text.slice(lastIndex));
    return parts;
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full overflow-hidden bg-nexus-950 animate-in fade-in duration-500 relative">
      {/* Selection Tooltip */}
      {selectionMenu && (
        <div
          className="fixed z-[1000] bg-nexus-900 border border-nexus-700 rounded-2xl p-1 shadow-2xl flex items-center gap-1 animate-in zoom-in-95"
          style={{ left: selectionMenu.x, top: selectionMenu.y - 60 }}
        >
          <button
            onClick={() => createAnchor(selectionMenu.text)}
            className="px-4 py-2 hover:bg-nexus-accent hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2"
          >
            <Plus size={14} /> New Anchor
          </button>
          {activeSeedId && (
            <>
              <div className="w-px h-6 bg-nexus-800" />
              <button
                onClick={() => addAsAlias(selectionMenu.text)}
                className="px-4 py-2 hover:bg-nexus-arcane hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2"
              >
                <AtSign size={14} /> Add as AKA
              </button>
            </>
          )}
        </div>
      )}

      {/* Left Column: The Manifest */}
      <div
        className="flex-1 overflow-y-auto no-scrollbar border-r border-nexus-800 p-8 md:p-12 relative"
        onMouseUp={handleMouseUp}
      >
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3 opacity-60">
              <List size={16} className="text-nexus-accent" />
              <span className="text-[10px] font-display font-black uppercase tracking-[0.4em] text-nexus-muted">
                The Manifest // Extraction Focus
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-[10px] font-mono text-nexus-muted uppercase tracking-widest bg-nexus-900 border border-nexus-800 px-4 py-2 rounded-xl">
                Select text to anchor concepts
              </div>
            </div>
          </div>

          <div
            className={`prose max-w-none text-xl leading-[1.8] font-serif text-nexus-text select-text whitespace-pre-wrap transition-all ${isAkaMode ? 'cursor-crosshair' : ''}`}
          >
            {isLoading ? (
              <div className="animate-pulse flex flex-col gap-6">
                <div className="h-6 bg-nexus-800 rounded w-full"></div>
                <div className="h-6 bg-nexus-800 rounded w-5/6"></div>
                <div className="h-6 bg-nexus-800 rounded w-full"></div>
              </div>
            ) : (
              renderTextWithHighlights()
            )}
          </div>
        </div>
      </div>

      {/* Right Column: The Workbench */}
      <aside className="w-[500px] bg-nexus-900 border-l border-nexus-800 flex flex-col relative shrink-0 shadow-[-10px_0_30px_var(--shadow-color)] z-40">
        <header className="h-16 border-b border-nexus-800 flex items-center px-6 justify-between shrink-0 bg-nexus-900/80 backdrop-blur-xl z-20">
          <div className="flex items-center gap-2">
            {activeSeedId ? (
              <button
                onClick={() => setActiveSeedId(null)}
                className="p-2 -ml-2 text-nexus-muted hover:text-nexus-accent transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
            ) : (
              <Wand2 size={16} className="text-nexus-accent" />
            )}
            <span className="text-[11px] font-display font-black uppercase tracking-widest text-nexus-muted">
              {activeSeedId ? 'Anchor Refinement' : 'Concept Forge'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-nexus-accent bg-nexus-accent/5 px-3 py-1 rounded-full border border-nexus-accent/20 font-bold uppercase tracking-tighter">
              {seeds.length} Anchors
            </span>
          </div>
        </header>

        <div
          ref={workbenchRef}
          className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8 relative"
        >
          {activeSeed ? (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              {/* Parent Anchor Editor */}
              <div
                className={`bg-nexus-800/40 border rounded-[32px] p-8 shadow-xl relative overflow-hidden group transition-all duration-500 
                ${activeSeed.timeData ? 'border-indigo-500/40 bg-indigo-500/5' : activeSeed.isAuthorNote ? 'border-amber-500/40 bg-amber-500/5' : 'border-nexus-700'}`}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-3 rounded-2xl border transition-all 
                        ${
                          activeSeed.timeData
                            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-500'
                            : activeSeed.isAuthorNote
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                              : 'bg-nexus-accent/10 border-nexus-accent/30 text-nexus-accent'
                        }`}
                    >
                      {activeSeed.timeData ? (
                        <History size={20} />
                      ) : activeSeed.isAuthorNote ? (
                        <UserCircle2 size={20} />
                      ) : (
                        <Target size={20} />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-display font-black text-nexus-text uppercase tracking-wider">
                        {activeSeed.timeData
                          ? 'Time State'
                          : activeSeed.isAuthorNote
                            ? 'Meta Anchor'
                            : 'Primary Anchor'}
                      </h3>
                      <p className="text-[9px] text-nexus-muted font-mono uppercase tracking-widest">
                        SEED_ID: {activeSeed.id.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => deleteSeed(activeSeed.id)}
                      className="p-2 text-nexus-muted hover:text-red-500 transition-colors bg-nexus-900 border border-nexus-800 rounded-xl"
                      title="Delete Anchor"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      onClick={() => setActiveSeedId(null)}
                      className="p-2 bg-nexus-accent text-white rounded-xl shadow-lg shadow-nexus-accent/20 transition-all hover:scale-105 active:scale-95"
                      title="Done Refining"
                    >
                      <Check size={18} />
                    </button>
                  </div>
                </div>

                {/* Time Node Attachment Banner */}
                {potentialBaseNode && !activeSeed.timeData && (
                  <div className="mb-6 p-4 bg-indigo-900/40 border border-indigo-500/30 rounded-2xl animate-in slide-in-from-top-2">
                    <div className="flex items-start gap-3">
                      <Sparkles className="text-indigo-400 shrink-0 mt-0.5" size={16} />
                      <div className="flex-1">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-1">
                          Soul Detected
                        </h4>
                        <p className="text-[11px] text-indigo-100/80 mb-3">
                          "<strong>{potentialBaseNode.title}</strong>" already exists in the Nexus.
                          Would you like to attach this as a historical state (Skin) instead of
                          creating a new concept?
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <Calendar
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300"
                              size={12}
                            />
                            <input
                              type="number"
                              placeholder="Year"
                              className="w-24 bg-indigo-950/50 border border-indigo-500/30 rounded-lg pl-8 pr-2 py-1.5 text-xs text-indigo-100 placeholder:text-indigo-400/50 outline-none focus:border-indigo-400"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const val = parseInt(e.currentTarget.value);
                                  if (!isNaN(val)) {
                                    attachTimeState(
                                      activeSeed.id,
                                      potentialBaseNode.id,
                                      potentialBaseNode.title,
                                      val,
                                    );
                                  }
                                }
                              }}
                              onBlur={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val)) {
                                  attachTimeState(
                                    activeSeed.id,
                                    potentialBaseNode.id,
                                    potentialBaseNode.title,
                                    val,
                                  );
                                }
                              }}
                            />
                          </div>
                          <button
                            className="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors border border-indigo-500/30"
                            onClick={(e) => {
                              // Focus the input instead? or just default to current year?
                              // For now, let's just default to current year if clicked directly
                              attachTimeState(
                                activeSeed.id,
                                potentialBaseNode.id,
                                potentialBaseNode.title,
                                new Date().getFullYear(),
                              );
                            }}
                          >
                            Link to Timeline
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeSeed.timeData && (
                  <div className="mb-6 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Link size={16} className="text-indigo-400" />
                      <div>
                        <div className="text-[9px] font-black uppercase tracking-widest text-indigo-300">
                          Linked to Soul
                        </div>
                        <div className="text-xs font-bold text-indigo-100">
                          {activeSeed.timeData.baseTitle} (Year {activeSeed.timeData.year})
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => detachTimeState(activeSeed.id)}
                      className="p-1.5 text-indigo-300 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Unlink Time State"
                    >
                      <Unlink size={16} />
                    </button>
                  </div>
                )}

                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-display font-black text-nexus-muted uppercase tracking-widest ml-1">
                      Title
                    </label>
                    <input
                      value={activeSeed.title}
                      onChange={(e) => updateSeed(activeSeed.id, { title: e.target.value })}
                      className="w-full bg-nexus-950 border border-nexus-700 rounded-xl px-4 py-3 text-sm font-bold text-nexus-text focus:border-nexus-accent outline-none shadow-sm transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-display font-black text-nexus-muted uppercase tracking-widest ml-1">
                        Type
                      </label>
                      <div className="relative">
                        <select
                          value={activeSeed.category}
                          onChange={(e) =>
                            updateSeed(activeSeed.id, { category: e.target.value as NexusCategory })
                          }
                          className="w-full bg-nexus-950 border border-nexus-700 rounded-xl px-4 py-3 text-[10px] font-black uppercase text-nexus-text focus:border-nexus-accent outline-none appearance-none cursor-pointer tracking-widest"
                        >
                          {Object.values(NexusCategory).map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        <ChevronRight
                          size={12}
                          className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-nexus-muted pointer-events-none"
                        />
                      </div>
                    </div>
                    <div className="flex items-end pb-0">
                      <button
                        onClick={() =>
                          updateSeed(activeSeed.id, { isAuthorNote: !activeSeed.isAuthorNote })
                        }
                        className={`w-full py-3 rounded-xl border transition-all text-[9px] font-black uppercase tracking-widest h-[46px] ${activeSeed.isAuthorNote ? 'bg-amber-500 text-black border-amber-500' : 'text-nexus-muted border-nexus-700 hover:text-nexus-text hover:bg-nexus-800'}`}
                      >
                        {activeSeed.isAuthorNote ? 'Meta Active' : 'Meta Mode'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-[9px] font-display font-black text-nexus-muted uppercase tracking-widest">
                        Aliases (AKA)
                      </label>
                      <button
                        onClick={() => setIsAkaMode(!isAkaMode)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-[9px] font-black uppercase transition-all shadow-sm ${isAkaMode ? 'bg-nexus-arcane text-white border-nexus-arcane' : 'bg-nexus-950 text-nexus-muted border-nexus-800 hover:text-nexus-arcane hover:border-nexus-arcane'}`}
                      >
                        {isAkaMode ? <MousePointerClick size={12} /> : <Plus size={12} />}
                        {isAkaMode ? 'Selecting...' : 'Text Scry'}
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <AtSign
                            size={12}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-nexus-muted"
                          />
                          <input
                            value={manualAliasInput}
                            onChange={(e) => setManualAliasInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addManualAlias()}
                            placeholder="Manual entry..."
                            className="w-full bg-nexus-950 border border-nexus-800 rounded-xl pl-10 pr-4 py-3 text-xs font-medium text-nexus-text focus:border-nexus-arcane outline-none shadow-inner"
                          />
                        </div>
                        <button
                          onClick={addManualAlias}
                          className="p-3 bg-nexus-800 border border-nexus-700 rounded-xl text-nexus-muted hover:text-nexus-arcane hover:bg-nexus-arcane/10 transition-all shadow-sm"
                        >
                          <Check size={16} />
                        </button>
                      </div>
                      <div className="min-h-[60px] w-full bg-nexus-950 border border-nexus-700 rounded-2xl px-4 py-3 flex flex-wrap gap-2 shadow-inner">
                        {activeSeed.aliases.map((alias) => (
                          <div
                            key={alias}
                            className="flex items-center gap-2 px-3 py-1.5 bg-nexus-900 border border-nexus-800 rounded-xl text-[10px] font-bold text-nexus-arcane group transition-all hover:border-nexus-arcane/40"
                          >
                            <span className="max-w-[120px] truncate">{alias}</span>
                            <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-nexus-800">
                              <button
                                onClick={() => promoteAlias(activeSeed.id, alias)}
                                className="text-nexus-muted hover:text-nexus-accent transition-colors"
                                title="Promote to Primary Title"
                              >
                                <Repeat size={12} />
                              </button>
                              <button
                                onClick={() =>
                                  updateSeed(activeSeed.id, {
                                    aliases: activeSeed.aliases.filter((a) => a !== alias),
                                  })
                                }
                                className="text-nexus-muted hover:text-red-500"
                                title="Remove Alias"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                        {activeSeed.aliases.length === 0 && !isAkaMode && (
                          <span className="text-[10px] text-nexus-muted/40 italic p-1">
                            No aliases. Select text or type above.
                          </span>
                        )}
                        {isAkaMode && (
                          <span className="text-[10px] text-nexus-arcane font-black animate-pulse uppercase tracking-widest p-1">
                            Scrying from text...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-display font-black text-nexus-muted uppercase tracking-widest ml-1">
                      Abstract (Gist)
                    </label>
                    <textarea
                      value={activeSeed.gist}
                      onChange={(e) => updateSeed(activeSeed.id, { gist: e.target.value })}
                      placeholder="Establish core essence..."
                      className="w-full h-24 bg-nexus-950 border border-nexus-700 rounded-xl p-4 text-xs text-nexus-text/90 focus:border-nexus-accent outline-none resize-none no-scrollbar font-serif leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              {/* Logical Expansion Matrix */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h4 className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.3em] flex items-center gap-3">
                    <Sparkles size={14} className="text-nexus-accent" /> Logical Hierarchy
                  </h4>
                  <button
                    onClick={() => handleExpansion(activeSeed.id)}
                    disabled={!!isExpanding}
                    className="flex items-center gap-2 px-3 py-1.5 bg-nexus-800 hover:bg-nexus-accent text-nexus-muted hover:text-white rounded-xl border border-nexus-700 transition-all text-[9px] font-black uppercase tracking-widest disabled:opacity-50"
                  >
                    {isExpanding ? (
                      <RotateCw className="animate-spin" size={12} />
                    ) : (
                      <Wand2 size={12} />
                    )}
                    Expand
                  </button>
                </div>

                <div className="space-y-4">
                  {(activeSeed.suggestedChildren || []).map((child, i) => (
                    <div
                      key={i}
                      className={`bg-nexus-800/40 border rounded-[28px] p-6 flex flex-col gap-4 group/child transition-all animate-in slide-in-from-bottom-2 ${child.isAuthorNote ? 'border-amber-500/20 bg-amber-500/5 shadow-sm' : 'border-nexus-800 hover:border-nexus-500/40'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {child.isAuthorNote ? (
                            <UserCircle2 size={16} className="text-amber-500 shrink-0" />
                          ) : (
                            <Hash size={16} className="text-nexus-500 shrink-0" />
                          )}
                          <input
                            value={child.title}
                            onChange={(e) => {
                              const next = [...activeSeed.suggestedChildren];
                              next[i].title = e.target.value;
                              updateSeed(activeSeed.id, { suggestedChildren: next });
                            }}
                            className="bg-transparent border-none p-0 text-sm font-bold text-nexus-text uppercase tracking-wider outline-none flex-1 truncate placeholder:text-nexus-muted/40"
                            placeholder="Child Title"
                          />
                        </div>
                        <button
                          onClick={() => removeSuggestion(activeSeed.id, i)}
                          className="p-1.5 text-nexus-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <textarea
                        value={child.gist}
                        placeholder="Establish essence..."
                        onChange={(e) => {
                          const next = [...activeSeed.suggestedChildren];
                          next[i].gist = e.target.value;
                          updateSeed(activeSeed.id, { suggestedChildren: next });
                        }}
                        className="bg-nexus-950/50 border border-nexus-800/50 rounded-xl p-3 text-[11px] italic text-nexus-muted outline-none w-full h-16 resize-none no-scrollbar font-serif transition-colors focus:border-nexus-accent/30"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setActiveSeedId(null)}
                className="w-full py-4 bg-nexus-800 text-nexus-text hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Return to Anchor List
              </button>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2 px-2 text-[9px] font-display font-black text-nexus-muted uppercase tracking-widest opacity-60 mb-4">
                  <Database size={10} /> Active Anchor Registry
                </div>

                {seeds.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-nexus-800 rounded-[32px] opacity-40">
                    <MousePointer2 size={32} className="mb-4 animate-pulse text-nexus-muted" />
                    <h3 className="text-[10px] font-display font-black uppercase tracking-[0.2em] text-nexus-text">
                      No Anchors Set
                    </h3>
                    <p className="text-[9px] font-serif italic mt-1">
                      Select text in the manifest to define concepts.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {seeds.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setActiveSeedId(s.id)}
                        className="flex items-center justify-between p-4 bg-nexus-800/40 border border-nexus-800 rounded-3xl hover:border-nexus-accent transition-all text-left group shadow-sm"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`p-2 rounded-xl border ${s.isAuthorNote ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-nexus-accent/10 border-nexus-accent/20 text-nexus-accent'}`}
                          >
                            {s.isAuthorNote ? <UserCircle2 size={16} /> : <Target size={16} />}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white uppercase tracking-tight truncate max-w-[200px]">
                              {s.title}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[8px] font-mono text-nexus-muted uppercase">
                                {s.category}
                              </span>
                              {s.aliases.length > 0 && (
                                <span className="text-[7px] bg-nexus-arcane/20 text-nexus-arcane px-1.5 py-0.5 rounded border border-nexus-arcane/30 font-black">
                                  +{s.aliases.length} AKA
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <ChevronRight
                          size={16}
                          className="text-nexus-muted group-hover:text-nexus-accent transition-transform group-hover:translate-x-1"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <footer className="p-8 border-t border-nexus-800 bg-nexus-900/95 backdrop-blur-xl shrink-0 z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.3)]">
          <div className="flex flex-col gap-4">
            {!activeSeedId && (
              <button
                onClick={() => onFinalize(seeds)}
                disabled={seeds.length === 0}
                className={`
                                    w-full py-6 rounded-[32px] font-display font-black text-xs uppercase tracking-[0.4em] flex items-center justify-center gap-4 transition-all
                                    ${
                                      seeds.length > 0
                                        ? 'bg-nexus-accent text-white shadow-2xl shadow-nexus-accent/20 hover:brightness-110 active:scale-95'
                                        : 'bg-nexus-800 text-nexus-muted cursor-not-allowed opacity-40 border border-nexus-700'
                                    }
                                `}
              >
                <Sparkles size={20} />
                Run Neural Extraction
              </button>
            )}
            <button
              onClick={onCancel}
              className="w-full py-3 rounded-2xl text-nexus-muted text-[10px] font-display font-black uppercase tracking-widest hover:text-red-500 transition-colors"
            >
              Abort Preprocessing
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
};
