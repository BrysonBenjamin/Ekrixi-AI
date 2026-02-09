import React, { useMemo, useState } from 'react';
import { Activity, ArrowRight, ArrowLeft, Check, BookOpen, X } from 'lucide-react';
import { LITERARY_ARCHETYPES } from './archetypes/data';

const SlideVisualizer = ({ type }: { type: string }) => {
  switch (type) {
    case 'THREE_ACT_1':
      return (
        <svg
          width="320"
          height="160"
          viewBox="0 0 320 160"
          className="animate-in fade-in duration-1000"
        >
          <line
            x1="20"
            y1="130"
            x2="300"
            y2="130"
            stroke="var(--bg-800)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <rect
            x="20"
            y="110"
            width="80"
            height="40"
            rx="8"
            fill="var(--nexus-ruby)"
            opacity="0.1"
          />
          <text
            x="30"
            y="100"
            fill="var(--nexus-ruby)"
            fontSize="10"
            className="font-mono font-bold"
          >
            ACT I
          </text>
          <path
            d="M 20 130 Q 100 130 140 60"
            fill="none"
            stroke="var(--nexus-ruby)"
            strokeWidth="4"
            strokeDasharray="300"
            strokeDashoffset="300"
            className="animate-[dash_2s_ease-out_forwards]"
          />
          <circle
            cx="140"
            cy="60"
            r="8"
            fill="var(--nexus-ruby)"
            className="animate-pulse shadow-lg"
          />
          <style>{`@keyframes dash { to { stroke-dashoffset: 0; } }`}</style>
        </svg>
      );
    case 'THREE_ACT_2':
      return (
        <svg
          width="320"
          height="160"
          viewBox="0 0 320 160"
          className="animate-in fade-in duration-1000"
        >
          <line
            x1="20"
            y1="80"
            x2="300"
            y2="80"
            stroke="var(--bg-800)"
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.3"
          />
          <path
            d="M 160 20 L 160 140"
            stroke="var(--nexus-ruby)"
            strokeWidth="2"
            strokeDasharray="5,5"
          />
          <circle cx="160" cy="80" r="12" fill="var(--nexus-ruby)" className="animate-pulse" />
          <path
            d="M 20 100 L 160 80 L 300 40"
            fill="none"
            stroke="var(--nexus-ruby)"
            strokeWidth="5"
          />
          <text
            x="145"
            y="15"
            fill="var(--nexus-ruby)"
            fontSize="10"
            className="font-mono font-bold"
          >
            MIDPOINT
          </text>
        </svg>
      );
    case 'THREE_ACT_3':
      return (
        <svg
          width="320"
          height="160"
          viewBox="0 0 320 160"
          className="animate-in fade-in duration-1000"
        >
          <path
            d="M 20 130 L 220 30"
            fill="none"
            stroke="var(--nexus-ruby)"
            strokeWidth="6"
            opacity="0.2"
          />
          <path
            d="M 20 130 L 220 30"
            fill="none"
            stroke="var(--nexus-ruby)"
            strokeWidth="6"
            strokeDasharray="500"
            strokeDashoffset="500"
            className="animate-[dash_1s_ease-out_forwards]"
          />
          <path
            d="M 220 30 L 300 30"
            fill="none"
            stroke="var(--nexus-ruby)"
            strokeWidth="6"
            strokeDasharray="100"
            strokeDashoffset="100"
            className="animate-[dash_0.5s_ease-out_1s_forwards]"
          />
          <circle cx="220" cy="30" r="14" fill="var(--nexus-ruby)" filter="url(#glow)">
            <animate attributeName="r" values="14;18;14" dur="1s" repeatCount="indefinite" />
          </circle>
          <text
            x="240"
            y="20"
            fill="var(--nexus-ruby)"
            fontSize="12"
            className="font-display font-black"
          >
            CLIMAX
          </text>
        </svg>
      );
    case 'HERO_1':
      return (
        <svg
          width="320"
          height="160"
          viewBox="0 0 320 160"
          className="animate-in fade-in duration-1000"
        >
          <rect x="0" y="0" width="160" height="160" fill="var(--bg-800)" opacity="0.2" />
          <text
            x="30"
            y="30"
            fill="var(--nexus-muted)"
            fontSize="10"
            className="font-mono uppercase"
          >
            Ordinary World
          </text>
          <text
            x="180"
            y="30"
            fill="var(--nexus-accent)"
            fontSize="10"
            className="font-mono uppercase"
          >
            Special World
          </text>
          <line
            x1="160"
            y1="20"
            x2="160"
            y2="140"
            stroke="var(--nexus-accent)"
            strokeWidth="2"
            strokeDasharray="10,5"
          />
          <circle cx="60" cy="80" r="12" fill="var(--nexus-accent)">
            <animate attributeName="cx" values="60;260" dur="4s" repeatCount="indefinite" />
          </circle>
        </svg>
      );
    case 'HERO_2':
      return (
        <svg
          width="320"
          height="160"
          viewBox="0 0 320 160"
          className="animate-in fade-in duration-1000"
        >
          <circle
            cx="160"
            cy="80"
            r="50"
            fill="none"
            stroke="var(--nexus-accent)"
            strokeWidth="2"
            strokeDasharray="5,10"
            className="animate-spin-slow"
          />
          <circle cx="160" cy="80" r="30" fill="var(--nexus-accent)" opacity="0.2" />
          <path
            d="M 130 80 Q 160 40 190 80 Q 160 120 130 80"
            fill="none"
            stroke="white"
            strokeWidth="2"
            className="animate-pulse"
          />
          <text
            x="135"
            y="145"
            fill="var(--nexus-accent)"
            fontSize="10"
            className="font-display font-black uppercase tracking-widest"
          >
            THE ABYSS
          </text>
        </svg>
      );
    case 'HERO_3':
      return (
        <svg
          width="320"
          height="160"
          viewBox="0 0 320 160"
          className="animate-in fade-in duration-1000"
        >
          <circle cx="160" cy="80" r="15" fill="var(--nexus-accent)" filter="url(#glow)">
            <animate attributeName="r" values="15;40;15" dur="3s" repeatCount="indefinite" />
            <animate
              attributeName="opacity"
              values="0.8;0.2;0.8"
              dur="3s"
              repeatCount="indefinite"
            />
          </circle>
          <path
            d="M 160 20 L 160 140 M 100 80 L 220 80"
            stroke="white"
            strokeWidth="1"
            opacity="0.3"
          />
          <text
            x="125"
            y="150"
            fill="var(--nexus-accent)"
            fontSize="11"
            className="font-display font-black uppercase tracking-[0.2em]"
          >
            INTEGRATION
          </text>
        </svg>
      );
    case 'TRAGEDY_1':
      return (
        <svg
          width="240"
          height="120"
          viewBox="0 0 240 120"
          className="animate-in fade-in duration-1000"
        >
          <rect
            x="100"
            y="20"
            width="40"
            height="80"
            fill="none"
            stroke="var(--nexus-ruby)"
            strokeWidth="3"
          />
          <path d="M 90 20 L 150 20" stroke="var(--nexus-ruby)" strokeWidth="5" />
          <path
            d="M 110 50 L 130 70"
            stroke="white"
            strokeWidth="2"
            opacity="0.5"
            className="animate-pulse"
          />
        </svg>
      );
    case 'RASH_1':
      return (
        <svg
          width="240"
          height="120"
          viewBox="0 0 240 120"
          className="animate-in fade-in duration-1000"
        >
          <circle cx="120" cy="60" r="10" fill="var(--accent-color)" />
          <path
            d="M 40 20 Q 120 60 40 100"
            fill="none"
            stroke="var(--arcane-color)"
            strokeWidth="2"
            opacity="0.6"
          />
          <path
            d="M 200 20 Q 120 60 200 100"
            fill="none"
            stroke="var(--nexus-ruby)"
            strokeWidth="2"
            opacity="0.6"
          />
        </svg>
      );
    default:
      return <Activity size={80} className="text-nexus-muted opacity-20 animate-pulse" />;
  }
};

