import React, { useState } from 'react';
import { Palette, Link2, X, ImageIcon, RotateCw, Wand2, Trash2 } from 'lucide-react';
import { NexusObject, isLink, isReified } from '../../../types';

interface WikiHeaderProps {
  currentObject: NexusObject;
  viewMode: 'NOTE' | 'ENCYCLOPEDIA';
  setViewMode: (mode: 'NOTE' | 'ENCYCLOPEDIA') => void;
  onUpdateObject: (id: string, updates: Partial<NexusObject>) => void;
  handleGenerateBg: () => void;
  isGeneratingBg: boolean;
}

const THEME_COLORS = [
  { name: 'Nexus Cyan', hex: '#06b6d4' },
  { name: 'Arcane Purple', hex: '#8b5cf6' },
  { name: 'Ruby Core', hex: '#e11d48' },
  { name: 'Essence Green', hex: '#10b981' },
  { name: 'Amber Glow', hex: '#f59e0b' },
  { name: 'Slate Ghost', hex: '#64748b' },
];

export const WikiHeader: React.FC<WikiHeaderProps> = ({
  currentObject,
  viewMode,
  setViewMode,
  onUpdateObject,
  handleGenerateBg,
  isGeneratingBg,
}) => {
  const [showCustomizer, setShowCustomizer] = useState(false);
  const isL = isLink(currentObject) && !isReified(currentObject);

  return (
    <div className="flex items-center justify-end mb-16 sticky top-4 z-50 pointer-events-none gap-4">
      <div className="flex bg-nexus-900/90 backdrop-blur-xl border border-nexus-700/50 rounded-full p-1.5 shadow-2xl pointer-events-auto items-center">
        {!isL && (
          <>
            <button
              onClick={() => setViewMode('NOTE')}
              className={`px-6 py-2.5 rounded-full text-[10px] font-display font-black uppercase tracking-[0.2em] transition-all ${viewMode === 'NOTE' ? 'bg-nexus-accent text-white shadow-lg' : 'text-nexus-muted hover:text-nexus-text'}`}
            >
              Chronicle
            </button>
            <button
              onClick={() => setViewMode('ENCYCLOPEDIA')}
              className={`px-6 py-2.5 rounded-full text-[10px] font-display font-black uppercase tracking-[0.2em] transition-all ${viewMode === 'ENCYCLOPEDIA' ? 'bg-nexus-accent text-white shadow-lg' : 'text-nexus-muted hover:text-nexus-text'}`}
            >
              Encyclopedia
            </button>

            <div className="w-px h-6 bg-nexus-800 mx-2" />

            <button
              onClick={() => setShowCustomizer(!showCustomizer)}
              className={`p-2.5 rounded-full transition-all ${showCustomizer ? 'bg-nexus-accent text-white' : 'text-nexus-muted hover:text-nexus-text'}`}
              title="Visual Neural ID"
            >
              <Palette size={14} />
            </button>
          </>
        )}
        {isL && (
          <button className="px-6 py-2.5 rounded-full bg-nexus-arcane text-white shadow-lg text-[10px] font-display font-black uppercase tracking-[0.2em] flex items-center gap-2">
            <Link2 size={12} /> Neural Logic Editor
          </button>
        )}
      </div>

      {showCustomizer && !isL && (
        <div className="absolute top-16 right-0 w-72 bg-nexus-900 border border-nexus-700 rounded-[32px] p-6 shadow-2xl pointer-events-auto animate-in fade-in zoom-in-95 backdrop-blur-3xl">
          <div className="space-y-8">
            <div>
              <h4 className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                <Palette size={12} /> Unit Signature
              </h4>
              <div className="grid grid-cols-6 gap-2">
                {THEME_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => onUpdateObject(currentObject.id, { theme_color: c.hex })}
                    className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 shadow-sm ${(currentObject as any).theme_color === c.hex ? 'border-white' : 'border-transparent'}`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
                <button
                  onClick={() => onUpdateObject(currentObject.id, { theme_color: undefined })}
                  className="w-7 h-7 rounded-full border border-nexus-800 flex items-center justify-center text-nexus-muted hover:bg-nexus-800 transition-colors"
                >
                  <X size={10} />
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                <ImageIcon size={12} /> Neural Ambience
              </h4>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleGenerateBg}
                  disabled={isGeneratingBg}
                  className="w-full py-3 bg-nexus-accent text-white rounded-2xl text-[10px] font-black flex items-center justify-center gap-2 uppercase tracking-widest disabled:opacity-50 transition-all shadow-lg shadow-nexus-accent/20"
                >
                  {isGeneratingBg ? (
                    <RotateCw size={12} className="animate-spin" />
                  ) : (
                    <Wand2 size={12} />
                  )}
                  Manifest Atmosphere
                </button>
                {(currentObject as any).background_url && (
                  <button
                    onClick={() => onUpdateObject(currentObject.id, { background_url: undefined })}
                    className="w-full py-3 border border-red-500/20 text-red-500 rounded-2xl text-[10px] font-black flex items-center justify-center gap-2 uppercase tracking-widest hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 size={12} />
                    Purge Layer
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
