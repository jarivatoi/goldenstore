import React, { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Client } from '../../types';
import ClientCard from '../ClientCard';

interface Carousel3DProps {
  clients: Client[];
  linkedClient: Client | null;
  onQuickAdd: (client: Client) => void;
  onResetCalculator: () => void;
  recentTransactionClient: Client | null;
  onCloseWobble: () => void;
}

/**
 * 3D CAROUSEL COMPONENT
 * =====================
 * 
 * Creates a beautiful 3D rotating carousel for client cards
 * Based on https://codepen.io/creativeocean/pen/PoWGpWj
 */
const Carousel3D: React.FC<Carousel3DProps> = ({
  clients,
  linkedClient,
  onQuickAdd,
  onResetCalculator,
  recentTransactionClient,
  onCloseWobble
}) => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const rotationAngle = useRef(0);

  // Calculate angle between cards
  const angleStep = clients.length > 0 ? 360 / clients.length : 0;
  const radius = 280; // Distance from center

  useEffect(() => {
    if (!carouselRef.current || clients.length === 0) return;

    const carousel = carouselRef.current;
    const cards = carousel.querySelectorAll('.carousel-card');

    // Set up 3D perspective
    gsap.set(carousel, {
      transformStyle: "preserve-3d",
      perspective: 1000
    });

    // Position cards in 3D space
    cards.forEach((card, index) => {
      const angle = index * angleStep;
      const x = Math.sin(angle * Math.PI / 180) * radius;
      const z = Math.cos(angle * Math.PI / 180) * radius;
      
      gsap.set(card, {
        transformStyle: "preserve-3d",
        rotationY: angle,
        x: x,
        z: z,
        transformOrigin: "center center"
      });
    });

    // Set initial rotation
    gsap.set(carousel, {
      rotationY: rotationAngle.current
    });

  }, [clients.length, angleStep]);

  const rotateCarousel = (direction: 'next' | 'prev') => {
    if (isAnimating || clients.length <= 1) return;

    setIsAnimating(true);
    
    const newIndex = direction === 'next' 
      ? (currentIndex + 1) % clients.length
      : (currentIndex - 1 + clients.length) % clients.length;
    
    const rotationDelta = direction === 'next' ? -angleStep : angleStep;
    rotationAngle.current += rotationDelta;

    gsap.to(carouselRef.current, {
      rotationY: rotationAngle.current,
      duration: 0.8,
      ease: "power2.inOut",
      onComplete: () => {
        setCurrentIndex(newIndex);
        setIsAnimating(false);
      }
    });
  };

  const goToCard = (index: number) => {
    if (isAnimating || index === currentIndex) return;

    setIsAnimating(true);
    
    const targetRotation = -index * angleStep;
    rotationAngle.current = targetRotation;

    gsap.to(carouselRef.current, {
      rotationY: targetRotation,
      duration: 1,
      ease: "power2.inOut",
      onComplete: () => {
        setCurrentIndex(index);
        setIsAnimating(false);
      }
    });
  };

  if (clients.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center text-gray-500">
          <p className="text-lg">No clients available</p>
          <p className="text-sm">Use the calculator to add transactions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Client Cards</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {currentIndex + 1} of {clients.length}
          </span>
        </div>
      </div>

      {/* 3D Carousel Container */}
      <div className="relative h-96 overflow-hidden">
        {/* Navigation Buttons */}
        {clients.length > 1 && (
          <>
            <button
              onClick={() => rotateCarousel('prev')}
              disabled={isAnimating}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white shadow-lg rounded-full p-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={24} className="text-gray-700" />
            </button>
            
            <button
              onClick={() => rotateCarousel('next')}
              disabled={isAnimating}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white shadow-lg rounded-full p-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={24} className="text-gray-700" />
            </button>
          </>
        )}

        {/* 3D Carousel */}
        <div className="relative w-full h-full flex items-center justify-center">
          <div
            ref={carouselRef}
            className="relative w-64 h-80"
            style={{
              transformStyle: "preserve-3d",
              perspective: "1000px"
            }}
          >
            {clients.map((client, index) => (
              <div
                key={client.id}
                className="carousel-card absolute top-0 left-0 w-full h-full cursor-pointer"
                style={{
                  transformStyle: "preserve-3d",
                  backfaceVisibility: "hidden"
                }}
                onClick={() => {
                  if (index !== currentIndex) {
                    goToCard(index);
                  }
                }}
              >
                <div className="w-full h-full transform hover:scale-105 transition-transform duration-200">
                  <ClientCard
                    client={client}
                    onLongPress={() => {}}
                    onQuickAdd={onQuickAdd}
                    onResetCalculator={onResetCalculator}
                    isLinked={linkedClient?.id === client.id}
                    showWobble={recentTransactionClient?.id === client.id}
                    onCloseWobble={onCloseWobble}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dot Indicators */}
      {clients.length > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {clients.map((_, index) => (
            <button
              key={index}
              onClick={() => goToCard(index)}
              disabled={isAnimating}
              className={`w-3 h-3 rounded-full transition-all duration-200 ${
                index === currentIndex
                  ? 'bg-blue-500 scale-125'
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      )}

      {/* Auto-rotation toggle (optional) */}
      <div className="flex justify-center mt-4">
        <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          3D Carousel • {clients.length} client{clients.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
};

export default Carousel3D;