import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronRight, Sparkles } from 'lucide-react';

export interface TutorialStep {
  target: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  isInteraction?: boolean;
}

interface TutorialContextType {
  activeTutorial: string | null;
  currentStepIdx: number;
  startTutorial: (id: string, steps: TutorialStep[]) => void;
  completeTutorial: (id: string) => void;
  nextStep: () => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (!context) throw new Error('useTutorial must be used within TutorialProvider');
  return context;
};

export const TutorialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTutorial, setActiveTutorial] = useState<string | null>(null);
  const [steps, setSteps] = useState<TutorialStep[]>([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const attemptedRef = useRef<Set<string>>(new Set());

  const startTutorial = useCallback((id: string, tutorialSteps: TutorialStep[]) => {
    // Short-circuited for maintenance
    return;
  }, []);

  const completeTutorial = useCallback((id: string) => {
    const saved = localStorage.getItem('nexus_tutorials_completed');
    const completed = saved ? JSON.parse(saved) : [];
    if (!completed.includes(id)) {
      const updated = [...completed, id];
      localStorage.setItem('nexus_tutorials_completed', JSON.stringify(updated));
    }
    setActiveTutorial(null);
    setSteps([]);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStepIdx < steps.length - 1) {
      setCurrentStepIdx((prev) => prev + 1);
    } else if (activeTutorial) {
      completeTutorial(activeTutorial);
    }
  }, [currentStepIdx, steps.length, activeTutorial, completeTutorial]);

  useEffect(() => {
    if (activeTutorial && steps[currentStepIdx]) {
      const updatePosition = () => {
        const el = document.querySelector(steps[currentStepIdx].target);
        if (el) {
          setTargetRect(el.getBoundingClientRect());
        } else {
          setTargetRect(null);
        }
      };

      updatePosition();
      const interval = setInterval(updatePosition, 100);
      return () => clearInterval(interval);
    }
  }, [activeTutorial, steps, currentStepIdx]);

  return (
    <TutorialContext.Provider
      value={{ activeTutorial, currentStepIdx, startTutorial, completeTutorial, nextStep }}
    >
      {children}
      {activeTutorial && targetRect && steps[currentStepIdx] && (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-all duration-500"
            style={{
              maskImage: `radial-gradient(circle at ${targetRect.left + targetRect.width / 2}px ${targetRect.top + targetRect.height / 2}px, transparent ${Math.max(targetRect.width, targetRect.height) / 1.5}px, black ${Math.max(targetRect.width, targetRect.height) * 2}px)`,
            }}
          />

          <div
            className="absolute pointer-events-auto w-72 bg-nexus-900 border border-nexus-700 rounded-[32px] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-300"
            style={{
              left:
                steps[currentStepIdx].position === 'right'
                  ? targetRect.right + 24
                  : steps[currentStepIdx].position === 'left'
                    ? targetRect.left - 312
                    : targetRect.left + targetRect.width / 2 - 144,
              top:
                steps[currentStepIdx].position === 'bottom'
                  ? targetRect.bottom + 24
                  : steps[currentStepIdx].position === 'top'
                    ? targetRect.top - 220
                    : targetRect.top + targetRect.height / 2 - 100,
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-1.5 bg-nexus-accent/10 rounded-lg">
                <Sparkles size={14} className="text-nexus-accent" />
              </div>
              <span className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest">
                Neural Assist
              </span>
            </div>
            <h4 className="text-sm font-display font-bold text-nexus-text mb-2">
              {steps[currentStepIdx].title}
            </h4>
            <p className="text-xs text-nexus-muted leading-relaxed font-serif italic mb-6">
              "{steps[currentStepIdx].content}"
            </p>

            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-1">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 rounded-full transition-all ${i === currentStepIdx ? 'w-4 bg-nexus-accent' : 'w-1 bg-nexus-800'}`}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => completeTutorial(activeTutorial!)}
                  className="p-2 text-nexus-muted hover:text-red-400 transition-colors"
                >
                  <X size={14} />
                </button>
                {!steps[currentStepIdx].isInteraction && (
                  <button
                    onClick={nextStep}
                    className="bg-nexus-accent text-white px-4 py-2 rounded-xl text-[10px] font-display font-black uppercase tracking-widest flex items-center gap-2 hover:brightness-110"
                  >
                    {currentStepIdx === steps.length - 1 ? 'Finish' : 'Next'}{' '}
                    <ChevronRight size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </TutorialContext.Provider>
  );
};
