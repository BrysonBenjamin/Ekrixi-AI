import React, { useState } from 'react';
import { BrainCircuit, Key, Check, Eye, EyeOff } from 'lucide-react';
import { useLLM } from '../hooks/useLLM';

export const LLMSettingsPanel: React.FC = () => {
  const { hasKey, isReady, setKey } = useLLM();
  const [inputKey, setInputKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isEditing, setIsEditing] = useState(!hasKey);

  const handleSave = () => {
    if (inputKey.trim()) {
      setKey(inputKey.trim());
      setIsEditing(false);
      setInputKey('');
    }
  };

  return (
    <div className="bg-nexus-900 border border-nexus-800 rounded-3xl p-8 shadow-xl">
      <h2 className="text-lg font-display font-bold text-nexus-text mb-6 flex items-center gap-3">
        <BrainCircuit size={20} className={isReady ? 'text-nexus-accent' : 'text-nexus-muted'} />
        Narrative Intelligence
      </h2>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-nexus-950 border border-nexus-800 rounded-xl">
          <div className="flex items-center gap-3">
            <div
              className={`w-2 h-2 rounded-full ${isReady ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}
            />
            <span className="text-sm font-mono text-nexus-text">
              STATUS: {isReady ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>

        {!isEditing && hasKey ? (
          <div className="flex items-center justify-between">
            <span className="text-xs text-nexus-muted font-mono">
              API Key configured (Ending in ••••)
            </span>
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs text-nexus-accent hover:text-white transition-colors uppercase font-bold tracking-wider"
            >
              Change Key
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-[10px] text-nexus-muted uppercase tracking-widest font-bold">
              Gemini API Key
            </label>
            <div className="relative group">
              <Key
                size={14}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-nexus-muted group-focus-within:text-nexus-accent transition-colors"
              />
              <input
                type={showKey ? 'text' : 'password'}
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="Paste AI Studio Key here..."
                className="w-full bg-nexus-950 border border-nexus-800 rounded-xl py-3 pl-10 pr-12 text-sm text-nexus-text placeholder-nexus-muted/30 focus:outline-none focus:border-nexus-accent transition-all font-mono"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-nexus-muted hover:text-white transition-colors"
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <button
              onClick={handleSave}
              disabled={!inputKey.trim()}
              className="w-full py-3 mt-2 bg-nexus-accent text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-nexus-accent/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check size={14} />
              Save Configuration
            </button>
            <p className="text-[10px] text-nexus-muted pt-2 opacity-50 text-center">
              Key is stored locally in your browser.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
