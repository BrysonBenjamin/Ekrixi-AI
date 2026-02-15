import React, { ReactNode } from 'react';
import { ArrowLeft, BookOpen, Clock, Network } from 'lucide-react';
import { NexusObject } from '../../../../types';

interface NexusEditorLayoutProps {
  // Navigation
  onBack: () => void;
  onGenerateEncyclopedia: () => void;

  // State
  title: string;
  type: string;
  id: string;

  // View Mode
  viewMode: 'EDIT' | 'PREVIEW' | 'ENCYCLOPEDIA';
  onChangeViewMode: (mode: 'EDIT' | 'PREVIEW' | 'ENCYCLOPEDIA') => void;

  // Slots for the 3 columns
  hierarchySidebar: ReactNode;
  mainEditor: ReactNode;
  metadataRail: ReactNode;
}

export const NexusEditorLayout: React.FC<NexusEditorLayoutProps> = ({
  onBack,
  onGenerateEncyclopedia,
  title,
  type,
  id,
  viewMode,
  onChangeViewMode,
  hierarchySidebar,
  mainEditor,
  metadataRail,
}) => {
  return (
    <div className="w-full h-full flex flex-col bg-nexus-950 text-nexus-text overflow-hidden">
      {/* 
        ========================================
        HEADER
        ========================================
      */}
      <div className="h-16 flex-none border-b border-nexus-800/50 bg-nexus-900/50 backdrop-blur-md flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-nexus-800 rounded-lg text-nexus-muted hover:text-nexus-text transition-colors group"
            title="Back to Wiki Home"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>

          <div className="flex flex-col">
            <h1 className="text-lg font-display font-bold text-nexus-text tracking-tight leading-none">
              {title}
            </h1>
            <div className="flex items-center gap-3 mt-1 text-[10px] font-mono uppercase tracking-widest text-nexus-muted">
              <span className="text-nexus-accent">{type}</span>
              <span className="text-nexus-800">|</span>
              <span className="opacity-50 select-all" title="Click to copy ID">
                ID: {id.slice(0, 8)}...
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center bg-nexus-900 border border-nexus-800 rounded-lg p-1">
          {/* View Mode Toggles */}
          <button
            onClick={() => onChangeViewMode('EDIT')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'EDIT' ? 'bg-nexus-800 text-nexus-accent shadow-sm' : 'text-nexus-muted hover:text-nexus-text'}`}
          >
            Editor
          </button>
          <button
            onClick={() => onChangeViewMode('PREVIEW')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'PREVIEW' ? 'bg-nexus-800 text-nexus-accent shadow-sm' : 'text-nexus-muted hover:text-nexus-text'}`}
          >
            Preview
          </button>
          <button
            onClick={() => onChangeViewMode('ENCYCLOPEDIA')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'ENCYCLOPEDIA' ? 'bg-nexus-800 text-nexus-accent shadow-sm' : 'text-nexus-muted hover:text-nexus-text'}`}
          >
            <BookOpen size={12} />
            Encyclopedia
          </button>
        </div>
      </div>

      {/* 
        ========================================
        MAIN WORKBENCH
        ========================================
      */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT RAIL: Hierarchy & Backlinks */}
        <aside className="w-80 flex-none border-r border-nexus-800/30 bg-nexus-900/20 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-nexus-800/30">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-nexus-muted flex items-center gap-2">
              <Network size={12} /> Structure
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">{hierarchySidebar}</div>
        </aside>

        {/* CENTER: Editor Canvas */}
        <main className="flex-1 flex flex-col min-w-0 bg-nexus-950 relative">{mainEditor}</main>

        {/* RIGHT RAIL: Metadata & History */}
        <aside className="w-80 flex-none border-l border-nexus-800/30 bg-nexus-900/20 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-nexus-800/30">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-nexus-muted flex items-center gap-2">
              <Clock size={12} /> Temporal & Data
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">{metadataRail}</div>
        </aside>
      </div>
    </div>
  );
};
