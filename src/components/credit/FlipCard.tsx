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
      perspective: 1000
    });

    gsap.set(front, {
      rotationY: 0,
      backfaceVisibility: "hidden",
      transformStyle: "preserve-3d",
    });

    gsap.set(back, {
      rotationY: 180,
      backfaceVisibility: "hidden",
      transformStyle: "preserve-3d",
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      transformOrigin: "center center"
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
          ease: "power2.inOut",
          transformOrigin: "center center",
          onComplete: () => setIsFlipped(prev => !prev)
        });

      return timelineRef.current;
    };

    if (shouldFlip) {
      createFlipTimeline();
    } else {
      // Reset to front if flip is disabled
      gsap.set([front, back], { rotationY: 0 });
      gsap.set(back, { rotationY: 180 });
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
        textAlign: "center",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      {/* Front Side */}
      <div 
        ref={frontRef}
        className="w-full h-full"
        style={{
          backfaceVisibility: "hidden",
          transformStyle: "preserve-3d",
          width: "100%",
          height: "100%"
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
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          rotateY: "180deg"
        }}
      >
        {backContent}
      </div>
    </div>
  );
};

export default FlipCard;