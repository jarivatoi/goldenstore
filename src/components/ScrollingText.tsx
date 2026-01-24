import React, { useRef, useEffect, useState } from 'react';
import { ScrollingTextAnimator } from '../utils/scrollingTextAnimator';

interface ScrollingTextProps {
  text?: string;
  className?: string;
  children?: React.ReactNode;
  pauseDuration?: number;
  scrollDuration?: number;
  easing?: string;
}

export const ScrollingText: React.FC<ScrollingTextProps> = ({ 
  text, 
  className = '', 
  children,
  pauseDuration = 2,
  scrollDuration = 6,
  easing = 'power2.inOut'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [needsScrolling, setNeedsScrolling] = useState(false);
  const animatorRef = useRef<ScrollingTextAnimator | null>(null);
  const scrollListenerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const checkAndAnimate = () => {
      if (!containerRef.current || !textRef.current) return;

      const container = containerRef.current;
      const textElement = textRef.current;
      
      // Ensure initial state is set correctly
      textElement.style.willChange = 'transform';
      
      // Stop any existing animation
      if (animatorRef.current) {
        animatorRef.current.stop();
        animatorRef.current = null;
      }
      
      // Remove existing scroll listener
      if (scrollListenerRef.current) {
        window.removeEventListener('scroll', scrollListenerRef.current, { passive: true } as any);
        document.removeEventListener('scroll', scrollListenerRef.current, { passive: true } as any);
        scrollListenerRef.current = null;
      }
      
      // Force layout recalculation
      container.offsetWidth;
      textElement.offsetWidth;
      
      // Check if text overflows container
      const containerWidth = container.offsetWidth;
      const textWidth = textElement.scrollWidth;
      
      const currentText = text || 'children content';
      const hasSpaces = currentText.includes(' ');
      const isLongText = currentText.length > 30;
      
      if (textWidth > containerWidth) {
        setNeedsScrolling(true);
        
        // Use enhanced timing for longer text with spaces
        const enhancedPauseDuration = (hasSpaces && isLongText) ? pauseDuration + 1 : pauseDuration;
        const enhancedScrollDuration = (hasSpaces && isLongText) ? scrollDuration + 1 : scrollDuration;
        const enhancedEasing = (hasSpaces && isLongText) ? 'power1.inOut' : easing;
        
        // Create animator with TweenMax-style enhanced timing
        animatorRef.current = ScrollingTextAnimator.create({
          container,
          textElement,
          text: currentText,
          pauseDuration: enhancedPauseDuration,
          scrollDuration: enhancedScrollDuration,
          easing: enhancedEasing
        });
        
        
        // Add scroll detection
        const handleScroll = () => {
          if (animatorRef.current) {
            animatorRef.current.handleScrollStart();
          }
        };
        
        // Listen to both window and document scroll events
        window.addEventListener('scroll', handleScroll, { passive: true });
        document.addEventListener('scroll', handleScroll, { passive: true });
        
        // Also listen to scroll events on scrollable parents
        let parent = container.parentElement;
        while (parent) {
          if (parent.scrollHeight > parent.clientHeight || parent.scrollWidth > parent.clientWidth) {
            parent.addEventListener('scroll', handleScroll, { passive: true });
          }
          parent = parent.parentElement;
        }
        
        scrollListenerRef.current = handleScroll;
      } else {
        setNeedsScrolling(false);
        
        // Smoothly reset the text position to the left when text no longer overflows
        if (textElement.style.transform !== 'translateX(0px)') {
          textElement.style.transition = 'transform 0.3s ease-out';
          textElement.style.transform = 'translateX(0px)';
          
          // Remove transition after animation completes
          setTimeout(() => {
            textElement.style.transition = '';
          }, 300);
        }
        
        // Stop any existing animation
        if (animatorRef.current) {
          (animatorRef.current as ScrollingTextAnimator).stop();
          animatorRef.current = null;
        }
      }
    };

    // Initial check
    checkAndAnimate();
    
    // Recheck on window resize
    const handleResize = () => {
      checkAndAnimate();
    };
    
    window.addEventListener('resize', handleResize);
    
    // Recheck when content changes with smoother handling
    let timeoutId: NodeJS.Timeout;
    const observer = new MutationObserver(() => {
      // Clear any existing timeout to debounce multiple rapid changes
      clearTimeout(timeoutId);
      
      // When content changes, smoothly stop current animation
      if (animatorRef.current) {
        (animatorRef.current as ScrollingTextAnimator).stop();
        animatorRef.current = null;
      }
      
      // Smoothly reset transform to initial state to prevent jumping
      if (textRef.current) {
        // Use CSS transition for smooth reset instead of instant jump
        textRef.current.style.transition = 'transform 0.3s ease-out';
        textRef.current.style.transform = 'translateX(0px)';
        
        // Remove transition after animation completes
        setTimeout(() => {
          if (textRef.current) {
            textRef.current.style.transition = '';
          }
        }, 300);
      }
      
      // Restart animation after a brief delay to handle rapid updates properly
      timeoutId = setTimeout(checkAndAnimate, 100);
    });
    
    if (containerRef.current) {
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
      
      // Clean up scroll listener
      if (scrollListenerRef.current) {
        window.removeEventListener('scroll', scrollListenerRef.current, { passive: true } as any);
        document.removeEventListener('scroll', scrollListenerRef.current, { passive: true } as any);
        scrollListenerRef.current = null;
      }
      
      if (animatorRef.current) {
        animatorRef.current.stop();
        animatorRef.current = null;
      }
    };
  }, [text, children, pauseDuration, scrollDuration, easing]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      // Clean up scroll listener on unmount
      if (scrollListenerRef.current) {
        // Remove the filtered scroll handler
        const filteredScrollHandler = scrollListenerRef.current;
        window.removeEventListener('scroll', filteredScrollHandler as any, { passive: true } as any);
        
        // Remove scroll listeners from parent elements
        let parent = containerRef.current?.parentElement;
        while (parent && parent !== document.body) {
          parent.removeEventListener('scroll', scrollListenerRef.current as any, { passive: true } as any);
          parent = parent.parentElement;
        }
        
        scrollListenerRef.current = null;
      }
      
      if (animatorRef.current) {
        animatorRef.current.stop();
        animatorRef.current = null;
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`w-full ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden' // Contain text within parent boundaries
      }
      }
    >
      <div 
        ref={textRef}
        className="whitespace-nowrap"
        style={{
          display: 'inline-block',
          minWidth: '100%',
          maxWidth: 'none',
          overflow: 'hidden' // Prevent text from escaping container
        }
        }
      >
        {children || text}
      </div>
    </div>
  );
};