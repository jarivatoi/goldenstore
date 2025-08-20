import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Draggable } from '../../lib/draggable.js';
import { Client } from '../../types';
import ClientActionModal from '../ClientActionModal';
import { useCredit } from '../../context/CreditContext';

// Register GSAP plugins
gsap.registerPlugin(Draggable);

interface ScrollingTabsProps {
  clients: Client[];
  linkedClient: Client | null;
  onQuickAdd: (client: Client) => void;
  onClientSelect?: (client: Client) => void;
  searchQuery: string;
  clientFilter: 'all' | 'returnables' | 'overdue' | 'overlimit';
  getClientTotalDebt: (clientId: string) => number;
  onResetCalculator?: () => void;
}

const ScrollingTabs: React.FC<ScrollingTabsProps> = ({
  clients,
  linkedClient,
  onQuickAdd,
  onClientSelect,
  searchQuery,
  clientFilter,
  getClientTotalDebt,
  onResetCalculator
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const draggableRef = useRef<Draggable[] | null>(null);
  const [selectedClientForAction, setSelectedClientForAction] = React.useState<Client | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);
  const { getClientTransactions } = useCredit();

  // Configuration - adjust these values as needed
  const START_OFFSET = 400; // Offset from right edge
  const PIXELS_PER_SECOND = 40; // Animation speed

  // Helper function to safely kill existing timeline
  const killExistingTimeline = () => {
    if (timelineRef.current) {
      timelineRef.current.kill();
      timelineRef.current = null;
    }
  };

  // Helper function to get animation parameters
  const getAnimationParams = () => {
    if (!contentRef.current || !containerRef.current) return null;
    
    const container = containerRef.current;
    const content = contentRef.current;
    
    // Force layout calculation
    gsap.set(content, { x: 0 });
    container.offsetWidth;
    content.offsetWidth;
    
    const containerWidth = container.offsetWidth;
    const contentWidth = content.scrollWidth;
    
    // Calculate duration based on content width with offset
    const totalDistance = contentWidth + containerWidth;
    const duration = totalDistance / PIXELS_PER_SECOND;
    
    return { 
      containerWidth, 
      contentWidth, 
      pixelsPerSecond: PIXELS_PER_SECOND, 
      totalDistance, 
      duration,
      startOffset: START_OFFSET
    };
  };

  // Helper function to create new timeline
  const createNewTimeline = (startFromPosition?: number) => {
    if (!contentRef.current) return null;
    
    const params = getAnimationParams();
    if (!params) return null;
    
    const { containerWidth, contentWidth, duration, startOffset } = params;
    const content = contentRef.current;
    
    // CRITICAL: Always kill existing timeline first
    killExistingTimeline();
    
    // Create new timeline
    timelineRef.current = gsap.timeline({ 
      repeat: -1, 
      paused: isPaused,
      ease: "none",
      immediateRender: false,
      force3D: true
    });
    
    // Calculate seamless loop positions with offset
    const endPosition = -contentWidth;
    const loopStartPosition = contentWidth - startOffset; // Apply offset to loop restart
    
    // If starting from a specific position (like after drag)
    if (startFromPosition !== undefined) {
      // Calculate remaining duration based on current position
      const totalDistance = contentWidth + containerWidth;
      const currentToEndDistance = Math.abs(startFromPosition - endPosition);
      const currentToEndDuration = (currentToEndDistance / totalDistance) * duration;
      
      // Create timeline from current position
      timelineRef.current
        .set(content, { x: startFromPosition })
        .to(content, { 
          x: endPosition, 
          duration: currentToEndDuration,
          ease: "none",
          force3D: true
        })
        .set(content, { x: loopStartPosition })
        .to(content, { 
          x: endPosition, 
          duration: duration,
          ease: "none",
          force3D: true
        });
    } else {
      // Initial timeline - start with offset from right edge
      const initialStartPosition = containerWidth - startOffset;
      
      timelineRef.current
        .set(content, { x: initialStartPosition }) // Start with offset from right edge
        .to(content, { 
          x: endPosition, 
          duration: duration,
          ease: "none",
          force3D: true
        })
        .set(content, { x: loopStartPosition })
        .to(content, { 
          x: endPosition, 
          duration: duration,
          ease: "none",
          force3D: true
        });
    }
    
    return timelineRef.current;
  };

  const getFilterLabel = () => {
    switch (clientFilter) {
      case 'returnables': return 'Returnable Items';
      case 'overdue': return 'Overdue Clients';
      case 'overlimit': return 'Over Limit';
      default: return 'Active Clients';
    }
  };

  // Handle tab click - pause timeline and show modal
  const handleTabClick = (client: Client) => {
    // Kill the timeline completely
    if (timelineRef.current) {
      killExistingTimeline();
    }
    setSelectedClientForAction(client);
  };

  // Handle modal close - resume timeline
  const handleModalClose = () => {
    setSelectedClientForAction(null);
    
    // Create new timeline from current position
    if (contentRef.current) {
      const currentPosition = gsap.getProperty(contentRef.current, "x") as number;
      
      const newTimeline = createNewTimeline(currentPosition);
      if (newTimeline) {
        newTimeline.play();
      }
    }
  };

  // GSAP animation setup with length-based calculation
  useEffect(() => {
    if (!contentRef.current || !containerRef.current) return;

    // Only animate if we have clients to show
    if (clients.length > 0) {
      const container = containerRef.current;
      const content = contentRef.current;
      
      // Force layout calculation
      gsap.set(content, { x: 0 });
      container.offsetWidth;
      content.offsetWidth;
      
      const containerWidth = container.offsetWidth;
      const contentWidth = content.scrollWidth;
      
      // Calculate duration based on content width with offset
      const totalDistance = contentWidth + containerWidth;
      const duration = totalDistance / PIXELS_PER_SECOND;
      
      // Kill any existing timeline and draggable
      killExistingTimeline();
      
      if (draggableRef.current) {
        draggableRef.current.forEach(d => d.kill());
        draggableRef.current = null;
      }
      
      // Create initial timeline - start with offset
      const newTimeline = createNewTimeline();
      if (newTimeline) {
        newTimeline.play();
      }
      
      // Create draggable instance with proper bounds considering offset
      draggableRef.current = Draggable.create(content, {
        type: "x",
        bounds: {
          minX: -contentWidth,
          maxX: contentWidth - START_OFFSET // Adjust bounds for offset
        },
        inertia: true,
        edgeResistance: 0.7,
        dragResistance: 0.1,
        throwResistance: 0.3,
        maxDuration: 3,
        minDuration: 0.2,
        overshootTolerance: 0,
        onDragStart: function() {
          killExistingTimeline();
          setIsDragging(true);
        },
        onDragEnd: function() {
          const currentPosition = gsap.getProperty(content, "x") as number;
          setIsDragging(false);
          killExistingTimeline();
          const newTimeline = createNewTimeline(currentPosition);
          if (newTimeline) {
            newTimeline.play();
          }
        },
        onThrowComplete: function() {
          const currentPosition = gsap.getProperty(content, "x") as number;
          killExistingTimeline();
          const newTimeline = createNewTimeline(currentPosition);
          if (newTimeline) {
            newTimeline.play();
          }
        }
      });
    }
  }, [clients, clientFilter, searchQuery]);

  // ... rest of the component (return statement) remains exactly the same ...
  return (
    <>
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">
            {getFilterLabel()}
          </h3>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {clients.length} client{clients.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Scrolling Container */}
      <div className="p-3">
        <div 
          ref={containerRef}
          className="overflow-hidden py-4 w-full h-30 flex items-center justify-center relative z-10"
          style={{
            height: '106px'
          }}
        >
          <div 
            ref={contentRef}
            className="flex gap-3 whitespace-nowrap relative z-10 justify-center min-w-full"
          >
            {clients.map((client) => {
              const totalDebt = getClientTotalDebt(client.id);
              const isLinked = linkedClient?.id === client.id;
              
              return (
                <div
                  key={client.id}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg border cursor-pointer h-25 min-w-fit flex items-center ${
                    isDragging 
                      ? 'transition-none'
                      : 'transition-all duration-200'
                  } ${
                    isLinked 
                      ? 'bg-blue-50 border-blue-200 shadow-md'
                      : isDragging
                        ? 'bg-gray-50 border-gray-200'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                  style={{
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none',
                    WebkitTouchCallout: 'none',
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'pan-x'
                  }}
                  onClick={() => handleTabClick(client)}
                  onDoubleClick={() => onQuickAdd(client)}
                >
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-800 truncate select-none">
                      {client.name}
                    </div>
                    {/* ... rest of the client details rendering ... */}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Modal */}
      {selectedClientForAction && (
        <ClientActionModal
          client={selectedClientForAction}
          onClose={handleModalClose}
          onResetCalculator={onResetCalculator}
        />
      )}
    </div>
    </>
  );
};

export default ScrollingTabs;