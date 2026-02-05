import React, { useState, useRef, useEffect } from 'react';
import { 
    Sparkles, 
    Send, 
    RotateCw, 
    ShieldCheck, 
    Bot, 
    User, 
    Zap, 
    Activity, 
    ArrowRight, 
    Quote, 
    X,
    FileText,
    Layers,
    PenTool
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { NexusObject, StoryType, NexusType, NarrativeStatus } from '../../../types';
import { generateId } from '../../../utils/ids';

interface WeaverChatAssistantProps {
    chapter: any;
    isChapterMode: boolean;
    notes: any[];
    studioItems: NexusObject[];
    onUpdate: (items: NexusObject[]) => void;
    worldRegistry: Record<string, NexusObject>;
    selection?: string;
    onClearSelection?: () => void;
}

export const WeaverChatAssistant: React.FC<WeaverChatAssistantProps> = ({ 
    chapter, isChapterMode, notes, studioItems, onUpdate, worldRegistry, selection, onClearSelection 
}) => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;
        const userMsg = input.trim();
        setInput('');
        
        const currentSelection = selection;
        setMessages(prev => [...prev, { role: 'user', text: userMsg, selection: currentSelection }]);
        if (onClearSelection) onClearSelection();
        setIsLoading(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const chapterContext = isChapterMode 
                ? `COMPOSITE CHAPTER VIEW: Editing multiple scenes simultaneously. Stack: ${studioItems.filter(i => (i as any).story_type === StoryType.SCENE).map(s => (s as any).title).join(', ')}`
                : `SCENE FOCUS: ${chapter?.title}. Gist: ${chapter?.gist}`;

            const noteContext = notes.map(n => `- ${n.title}: ${n.gist}`).join('\n');
            
            const prompt = `
                ACT AS: The Ekrixi Writing Chat agent. You are a high-fidelity literary assistant.
                
                YOUR MISSION:
                1. Provide prose suggestions that respect the chapter's gist and governing Author Notes.
                2. If the user provides a "SELECTION" (highlighted text), focus specifically on rewriting or expanding that section based on their prompt.
                3. Maintain a consistent voice based on the narrative mass of the manuscript.
                
                REQUIREMENT: Return RAW PROSE only. Do not use Markdown symbols like **bold** or # headings in the proseSuggestion field.
                
                CONTEXT:
                - TARGET_UNIT: ${chapterContext}
                - ACTIVE_AUTHOR_NOTES:
                ${noteContext || "No directives established."}
                - HIGHLIGHTED_TEXT_SELECTION: "${currentSelection || "None"}"

                USER_COMMAND: "${userMsg}"

                OUTPUT: JSON ONLY.
                {
                    "reply": "Conversational advice or commentary.",
                    "proseSuggestion": "The actual suggested RAW PROSE rewrite/expansion.",
                    "logicObservation": "Any structural warnings or insights regarding author notes."
                }
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });

            const result = JSON.parse(response.text || '{}');
            setMessages(prev => [...prev, { role: 'assistant', ...result }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', reply: "Assistant synchronization interrupted. Registry heartbeat lost." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-nexus-900/50 backdrop-blur-xl">
            <header className="h-14 border-b border-nexus-800 flex items-center px-6 gap-3 shrink-0 bg-nexus-950/20">
                <Sparkles size={16} className="text-nexus-accent animate-pulse" />
                <h3 className="text-[10px] font-display font-black text-nexus-text uppercase tracking-widest">Writing Chat</h3>
                <div className="flex-1" />
                <div className="flex items-center gap-2">
                     <span className="text-[8px] font-mono text-nexus-muted uppercase">Kernel: Raw Text v1.0</span>
                </div>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
                {messages.length === 0 && (
                    <div className="py-20 text-center space-y-6 opacity-30">
                        <Bot size={48} className="mx-auto text-nexus-accent" />
                        <div className="space-y-2">
                            <p className="text-[10px] font-display font-bold uppercase tracking-[0.2em] px-10">Awaiting Writing Directives</p>
                            <p className="text-[9px] font-serif italic max-w-xs mx-auto">"Highlight text in the editor and click 'Search Selection' to send it as context."</p>
                        </div>
                    </div>
                )}
                
                {messages.map((m, i) => (
                    <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start animate-in fade-in slide-in-from-bottom-2'}`}>
                        {m.selection && (
                            <div className="max-w-[80%] mb-2 p-3 bg-nexus-accent/10 border border-nexus-accent/30 rounded-2xl flex items-start gap-3">
                                <Quote size={12} className="text-nexus-accent shrink-0 mt-1" />
                                <p className="text-[10px] text-nexus-text italic line-clamp-3 leading-relaxed">"{m.selection}"</p>
                            </div>
                        )}
                        
                        <div className={`max-w-[90%] p-5 rounded-[28px] shadow-sm text-xs leading-relaxed ${m.role === 'user' ? 'bg-nexus-accent text-white font-bold' : 'bg-nexus-950 border border-nexus-800 text-nexus-text font-serif italic'}`}>
                            {m.text || m.reply}
                        </div>

                        {m.proseSuggestion && (
                            <div className="mt-4 w-full bg-nexus-950/80 border border-nexus-accent/30 rounded-[32px] p-6 shadow-xl space-y-4 group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <FileText size={60} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[8px] font-black uppercase text-nexus-accent tracking-widest flex items-center gap-2">
                                        <Sparkles size={10} /> Suggested Raw Manifest
                                    </span>
                                    <button 
                                        onClick={() => navigator.clipboard.writeText(m.proseSuggestion)}
                                        className="p-1.5 bg-nexus-900 border border-nexus-800 rounded-lg text-nexus-muted hover:text-nexus-accent transition-all"
                                        title="Copy Suggested Prose"
                                    >
                                        <Layers size={14} />
                                    </button>
                                </div>
                                <div className="text-[13px] text-nexus-text font-serif leading-relaxed whitespace-pre-wrap border-l-2 border-nexus-accent/20 pl-4 py-2">
                                    {m.proseSuggestion}
                                </div>
                                {m.logicObservation && (
                                    <div className="pt-4 border-t border-nexus-800 flex items-start gap-3">
                                        <ShieldCheck size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                        <p className="text-[9px] text-amber-500/80 font-mono uppercase tracking-tighter leading-tight">{m.logicObservation}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {isLoading && (
                    <div className="flex items-center gap-3 text-nexus-accent animate-pulse">
                        <RotateCw size={14} className="animate-spin" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Weaving neural prose...</span>
                    </div>
                )}
            </div>

            <div className="p-5 border-t border-nexus-800 bg-nexus-950/60 relative">
                {selection && (
                    <div className="absolute bottom-full left-4 right-4 mb-4 p-4 bg-nexus-accent text-white rounded-[24px] shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom-2 duration-300">
                         <div className="flex items-center gap-3 overflow-hidden">
                             <Quote size={16} />
                             <p className="text-[10px] font-bold truncate italic">Context selection captured</p>
                         </div>
                         <button onClick={onClearSelection} className="p-1 hover:bg-white/20 rounded-full shrink-0 ml-2"><X size={14}/></button>
                    </div>
                )}
                
                <div className="relative group">
                    <input 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder={selection ? "Suggest a rewrite for selection..." : "Request a scene expansion or edit..."}
                        className="w-full bg-nexus-900 border border-nexus-800 rounded-3xl pl-6 pr-14 py-4 text-sm text-nexus-text outline-none focus:border-nexus-accent transition-all shadow-inner placeholder:text-nexus-muted/30"
                    />
                    <button 
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-2xl shadow-lg transition-all active:scale-90 ${!input.trim() || isLoading ? 'bg-nexus-800 text-nexus-muted' : 'bg-nexus-accent text-white hover:brightness-110'}`}
                    >
                        <ArrowRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};