export const TheoryGuideModal = ({
  archetypeId,
  onClose,
  activeColorClass,
}: {
  archetypeId: string;
  onClose: () => void;
  activeColorClass: string;
}) => {
  const archetype = useMemo(
    () => LITERARY_ARCHETYPES.find((a) => a.id === archetypeId),
    [archetypeId],
  );
  const [slideIdx, setSlideIdx] = useState(0);

  if (!archetype) return null;

  const currentSlide = archetype.slides[slideIdx];
  const SlideIcon = currentSlide.icon;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-nexus-950/60 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-nexus-900 border border-nexus-800 rounded-[48px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-10 flex flex-col h-[550px]">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div
                className={`p-3 bg-${activeColorClass}/10 rounded-2xl border border-${activeColorClass}/30 text-${activeColorClass}`}
              >
                <BookOpen size={24} />
              </div>
              <div>
                <h3 className="text-sm font-display font-black text-nexus-text uppercase tracking-widest">
                  {archetype.label}
                </h3>
                <p className="text-[9px] font-mono text-nexus-muted uppercase tracking-[0.2em] mt-0.5">
                  Theory Oracle v3.0
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-nexus-muted hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div
            className="flex-1 flex flex-col items-center justify-center text-center space-y-8 animate-in slide-in-from-right-4 duration-300"
            key={slideIdx}
          >
            <div className="p-8 rounded-[40px] bg-nexus-950/40 border border-nexus-800 flex items-center justify-center w-full min-h-[160px] shadow-inner">
              <SlideVisualizer type={currentSlide.visual || ''} />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                <div
                  className={`p-1.5 rounded-lg bg-${activeColorClass}/20 text-${activeColorClass}`}
                >
                  <SlideIcon size={16} />
                </div>
                <h4 className="text-xl font-display font-black text-nexus-text uppercase tracking-tight">
                  {currentSlide.title}
                </h4>
              </div>
              <p className="text-sm text-nexus-muted font-serif italic leading-relaxed max-w-sm mx-auto">
                "{currentSlide.content}"
              </p>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between">
            <div className="flex gap-2">
              {archetype.slides.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-500 ${i === slideIdx ? `w-8 bg-${activeColorClass} shadow-[0_0_8px_rgba(225,29,72,0.5)]` : 'w-2 bg-nexus-800'}`}
                />
              ))}
            </div>
            <div className="flex gap-3">
              <button
                disabled={slideIdx === 0}
                onClick={() => setSlideIdx((prev) => prev - 1)}
                className="p-4 rounded-2xl bg-nexus-950 border border-nexus-800 text-nexus-muted hover:text-white disabled:opacity-20 transition-all active:scale-95 shadow-sm"
              >
                <ArrowLeft size={18} />
              </button>
              <button
                onClick={() =>
                  slideIdx === archetype.slides.length - 1
                    ? onClose()
                    : setSlideIdx((prev) => prev + 1)
                }
                className={`p-4 rounded-2xl bg-${activeColorClass} text-white shadow-xl shadow-${activeColorClass}/20 transition-all hover:brightness-110 active:scale-95`}
              >
                {slideIdx === archetype.slides.length - 1 ? (
                  <Check size={18} />
                ) : (
                  <ArrowRight size={18} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
