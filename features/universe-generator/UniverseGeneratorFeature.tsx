
import React, { useState } from 'react';
import { PanelLeftClose, PanelLeft, Plus, ChevronDown, MoreHorizontal } from 'lucide-react';
import { useUniverseChat } from './hooks/useUniverseChat';
import { Sidebar } from './components/Sidebar';
import { MessageList } from './components/MessageList';
import { Composer } from './components/Composer';
import { EmptyState } from './components/EmptyState';
import { NexusObject } from '../../types';

interface UniverseGeneratorFeatureProps {
    onScan: (text: string) => void;
    registry: Record<string, NexusObject>;
}

export const UniverseGeneratorFeature: React.FC<UniverseGeneratorFeatureProps> = ({ onScan, registry }) => {
    const { 
        sessions, 
        currentSessionId, 
        currentSession,
        thread,
        isLoading,
        createSession, 
        deleteSession, 
        selectSession, 
        sendMessage,
        editMessage,
        regenerate,
        navigateBranch
    } = useUniverseChat(registry);

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const hasMessages = thread.length > 0;

    return (
        <div className="flex h-full bg-nexus-950 text-nexus-text relative overflow-hidden font-sans">
            {/* Left Panel - Mobile Overlay */}
            <div className={`
                fixed inset-0 z-[60] md:relative md:z-auto transition-transform duration-300
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                ${!isSidebarOpen && 'md:hidden'}
            `}>
                <div 
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm md:hidden" 
                    onClick={() => setIsSidebarOpen(false)}
                />
                <div className="relative h-full w-72">
                    <Sidebar 
                        sessions={sessions} 
                        activeId={currentSessionId}
                        onCreate={() => { createSession(); setIsSidebarOpen(false); }}
                        onSelect={(id) => { selectSession(id); setIsSidebarOpen(false); }}
                        onDelete={deleteSession}
                    />
                </div>
            </div>

            {/* Main Chat Interface */}
            <div className="flex-1 flex flex-col relative min-w-0">
                
                {/* 1. TOP BAR */}
                <header className="h-16 flex items-center justify-between px-6 shrink-0 bg-nexus-900/50 backdrop-blur-xl border-b border-nexus-800 z-20">
                    <div className="flex items-center gap-4">
                         <button 
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 text-nexus-muted hover:text-nexus-text hover:bg-nexus-800 rounded-xl transition-all"
                            title={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
                        >
                            {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
                        </button>
                        
                        <button
                            onClick={createSession}
                            className="hidden sm:flex p-2 text-nexus-muted hover:text-nexus-accent hover:bg-nexus-800 rounded-xl transition-all"
                            title="New Universe"
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                    
                    {/* Centered Title */}
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-nexus-800 cursor-pointer transition-all group max-w-[200px] sm:max-w-xs">
                        <span className="font-display font-semibold text-nexus-text text-sm truncate">
                            {currentSession?.title || 'New Project'}
                        </span>
                        <ChevronDown size={14} className="text-nexus-muted group-hover:text-nexus-text shrink-0" />
                    </div>

                    <div className="flex items-center gap-2">
                         <button className="p-2 text-nexus-muted hover:text-nexus-text rounded-xl transition-all">
                            <MoreHorizontal size={20} />
                         </button>
                    </div>
                </header>

                {/* 2. MAIN SCROLL AREA */}
                {hasMessages ? (
                    <>
                        <div className="flex-1 overflow-hidden relative">
                            {currentSession && (
                                <MessageList 
                                    thread={thread}
                                    session={currentSession}
                                    isLoading={isLoading} 
                                    editMessage={editMessage}
                                    regenerate={regenerate}
                                    navigateBranch={navigateBranch}
                                    onScan={onScan}
                                />
                            )}
                        </div>

                        {/* 3. INPUT FOOTER */}
                        <div className="shrink-0 w-full bg-nexus-950 border-t border-nexus-800/30">
                            <div className="max-w-4xl mx-auto px-6 pb-8 md:pb-8 pt-4 pb-safe">
                                <Composer 
                                    isLoading={isLoading} 
                                    onSend={sendMessage}
                                    variant="footer" 
                                    registry={registry}
                                />
                                <div className="text-center mt-3">
                                    <p className="text-[10px] text-nexus-muted font-mono tracking-widest uppercase opacity-60">
                                        Nexus Engine v4.0 // Project Stability: Optimal
                                    </p>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex overflow-y-auto no-scrollbar">
                        <EmptyState onSend={sendMessage} registry={registry} />
                    </div>
                )}
            </div>
        </div>
    );
};
