import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, List, AtSign, Wand2, ArrowLeft } from 'lucide-react';
import { EntitySeed } from '../ScannerFeature';
import { NexusCategory } from '../../../types';
import { generateId } from '../../../utils/ids';
import { useLLM } from '../../system/hooks/useLLM';
import { GEMINI_MODELS } from '../../../core/llm';

interface PreprocessorAgentProps {
  text: string;
  onFinalize: (seeds: EntitySeed[]) => void;
  onCancel: () => void;
}

export const PreprocessorAgent: React.FC<PreprocessorAgentProps> = ({
  text,
  onFinalize,
  onCancel,
}) => {
  const { generateContent } = useLLM();
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

  const workbenchRef = useRef<HTMLDivElement>(null);

  // Initial detection pass
  useEffect(() => {
    const detectInitial = async () => {
      try {
        const response = await generateContent({
          model: GEMINI_MODELS.PRO,
          systemInstruction: 'Identify unique entities in text. Return JSON list of strings only.',
          generationConfig: {
            responseMimeType: 'application/json',
          },
          contents: [{ role: 'user', parts: [{ text: text.slice(0, 8000) }] }],
        });
        try {
          const result = await response.response;
          const entities = JSON.parse(result.text() || '[]');
          if (Array.isArray(entities)) {
            setHighlights(entities.map((e: string) => ({ text: String(e), type: 'CANDIDATE' })));
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
  }, [text]);

  const activeSeed = useMemo(() => seeds.find((s) => s.id === activeSeedId), [seeds, activeSeedId]);

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
        model: GEMINI_MODELS.PRO,
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
        const suggestions = JSON.parse(result.text() || '[]');
        if (Array.isArray(suggestions)) {
          const sanitized = suggestions.map((s: any) => ({
            ...s,
            category: s.category || NexusCategory.CONCEPT,
            isAuthorNote: !!s.isAuthorNote,
          }));
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
        ? `(${sortedHighlights.map((h) => h.text.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})`
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
    <div className="flex h-full w-full overflow-hidden bg-nexus-950 animate-in fade-in duration-500">
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
      <aside className="w-[500px] bg-nexus-900 border-l border-nexus-800 flex flex-col relative shrink-0 shadow-[-10px_0_30px_var(--shadow-color)]">
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
            <span className="text-[10px] font-display font-black uppercase tracking-widest text-nexus-muted ml-2">
              Entity Processor
            </span>
          </div>
        </header>
        <div className="flex-1 p-8 flex flex-col items-center justify-center text-nexus-muted/50">
          <p className="text-sm italic">Select a token to begin refinement.</p>
        </div>
      </aside>
    </div>
  );
};
