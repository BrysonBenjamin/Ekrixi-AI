import React, { useState, useRef, useEffect } from 'react';
import { NexusMarkdown } from '../../../../../components/shared/NexusMarkdown';
import { X, Send, Sparkles, RotateCw, Activity, Type, Zap, Plus } from 'lucide-react';
// Fix: Import StudioBlock from types
import { StudioBlock } from '../../../types';
import { generateId } from '../../../../../utils/ids';
import { useLLM } from '../../../../system/hooks/useLLM';
import { GEMINI_MODELS } from '../../../../../core/llm';
import { NexusObject } from '../../../../../types';
import { LITERARY_ARCHETYPES } from '../../manifesto/archetypes/data';

interface ProposedBlock {
  type: StudioBlock['type'];
  data: any; // Data depends on type
}

interface Message {
  role: 'user' | 'assistant';
  text: string;
  action?: {
    proposedBlocks: ProposedBlock[];
    reply: string;
  };
}

interface ManifestoChatbotProps {
  blocks: StudioBlock[];
  onUpdateBlocks: (blocks: StudioBlock[]) => void;
  registry: Record<string, NexusObject>;
  onClose: () => void;
}

export const ManifestoChatbot: React.FC<ManifestoChatbotProps> = ({
  blocks,
  onUpdateBlocks,
  registry,
  onClose,
}) => {
  const { generateContent } = useLLM();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const manifestContext = blocks.map((b) => `${b.type}: ${JSON.stringify(b.data)}`).join('\n');
      const archetypeOptions = LITERARY_ARCHETYPES.map(
        (a) => `- ${a.id}: ${a.label} (${a.desc})`,
      ).join('\n');

      const systemInstruction = `
                ACT AS: The Ekrixi Blueprint Chat agent. 
                TASK: Help the user build a high-fidelity story blueprint.
                
                CURRENT BLUEPRINT BLOCKS:
                ${manifestContext || 'None yet.'}

                LITERARY ARCHETYPES (MANDATORY FOR 'LITERARY_APPROACH' BLOCKS):
                You MUST use one of these IDs if proposing a LITERARY_APPROACH:
                ${archetypeOptions}

                OPERATING MODES:
                1. If the user wants to established a direction, propose a "THESIS" block.
                2. If the user wants a narrative structure, propose a "LITERARY_APPROACH" block with a valid archetype ID from above and a rationale.
                3. If the user mentions a character or location development, propose a "DELTA" or "LATENT_UNIT" block.
                4. If the user wants a brainstorming session, provide conversational text and suggest 1-2 structural blocks.
                
                USE "[[Title]]" SYNTAX for any references to entities, concepts, or story nodes. These become clickable links.

                OUTPUT FORMAT: JSON ONLY.
                {
                    "reply": "Conversational, evocative text here.",
                    "proposedBlocks": [
                        { "type": "THESIS" | "DELTA" | "LATENT_UNIT" | "LITERARY_APPROACH" | "ORACLE_PROMPT", "data": object }
                    ]
                }
                
                If proposing 'LITERARY_APPROACH', the data object MUST look like: { "archetype": "ID_HERE", "rationale": "Why this fits." }
            `;

      const response = await generateContent({
        model: GEMINI_MODELS.FLASH,
        systemInstruction: systemInstruction,
        contents: [{ role: 'user', parts: [{ text: userMsg }] }],
        generationConfig: { responseMimeType: 'application/json' },
      });

      const resultJson = await response.response;
      const result = JSON.parse(resultJson.text() || '{}');
      setMessages((prev) => [...prev, { role: 'assistant', text: result.reply, action: result }]);
    } catch (err) {
      console.error('Blueprint Synthesis Error:', err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Synthesis kernel interrupted. Please retry.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyBlocks = (proposed: ProposedBlock[]) => {
    const nextBlocks = [...blocks];
    proposed.forEach((p) => {
      nextBlocks.push({
        id: generateId(),
        type: p.type,
        data: p.data,
      });
    });
    onUpdateBlocks(nextBlocks);
    setMessages((prev) => [...prev, { role: 'assistant', text: 'Blocks reified into Blueprint.' }]);
  };

  return (
    <div className="flex flex-col h-full bg-nexus-900 border-l border-nexus-800 shadow-2xl overflow-hidden font-sans">
      <header className="h-16 flex items-center justify-between px-6 border-b border-nexus-800 bg-nexus-ruby/5 shrink-0">
        <div className="flex items-center gap-3">
          <Sparkles size={16} className="text-nexus-ruby" />
          <span className="text-[10px] font-display font-black text-nexus-text uppercase tracking-widest">
            Blueprint Chat
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-nexus-muted hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
        {messages.length === 0 && (
          <div className="py-12 text-center space-y-4 opacity-40">
            <Zap size={32} className="mx-auto text-nexus-ruby" />
            <p className="text-[10px] font-display font-bold uppercase tracking-widest px-8 text-nexus-text">
              Define your vision to manifest structural units.
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[90%] p-4 rounded-2xl text-[12px] shadow-sm ${m.role === 'user' ? 'bg-nexus-ruby text-white shadow-nexus-ruby/20' : 'bg-nexus-950 border border-nexus-800 text-nexus-text'}`}
            >
              {m.role === 'user' ? (
                m.text
              ) : (
                <NexusMarkdown
                  content={m.text}
                  registry={registry}
                  className="prose-sm text-[12px] leading-relaxed font-serif italic"
                />
              )}
            </div>
            {m.action?.proposedBlocks?.length > 0 && (
              <div className="mt-3 w-full animate-in slide-in-from-left-2 duration-300">
                <div className="p-4 bg-nexus-ruby/5 border border-nexus-ruby/20 rounded-2xl space-y-4 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-black uppercase text-nexus-ruby tracking-widest">
                      Proposed Logic Units
                    </span>
                    <Activity size={10} className="text-nexus-ruby animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    {m.action.proposedBlocks.map((b, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 bg-nexus-900 border border-nexus-800 rounded-lg"
                      >
                        <div className="p-1 bg-nexus-ruby/10 rounded text-nexus-ruby">
                          <Type size={10} />
                        </div>
                        <span className="text-[9px] font-bold text-nexus-muted truncate">
                          {b.type === 'LITERARY_APPROACH'
                            ? `APPROACH: ${b.data.archetype}`
                            : b.type}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => handleApplyBlocks(m.action.proposedBlocks)}
                    className="w-full py-2 bg-nexus-ruby text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:brightness-110 flex items-center justify-center gap-2 shadow-lg shadow-nexus-ruby/10 transition-all active:scale-[0.98]"
                  >
                    <Plus size={12} /> Reify Proposals
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-3 text-nexus-ruby animate-pulse text-[10px] font-black uppercase tracking-widest">
            <RotateCw size={12} className="animate-spin" /> Synthesizing Logic...
          </div>
        )}
      </div>

      <div className="p-4 border-t border-nexus-800 bg-nexus-950/50">
        <div className="relative">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Establish thesis, add latent units..."
            className="w-full bg-nexus-900 border border-nexus-800 rounded-2xl pl-5 pr-12 py-4 text-xs text-nexus-text outline-none focus:border-nexus-ruby transition-all shadow-inner placeholder:text-nexus-muted/40"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-nexus-ruby text-white rounded-xl shadow-lg active:scale-95 transition-transform disabled:opacity-50"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
