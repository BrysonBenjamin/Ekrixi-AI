import React, { useEffect, useRef } from 'react';
import { X, Sparkles, Zap, Shield, Rocket, LucideIcon } from 'lucide-react';
import gsap from 'gsap';
import { AnalyticsService } from '../../core/services/AnalyticsService';

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProUpgradeModal: React.FC<ProUpgradeModalProps> = ({ isOpen, onClose }) => {
  const backdropRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const tl = gsap.timeline();
      tl.to(backdropRef.current, {
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out',
      });
      tl.fromTo(
        contentRef.current,
        {
          scale: 0.9,
          opacity: 0,
          y: 20,
        },
        {
          scale: 1,
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: 'expo.out',
        },
        '-=0.1',
      );
    }
  }, [isOpen]);

  const handleClose = () => {
    const tl = gsap.timeline({
      onComplete: onClose,
    });
    tl.to(contentRef.current, {
      scale: 0.9,
      opacity: 0,
      y: 20,
      duration: 0.3,
      ease: 'power2.in',
    });
    tl.to(
      backdropRef.current,
      {
        opacity: 0,
        duration: 0.2,
        ease: 'power2.in',
      },
      '-=0.1',
    );
  };

  const handleJoinWaitlist = () => {
    AnalyticsService.trackWaitlistJoin('pro_modal_cta');
    // In a real app, you might show a success state or an email input
    alert("You've been added to the priority waitlist! We'll notify you when Pro features unlock.");
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-nexus-950/80 backdrop-blur-md opacity-0"
        onClick={handleClose}
      />

      {/* Modal Content */}
      <div
        ref={contentRef}
        className="relative w-full max-w-lg bg-nexus-900 border border-nexus-800 rounded-3xl overflow-hidden shadow-2xl shadow-nexus-accent/10 opacity-0"
      >
        {/* Glow Effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-nexus-accent/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="p-8 relative">
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-6 right-6 p-2 rounded-full bg-nexus-800/50 hover:bg-nexus-700 text-nexus-muted hover:text-nexus-text transition-all"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-nexus-accent/10">
              <Sparkles className="text-nexus-accent" size={24} />
            </div>
            <span className="text-xs font-black uppercase tracking-[0.3em] text-nexus-accent">
              Premium Access
            </span>
          </div>

          <h2 className="text-3xl font-display font-black text-nexus-text mb-4 tracking-tight">
            Level up to <span className="text-nexus-accent">Ekrixi Pro.</span>
          </h2>

          <p className="text-nexus-muted mb-8 leading-relaxed font-medium">
            Unlock professional world-building tools and specialized AI architectures for your most
            ambitious projects.
          </p>

          {/* Features */}
          <div className="space-y-4 mb-10">
            <FeatureItem
              icon={Rocket}
              title="Story Structure Mode"
              description="Advanced narrative planning with act structure templates."
            />
            <FeatureItem
              icon={Shield}
              title="Unlimited Cloud Sync"
              description="Keep your entire multiverse synced across all devices."
            />
            <FeatureItem
              icon={Zap}
              title="Private AI Writing Assistant"
              description="Fine-tuned LLM specialized for creative prose and lore."
            />
          </div>

          {/* Pricing Card */}
          <div className="bg-nexus-950/50 border border-nexus-800 rounded-2xl p-6 mb-8">
            <div className="flex items-end gap-2 mb-1">
              <span className="text-4xl font-display font-black text-nexus-text">$9</span>
              <span className="text-nexus-muted pb-1">/ month</span>
            </div>
            <p className="text-xs text-nexus-muted font-bold uppercase tracking-wider mb-6">
              Or $79 billed annually (Save 25%)
            </p>

            <button
              onClick={handleJoinWaitlist}
              className="w-full py-4 bg-nexus-accent hover:bg-nexus-accent/90 text-white font-bold rounded-xl transition-all shadow-lg shadow-nexus-accent/20 active:scale-[0.98] flex items-center justify-center gap-2 group"
            >
              Unlock Early Access
              <Zap size={18} className="group-hover:fill-current transition-all" />
            </button>
          </div>

          <p className="text-center text-[10px] text-nexus-muted/40 uppercase tracking-widest font-black">
            Priority Beta Access // Restricted Release
          </p>
        </div>
      </div>
    </div>
  );
};

const FeatureItem = ({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) => (
  <div className="flex gap-4">
    <div className="shrink-0 p-2 rounded-lg bg-nexus-800/50 text-nexus-accent h-fit">
      <Icon size={20} />
    </div>
    <div>
      <h4 className="text-sm font-bold text-nexus-text mb-1">{title}</h4>
      <p className="text-xs text-nexus-muted font-medium opacity-80">{description}</p>
    </div>
  </div>
);
