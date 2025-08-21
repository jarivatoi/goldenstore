import React, { useEffect, useRef } from 'react';
import { useCallback } from 'react';
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
  sortOption: 'name' | 'date' | 'debt';
}

const ScrollingTabs: React.FC<ScrollingTabsProps> = ({
  clients,
  linkedClient,
  onQuickAdd,
  onClientSelect,
  searchQuery,
  clientFilter,
  getClientTotalDebt,
  onResetCalculator,
  sortOption
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const draggableRef = useRef<Draggable[] | null>(null);
  const [selectedClientForAction, setSelectedClientForAction] = React.useState<Client | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [clickedTabId, setClickedTabId] = React.useState<string | null>(null);
  const [persistentAnimationTabId, setPersistentAnimationTabId] = React.useState<string | null>(null);
  const { getClientTransactions } = useCredit();

  // Sort clients based on sort option
  const sortedClients = React.useMemo(() => {
    const clientsToSort = [...clients];
    
    switch (sortOption) {
      case 'name':
        return clientsToSort.sort((a, b) => a.name.localeCompare(b.name));
      
      case 'date':
        return clientsToSort.sort((a, b) => b.lastTransactionAt.getTime() - a.lastTransactionAt.getTime());
      
      case 'debt':
        return clientsToSort.sort((a, b) => getClientTotalDebt(b.id) - getClientTotalDebt(a.id));
      
      default:
        return clientsToSort;
    }
  }, [clients, sortOption, getClientTotalDebt]);

  // Helper function to calculate timeline progress from current position
  const calculateTimelineProgress = useCallback(() => {
    if (!contentRef.current || !containerRef.current) return 0;
    
    const container = containerRef.current;
    const content = contentRef.current;
    const containerWidth = container.offsetWidth;
    const contentWidth = content.scrollWidth;
    
    // Get current X position of the content
    const currentX = gsap.getProperty(content, "x") as number;
    
    // Timeline animates from containerWidth to -contentWidth
    const startPosition = containerWidth;
    const endPosition = -contentWidth;
    const totalDistance = startPosition - endPosition; // Total animation distance
    
    // Calculate how far we've moved from start position
    const distanceMoved = startPosition - currentX;
    
    // Calculate progress (0 to 1)
    const progress = Math.max(0, Math.min(1, distanceMoved / totalDistance));
    
    console.log('📊 Progress calculation:', {
      currentX,
      startPosition,
      endPosition,
      totalDistance,
      distanceMoved,
      progress
    });
    
    return progress;
  }, []);

  // Seamless continuous scroll setup
  const setupContinuousScroll = useCallback(() => {
    // Don't setup animation if there are no clients
    if (sortedClients.length === 0) {
      console.log('🎯 No clients to animate, skipping continuous scroll setup');
      return;
    }
    
    if (!contentRef.current || !containerRef.current || sortedClients.length === 0) return;

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
      
      // Calculate total distance including container width gap
      const totalDistance = contentWidth + containerWidth;
      const duration = totalDistance / 60; // 60px per second for faster speed
      
      console.log('Setting up continuous scroll - Container:', containerWidth, 'Content:', contentWidth, 'Total Distance:', totalDistance);
      
      // Create draggable instance without initial timeline
      draggableRef.current = Draggable.create(content, {
        type: "x",
          // Cards remain exactly where the user dragged them
          // No timeline restart, no snap to center
        },
      });
    });
  }, [sortedClients.length, calculateTimelineProgress]);

  // Setup animation when clients change
  useEffect(() => {
    // Don't setup animation if there are no clients
    if (sortedClients.length === 0) {
      // Clean up any existing animations
      if (timelineRef.current) {
        timelineRef.current.kill();
        timelineRef.current = null;
      }
      
      if (draggableRef.current) {
        draggableRef.current.forEach(d => d.kill());
        draggableRef.current = null;
      }
      return;
    }
    
    setupContinuousScroll();
  }, [setupContinuousScroll]);

  // Debug effect to monitor timeline state
  useEffect(() => {
    const interval = setInterval(() => {
      if (timelineRef.current && !isDragging) {
        const progress = timelineRef.current.progress();
        const isActive = timelineRef.current.isActive();
        console.log('Timeline status - Progress:', progress.toFixed(3), 'Active:', isActive);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isDragging]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
      if (draggableRef.current) {
        draggableRef.current.forEach(d => d.kill());
      }
    };
  }, []);

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
    // Add click animation
    setSelectedClientForAction(client);
  };

  // Handle modal close - resume timeline
  const handleModalClose = () => {
    setSelectedClientForAction(null);
    // Don't resume timeline immediately - let the animation detection handle it
    // Cards remain where they are
  };

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
            {sortedClients.length} client{sortedClients.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      <div className="p-3">
        <div 
          ref={containerRef}
          className="overflow-hidden py-4 w-full h-30 flex items-center relative z-10"
          style={{
            height: '106px'
          }}
        >
          <div 
            ref={contentRef}
            className="flex gap-6 whitespace-nowrap relative z-10"
            style={{ minWidth: 'max-content' }}
          >
            {sortedClients.map((client, index) => {
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
                  } ${
                    clickedTabId === client.id 
                      ? 'animate-pulse-attention bg-yellow-200 border-yellow-400 shadow-lg scale-110 z-50' 
                      : persistentAnimationTabId === client.id
                      ? 'animate-pulse-persistent bg-yellow-100 border-yellow-300 shadow-md scale-105 z-40'
                      : ''
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
                    <div className={`text-xs font-semibold ${
                      totalDebt > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      Rs {totalDebt.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 text-center">
                      {client.lastTransactionAt.toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: '2-digit'
                      }).replace(/\s/g, '-')}
                    </div>
                    <div className="text-xs text-gray-500 text-center">
                      {client.lastTransactionAt.toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
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