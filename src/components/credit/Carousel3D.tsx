import React, { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { Draggable } from '../../lib/draggable.js';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const draggerRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  let xPos = 0;

  useEffect(() => {
    if (!containerRef.current || !ringRef.current || !draggerRef.current || clients.length === 0) return;

    const ring = ringRef.current;
    const dragger = draggerRef.current;
    const cards = ring.querySelectorAll('.carousel-card');

    if (cards.length === 0) return;

    // Calculate rotation angle for each card
    const angleStep = 360 / clients.length;

    // Initialize GSAP timeline
    const tl = gsap.timeline();
    
    tl.set(dragger, { opacity: 0 }) // Make drag layer invisible
      .set(ring, { rotationY: 180 }) // Set initial rotation
      .set('.carousel-card', {
        rotateY: (i) => i * -angleStep,
        transformOrigin: '50% 50% 500px',
        z: -500,
        backfaceVisibility: 'hidden'
      })
      .from('.carousel-card', {
        duration: 1.5,
        y: 200,
        opacity: 0,
        stagger: 0.1,
        ease: 'expo'
      });

    // Create draggable functionality
    const draggableInstance = Draggable.create(dragger, {
      onDragStart: (e) => {
        if (e.touches) e.clientX = e.touches[0].clientX;
        xPos = Math.round(e.clientX);
      },
      
      onDrag: (e) => {
        if (e.touches) e.clientX = e.touches[0].clientX;
        
        gsap.to(ring, {
          rotationY: '-=' + ((Math.round(e.clientX) - xPos) % 360),
          duration: 0.3,
          ease: "power2.out"
        });
        
        xPos = Math.round(e.clientX);
      },
      
      onDragEnd: () => {
        gsap.set(dragger, { x: 0, y: 0 }); // Reset drag layer
      }
    });

    setIsInitialized(true);

    return () => {
      if (draggableInstance && draggableInstance[0]) {
        draggableInstance[0].kill();
      }
      tl.kill();
    };
  }, [clients.length]);

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
            {clients.length} client{clients.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* 3D Carousel Container */}
      <div 
        ref={containerRef}
        className="relative mx-auto"
        style={{
          perspective: '2000px',
          width: '300px',
          height: '400px'
        }}
      >
        {/* Ring Container */}
        <div
          ref={ringRef}
          id="ring"
          className="w-full h-full"
          style={{
            transformStyle: 'preserve-3d',
            position: 'absolute'
          }}
        >
          {clients.map((client, index) => (
            <div
              key={client.id}
              className="carousel-card absolute w-64 h-80"
              style={{
                transformStyle: 'preserve-3d',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)'
              }}
            >
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
          ))}
        </div>

        {/* Invisible Drag Layer */}
        <div
          ref={draggerRef}
          id="dragger"
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          style={{
            zIndex: 10,
            background: 'transparent'
          }}
        />

        {/* Vignette Effect */}
        <div 
          className="vignette absolute pointer-events-none"
          style={{
            width: '1400px',
            height: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(to left, rgba(0,0,0,0.3) 12%, rgba(0,0,0,0) 40%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.3) 88%)',
            zIndex: 5
          }}
        />
      </div>

      {/* Instructions */}
      <div className="text-center mt-4">
        <p className="text-xs text-gray-500">
          Drag to rotate • {clients.length} client{clients.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
};

export default Carousel3D;