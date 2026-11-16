import React from 'react';

interface AnkaraPatternProps {
  className?: string;
}

/**
 * Pure inline SVG geometric Adire / Aso-Oke woven textile pattern.
 * Zero external font or image dependencies — 100% DeWEB on-chain compatible.
 */
export const AnkaraPattern: React.FC<AnkaraPatternProps> = ({ className = 'opacity-[0.035]' }) => (
  <svg
    className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <pattern id="ankara-weave" width="56" height="56" patternUnits="userSpaceOnUse">
        {/* Diamond Outer Frame */}
        <path d="M28 0 L56 28 L28 56 L0 28 Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
        {/* Inner Concentric Diamond */}
        <path d="M28 10 L46 28 L28 46 L10 28 Z" fill="none" stroke="currentColor" strokeWidth="0.8" />
        {/* Traditional Woven Dot Center */}
        <circle cx="28" cy="28" r="3" fill="currentColor" />
        {/* Corner Diagonal Weft Lines */}
        <path d="M0 0 L14 14 M56 0 L42 14 M0 56 L14 42 M56 56 L42 42" stroke="currentColor" strokeWidth="0.8" />
        <path d="M28 0 L28 10 M28 46 L28 56 M0 28 L10 28 M46 28 L56 28" stroke="currentColor" strokeWidth="0.8" strokeDasharray="1 3" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#ankara-weave)" />
  </svg>
);
