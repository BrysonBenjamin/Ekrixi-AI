import React, { useState } from 'react';
import {
  Key,
  ExternalLink,
  ArrowRight,
  CheckCircle2,
  Shield,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Play,
} from 'lucide-react';
import { useLLM } from '../../system/hooks/useLLM';

interface FirstRunOnboardingProps {
  onComplete: () => void;
}

const InstructionsSlide = ({
  title,
  children,
  icon: Icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: any;
}) => (
  <div className="flex flex-col h-full animate-in fade-in duration-300">
    <div className="flex items-center gap-2 mb-3">
      {Icon && <Icon className="w-5 h-5 text-nexus-accent" />}
      <h3 className="text-lg font-bold text-nexus-text">{title}</h3>
    </div>
    <div className="text-sm text-nexus-text/90 leading-relaxed space-y-3 flex-1 overflow-y-auto pr-1">
      {children}
    </div>
  </div>
);

export const FirstRunOnboarding: React.FC<FirstRunOnboardingProps> = ({ onComplete }) => {
  const { setKey } = useLLM();
  const [inputKey, setInputKey] = useState('');
  const [useCommunityKey, setUseCommunityKey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'welcome' | 'key' | 'instructions'>('welcome');
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const keyToSave = useCommunityKey ? 'USE_COMMUNITY_KEY' : inputKey.trim();
    if (!keyToSave) return;

    setIsSubmitting(true);
    try {
      setKey(keyToSave);
      await new Promise((r) => setTimeout(r, 600));
      onComplete();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const instructions = [
    {
      title: 'Why do we need a key?',
      icon: Shield,
      content: (
        <>
          <p>
            Ekrixi AI operates on a <strong className="text-nexus-accent">BYOK/HYOK</strong>{' '}
            (Bring/Hold Your Own Key) standard. This means:
          </p>
          <ul className="list-disc pl-4 space-y-1 text-nexus-text/95">
            <li>
              <strong>BYOK/HYOK:</strong> Bring/Hold your own key. It lives only in your browser and
              never touches our servers.
            </li>
            <li>
              <strong>RPM/RPD:</strong> Using your own key bypasses shared limits (Requests Per
              Minute/Day), ensuring your generation is never throttled.
            </li>
          </ul>
          <p>
            Direct browser-to-Google communication ensures your data and your key remain strictly
            under your control.
          </p>
        </>
      ),
    },
    {
      title: 'How to get a Key',
      icon: Key,
      content: (
        <div className="space-y-4">
          <p>It's free and takes about 30 seconds:</p>
          <ol className="list-decimal pl-4 space-y-2 text-nexus-text/95">
            <li>
              Go to{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-nexus-accent hover:brightness-110 underline decoration-nexus-accent/30 underline-offset-4"
              >
                Google AI Studio
              </a>
              .
            </li>
            <li>
              Click the blue <strong>"Create API Key"</strong> button.
            </li>
            <li>Select "Create API key in new project".</li>
            <li>Copy the string (starts with `AIzaSy...`).</li>
          </ol>
          <div className="p-3 bg-nexus-950 rounded-lg border border-nexus-800 text-xs font-mono text-nexus-muted break-all">
            AIzaSy...[your_unique_key]...
          </div>
        </div>
      ),
    },
    {
      title: 'Safety & Billing Tips',
      icon: AlertTriangle,
      content: (
        <>
          <p>
            For most personal projects, the <strong>Free Tier</strong> is sufficient. However, if
            you choose to enable billing for higher limits:
          </p>
          <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
            <p className="text-xs text-nexus-text/90 leading-relaxed">
              <strong className="block mb-1 text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
                PRO TIP: Set Budget Alerts
              </strong>
              Always set a monthly budget limit in your Google Cloud Console to prevent unexpected
              costs.
            </p>
          </div>
          <p>
            Remember: <strong>We never store your key on our servers.</strong> It lives in your
            browser's local storage only.
          </p>
        </>
      ),
    },
  ];

  const nextSlide = () => setCurrentSlide((prev) => Math.min(prev + 1, instructions.length - 1));
  const prevSlide = () => setCurrentSlide((prev) => Math.max(prev - 1, 0));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-nexus-950/90 backdrop-blur-md animate-in fade-in duration-500" />

      <div className="relative w-full max-w-lg bg-nexus-900 border border-nexus-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-nexus-accent via-purple-500 to-nexus-accent opacity-50" />

        <div className="p-8 flex-1 overflow-y-auto">
          {step === 'welcome' && (
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-nexus-800 flex items-center justify-center border border-nexus-700 shadow-inner mb-2 animate-in zoom-in-50 duration-500">
                <Shield className="text-nexus-accent w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-display font-bold text-nexus-text tracking-tight">
                  Welcome to the Nexus
                </h2>
                <p className="text-nexus-text/80 text-base leading-relaxed">
                  To generate universes and weave narratives, this system requires a localized
                  neural link (API Key).
                </p>
              </div>

              <button
                onClick={() => setStep('key')}
                className="w-full py-3 px-4 bg-nexus-accent hover:bg-nexus-accent-hover text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 group mt-4 shadow-lg shadow-nexus-accent/20"
              >
                Get Started
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="flex items-center gap-4 w-full">
                <button
                  onClick={() => setStep('instructions')}
                  className="flex-1 py-2 text-xs text-nexus-text/60 hover:text-nexus-accent transition-colors flex items-center justify-center gap-1.5"
                >
                  <HelpCircle size={14} />
                  Why do I need this?
                </button>
              </div>

              <div className="p-3 bg-nexus-950/50 rounded-lg border border-nexus-800/50 flex gap-3 text-left w-full">
                <AlertTriangle className="w-4 h-4 text-nexus-text/40 shrink-0 mt-0.5" />
                <p className="text-[10px] text-nexus-text/80 leading-snug">
                  <strong className="text-nexus-accent">PRIVACY NOTICE:</strong> Your key is stored
                  ONLY in your browser. We never see it, store it, or touch it.
                </p>
              </div>
            </div>
          )}

          {step === 'instructions' && (
            <div className="flex flex-col h-full min-h-[400px]">
              <div className="flex-1 relative">
                {instructions.map((slide, idx) => (
                  <div key={idx} className={currentSlide === idx ? 'block' : 'hidden'}>
                    <InstructionsSlide title={slide.title} icon={slide.icon}>
                      {slide.content}
                    </InstructionsSlide>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between pt-4 border-t border-nexus-800">
                <button
                  onClick={currentSlide === 0 ? () => setStep('welcome') : prevSlide}
                  className="p-2 hover:bg-nexus-800 rounded-lg text-nexus-text/60 hover:text-nexus-text transition-colors text-sm flex items-center gap-1"
                >
                  <ChevronLeft size={16} />
                  {currentSlide === 0 ? 'Back' : 'Prev'}
                </button>

                <div className="flex gap-1.5">
                  {instructions.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${currentSlide === idx ? 'bg-nexus-accent w-4' : 'bg-nexus-700'}`}
                    />
                  ))}
                </div>

                {currentSlide === instructions.length - 1 ? (
                  <button
                    onClick={() => {
                      setCurrentSlide(0); // Reset for next time if they come back
                      setStep('key');
                    }}
                    className="py-2 px-4 bg-nexus-accent hover:bg-nexus-accent-hover rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    I'm Ready
                    <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    onClick={nextSlide}
                    className="p-2 hover:bg-nexus-800 rounded-lg text-nexus-text/60 hover:text-nexus-text transition-colors text-sm flex items-center gap-1"
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>
          )}

          {step === 'key' && (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
              <div className="text-center space-y-2">
                <div className="inline-flex p-3 rounded-full bg-nexus-800/50 mb-2">
                  <Key className="w-6 h-6 text-nexus-text" />
                </div>
                <h2 className="text-xl font-display font-semibold text-nexus-text">
                  Access Configuration
                </h2>
                <p className="text-nexus-text/70 text-sm px-4">
                  Enter your key for optimal performance, or try our community tier.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Toggle Section */}
                <div
                  className="bg-nexus-950 border border-nexus-700 rounded-xl p-3 flex items-center justify-between cursor-pointer hover:border-nexus-600 transition-colors group"
                  onClick={() => setUseCommunityKey(!useCommunityKey)}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-nexus-text">
                      Use Community Key (Beta)
                    </span>
                    <span className="text-xs text-nexus-text/80">
                      Free tier, subject to rate limits
                    </span>
                  </div>
                  <div
                    className={`transition-colors text-2xl ${useCommunityKey ? 'text-nexus-accent' : 'text-nexus-700'}`}
                  >
                    {useCommunityKey ? <ToggleRight /> : <ToggleLeft />}
                  </div>
                </div>

                {/* Input Section - Collapsible or Disabled */}
                <div
                  className={`space-y-4 transition-all duration-300 ${useCommunityKey ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-mono text-nexus-muted uppercase tracking-wider ml-1">
                        Your Gemini API Key
                      </label>
                      <button
                        type="button"
                        onClick={() => setStep('instructions')}
                        className="text-[10px] text-nexus-accent hover:brightness-110 flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <HelpCircle size={10} />
                        Need a key?
                      </button>
                    </div>
                    <input
                      type="password"
                      value={inputKey}
                      onChange={(e) => setInputKey(e.target.value)}
                      placeholder="AIzaSy..."
                      disabled={useCommunityKey}
                      className="w-full bg-nexus-950 border border-nexus-700 rounded-xl px-4 py-3 text-nexus-text placeholder-nexus-700 focus:outline-none focus:border-nexus-accent focus:ring-1 focus:ring-nexus-accent/50 transition-all font-mono disabled:cursor-not-allowed"
                      autoFocus={!useCommunityKey}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={(!inputKey && !useCommunityKey) || isSubmitting}
                  className="w-full py-3 px-4 bg-nexus-accent hover:bg-nexus-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-nexus-accent/10"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {useCommunityKey ? 'Initialize Beta Access' : 'Save & Initialize'}
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              <button
                onClick={() => setStep('welcome')}
                className="w-full text-center text-nexus-text/70 hover:text-nexus-accent text-sm transition-colors py-2"
              >
                Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
