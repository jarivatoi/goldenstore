import React, { useState, useEffect } from 'react';

interface AlternatingTextProps {
  className?: string;
  interval?: number; // Time between alternations in milliseconds
  transitionDuration?: number; // Fade transition duration in milliseconds
}

/**
 * ALTERNATING TEXT COMPONENT
 * ==========================
 * 
 * Smoothly alternates between "Amount" and "Returnable" text labels
 * with fade transitions for small card interfaces
 */
const AlternatingText: React.FC<AlternatingTextProps> = ({
  className = '',
  interval = 3000, // 3 seconds between changes
  transitionDuration = 400 // 400ms fade transition
}) => {
  const [currentText, setCurrentText] = useState<'Amount' | 'Returnable'>('Amount');
  const [isVisible, setIsVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const texts = ['Amount', 'Returnable'] as const;

  useEffect(() => {
    if (isPaused) return;

    const alternateText = () => {
      // Start fade out
      setIsVisible(false);
      
      // After fade out completes, change text and fade in
      setTimeout(() => {
        setCurrentText(prev => prev === 'Amount' ? 'Returnable' : 'Amount');
        setIsVisible(true);
      }, transitionDuration);
    };

    const intervalId = setInterval(alternateText, interval);

    return () => clearInterval(intervalId);
  }, [interval, transitionDuration, isPaused]);

  // Pause animation when user hovers (for better UX)
  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);

  // Respect user's motion preferences
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <span
      className={`inline-block transition-opacity duration-${Math.round(transitionDuration / 100) * 100} ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transitionDuration: prefersReducedMotion ? '0ms' : `${transitionDuration}ms`,
        minWidth: '4rem', // Prevent layout shift between "Amount" and "Returnable"
        textAlign: 'center'
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {currentText}
    </span>
  );
};

export default AlternatingText;