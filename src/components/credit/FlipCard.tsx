import React, { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';

interface FlipCardProps {
  frontContent: React.ReactNode;
  backContent: React.ReactNode;
  shouldFlip: boolean;
  flipDuration?: number;
  flipDelay?: number;
  className?: string;
}

/**
 * GSAP FLIP CARD COMPONENT
 * ========================
 * 
 * Creates a smooth 3D flip animation using GSAP
 */
const FlipCard: React.FC<FlipCardProps> = ({
  frontContent,
  backContent,
  shouldFlip,
  flipDuration = 0.6,
  flipDelay = 2,
  className = ''
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    if (!cardRef.current || !frontRef.current || !backRef.current) return;

    const card = cardRef.current;
    const front = frontRef.current;
    const back = backRef.current;

    // Check if parent has CSS animations that might interfere
    const parentElement = card.parentElement;
    const hasParentAnimation = parentElement && (
      parentElement.classList.contains('animate-bounce') ||
      parentElement.classList.contains('animate-subtle-shake') ||
      parentElement.classList.contains('animate-pulse') ||
      parentElement.classList.contains('animate-wobble') ||
      parentElement.classList.contains('animate-high-debt-bounce') ||
      parentElement.classList.contains('animate-returnables-shake')
    );

    // Set initial 3D perspective and positioning
    gsap.set(card, {
      transformStyle: "preserve-3d",
      perspective: 1000,
      // iOS Safari specific fixes
      WebkitTransformStyle: "preserve-3d",
      WebkitPerspective: 1000,
      // Override any parent transforms that might interfere
      position: "relative",
      isolation: "isolate", // Create new stacking context
      // Force hardware acceleration for iPhone 7
      transform: "translateZ(0)",
      WebkitTransform: "translateZ(0)"
    });

    gsap.set(front, {
      rotationY: 0,
      backfaceVisibility: "hidden",
      transformStyle: "preserve-3d",
      WebkitBackfaceVisibility: "hidden",
      WebkitTransformStyle: "preserve-3d",
      position: "relative",
      zIndex: 2,
      // iPhone 7 specific fixes
      transform: "rotateY(0deg) translateZ(1px)",
      WebkitTransform: "rotateY(0deg) translateZ(1px)",
      transformOrigin: "center center",
      WebkitTransformOrigin: "center center"
    });

    gsap.set(back, {
      rotationY: 180,
      backfaceVisibility: "hidden",
      transformStyle: "preserve-3d",
      WebkitBackfaceVisibility: "hidden",
      WebkitTransformStyle: "preserve-3d",
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      transformOrigin: "center center",
      WebkitTransformOrigin: "center center",
      zIndex: 1,
      // iPhone 7 specific fixes
      transform: "rotateY(180deg) translateZ(1px)",
      WebkitTransform: "rotateY(180deg) translateZ(1px)"
    });

    // Create flip animation timeline
    const createFlipTimeline = () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }

      // Use different animation approach for cards with parent animations
      const animationDuration = hasParentAnimation ? flipDuration * 0.8 : flipDuration;
      const animationEase = hasParentAnimation ? "power2.inOut" : "power1.inOut";

      timelineRef.current = gsap.timeline({ 
        repeat: shouldFlip ? -1 : 0,
        delay: flipDelay,
        yoyo: true,
        repeatDelay: flipDelay,
        // Override any parent timeline interference
        overwrite: "auto"
      });

      timelineRef.current
        .to([front, back], {
          rotationY: "+=180",
          duration: animationDuration,
          ease: animationEase,
          transformOrigin: "50% 50%", // More explicit transform origin
          WebkitTransformOrigin: "50% 50%",
          force3D: true, // Force hardware acceleration
          // More explicit transform for iPhone 7
          transform: "rotateY(+=180deg) translateZ(1px)",
          WebkitTransform: "rotateY(+=180deg) translateZ(1px)",
          // Override any conflicting animations
          overwrite: "auto",
          onComplete: () => setIsFlipped(prev => !prev)
        });

      return timelineRef.current;
    };

    if (shouldFlip) {
      createFlipTimeline();
    } else {
      // Reset to front if flip is disabled
      gsap.set([front, back], { 
        rotationY: 0,
        force3D: true,
        transform: "rotateY(0deg) translateZ(1px)",
        WebkitTransform: "rotateY(0deg) translateZ(1px)"
      });
      gsap.set(back, { 
        rotationY: 180,
        force3D: true,
        transform: "rotateY(180deg) translateZ(1px)",
        WebkitTransform: "rotateY(180deg) translateZ(1px)"
      });
      setIsFlipped(false);
    }

    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
    };
  }, [shouldFlip, flipDuration, flipDelay]);

  return (
    <div 
      ref={cardRef}
      className={`relative inline-flex items-center justify-center align-middle ${className}`}
      style={{
        transformStyle: "preserve-3d",
        WebkitTransformStyle: "preserve-3d",
        textAlign: "center",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        verticalAlign: "middle",
        // iPhone 7 specific optimizations
        WebkitPerspective: "1000px",
        perspective: "1000px",
        WebkitBackfaceVisibility: "hidden",
        backfaceVisibility: "hidden"
      }}
    >
      {/* Front Side */}
      <div 
        ref={frontRef}
        className="w-full h-full flex items-center justify-center"
        style={{
          backfaceVisibility: "hidden",
          transformStyle: "preserve-3d",
          WebkitBackfaceVisibility: "hidden",
          WebkitTransformStyle: "preserve-3d",
          width: "100%",
          height: "100%",
          position: "relative",
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        {frontContent}
      </div>

      {/* Back Side */}
      <div 
        ref={backRef}
        className="absolute top-0 left-0 w-full h-full flex items-center justify-center"
        style={{
          backfaceVisibility: "hidden",
          transformStyle: "preserve-3d",
          WebkitBackfaceVisibility: "hidden",
          WebkitTransformStyle: "preserve-3d",
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          transform: "rotateY(180deg)",
          WebkitTransform: "rotateY(180deg)",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        {backContent}
      </div>
    </div>
  );
};

export default FlipCard;