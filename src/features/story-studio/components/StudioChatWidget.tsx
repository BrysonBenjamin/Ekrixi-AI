import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  X,
  Send,
  Sparkles,
  RotateCw,
  Activity,
  BookOpen,
  ShieldCheck,
  LucideIcon,
} from 'lucide-react';
import {
  NexusObject,
  StoryType,
  NexusType,
  NexusCategory,
  NarrativeStatus,
  HierarchyType,
  ContainmentType,
  DefaultLayout,
  StoryNote,
  SimpleNote,
} from '../../../types';
import { StudioBlock } from '../types';
import { generateId } from '../../../utils/ids';
import { useLLM } from '../../system/hooks/useLLM';
import { NexusMarkdown } from '../../../components/shared/NexusMarkdown';
import { GEMINI_MODELS } from '../../../core/llm';

interface ChatAction {
  reply: string;
  proposedChapters?: Array<{ title: string; gist: string; insertAfterIndex: number }>;
  proposedProtocols?: Array<{ title: string; gist: string; targetChapterIds: string[] }>;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  context?: Array<{ title: string; id: string }>;
  action?: ChatAction;
}

interface StudioChatWidgetProps {
  _isOpen: boolean;
  onClose: () => void;
  items: NexusObject[];
  onUpdateItems: (items: NexusObject[]) => void;
  blocks: StudioBlock[];
  inline?: boolean;
}

