import React from 'react';
import { Sparkles, Terminal, AlertCircle, Info } from 'lucide-react';

interface ScannerInputProps {
  value: string;
  onChange: (val: string) => void;
  onScan: () => void;
  error: string | null;
}

export const ScannerInput: React.FC<ScannerInputProps> = ({ value, onChange, onScan, error }) => {
  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex-1 flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-1.5 ml-1">
          <h2 className="text-base md:text-lg font-bold text-nexus-text flex items-center gap-2">
            <Terminal size={16} className="text-nexus-accent" /> Lore Injection Buffer
          </h2>
          <p className="text-[11px] md:text-xs text-nexus-muted font-medium">
            Paste character bios, location descriptions, or history summaries below.
          </p>
        </div>

        <div className="flex-1 relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-nexus-accent/20 to-transparent rounded-2xl md:rounded-[32px] blur opacity-10 group-focus-within:opacity-20 transition-opacity"></div>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Ex: 'The Spire of Elara is a gravity-anchored structure built in the year 402 AC by the Silent Monks. It contains the Resonance Stone...'"
            className="relative w-full h-full bg-nexus-950/80 backdrop-blur-sm border border-nexus-800 rounded-2xl md:rounded-[32px] p-5 md:p-8 pb-14 md:pb-8 text-nexus-text outline-none focus:border-nexus-accent transition-all resize-none font-sans text-base md:text-lg leading-relaxed no-scrollbar placeholder:text-nexus-muted/20"
          />

          <div className="absolute bottom-4 right-4 md:bottom-6 md:right-8 flex items-center gap-4 pointer-events-none">
            <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-mono text-nexus-muted bg-nexus-900/80 px-2 py-1 md:px-3 md:py-1.5 rounded-full border border-nexus-800/50 backdrop-blur-md shadow-lg">
              <Info size={10} className="md:w-3 md:h-3" /> {value.length} CHARACTERS
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 md:p-4 bg-red-500/10 border border-red-500/30 rounded-xl md:rounded-2xl flex items-center gap-3 text-red-500 text-xs md:text-sm animate-in shake-in duration-300">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <button
          onClick={onScan}
          disabled={!value.trim()}
          className={`
                        h-14 md:h-20 rounded-xl md:rounded-[28px] font-display font-black text-[10px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.4em] flex items-center justify-center gap-3 transition-all
                        ${
                          value.trim()
                            ? 'bg-nexus-accent hover:brightness-110 text-white shadow-[0_0_20px_rgba(6,182,212,0.15)] md:shadow-[0_0_40px_rgba(6,182,212,0.2)] active:scale-95'
                            : 'bg-nexus-900 text-nexus-muted cursor-not-allowed border border-nexus-800'
                        }
                    `}
        >
          <Sparkles size={16} className={`md:w-5 md:h-5 ${value.trim() ? 'animate-pulse' : ''}`} />
          <span>EXECUTE EXTRACTION</span>
        </button>
      </div>
    </div>
  );
};
