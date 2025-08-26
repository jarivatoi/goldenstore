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

    // Set initial 3D perspective and positioning
    gsap.set(card, {
      transformStyle: "preserve-3d",
      perspective: 1000,
      // iOS Safari specific fixes
      WebkitTransformStyle: "preserve-3d",
      WebkitPerspective: 1000
    });

    gsap.set(front, {
      rotationY: 0,
      backfaceVisibility: "hidden",
      transformStyle: "preserve-3d",
      WebkitBackfaceVisibility: "hidden",
      WebkitTransformStyle: "preserve-3d",
      position: "relative",
      zIndex: 2
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
      zIndex: 1
    });

    // Create flip animation timeline
    const createFlipTimeline = () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }

      timelineRef.current = gsap.timeline({ 
        repeat: shouldFlip ? -1 : 0,
        delay: flipDelay,
        yoyo: true,
        repeatDelay: flipDelay
      });

      timelineRef.current
        .to([front, back], {
          rotationY: "+=180",
          duration: flipDuration,
          ease: "power1.inOut", // Smoother easing for older devices
          transformOrigin: "50% 50%", // More explicit transform origin
          force3D: true, // Force hardware acceleration
          WebkitTransform: "rotateY(+=180deg)", // Explicit WebKit transform
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
        WebkitTransform: "rotateY(0deg)"
      });
      gsap.set(back, { 
        rotationY: 180,
        force3D: true,
        WebkitTransform: "rotateY(180deg)"
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
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{
        transformStyle: "preserve-3d",
        WebkitTransformStyle: "preserve-3d",
        textAlign: "center",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
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
        className="w-full h-full"
        style={{
          backfaceVisibility: "hidden",
          transformStyle: "preserve-3d",
          WebkitBackfaceVisibility: "hidden",
          WebkitTransformStyle: "preserve-3d",
          width: "100%",
          height: "100%",
          position: "relative",
          zIndex: 2
        }}
      >
        {frontContent}
      </div>

      {/* Back Side */}
      <div 
        ref={backRef}
        className="absolute top-0 left-0 w-full h-full"
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
          zIndex: 1
        }}
      >
        {backContent}
      </div>
    </div>
  );
};

export default FlipCard;