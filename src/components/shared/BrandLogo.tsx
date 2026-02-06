import React from 'react';

interface BrandLogoProps {
  className?: string;
  id?: string;
  'data-flip-id'?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = 'w-32 h-8',
  id,
  'data-flip-id': flipId,
}) => {
  return (
    <img
      src="/brand_logo_full.png"
      alt="Ekrixi AI"
      className={`object-contain ${className}`}
      id={id}
      data-flip-id={flipId}
    />
  );
};
