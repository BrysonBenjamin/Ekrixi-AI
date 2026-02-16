import React, { useState, useRef, useEffect } from 'react';
import {
  PanelLeftClose,
  PanelLeft,
  Plus,
  MoreHorizontal,
  Trash2,
  Edit2,
  Check,
  X,
  PanelRightClose,
  PanelRight,
} from 'lucide-react';
import { useUniverseChat } from './hooks/useUniverseChat';
import { useCanvasState, CanvasMode } from './hooks/useCanvasState';
import { Sidebar } from './components/Sidebar';
import { MessageList } from './components/MessageList';
import { Composer } from './components/Composer';
import { EmptyState } from './components/EmptyState';
import { SideCanvas } from './components/SideCanvas';
import { NexusObject } from '../../types';

interface UniverseGeneratorFeatureProps {
  onScan: (text: string) => void;
  registry: Record<string, NexusObject>;
  activeUniverseId?: string;
}

export const UniverseGeneratorFeature: React.FC<UniverseGeneratorFeatureProps> = ({
  onScan,
  registry,
  activeUniverseId,
}) => {
  // Canvas visibility is now manually togglable + smart activation
  const [mode, setMode] = useState<CanvasMode>('hidden');
  const isCanvasVisible = mode !== 'hidden';

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
    updateTitle,
    updateSession,
    navigateBranch,
  } = useUniverseChat(registry, activeUniverseId, isCanvasVisible);

  // Canvas State Management
  const {
    document: canvasDocument,
    activeCanvas,
    canvases,
    updateDocument,
    updateCanvasTitle,
    createCanvas,
    switchCanvas,
    deleteCanvas,
    isUpdating,
    toggleCanvasMode,
    refineDocument,
  } = useCanvasState(currentSession, thread, registry, updateSession, mode, setMode);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    window.document.addEventListener('mousedown', handleClickOutside);
    return () => window.document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStartRename = () => {
    setEditTitle(currentSession?.title || 'New Project');
    setIsRenaming(true);
    setIsMenuOpen(false);
  };

  const handleRename = async () => {
    if (currentSessionId && editTitle.trim()) {
      await updateTitle(currentSessionId, editTitle.trim());
    }
    setIsRenaming(false);
  };

  const hasMessages = thread.length > 0;

  return (
    <div className="flex h-full bg-nexus-950 text-nexus-text relative overflow-hidden font-sans">
      {/* Left Panel - Mobile Overlay */}
      {/* ... (Left Panel code stays same) ... */}
      <div
        className={`
                fixed inset-0 z-[60] md:relative md:z-auto transition-transform duration-300
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                ${!isSidebarOpen && 'md:hidden'}
            `}
      >
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
        <div className="relative h-full w-80 shrink-0 border-r border-nexus-800 hidden lg:block">
          <Sidebar
            sessions={sessions}
            activeId={currentSessionId}
            onCreate={() => {
              createSession();
            }}
            onSelect={(id) => {
              selectSession(id);
            }}
            onDelete={deleteSession}
            onSuggestionClick={(text) => {
              sendMessage(text);
            }}
          />
        </div>
      </div>

      {/* Main Container - Dual Column Layout */}
      <div className="flex-1 flex flex-col relative min-w-0">
        {/* 1. TOP BAR */}
        <header className="h-16 flex items-center justify-between px-6 shrink-0 bg-nexus-900/40 backdrop-blur-3xl border-b border-white/5 z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-3 md:p-2 text-nexus-muted hover:text-nexus-text hover:bg-nexus-800 rounded-xl transition-all"
              title={isSidebarOpen ? 'Close Sidebar' : 'Open Sidebar'}
            >
              {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
            </button>

            <button
              onClick={createSession}
              className="hidden sm:flex p-2 text-nexus-muted hover:text-nexus-accent hover:bg-nexus-800 rounded-xl transition-all"
              title="New Nexus Chat"
            >
              <Plus size={20} />
            </button>
          </div>

          {/* Centered Title Section */}
          <div className="flex-1 flex justify-center min-w-0 px-4">
            {isRenaming ? (
              <div className="flex items-center gap-2 bg-nexus-800 px-3 py-1.5 rounded-xl border border-nexus-700 w-full max-w-xs shadow-lg">
                <input
                  autoFocus
                  className="bg-transparent border-none outline-none text-sm text-nexus-text w-full font-display font-semibold"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename();
                    if (e.key === 'Escape') setIsRenaming(false);
                  }}
                />
                <button
                  onClick={handleRename}
                  className="p-1 hover:text-nexus-accent transition-colors"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => setIsRenaming(false)}
                  className="p-1 hover:text-red-400 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div
                onClick={handleStartRename}
                className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-nexus-800 cursor-pointer transition-all group max-w-[200px] sm:max-w-xs"
                title="Click to rename"
              >
                <span className="font-display font-semibold text-nexus-text text-sm truncate">
                  {currentSession?.title || 'New Session'}
                </span>
                <Edit2
                  size={12}
                  className="text-nexus-muted opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 relative" ref={menuRef}>
            {/* Manual Canvas Toggle Button */}
            <button
              onClick={toggleCanvasMode}
              className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                isCanvasVisible
                  ? 'bg-nexus-accent/10 border-nexus-accent/30 text-nexus-accent'
                  : 'bg-nexus-800/50 border-nexus-800 text-nexus-muted hover:text-nexus-text'
              }`}
              title={isCanvasVisible ? 'Close Canvas' : 'Open Canvas'}
            >
              {isCanvasVisible ? <PanelRightClose size={18} /> : <PanelRight size={18} />}
              <span className="text-[10px] font-black uppercase tracking-widest">Canvas</span>
            </button>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-3 md:p-2 text-nexus-muted hover:text-nexus-text rounded-xl transition-all ${isMenuOpen ? 'bg-nexus-800 text-nexus-text' : ''}`}
            >
              <MoreHorizontal size={20} />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-nexus-900 border border-nexus-800 rounded-2xl shadow-2xl z-[70] overflow-hidden py-2 backdrop-blur-xl bg-nexus-900/90 animate-slide-up">
                <button
                  onClick={handleStartRename}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-nexus-muted hover:text-nexus-text hover:bg-nexus-800 transition-all group"
                >
                  <Edit2 size={16} className="group-hover:text-nexus-accent transition-colors" />
                  <span>Rename Session</span>
                </button>
                <button
                  onClick={() => {
                    createSession();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-nexus-muted hover:text-nexus-text hover:bg-nexus-800 transition-all group"
                >
                  <Plus size={16} className="group-hover:text-nexus-accent transition-colors" />
                  <span>New Chat</span>
                </button>
                <div className="h-px bg-nexus-800 mx-2 my-1" />
                <button
                  onClick={() => {
                    if (currentSessionId) {
                      deleteSession(currentSessionId);
                      setIsMenuOpen(false);
                    }
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 size={16} />
                  <span>Delete Session</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* 2. MAIN CONTENT AREA - SPLIT SCREEN */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chat Sidebar (Editing Tool) */}
          <div
            className={`
              flex flex-col border-r border-white/10 transition-all duration-500 ease-nexus-in-out
              ${isCanvasVisible ? 'w-full md:w-[320px] lg:w-[380px]' : 'w-full'}
            `}
          >
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
                      registry={registry}
                    />
                  )}
                </div>

                {/* 3. INPUT FOOTER */}
                <div className="shrink-0 w-full bg-nexus-950/80 border-t border-nexus-800/30">
                  <div className="max-w-3xl mx-auto px-4 pb-4 pt-2 pb-safe">
                    <Composer
                      isLoading={isLoading}
                      onSend={sendMessage}
                      variant="footer"
                      registry={registry}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex overflow-y-auto no-scrollbar">
                <EmptyState onSend={sendMessage} registry={registry} />
              </div>
            )}
          </div>

          {/* Main Canvas Area - Smart Activation */}
          <div
            className={`flex-1 flex flex-col transition-all duration-500 overflow-hidden ${!isCanvasVisible ? 'hidden' : ''}`}
          >
            {isCanvasVisible && (
              <SideCanvas
                sessionId={currentSessionId}
                document={canvasDocument}
                activeCanvas={activeCanvas}
                canvases={canvases}
                onUpdateDocument={updateDocument}
                onUpdateCanvasTitle={updateCanvasTitle}
                onCreateCanvas={createCanvas}
                onSwitchCanvas={switchCanvas}
                onDeleteCanvas={deleteCanvas}
                onRefineDocument={refineDocument}
                onScan={onScan}
                registry={registry}
                isUpdating={isUpdating}
                mode={mode}
                onModeChange={setMode}
                onClose={() => setMode('hidden')}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
