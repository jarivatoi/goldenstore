import React from 'react';

interface CrateLogoProps {
  count: number;
  size?: number;
  className?: string;
}

/**
 * CRATE LOGO COMPONENT
 * ====================
 *
 * Displays an empty crate (U shape) in orange with a count indicator below
 */
const CrateLogo: React.FC<CrateLogoProps> = ({ count, size = 32, className = '' }) => {
  return (
    <div className={`relative inline-flex flex-col items-center ${className}`} style={{ width: size }}>
      {/* Container for crate */}
      <div className="relative" style={{ width: size, height: size }}>
        {/* Crate - U shape using SVG */}
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          className="absolute"
          style={{
            pointerEvents: 'none',
            top: 0,
            left: 0
          }}
        >
          {/* U-shaped crate frame - orange color */}
          <path
            d="M 4 6 L 4 28 L 28 28 L 28 6"
            fill="none"
            stroke="#ea580c"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Horizontal slats for crate texture */}
          <line x1="4" y1="12" x2="6" y2="12" stroke="#ea580c" strokeWidth="1.5" />
          <line x1="4" y1="18" x2="6" y2="18" stroke="#ea580c" strokeWidth="1.5" />
          <line x1="4" y1="24" x2="6" y2="24" stroke="#ea580c" strokeWidth="1.5" />
          <line x1="26" y1="12" x2="28" y2="12" stroke="#ea580c" strokeWidth="1.5" />
          <line x1="26" y1="18" x2="28" y2="18" stroke="#ea580c" strokeWidth="1.5" />
          <line x1="26" y1="24" x2="28" y2="24" stroke="#ea580c" strokeWidth="1.5" />
          <line x1="6" y1="28" x2="10" y2="28" stroke="#ea580c" strokeWidth="1.5" />
          <line x1="14" y1="28" x2="18" y2="28" stroke="#ea580c" strokeWidth="1.5" />
          <line x1="22" y1="28" x2="26" y2="28" stroke="#ea580c" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Count indicator below the crate with X prefix - no border */}
      <div
        className="text-orange-600 font-bold flex items-center justify-center mt-0.5"
        style={{
          fontSize: size * 0.35
        }}
      >
        X{count}
      </div>
    </div>
  );
};

export default CrateLogo;
