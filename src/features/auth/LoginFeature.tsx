import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../core/auth/AuthContext';
import { useLLM } from '../system/hooks/useLLM';
import {
  Zap,
  Shield,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  ToggleLeft,
  ToggleRight,
  Lock,
  ArrowUpRight,
} from 'lucide-react';
import { config } from '../../config';
import gsap from 'gsap';

import { dbFixtures } from '../../core/services/dbFixtures';

type OnboardingStep = 'AUTH' | 'CONFIG' | 'SUCCESS';

export const LoginFeature: React.FC = () => {
  const { user, signInWithGoogle, signInGuest, loading: authLoading } = useAuth();
  const { hasKey, requiresUserKey, setKey } = useLLM();
  const navigate = useNavigate();

  const [step, setStep] = useState<OnboardingStep>('AUTH');
  const [inputKey, setInputKey] = useState('');
  const [useCommunityKey, setUseCommunityKey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSeedFixtures = async () => {
    setIsSubmitting(true);
    try {
      if (!user) {
        await signInGuest();
      }
      await dbFixtures.seedDemoUniverse();
      setStep('SUCCESS');
      setTimeout(() => navigate('/nexus'), 1500);
    } catch (err) {
      console.error('Failed to seed fixtures', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Initial step determination
  useEffect(() => {
    if (!authLoading) {
      if (user) {
        if (requiresUserKey && !hasKey) {
          setStep('CONFIG');
        } else {
          navigate('/nexus');
        }
      } else {
        setStep('AUTH');
      }
    }
  }, [user, authLoading, hasKey, requiresUserKey, navigate]);

  // GSAP Transitions
  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current.children,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out' },
      );
    }
  }, [step]);

  const handleKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const keyToSave = useCommunityKey ? 'USE_COMMUNITY_KEY' : inputKey.trim();
    if (!keyToSave) return;

    setIsSubmitting(true);
    try {
      setKey(keyToSave);
      await new Promise((r) => setTimeout(r, 800));
      setStep('SUCCESS');
      setTimeout(() => navigate('/nexus'), 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-white text-slate-900">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
      </div>
    );
  }

  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-[#fafafa] selection:bg-nexus-accent/20 selection:text-nexus-accent">
      {/* Soft Professional Architecture */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.05)_0%,transparent_50%)]" />
        <div className="absolute inset-0 [background-image:linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_20%,transparent_100%)]" />
      </div>

      <div className="relative z-10 w-full max-w-sm p-6 sm:p-0">
        <div ref={containerRef} className="flex flex-col">
          {/* Header: Clean Brand Mark */}
          <div className="mb-10 flex flex-col items-center text-center">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white shadow-lg">
              <Sparkles size={24} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Ekrixi AI</h1>
            <p className="mt-1.5 text-[13px] text-slate-500 font-medium">
              Professional World-Building Workspace
            </p>
          </div>

          <div className="rounded-2xl bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
            {step === 'AUTH' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="space-y-1 text-center">
                  <h2 className="text-lg font-semibold text-slate-900">Sign In</h2>
                  <p className="text-xs text-slate-400 font-medium">
                    Authenticate to sync your lore across devices.
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => signInWithGoogle()}
                    className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98]"
                  >
                    <img
                      src="https://www.svgrepo.com/show/475656/google-color.svg"
                      className="h-4 w-4"
                      alt=""
                    />
                    Continue with Google
                  </button>

                  <button
                    onClick={() => signInGuest()}
                    className="flex w-full items-center justify-center gap-3 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 active:scale-[0.98] shadow-md shadow-slate-900/10"
                  >
                    <Zap size={16} className="text-amber-400" />
                    Browse as Guest
                  </button>

                  {import.meta.env.DEV && (
                    <button
                      onClick={handleSeedFixtures}
                      className="flex w-full items-center justify-center gap-3 rounded-lg border border-cyan-100 bg-cyan-50/30 px-4 py-3 text-sm font-semibold text-cyan-700 transition-all hover:bg-cyan-50 hover:border-cyan-200 active:scale-[0.98]"
                    >
                      <Sparkles size={16} className="text-cyan-500" />
                      Seed Demo Universe
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 border border-slate-100">
                  <Shield size={16} className="text-slate-400 shrink-0" />
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Your encryption keys are stored locally. Enterprise-grade synchronization is
                    active.
                  </p>
                </div>
              </div>
            )}

            {step === 'CONFIG' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="space-y-1 text-center">
                  <h2 className="text-lg font-semibold text-slate-900">Configure Engine</h2>
                  <p className="text-xs text-slate-400 font-medium">
                    Provide an API key to enable generation.
                  </p>
                </div>

                <form onSubmit={handleKeySubmit} className="space-y-4">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between px-0.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Gemini Key
                      </label>
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-nexus-accent hover:underline transition-all"
                      >
                        Get Seq <ArrowUpRight size={10} />
                      </a>
                    </div>
                    <div className="relative">
                      <input
                        type="password"
                        value={inputKey}
                        onChange={(e) => setInputKey(e.target.value)}
                        placeholder="••••••••••••••••"
                        disabled={useCommunityKey}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-nexus-accent/20 focus:border-nexus-accent transition-all"
                        autoFocus
                      />
                      <Lock
                        size={14}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300"
                      />
                    </div>
                  </div>

                  <div
                    className={`flex items-center justify-between p-3.5 rounded-lg border transition-all cursor-pointer ${useCommunityKey ? 'bg-nexus-accent/5 border-nexus-accent/20' : 'bg-transparent border-slate-100 hover:border-slate-200'}`}
                    onClick={() => config.useBackendProxy && setUseCommunityKey(!useCommunityKey)}
                  >
                    <div className="flex flex-col">
                      <span
                        className={`text-[13px] font-bold ${useCommunityKey ? 'text-nexus-accent' : 'text-slate-600'}`}
                      >
                        Use Community Hub
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Shared, rate-limited pool
                      </span>
                    </div>
                    <div
                      className={`transition-colors ${useCommunityKey ? 'text-nexus-accent' : 'text-slate-200'}`}
                    >
                      {useCommunityKey ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={(!inputKey && !useCommunityKey) || isSubmitting}
                    className="relative w-full flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-slate-800 disabled:opacity-20 active:scale-[0.98]"
                  >
                    {isSubmitting ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                    ) : (
                      <>
                        Continue
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {step === 'SUCCESS' && (
              <div className="flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-500 py-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 border border-emerald-100">
                  <CheckCircle2 size={32} />
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-slate-900">Workspace Ready</h2>
                  <p className="text-xs text-slate-400 font-medium">
                    Synchronizing your manifold...
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Minimal Footer */}
          <div className="mt-12 flex justify-between items-center text-slate-300 font-bold text-[9px] uppercase tracking-[0.2em] px-2">
            <span>v4.0.0 Stable</span>
            <span>Sovereign Security active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
