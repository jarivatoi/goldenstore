import React, { useState, useEffect } from 'react';

interface AlternatingTextProps {
  amount: string; // The formatted amount like "Rs 1,235.35"
  returnableItems: string; // The returnable items like "3 Ch, 1 Bt"
  className?: string;
  interval?: number; // Time between alternations in milliseconds
  transitionDuration?: number; // Fade transition duration in milliseconds
}

/**
 * ALTERNATING TEXT COMPONENT
 * ==========================
 * 
 * Smoothly alternates between amount and actual returnable items
 * with fade transitions for small card interfaces
 */
const AlternatingText: React.FC<AlternatingTextProps> = ({
  amount,
  returnableItems,
  className = '',
  interval = 2000, // 2 seconds between changes
  transitionDuration = 400 // 400ms fade transition
}) => {
  const [showAmount, setShowAmount] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused || !returnableItems) return;

    const alternateText = () => {
      // Start fade out
      setIsVisible(false);
      
      // After fade out completes, change text and fade in
      setTimeout(() => {
        setShowAmount(prev => !prev);
        setIsVisible(true);
      }, transitionDuration);
    };

    const intervalId = setInterval(alternateText, interval);

    return () => clearInterval(intervalId);
  }, [interval, transitionDuration, isPaused, returnableItems]);

  // Pause animation when user hovers (for better UX)
  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);

  // Respect user's motion preferences
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // If no returnable items, just show the amount
  if (!returnableItems) {
    return <span className={className}>{amount}</span>;
  }

  return (
    <span
      className={`inline-block transition-opacity duration-${Math.round(transitionDuration / 100) * 100} ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transitionDuration: prefersReducedMotion ? '0ms' : `${transitionDuration}ms`,
        minWidth: '5rem', // Prevent layout shift between amount and returnable items
        textAlign: 'center'
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {showAmount ? amount : returnableItems}
    </span>
  );
};

export default AlternatingText;