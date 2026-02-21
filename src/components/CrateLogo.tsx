import React from 'react';
import { Milk } from 'lucide-react';

interface CrateLogoProps {
  count: number;
  size?: number;
  className?: string;
}

/**
 * CRATE LOGO COMPONENT
 * ====================
 *
 * Displays a crate (U shape) overlapping a milk bottle icon
 * with a count indicator at the bottom showing total crates (e.g., X2)
 */
const CrateLogo: React.FC<CrateLogoProps> = ({ count, size = 32, className = '' }) => {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {/* Milk bottle icon from lucide-react - centered */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Milk size={size * 0.6} className="text-blue-500" strokeWidth={2} />
      </div>

      {/* Crate overlay - U shape using SVG */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        className="absolute inset-0"
        style={{ pointerEvents: 'none' }}
      >
        {/* U-shaped crate frame */}
        <path
          d="M 4 6 L 4 28 L 28 28 L 28 6"
          fill="none"
          stroke="#8B4513"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Horizontal slats for crate texture */}
        <line x1="4" y1="12" x2="6" y2="12" stroke="#8B4513" strokeWidth="1.5" />
        <line x1="4" y1="18" x2="6" y2="18" stroke="#8B4513" strokeWidth="1.5" />
        <line x1="4" y1="24" x2="6" y2="24" stroke="#8B4513" strokeWidth="1.5" />
        <line x1="26" y1="12" x2="28" y2="12" stroke="#8B4513" strokeWidth="1.5" />
        <line x1="26" y1="18" x2="28" y2="18" stroke="#8B4513" strokeWidth="1.5" />
        <line x1="26" y1="24" x2="28" y2="24" stroke="#8B4513" strokeWidth="1.5" />
        <line x1="6" y1="28" x2="10" y2="28" stroke="#8B4513" strokeWidth="1.5" />
        <line x1="14" y1="28" x2="18" y2="28" stroke="#8B4513" strokeWidth="1.5" />
        <line x1="22" y1="28" x2="26" y2="28" stroke="#8B4513" strokeWidth="1.5" />
      </svg>

      {/* Count indicator at bottom with X prefix */}
      <div
        className="absolute bg-yellow-400 text-gray-900 font-bold rounded-full flex items-center justify-center border-2 border-gray-900"
        style={{
          bottom: -4,
          right: -4,
          minWidth: size * 0.5,
          height: size * 0.4,
          fontSize: size * 0.28,
          padding: '0 4px'
        }}
      >
        X{count}
      </div>
    </div>
  );
};

export default CrateLogo;
