import React, { useRef, useEffect, useCallback, useState } from 'react';
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';

gsap.registerPlugin(Draggable);

interface Client {
  id: string;
  name: string;
  balance: number;
}

interface ScrollingTabsProps {
  clients: Client[];
  onClientSelect: (client: Client) => void;
  selectedClientId?: string;
}

const ScrollingTabs: React.FC<ScrollingTabsProps> = ({ 
  clients, 
  onClientSelect, 
  selectedClientId 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const draggableRef = useRef<Draggable[] | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Helper function to start timeline from any position
  const startTimelineFromPosition = useCallback((startX: number, containerWidth: number, contentWidth: number) => {
    if (!contentRef.current) return;
    
    const content = contentRef.current;
    const totalDistance = containerWidth + contentWidth;
    
    // Calculate remaining distance to complete the cycle
    const targetX = -contentWidth; // Always end at left edge
    const remainingDistance = startX - targetX;
    const remainingDuration = remainingDistance / 40; // 40px per second
    
    console.log('Starting timeline from:', startX, 'to:', targetX, 'duration:', remainingDuration);
    
    // Kill any existing timeline
    if (timelineRef.current) {
      timelineRef.current.kill();
    }
    
    // Create new timeline from current position
    timelineRef.current = gsap.timeline({ 
      repeat: -1, 
      ease: "none",
      onComplete: () => {
        console.log('Timeline cycle completed, restarting from right');
      }
    });
    
    // First, complete current cycle from startX to left edge
    if (remainingDuration > 0) {
      timelineRef.current.fromTo(content, 
        { x: startX },
        { 
          x: targetX,
          duration: remainingDuration,
          ease: "none"
        }
      );
    }
    
    // Then continue with normal cycles (right to left)
    timelineRef.current.fromTo(content, 
      { x: containerWidth }, // Enter from right
      { 
        x: -contentWidth, // Exit to left
        duration: totalDistance / 40,
        ease: "none"
      }
    );
  }, []);

  // Seamless continuous scroll setup
  const setupContinuousScroll = useCallback(() => {
    if (!contentRef.current || !containerRef.current || clients.length === 0) return;

    const container = containerRef.current;
    const content = contentRef.current;
    
    // Clean up existing animations
    if (timelineRef.current) {
      timelineRef.current.kill();
      timelineRef.current = null;
    }
    
    if (draggableRef.current) {
      draggableRef.current.forEach(d => d.kill());
      draggableRef.current = null;
    }

    // Reset position and wait for layout
    gsap.set(content, { x: 0 });
    requestAnimationFrame(() => {
      const containerWidth = container.offsetWidth;
      const contentWidth = content.scrollWidth;
      
      console.log('Setting up continuous scroll - Container:', containerWidth, 'Content:', contentWidth);
      
      // Start the initial timeline
      startTimelineFromPosition(containerWidth, containerWidth, contentWidth);
      
      // Create draggable with matching bounds
      draggableRef.current = Draggable.create(content, {
        type: "x",
        bounds: {
          minX: -(contentWidth + 100), // Allow dragging beyond content
          maxX: containerWidth
        },
        edgeResistance: 0.1,
        inertia: true,
        throwProps: {
          resistance: 300,
          minDuration: 0.3,
          maxDuration: 3
        },
        dragResistance: 0,
        throwResistance: 2000,
        onDragStart: function() {
          if (timelineRef.current) {
            timelineRef.current.kill();
            timelineRef.current = null;
          }
          setIsDragging(true);
          console.log('Drag started - timeline killed');
        },
        onDragEnd: function() {
          setIsDragging(false);
          // Create new timeline from current position
          const currentX = gsap.getProperty(content, "x") as number;
          console.log('Drag ended at position:', currentX, '- creating new timeline');
          startTimelineFromPosition(currentX, containerWidth, contentWidth);
        },
        onThrowComplete: function() {
          // Create new timeline from throw end position
          const currentX = gsap.getProperty(content, "x") as number;
          console.log('Throw completed at position:', currentX, '- creating new timeline');
          startTimelineFromPosition(currentX, containerWidth, contentWidth);
        }
      });
    });
  }, [clients.length, startTimelineFromPosition]);

  // Setup animation when clients change
  useEffect(() => {
    setupContinuousScroll();
    
    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
      if (draggableRef.current) {
        draggableRef.current.forEach(d => d.kill());
      }
    };
  }, [setupContinuousScroll]);

  // Debug monitoring
  useEffect(() => {
    if (isDragging) return;
    
    const interval = setInterval(() => {
      if (timelineRef.current && contentRef.current) {
        const currentX = gsap.getProperty(contentRef.current, "x") as number;
        console.log('Timeline status - Progress:', timelineRef.current.progress(), 'X:', currentX, 'Paused:', timelineRef.current.paused());
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [isDragging]);

  if (clients.length === 0) {
    return (
      <div className="h-16 bg-gray-50 rounded-lg flex items-center justify-center">
        <p className="text-gray-500 text-sm">No clients available</p>
      </div>
    );
  }

  return (
    <div className="relative h-16 bg-white rounded-lg shadow-sm border overflow-hidden">
      <div 
        ref={containerRef}
        className="absolute inset-0"
      >
        <div 
          ref={contentRef}
          className="flex items-center h-full whitespace-nowrap"
          style={{ willChange: 'transform' }}
        >
          {clients.map((client) => (
            <button
              key={client.id}
              onClick={() => onClientSelect(client)}
              className={`
                flex-shrink-0 px-6 py-2 mx-2 rounded-lg font-medium text-sm transition-all duration-200
                ${selectedClientId === client.id 
                  ? 'bg-blue-500 text-white shadow-md' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              <span className="font-semibold">{client.name}</span>
              <span className={`ml-2 text-xs ${
                selectedClientId === client.id ? 'text-blue-100' : 'text-gray-500'
              }`}>
                ${client.balance.toFixed(2)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ScrollingTabs;