import React, { useState } from 'react';
import {
  Activity,
  Compass,
  Sparkles,
  BrainCircuit,
  Layers,
  Target,
  X,
  RotateCw,
  AlertCircle,
} from 'lucide-react';
// Fix: Import StudioBlock from types
import { StudioBlock } from '../types';
import { useLLM } from '../../system/hooks/useLLM';
import { GEMINI_MODELS } from '../../../core/llm';
import { NexusObject } from '../../../types';

interface StudioMacroAnalyzerProps {
  blocks: StudioBlock[];
  onUpdateBlocks: (blocks: StudioBlock[]) => void;
  onClose: () => void;
}

interface AnalysisAlternative {
  archetype: string;
  rationale: string;
  fidelityGain: number;
}

interface AnalysisResult {
  fitScore: number;
  critique: string;
  frictionPoints: string[];
  alternatives: AnalysisAlternative[];
}

export const StudioMacroAnalyzer: React.FC<StudioMacroAnalyzerProps> = ({
  blocks,
  onUpdateBlocks,
  onClose,
}) => {
  const { generateContent } = useLLM();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const thesis = blocks.find((b) => b.type === 'THESIS')?.data.text || '';
  const approach = blocks.find((b) => b.type === 'LITERARY_APPROACH')?.data || {
    archetype: 'THREE_ACT',
    rationale: '',
  };

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const contextSummary = blocks.map((b) => `${b.type}: ${JSON.stringify(b.data)}`).join('\n');

      const systemInstruction = `
                ACT AS: The Macro-Sequence Oracle for Ekrixi AI.
                CONTEXT: I am providing a story Blueprint consisting of blocks (Thesis, Delta, Context, etc.).
                BLOCKS:
                ${contextSummary}
                
                TASK:
                1. Analyze the FIT of the chosen Archetype (${approach.archetype}) based on the Thesis and Rationale.
                2. Score the fit from 0-100%.
                3. Identify 3 "Structural Friction Points" where the logic might break.
                4. Suggest 2 alternative archetypes that could yield a "Higher Neural Fidelity".
                
                OUTPUT: Return valid JSON matching this schema:
                {
                    "fitScore": number,
                    "critique": string,
                    "frictionPoints": string[],
                    "alternatives": [{ "archetype": string, "rationale": string, "fidelityGain": number }]
                }
            `;

      const response = await generateContent({
        model: GEMINI_MODELS.PRO,
        systemInstruction: systemInstruction,
        contents: [{ role: 'user', parts: [{ text: 'Evaluate structural blueprint fidelity.' }] }],
        generationConfig: { responseMimeType: 'application/json' },
      });

      const resultJson = await response.response;
      const result = JSON.parse(resultJson.text() || '{}');
      setAnalysisResult(result);
    } catch (err) {
      console.error('Macro Analysis Failed', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSwitchArchetype = (newArch: string) => {
    const nextBlocks = blocks.map((b) =>
      b.type === 'LITERARY_APPROACH' ? { ...b, data: { ...b.data, archetype: newArch } } : b,
    );
    onUpdateBlocks(nextBlocks);
    // Reset analysis when switching
    setAnalysisResult(null);
  };

  return (
    <div className="h-full flex flex-col font-sans text-nexus-text">
      <header className="h-20 border-b border-nexus-800 flex items-center justify-between px-10 bg-nexus-950/50">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-nexus-ruby/10 rounded-2xl text-nexus-ruby border border-nexus-ruby/30">
            <BrainCircuit size={24} />
          </div>
          <div>
            <h2 className="text-xl font-display font-black text-nexus-text uppercase tracking-tighter">
              Macro <span className="text-nexus-ruby">Analyzer</span>
            </h2>
            <p className="text-[10px] font-mono text-nexus-muted uppercase tracking-widest">
              Theoretical Alignment Engine
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-nexus-muted hover:text-white transition-colors"
        >
          <X size={24} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar p-10 space-y-10">
        {/* 1. Chosen Logic Context */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <Compass size={16} className="text-nexus-ruby" />
            <span className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.3em]">
              Current Blueprint Context
            </span>
          </div>

          <div className="bg-nexus-950 border border-nexus-800 rounded-[32px] p-8 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
              <Target size={120} />
            </div>
            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <div className="px-3 py-1 bg-nexus-ruby/10 border border-nexus-ruby/30 rounded-full text-[9px] font-black text-nexus-ruby uppercase tracking-widest">
                  {approach.archetype} Protocol
                </div>
                <div className="text-[9px] font-mono text-nexus-muted uppercase opacity-40">
                  Thesis Active
                </div>
              </div>
              <h3 className="text-2xl font-serif italic text-nexus-text/90 leading-tight">
                "{thesis || 'No thesis defined.'}"
              </h3>
              <p className="text-xs text-nexus-muted leading-relaxed border-t border-nexus-800 pt-4 font-serif">
                <span className="text-nexus-ruby font-bold uppercase text-[9px] tracking-widest block mb-2">
                  Rationale:
                </span>
                {approach.rationale || 'No specific structural rationale provided by the author.'}
              </p>
            </div>
          </div>
        </div>

        {/* 2. Analysis Trigger / Result */}
        {!analysisResult ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in duration-700">
            <div className="relative">
              <div className="absolute inset-0 bg-nexus-ruby/10 rounded-full blur-3xl animate-pulse" />
              <div
                className={`p-10 rounded-full border-2 border-dashed border-nexus-800 relative ${isAnalyzing ? 'animate-spin-slow' : ''}`}
              >
                <Activity size={64} className="text-nexus-muted opacity-20" />
              </div>
            </div>
            <div className="max-w-xs space-y-3">
              <h3 className="text-lg font-display font-bold uppercase tracking-tight">
                Idle State
              </h3>
              <p className="text-xs text-nexus-muted font-serif italic leading-relaxed">
                "Synchronize the Blueprint logic with narrative archetypes to evaluate sequence
                fidelity."
              </p>
            </div>
            <button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
              className={`
                                px-12 py-5 rounded-[24px] font-display font-black text-xs uppercase tracking-[0.3em] transition-all flex items-center gap-4 shadow-2xl
                                ${
                                  isAnalyzing
                                    ? 'bg-nexus-800 text-nexus-muted cursor-not-allowed'
                                    : 'bg-nexus-ruby text-white shadow-nexus-ruby/20 hover:scale-105 active:scale-95'
                                }
                            `}
            >
              {isAnalyzing ? (
                <RotateCw className="animate-spin" size={18} />
              ) : (
                <Sparkles size={18} />
              )}
              {isAnalyzing ? 'Synthesizing Patterns...' : 'Run Macro Audit'}
            </button>
          </div>
        ) : (
          <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-700">
            {/* Fit Score Metric */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-nexus-900 border border-nexus-800 p-8 rounded-[40px] shadow-xl space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest">
                    Neural Fit Score
                  </span>
                  <span
                    className={`text-4xl font-display font-black tracking-tighter ${analysisResult.fitScore > 80 ? 'text-nexus-essence' : 'text-amber-500'}`}
                  >
                    {analysisResult.fitScore}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-nexus-950 rounded-full overflow-hidden border border-nexus-800">
                  <div
                    className={`h-full transition-all duration-1000 ${analysisResult.fitScore > 80 ? 'bg-nexus-essence shadow-[0_0_15px_var(--essence-color)]' : 'bg-amber-500 shadow-[0_0_15px_#f59e0b]'}`}
                    style={{ width: `${analysisResult.fitScore}%` }}
                  />
                </div>
                <p className="text-[11px] text-nexus-muted font-serif italic leading-relaxed">
                  "{analysisResult.critique}"
                </p>
              </div>

              <div className="bg-nexus-900 border border-nexus-800 p-8 rounded-[40px] shadow-xl space-y-6">
                <div className="flex items-center gap-3">
                  <AlertCircle size={16} className="text-red-500" />
                  <span className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest">
                    Causal Friction Points
                  </span>
                </div>
                <div className="space-y-4">
                  {analysisResult.frictionPoints.map((point: string, i: number) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 bg-red-500/5 border border-red-500/20 rounded-2xl"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-1.5" />
                      <span className="text-[10px] font-medium text-nexus-text/80 leading-snug">
                        {point}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Archetype Suggestions */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 px-2">
                <Layers size={16} className="text-nexus-ruby" />
                <span className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.3em]">
                  Alternative Sequence Protocols
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysisResult.alternatives.map((alt: AnalysisAlternative, i: number) => (
                  <div
                    key={i}
                    className="group bg-nexus-900 border border-nexus-800 p-6 rounded-[32px] hover:border-nexus-ruby transition-all flex flex-col gap-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-display font-black text-nexus-text uppercase tracking-widest">
                        {alt.archetype}
                      </div>
                      <div className="text-[9px] font-mono text-nexus-essence bg-nexus-essence/10 px-2 py-1 rounded-full border border-nexus-essence/30">
                        +{alt.fidelityGain}% Gain
                      </div>
                    </div>
                    <p className="text-[10px] text-nexus-muted font-serif italic leading-relaxed h-12 line-clamp-2">
                      "{alt.rationale}"
                    </p>
                    <button
                      onClick={() => handleSwitchArchetype(alt.archetype)}
                      className="w-full py-3 bg-nexus-950 border border-nexus-800 rounded-2xl text-[9px] font-black uppercase tracking-widest text-nexus-muted group-hover:bg-nexus-ruby group-hover:text-white group-hover:border-nexus-ruby transition-all flex items-center justify-center gap-2"
                    >
                      <RotateCw size={12} /> Apply Protocol
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="p-8 border-t border-nexus-800 bg-nexus-950/80 backdrop-blur-xl flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 opacity-70">
          <div className="w-10 h-10 rounded-full bg-nexus-900 border border-nexus-800 flex items-center justify-center text-nexus-ruby shrink-0 shadow-lg">
            <Compass size={20} />
          </div>
          <div>
            <div className="text-[10px] font-display font-black text-nexus-text uppercase tracking-widest">
              The Oracle
            </div>
            <div className="text-[8px] text-nexus-muted font-mono uppercase tracking-[0.2em] opacity-60">
              Sequence Optimization v6.2
            </div>
          </div>
        </div>
        {analysisResult && (
          <button
            onClick={() => setAnalysisResult(null)}
            className="text-[10px] font-black text-nexus-muted hover:text-white uppercase tracking-widest flex items-center gap-2"
          >
            <RotateCw size={14} /> Re-Audit
          </button>
        )}
      </footer>
    </div>
  );
};
