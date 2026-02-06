import React, { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { Flip } from 'gsap/all';
import { BrandLogo } from '../../../components/shared/BrandLogo';

gsap.registerPlugin(Flip);

interface IntroOverlayProps {
  onComplete: () => void;
}

export const IntroOverlay: React.FC<IntroOverlayProps> = ({ onComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!logoRef.current || !containerRef.current) return;

    const tl = gsap.timeline({ onComplete: onComplete });

    // Initial State
    // explicitly set filter start state to prevent 'jump' or black flash when filter tween starts
    tl.set(logoRef.current, {
      scale: 0.5,
      opacity: 0,
      filter: 'brightness(1)',
      willChange: 'transform, filter',
    });

    // 1. ZOOM FEATURE
    tl.to(logoRef.current, {
      scale: 1,
      opacity: 1,
      duration: 1.2,
      ease: 'power2.out',
    });

    // 2. HIGHLIGHT FEATURE
    tl.to(logoRef.current, {
      scale: 1.05,
      filter: 'brightness(1.5)',
      duration: 1.0,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: 1,
    });

    // Ensure logo stays visible for FLIP state capture
    tl.set(logoRef.current, { opacity: 1 });

    return () => {
      tl.kill();
    };
  }, [onComplete]);

  return (
    <div
      ref={containerRef}
      className="intro-overlay-container fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
    >
      {/* Separate background layer for independent fading */}
      <div id="intro-background" className="absolute inset-0 bg-nexus-950" />

      <div ref={logoRef} id="intro-logo" data-flip-id="hero-logo" className="relative z-10 p-4">
        <BrandLogo className="w-96 h-auto" />
      </div>
    </div>
  );
};
