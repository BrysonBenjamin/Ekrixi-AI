import React, { useState } from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = 'w-10 h-10', size = 40 }) => {
  const [useFallback, setUseFallback] = useState(false);

  // The Fallback is a high-fidelity SVG representing a "Neural Burst" (Ekrixi)
  const renderSvgLogo = () => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="ekrixi-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--accent-color)" />
          <stop offset="100%" stopColor="var(--arcane-color)" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      {/* Background Core */}
      <circle
        cx="50"
        cy="50"
        r="45"
        fill="var(--bg-900)"
        stroke="url(#ekrixi-gradient)"
        strokeWidth="2"
      />

      {/* The Burst (Ekrixi) */}
      <path
        d="M50 15L55 45L85 50L55 55L50 85L45 55L15 50L45 45Z"
        fill="url(#ekrixi-gradient)"
        filter="url(#glow)"
      />

      {/* Inner Accents */}
      <path
        d="M50 30L52 48L70 50L52 52L50 70L48 52L30 50L48 48Z"
        fill="var(--bg-950)"
        opacity="0.8"
      />

      {/* Orbitals */}
      <circle
        cx="50"
        cy="50"
        r="32"
        stroke="var(--accent-color)"
        strokeWidth="0.5"
        strokeDasharray="4 4"
        opacity="0.3"
      />
    </svg>
  );

  if (useFallback) {
    return renderSvgLogo();
  }

  return (
    <div className="relative flex items-center justify-center">
      <img
        src="/brand_logo_full.png"
        alt="Ekrixi AI"
        className={`${className} object-contain transition-opacity duration-300`}
        style={{ width: size, height: size }}
        onError={() => setUseFallback(true)}
      />
      {/* If the image is still loading or transparently failing, we can layer the SVG behind if needed, 
                but simple state fallback is cleaner. */}
    </div>
  );
};
