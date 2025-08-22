import React, { useEffect, useRef } from 'react';
import { useCallback } from 'react';
import { gsap } from 'gsap';
import { Draggable } from '../../lib/draggable.js';
import { Client } from '../../types';
import ClientActionModal from '../ClientActionModal';
import ClientDetailModal from '../ClientDetailModal';
import { useCredit } from '../../context/CreditContext';
import AlternatingText from '../AlternatingText';
import FlipCard from './FlipCard';

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
  isBigCard?: boolean; // New prop to identify if it's the big card
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
  sortOption,
  isBigCard = false // Default to false for backward compatibility
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const draggableRef = useRef<Draggable[] | null>(null);
  const [selectedClientForAction, setSelectedClientForAction] = React.useState<Client | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const lastDragPositionRef = useRef(0);
  const [clickedTabId, setClickedTabId] = React.useState<string | null>(null);
  const [selectedClientForDetails, setSelectedClientForDetails] = React.useState<Client | null>(null);
  const [longPressTimer, setLongPressTimer] = React.useState<NodeJS.Timeout | null>(null);
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

  // Track if any modal is open
  const isAnyModalOpen = selectedClientForAction !== null || selectedClientForDetails !== null;

  // Kill timeline when any modal opens
  useEffect(() => {
    if (isAnyModalOpen) {
      // Kill the timeline when modal opens
      if (timelineRef.current) {
        timelineRef.current.kill();
        timelineRef.current = null;
      }
    } else {
      // Restart timeline when all modals close
      if (sortedClients && sortedClients.length > 0 && !timelineRef.current && !isDragging) {
        // Small delay to ensure modal is fully closed
        setTimeout(() => {
          // Get the current position of the content element
          const currentX = gsap.getProperty(contentRef.current, "x") as number;
          // Use the current position instead of stored position for more accuracy
          restartTimelineFromPosition(currentX);
        }, 100);
      }
    }
  }, [isAnyModalOpen, sortedClients]);

  // Helper function to check if client has overdue returnables (3+ weeks old)
  const hasOverdueReturnables = (client: Client): boolean => {
    const clientTransactions = getClientTransactions(client.id);
    const threeWeeksAgo = Date.now() - (21 * 24 * 60 * 60 * 1000); // 3 weeks in milliseconds
    
    return clientTransactions.some(transaction => {
      // Only check debt transactions (not payments) and exclude already returned items
      if (transaction.type === 'payment' || transaction.description.toLowerCase().includes('returned')) {
        return false;
      }
      
      const description = transaction.description.toLowerCase();
      const hasReturnableItems = description.includes('chopine') || description.includes('bouteille');
      const isOlderThan3Weeks = transaction.date.getTime() < threeWeeksAgo;
      
      return hasReturnableItems && isOlderThan3Weeks;
    });
  };
  
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
    
    return progress;
  }, []);

  // Add this helper function to restart the timeline from a specific position
  const restartTimelineFromPosition = useCallback((startPosition: number) => {
    const container = containerRef.current;
    const content = contentRef.current;
    
    if (!container || !content) return;
    
    // Kill any existing timeline first
    if (timelineRef.current) {
      timelineRef.current.kill();
      timelineRef.current = null;
    }
    
    const containerWidth = container.offsetWidth;
    const contentWidth = content.scrollWidth;
    const totalDistance = contentWidth + containerWidth;
    const duration = totalDistance / 60;
    
    // Ensure we have valid dimensions
    if (containerWidth <= 0 || contentWidth <= 0) return;
    
    // Create new timeline
    timelineRef.current = gsap.timeline({ repeat: -1, ease: "none" });
    
    // Set the starting position immediately
    gsap.set(content, { x: startPosition });
    
    // Calculate remaining distance to complete current cycle
    const remainingDistance = Math.abs(startPosition - (-contentWidth));
    const remainingDuration = (remainingDistance / totalDistance) * duration;
    
    // Only animate if there's remaining distance
    if (remainingDistance > 0) {
      timelineRef.current
        .to(content, {
          x: -contentWidth,
          duration: remainingDuration,
          ease: "none"
        })
        .to(content, {
          x: containerWidth,
          duration: 0,
          ease: "none"
        })
        .to(content, {
          x: -contentWidth,
          duration: duration,
          ease: "none",
          repeat: -1
        });
    } else {
      // If already at end position, start new cycle
      timelineRef.current
        .to(content, {
          x: containerWidth,
          duration: 0,
          ease: "none"
        })
        .to(content, {
          x: -contentWidth,
          duration: duration,
          ease: "none",
          repeat: -1
        });
    }
    
  }, []);

  // Seamless continuous scroll setup
  const setupContinuousScroll = useCallback(() => {
    // Don't setup animation if there are no clients
    if (sortedClients.length === 0) {
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
      
      // Create seamless infinite timeline
      timelineRef.current = gsap.timeline({ repeat: -1, ease: "none" });
      
      timelineRef.current
        .fromTo(content, 
          { x: containerWidth }, // Enter from right
          { 
            x: -contentWidth, // Exit to left
            duration: duration,
            ease: "none"
          });
      
      // Create draggable instance with updated bounds
      draggableRef.current = Draggable.create(content, {
        type: "x",
        bounds: {
          minX: -contentWidth,
          maxX: containerWidth,
        },
        edgeResistance: 0.8, // Increased resistance for better control
        inertia: true,
        dragResistance: 0.5, // Normal resistance for dragging
        throwResistance: 1000, // Lower value = more throw, higher = less throw
        maxDuration: 2, // Shorter inertia duration
        minDuration: 0.1,
        overshootTolerance: 0, // No overshooting
        force3D: true,
        onDragStart: function() {
          // Kill the timeline completely on drag start
          if (timelineRef.current) {
            timelineRef.current.kill();
            timelineRef.current = null;
          }
          setIsDragging(true);
        },
        onDragEnd: function() {
          // Store the final position for modal resume
          const finalX = gsap.getProperty(content, "x") as number;
          lastDragPositionRef.current = finalX;
          
          setIsDragging(false);
          
          // Always restart the timeline after drag ends
          // Use requestAnimationFrame to ensure drag state is fully cleared
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (sortedClients.length > 0 && !isAnyModalOpen) {
                const currentX = gsap.getProperty(content, "x") as number;
                restartTimelineFromPosition(currentX);
              }
            });
          });
        },
      });
    });
  }, [clients, sortOption, getClientTotalDebt, calculateTimelineProgress, restartTimelineFromPosition]);

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
    
    setTimeout(() => {
      setupContinuousScroll();
    }, 0);
  }, [clients, sortOption, getClientTotalDebt]);

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
    // Clear any existing long press timer
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    // Add click animation
    setClickedTabId(client.id);
    
    // Remove animation after it completes
    setTimeout(() => {
      setClickedTabId(null);
    }, 600);
    
    setSelectedClientForAction(client);
  };

  // Handle long press start
  const handleLongPressStart = (client: Client, e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const timer = setTimeout(() => {
      // Add click animation for long press
      setClickedTabId(client.id);
      
      // Remove click animation after it completes
      setTimeout(() => {
        setClickedTabId(null);
      }, 600);
      
      setSelectedClientForDetails(client);
      setLongPressTimer(null);
    }, 1000); // 1 second long press
    
    setLongPressTimer(timer);
  };

  // Handle long press end
  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
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
          className={`overflow-hidden py-4 w-full h-30 flex items-center relative z-10 ${
            isBigCard ? 'overflow-x-auto' : ''
          }`}
          style={{
            height: '106px',
            // Remove snap behavior for big card
            ...(isBigCard && {
              scrollSnapType: 'none',
              msOverflowStyle: 'none',
              scrollbarWidth: 'none'
            })
          }}
        >
          <div 
            ref={contentRef}
            className="flex gap-6 whitespace-nowrap relative z-10"
            style={{