import React from 'react';
import {
  PenTool,
  FileText,
  GitBranch,
  Download,
  Upload,
  MessageSquare,
  Library as LibraryIcon,
  ScrollText,
  Save,
  PanelLeftClose,
  PanelLeft,
  RotateCw,
} from 'lucide-react';
import { StudioStage, RightWidgetMode } from '../../types';

interface StudioHeaderProps {
  isGalleryOpen: boolean;
  onToggleGallery: () => void;
  activeBookTitle?: string;
  stage: StudioStage;
  onSetStage: (s: StudioStage) => void;
  activeRightWidget: RightWidgetMode;
  onToggleRightWidget: (w: 'CHAT' | 'LIBRARY' | 'NOTES') => void;
  onSave: () => void;
  isSaveEnabled: boolean;
  onExportBlueprint?: () => void;
  onImportBlueprint?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  spineContextLabel?: string;
  isSaving?: boolean;
  lastSaved?: string | null;
}

export const StudioHeader: React.FC<StudioHeaderProps> = ({
  isGalleryOpen,
  onToggleGallery,
  activeBookTitle,
  stage,
  onSetStage,
  activeRightWidget,
  onToggleRightWidget,
  onSave,
  isSaveEnabled,
  onExportBlueprint,
  onImportBlueprint,
  spineContextLabel,
  isSaving,
  lastSaved,
}) => {
  return (
    <header className="h-16 border-b border-nexus-800 bg-nexus-900/50 backdrop-blur-xl flex items-center px-8 justify-between shrink-0 z-50 shadow-lg relative overflow-hidden">
      {isSaving && (
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-nexus-ruby to-transparent animate-shimmer" />
      )}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleGallery}
            className="p-2 text-nexus-muted hover:text-nexus-ruby transition-colors"
          >
            {isGalleryOpen ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
          </button>
          <div className="p-2 bg-nexus-ruby/10 rounded-xl border border-nexus-ruby/30 text-nexus-ruby">
            <PenTool size={20} />
          </div>
          <div>
            <h2 className="text-sm font-display font-black text-nexus-text uppercase tracking-[0.3em] leading-tight flex items-center gap-2">
              Story <span className="text-nexus-ruby">Studio</span>
              {isSaving && (
                <span className="flex h-1.5 w-1.5 rounded-full bg-nexus-ruby animate-pulse shadow-[0_0_8px_rgba(225,29,72,0.8)]" />
              )}
            </h2>
            {activeBookTitle && (
              <div className="flex items-center gap-2">
                <p className="text-[9px] font-mono text-nexus-muted uppercase tracking-widest truncate max-w-[120px]">
                  {activeBookTitle}
                </p>
                {lastSaved && !isSaving && (
                  <span className="text-[8px] font-mono text-nexus-muted/40 uppercase tracking-tighter">
                    • Last synced {lastSaved}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <nav className="flex items-center bg-nexus-950 border border-nexus-800 rounded-full p-1 shadow-inner">
          <StageButton
            active={stage === 'BLUEPRINT'}
            label="Global Blueprint"
            icon={FileText}
            onClick={() => onSetStage('BLUEPRINT')}
          />
          <StageButton
            active={stage === 'SPINE'}
            label={spineContextLabel || 'Story Spine'}
            icon={GitBranch}
            onClick={() => onSetStage('SPINE')}
          />
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {stage === 'BLUEPRINT' && (
          <div className="flex gap-2 mr-4">
            <button
              onClick={onExportBlueprint}
              className="p-2.5 rounded-xl bg-nexus-950 border border-nexus-800 text-nexus-muted hover:text-white"
            >
              <Download size={18} />
            </button>
            <label className="p-2.5 rounded-xl bg-nexus-950 border border-nexus-800 text-nexus-muted hover:text-white cursor-pointer">
              <Upload size={18} />
              <input type="file" className="hidden" onChange={onImportBlueprint} accept=".json" />
            </label>
          </div>
        )}

        <WidgetButton
          active={activeRightWidget === 'CHAT'}
          icon={MessageSquare}
          label="AI Chat"
          color="text-nexus-ruby"
          onClick={() => onToggleRightWidget('CHAT')}
        />
        <WidgetButton
          active={activeRightWidget === 'LIBRARY'}
          icon={LibraryIcon}
          label="World Bank"
          color="text-nexus-accent"
          onClick={() => onToggleRightWidget('LIBRARY')}
        />
        <WidgetButton
          active={activeRightWidget === 'NOTES'}
          icon={ScrollText}
          label="Notes"
          color="text-amber-500"
          onClick={() => onToggleRightWidget('NOTES')}
        />

        <button
          onClick={onSave}
          className={`px-6 py-2 rounded-full text-[10px] font-display font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 shadow-xl ${isSaveEnabled ? 'bg-nexus-ruby text-white hover:brightness-110' : 'bg-nexus-800 text-nexus-muted border border-nexus-700 cursor-not-allowed'}`}
          disabled={!isSaveEnabled || isSaving}
        >
          {isSaving ? <RotateCw size={14} className="animate-spin" /> : <Save size={14} />}
          {isSaving ? 'Syncing...' : 'Save Manuscript'}
        </button>
      </div>
    </header>
  );
};

interface StageButtonProps {
  active: boolean;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  onClick: () => void;
}

const StageButton = ({ active, label, icon: Icon, onClick }: StageButtonProps) => (
  <button
    onClick={onClick}
    className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${active ? 'bg-nexus-ruby text-white shadow-lg' : 'text-nexus-muted hover:text-nexus-text'}`}
  >
    <Icon size={12} /> {label}
  </button>
);

interface WidgetButtonProps {
  active: boolean;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  label: string;
  onClick: () => void;
}

const WidgetButton = ({ active, icon: Icon, color, onClick }: WidgetButtonProps) => (
  <button
    onClick={onClick}
    className={`p-2.5 rounded-xl border transition-all ${active ? `bg-nexus-900 ${color} border-${color} shadow-lg` : 'bg-nexus-950 border-nexus-800 text-nexus-muted'}`}
  >
    <Icon size={20} />
  </button>
);
