import React from 'react';
import { Monitor, Moon, Sun, Palette, Layers, Terminal, CheckCircle } from 'lucide-react';
import { ThemeMode } from '../../../store/useUIStore';

interface ThemeSelectorProps {
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ theme, onThemeChange }) => {
  return (
    <div className="bg-nexus-900 border border-nexus-800 rounded-3xl p-8 shadow-xl">
      <h2 className="text-lg font-display font-bold text-nexus-text mb-6 flex items-center gap-3">
        <Palette size={20} className="text-nexus-500" />
        Interface Protocols
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ThemeButton
          mode="modern"
          currentMode={theme}
          onSelect={onThemeChange}
          title="Deep Field"
          sub="Default Immersion"
          icon={Monitor}
        />
        <ThemeButton
          mode="legacy"
          currentMode={theme}
          onSelect={onThemeChange}
          title="Phosphor"
          sub="Terminal Matrix"
          icon={Terminal}
        />
        <ThemeButton
          mode="vanilla-dark"
          currentMode={theme}
          onSelect={onThemeChange}
          title="Onyx"
          sub="Neutral Dark"
          icon={Moon}
        />
        <ThemeButton
          mode="vanilla-light"
          currentMode={theme}
          onSelect={onThemeChange}
          title="Manuscript"
          sub="Clean Academic"
          icon={Sun}
        />
      </div>
    </div>
  );
};

const ThemeButton = ({ mode, currentMode, onSelect, title, sub, icon: Icon }: any) => {
  const isActive = currentMode === mode;
  return (
    <button
      onClick={() => onSelect(mode)}
      className={`
                flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group
                ${isActive ? 'bg-nexus-500/10 border-nexus-500' : 'bg-nexus-950/30 border-nexus-800 hover:border-nexus-700'}
            `}
    >
      <div
        className={`p-2.5 rounded-xl transition-colors ${isActive ? 'bg-nexus-500 text-white shadow-lg shadow-nexus-500/20' : 'bg-nexus-800 text-nexus-muted group-hover:text-nexus-text'}`}
      >
        <Icon size={20} />
      </div>
      <div>
        <div
          className={`text-sm font-bold ${isActive ? 'text-nexus-text' : 'text-nexus-muted group-hover:text-nexus-text'}`}
        >
          {title}
        </div>
        <div className="text-[10px] text-nexus-muted uppercase tracking-widest font-mono">
          {sub}
        </div>
      </div>
      {isActive && <CheckCircle size={16} className="ml-auto text-nexus-500" />}
    </button>
  );
};
