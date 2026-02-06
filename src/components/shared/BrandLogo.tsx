import React from 'react';

interface BrandLogoProps {
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = 'w-32 h-8' }) => {
  return (
    <img src="/brand_logo_full.png" alt="Ekrixi AI" className={`object-contain ${className}`} />
  );
};