const ActionButton = ({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="w-full py-2 bg-nexus-essence/10 border border-nexus-essence/30 text-nexus-essence rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-nexus-essence hover:text-black transition-all flex items-center justify-center gap-2 shadow-lg"
  >
    <Icon size={12} /> {label}
  </button>
);

export const StudioChatWidget: React.FC<StudioChatWidgetProps> = ({
  _isOpen,
  onClose,
  items,
  onUpdateItems,
  blocks,
  inline,
}) => {
  const { generateContent } = useLLM();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [contextNodes, setContextNodes] = useState<Array<{ title: string; id: string }>>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const memoizedRegistry = useMemo(
    () => items.reduce((acc, item) => ({ ...acc, [item.id]: item }), {}),
    [items],
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleDropLore = (e: React.DragEvent) => {
    e.preventDefault();
    const title = e.dataTransfer.getData('application/nexus-scry-title');
    const id = e.dataTransfer.getData('application/nexus-scry-id');
    if (title && !contextNodes.find((n) => n.id === id)) {
      setContextNodes([...contextNodes, { title, id }]);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userMsg, context: [...contextNodes] }]);
    setIsLoading(true);

    try {
      const chaptersSummary = items
        .filter((i) => (i as StoryNote).story_type === StoryType.CHAPTER)
        .map((ch) => {
          const note = ch as StoryNote;
          return `CH_${note.sequence_index}: ${note.title} - ${note.gist}`;
        })
        .join('\n');

      const worldContext = contextNodes.map((n) => `- ${n.title}`).join('\n');

      const systemInstruction = `
                ACT AS: The Ekrixi Neural Chat agent. You are a high-fidelity literary consultant and story architect.
                
                YOUR PRIMARY OPERATING MODES:
                1. CHAPTER_SPEC: Draft or refine chapters based on user specifications. Ask clarifying questions if the prompt is vague.
                2. LITERARY_AUDIT: Analyze the structure for pacing, causality, and thematic resonance. Only do this when prompted.
                3. CAUSAL_PROTOCOL: Suggest and create Author's Notes (Protocols) that link literary points to specific chapters.

                PRIORITY: Prioritize executing user-requested edits and structural commands over generating your own storyline ideas unless explicitly asked for "Brainstorming" or "Suggestions".

                KNOWLEDGE CONTEXT:
                - BLUEPRINT: ${JSON.stringify(blocks)}
                - SPINE SUMMARY:
                ${chaptersSummary}
                - DRAGGED LORE UNITS:
                ${worldContext}

                OUTPUT GUIDELINES:
                - Use "[[Title]]" syntax to reference ANY entities, concepts, or chapters that exist in the context. This creates interactive links.
                
                OUTPUT FORMAT: JSON ONLY.
                {
                    "reply": "Conversational response, analysis, or clarifying questions.",
                    "proposedChapters": [ { "title": "string", "gist": "string", "insertAfterIndex": number } ],
                    "proposedProtocols": [ { "title": "string", "gist": "string", "targetChapterIds": ["string"] } ]
                }
            `;

      const response = await generateContent({
        model: GEMINI_MODELS.FLASH,
        systemInstruction: systemInstruction,
        generationConfig: { responseMimeType: 'application/json' },
        contents: [{ role: 'user', parts: [{ text: userMsg }] }],
      });

      const resultJson = await response.response;
      const result = JSON.parse(resultJson.text() || '{}');
      setMessages((prev) => [...prev, { role: 'assistant', text: result.reply, action: result }]);
      setContextNodes([]);
      setContextNodes([]);
    } catch (err) {
      console.error('[StudioChatWidget] Error:', err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Neural Chat connection interrupted. Please re-synchronize.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteAction = (type: 'CHAPTERS' | 'PROTOCOLS', data: any) => {
    const now = new Date().toISOString();
    let nextItems = [...items];

    if (type === 'CHAPTERS') {
      (data as Array<{ title: string; gist: string; insertAfterIndex?: number }>).forEach((ch) => {
        const newId = generateId();
        const node: StoryNote = {
          id: newId,
          _type: NexusType.STORY_NOTE,
          story_type: StoryType.CHAPTER,
          title: ch.title,
          gist: ch.gist,
          sequence_index: (ch.insertAfterIndex || 0) + 1,
          tension_level: 50,
          status: NarrativeStatus.OUTLINE,
          category_id: NexusCategory.STORY,
          created_at: now,
          last_modified: now,
          link_ids: [],
          children_ids: [],
          internal_weight: 1.0,
          total_subtree_mass: 0,
          aliases: [],
          tags: [],
          prose_content: '',
          is_ghost: false,
          containment_type: ContainmentType.MANUSCRIPT,
          is_collapsed: false,
          default_layout: DefaultLayout.GRID,
        };
        nextItems.push(node);
        const book = items.find((i) => (i as StoryNote).story_type === StoryType.BOOK);
        if (book) {
          nextItems.push({
            id: generateId(),
            _type: NexusType.HIERARCHICAL_LINK,
            source_id: book.id,
            target_id: newId,
            verb: 'contains',
            hierarchy_type: HierarchyType.PARENT_OF,
            created_at: now,
            last_modified: now,
            link_ids: [],
          } as NexusObject);
        }
      });
    } else if (type === 'PROTOCOLS') {
      (data as Array<{ title: string; gist: string; targetChapterIds?: string[] }>).forEach(
        (prot) => {
          const pId = generateId();
          nextItems.push({
            id: pId,
            _type: NexusType.SIMPLE_NOTE,
            title: prot.title,
            gist: prot.gist,
            category_id: NexusCategory.META,
            is_author_note: true,
            created_at: now,
            last_modified: now,
            link_ids: [],
            internal_weight: 1.0,
            total_subtree_mass: 0,
            aliases: [],
            tags: [],
            prose_content: '',
            is_ghost: false,
          } as SimpleNote);
          if (prot.targetChapterIds) {
            prot.targetChapterIds.forEach((chId: string) => {
              if (items.some((i) => i.id === chId)) {
                nextItems.push({
                  id: generateId(),
                  _type: NexusType.SEMANTIC_LINK,
                  source_id: pId,
                  target_id: chId,
                  verb: 'governs',
                  created_at: now,
                  last_modified: now,
                  link_ids: [],
                } as NexusObject);
              }
            });
          }
        },
      );
    }
    onUpdateItems(nextItems);
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', text: 'Logical changes committed to story spine.' },
    ]);
  };

  return (
    <div
      className={`flex flex-col h-full bg-nexus-900 ${inline ? '' : 'w-96 border-l border-nexus-800 shadow-2xl animate-in slide-in-from-right duration-300'}`}
    >
      <header className="h-14 flex items-center justify-between px-6 border-b border-nexus-800 bg-nexus-ruby/5">
        <div className="flex items-center gap-3">
          <Sparkles size={16} className="text-nexus-ruby" />
          <span className="text-[10px] font-display font-black text-nexus-text uppercase tracking-widest">
            Neural Chat
          </span>
        </div>
        {!inline && (
          <button
            onClick={onClose}
            className="p-1.5 text-nexus-muted hover:text-nexus-text transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
        {messages.length === 0 && (
          <div className="py-12 text-center space-y-4 opacity-40">
            <Activity size={32} className="mx-auto text-nexus-ruby" />
            <p className="text-[10px] font-display font-bold uppercase tracking-widest px-8 text-nexus-text">
              Awaiting Strategic Directives...
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            {m.context && m.context.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1">
                {m.context.map((n) => (
                  <span
                    key={n.id}
                    className="px-2 py-0.5 bg-nexus-accent/10 border border-nexus-accent/30 rounded text-[7px] font-bold text-nexus-accent uppercase"
                  >
                    @{n.title}
                  </span>
                ))}
              </div>
            )}
            <div
              className={`max-w-[95%] p-4 rounded-2xl text-[12px] shadow-sm ${m.role === 'user' ? 'bg-nexus-ruby border border-nexus-ruby/20 text-white' : 'bg-nexus-950 border border-nexus-800 text-nexus-text'}`}
            >
              {m.role === 'user' ? (
                m.text
              ) : (
                <NexusMarkdown
                  content={m.text}
                  registry={memoizedRegistry}
                  className="prose-sm text-[12px] leading-relaxed"
                />
              )}
            </div>
            {m.action && (
              <div className="mt-4 flex flex-col gap-2 w-full">
                {m.action.proposedChapters?.length > 0 && (
                  <ActionButton
                    icon={BookOpen}
                    label={`Draft ${m.action.proposedChapters.length} Chapter${m.action.proposedChapters.length > 1 ? 's' : ''}`}
                    onClick={() => handleExecuteAction('CHAPTERS', m.action.proposedChapters)}
                  />
                )}
                {m.action.proposedProtocols?.length > 0 && (
                  <ActionButton
                    icon={ShieldCheck}
                    label="Anchor Strategic Protocols"
                    onClick={() => handleExecuteAction('PROTOCOLS', m.action.proposedProtocols)}
                  />
                )}
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-3 text-nexus-ruby animate-pulse text-[10px] font-black uppercase tracking-widest">
            <RotateCw size={12} className="animate-spin" /> Weaving Logic...
          </div>
        )}
      </div>

      <div
        className="p-4 border-t border-nexus-800 bg-nexus-950/50"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDropLore}
      >
        <div className="flex flex-wrap gap-2 mb-3">
          {contextNodes.map((n) => (
            <div
              key={n.id}
              className="flex items-center gap-2 px-3 py-1 bg-nexus-accent/10 border border-nexus-accent/30 rounded-full text-[9px] font-bold text-nexus-accent"
            >
              {n.title}{' '}
              <button onClick={() => setContextNodes(contextNodes.filter((cn) => cn.id !== n.id))}>
                <X size={10} />
              </button>
            </div>
          ))}
          {contextNodes.length > 0 && (
            <button
              onClick={() => setContextNodes([])}
              className="text-[9px] text-nexus-muted hover:text-nexus-text uppercase font-black px-2"
            >
              Clear
            </button>
          )}
        </div>
        <div className="relative">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Specify a chapter draft, ask for structural review..."
            className="w-full bg-nexus-900 border border-nexus-800 rounded-2xl pl-5 pr-12 py-4 text-xs text-nexus-text outline-none focus:border-nexus-ruby transition-all shadow-inner"
          />
          <button
            onClick={handleSend}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-nexus-ruby text-white rounded-xl shadow-lg active:scale-95 transition-transform"
          >
            <Send size={14} />
          </button>
        </div>
        <p className="mt-2 text-[8px] text-center text-nexus-muted uppercase tracking-widest opacity-40">
          Drag lore units to chat for deep contextual analysis
        </p>
      </div>
    </div>
  );
};
