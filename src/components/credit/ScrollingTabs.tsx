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
  const pausedPositionRef = useRef<number | null>(null);
  const [clickedTabId, setClickedTabId] = React.useState<string | null>(null);
  const [selectedClientForDetails, setSelectedClientForDetails] = React.useState<Client | null>(null);
  const [longPressTimer, setLongPressTimer] = React.useState<NodeJS.Timeout | null>(null);
  const { getClientTransactions } = useCredit();
  const dragHasExceededThreshold = useRef(false);
  
  // Debug: Track what causes component to remount
  React.useEffect(() => {
    console.log('🔍 ScrollingTabs MOUNTED with clients:', sortedClients.length, 'at:', new Date().toLocaleTimeString());
    return () => {
      console.log('💀 ScrollingTabs UNMOUNTING with clients:', sortedClients.length, 'at:', new Date().toLocaleTimeString());
      console.log('💀 Unmount stack trace:', new Error().stack?.split('\n').slice(1, 6).join('\n'));
    };
  }, []); // Empty dependency array - only runs on mount/unmount
  
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
    console.log('🔍 calculateTimelineProgress called');
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
    console.log('🚀 restartTimelineFromPosition called with:', startPosition, 'at time:', new Date().toLocaleTimeString());
    console.log('🚀 Called from stack:', new Error().stack?.split('\n').slice(1, 4).join('\n'));
    const container = containerRef.current;
    const content = contentRef.current;
    
    if (!container || !content) {
      console.log('❌ Missing container or content refs at:', new Date().toLocaleTimeString());
      return;
    }
    
    const containerWidth = container.offsetWidth;
    const contentWidth = content.scrollWidth;
    console.log('📏 Container width:', containerWidth, 'Content width:', contentWidth);
    
    // Only reset position if it's completely off-screen (beyond content boundaries)
    let adjustedPosition = startPosition;
    if (startPosition > containerWidth + 100) {
      console.log('🔧 Position too far right, resetting to container width:', containerWidth);
      adjustedPosition = containerWidth; // Start from right edge
    } else if (startPosition < -contentWidth - 100) {
      console.log('🔧 Position too far left, resetting to left boundary:', -contentWidth);
      adjustedPosition = -contentWidth; // Start from left boundary
    }
    
    // Kill any existing timeline
    if (timelineRef.current) {
      console.log('🔪 Killing existing timeline at:', new Date().toLocaleTimeString());
      timelineRef.current.kill();
      timelineRef.current = null;
    }
    
    // Calculate total distance for full cycle
    const totalDistance = contentWidth + containerWidth;
    const fullCycleDuration = totalDistance / 60; // 60px per second
    console.log('⏱️ Full cycle duration:', fullCycleDuration);
    
    // Create new infinite timeline that matches setupContinuousScroll
    timelineRef.current = gsap.timeline({ repeat: -1, ease: "none" });
    console.log('✨ Created new timeline at:', new Date().toLocaleTimeString());
    
    // Set initial position
    gsap.set(content, { x: adjustedPosition });
    console.log('📍 Set initial position to:', adjustedPosition, '(original was:', startPosition, ')');
    
    // Calculate remaining distance from current position to end
    const remainingDistance = Math.abs(adjustedPosition - (-contentWidth));
    const remainingDuration = (remainingDistance / (contentWidth + containerWidth)) * fullCycleDuration; // Proportional to full cycle
    console.log('📐 Remaining distance:', remainingDistance, 'Duration:', remainingDuration);
    
    // Continue from current position to end, then start infinite loop
    if (remainingDuration > 0) {
      console.log('▶️ Starting animation from current position at:', new Date().toLocaleTimeString());
      timelineRef.current
        .to(content, { 
          x: -contentWidth,
          duration: remainingDuration,
          ease: "none"
        })
        .set(content, { x: containerWidth }) // Jump to right edge instantly
        .to(content, {
          x: -contentWidth,
          repeat: -1, // Infinite repeat of full cycle
          duration: fullCycleDuration,
          ease: "none"
        })
        .call(() => {
          // Clear saved position when starting fresh infinite loop
          pausedPositionRef.current = null;
          console.log('🔄 Cleared saved position for fresh infinite loop');
        });
    } else {
      console.log('🔄 Starting fresh cycle at:', new Date().toLocaleTimeString());
      timelineRef.current
        .set(content, { x: containerWidth }) // Jump to right edge instantly
        .to(content, {
          x: -contentWidth,
          repeat: -1, // Infinite repeat of full cycle
          duration: fullCycleDuration,
          ease: "none"
        })
        .call(() => {
          // Clear saved position when starting fresh infinite loop
          pausedPositionRef.current = null;
          console.log('🔄 Cleared saved position for fresh infinite loop');
        });
    }
    console.log('✅ Timeline restart complete at:', new Date().toLocaleTimeString());
  }, [sortedClients.length]); // Remove function dependencies to prevent recreation

  const setupContinuousScroll = useCallback(() => {
    const content = contentRef.current;
    const container = containerRef.current;
    
    if (!container || !content) {
      console.log('❌ Missing container or content refs at:', new Date().toLocaleTimeString());
      return;
    }
    // Check if we already have an active timeline
    if (timelineRef.current && timelineRef.current.isActive()) {
      console.log('⚠️ Active timeline detected, preserving it at:', new Date().toLocaleTimeString());
      return;
    }
    
    // If timeline exists but is not active, kill it and create new one
    if (timelineRef.current && !timelineRef.current.isActive()) {
      console.log('🔪 Killing inactive timeline and creating new one at:', new Date().toLocaleTimeString());
      timelineRef.current.kill();
      timelineRef.current = null;
    }
    
    // If timeline exists but is not active, kill it and create new one
    if (timelineRef.current && !timelineRef.current.isActive()) {
      console.log('🔪 Killing inactive timeline and creating new one at:', new Date().toLocaleTimeString());
      timelineRef.current.kill();
    }
    // Always reset position when creating new timeline
    console.log('🔄 Resetting position and creating new timeline at:', new Date().toLocaleTimeString());
    gsap.set(content, { x: 0 });
    
    requestAnimationFrame(() => {
      const containerWidth = container.offsetWidth;
      const contentWidth = content.scrollWidth;
      
      // Calculate total distance including container width gap
      const totalDistance = contentWidth + containerWidth;
      const duration = totalDistance / 60; // 60px per second for faster speed
      
      console.log('📏 Creating timeline with - containerWidth:', containerWidth, 'contentWidth:', contentWidth, 'duration:', duration);
      
      console.log('📏 Creating timeline with - containerWidth:', containerWidth, 'contentWidth:', contentWidth, 'duration:', duration);
      
      // Create seamless infinite timeline with protection against external interference
      timelineRef.current = gsap.timeline({ 
        repeat: -1, 
        ease: "none",
        paused: false,
        immediateRender: true,
        overwrite: false // Don't let other animations overwrite this
      });
      
      console.log('✨ Created new timeline in setupContinuousScroll at:', new Date().toLocaleTimeString());
      console.log('📏 Animation params - containerWidth:', containerWidth, 'contentWidth:', contentWidth, 'duration:', duration);
      timelineRef.current
        .fromTo(content, 
          { x: containerWidth }, // Enter from right
          { 
            x: -contentWidth, // Exit to left
            duration: duration,
            ease: "none",
            overwrite: false // Prevent external interference
          });
      
      console.log('▶️ Timeline animation started at:', new Date().toLocaleTimeString());
      // Create draggable instance with updated bounds
      draggableRef.current = Draggable.create(content, {
        type: "x",
        allowEventDefault: false, // Prevent interference with other events
        allowNativeTouchScrolling: false, // Prevent scroll interference
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
        lockAxis: true, // Lock to horizontal axis only
        minimumMovement: 3, // Require minimum movement to start drag
        onDragStart: function() {
          // Kill the timeline on drag start but don't store position yet
          if (timelineRef.current) {
            console.log('🎯 DRAG STARTED - KILLING TIMELINE at:', new Date().toLocaleTimeString());
            console.log('🎯 Timeline was active:', timelineRef.current.isActive());
            timelineRef.current.kill();
          }
        },
        onThrowComplete: function() {
          console.log('🎯 THROW COMPLETE - RESTARTING TIMELINE from stored position:', pausedPositionRef.current, 'at:', new Date().toLocaleTimeString());
          
          // Always resume timeline after throw completes
          const currentX = gsap.getProperty(contentRef.current, "x") as number;
          console.log('🚀 Resuming timeline from current position after throw:', currentX);
          restartTimelineFromPosition(currentX);
          pausedPositionRef.current = null; // Clear any stored position
        }
      });
    });
  }, [sortedClients.length]); // Remove function dependencies to prevent recreation

  // Setup animation when clients change
  useEffect(() => {
    console.log('🔄 CLIENTS USEEFFECT - clients.length:', clients.length, 'sortedClients.length:', sortedClients.length, 'at:', new Date().toLocaleTimeString());
    console.log('🔄 CLIENTS USEEFFECT - Current timeline active:', timelineRef.current?.isActive() || false);
    // Only setup once when clients are first loaded
    if (!timelineRef.current && sortedClients.length > 0) {
      console.log('✨ FIRST TIME TIMELINE SETUP at:', new Date().toLocaleTimeString());
      // Remove timeout to prevent timing issues
      console.log('⏰ CALLING setupContinuousScroll IMMEDIATELY');
      setupContinuousScroll();
    }
    
    // Only clean up if clients are truly gone for a longer period
    if (sortedClients.length === 0) {
      console.log('❌ NO CLIENTS - Timeline should continue running, current active:', timelineRef.current?.isActive() || false);
      // Don't kill timeline immediately - let it continue running
      // Only kill if clients are gone for a very long time
    }
  }, [sortedClients.length]); // Remove setupContinuousScroll dependency to prevent re-triggering

  // Cleanup on unmount
  useEffect(() => {
    console.log('🧹 CLEANUP EFFECT REGISTERED');
    return () => {
      console.log('🧹 COMPONENT UNMOUNTING - KILLING TIMELINE');
      console.log('🧹 Timeline was active before kill:', timelineRef.current?.isActive() || false);
      console.log('🧹 Unmount stack trace:', new Error().stack?.split('\n').slice(1, 6).join('\n'));
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
      if (draggableRef.current) {
        draggableRef.current.forEach(d => d.kill());
      }
    };
  }, []);

  // Prevent timeline interference from linkedClient changes
  useEffect(() => {
    console.log('🔗 LINKEDCLIENT EFFECT - linkedClient:', linkedClient?.name || 'none', 'timeline active:', timelineRef.current?.isActive() || false, 'at:', new Date().toLocaleTimeString());
    // Don't let linkedClient changes affect the timeline
    // The timeline should run independently of calculator state
  }, [linkedClient]);

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
    console.log('👆 handleTabClick called for client:', client.name, 'at:', new Date().toLocaleTimeString());
    console.log('🎬 Timeline status before click - isActive:', timelineRef.current?.isActive(), 'exists:', !!timelineRef.current);
    
    // Clear any existing long press timer
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    // Store current position before opening modal (if timeline is active)
    if (timelineRef.current && timelineRef.current.isActive()) {
      const currentX = gsap.getProperty(contentRef.current, "x") as number;
      pausedPositionRef.current = currentX;
      console.log('🎬 Storing position before modal open:', currentX);
      
      // Kill timeline when opening modal
      timelineRef.current.kill();
      timelineRef.current = null;
      console.log('🎬 Timeline killed for modal');
    }
    
    console.log('🎭 Opening modal for client:', client.name);
    setSelectedClientForAction(client);
    
    console.log('🎬 Timeline status after click - isActive:', timelineRef.current?.isActive(), 'exists:', !!timelineRef.current);
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
              minWidth: 'max-content',
              // Remove snap behavior for big card
              ...(isBigCard && {
                scrollSnapAlign: 'none'
              })
            }}
          >
            {sortedClients.map((client, index) => {
              const totalDebt = getClientTotalDebt(client.id);
              const isLinked = linkedClient?.id === client.id;
              const hasOverdueItems = hasOverdueReturnables(client);
              
              // Get returnable items for this client
              const getReturnableItemsForCard = () => {
                const clientTransactions = getClientTransactions(client.id);
                const returnableItems: {[key: string]: number} = {};
                
                clientTransactions.forEach(transaction => {
                  if (transaction.type === 'payment' || transaction.description.toLowerCase().includes('returned')) {
                    return;
                  }
                  
                  const description = transaction.description.toLowerCase();
                  
                  if (!description.includes('chopine') && !description.includes('bouteille')) {
                    return;
                  }
                  
                  const chopinePattern = /(\d+)\s+chopines?(?:\s+([^,]*))?/gi;
                  let chopineMatch;
                  
                  while ((chopineMatch = chopinePattern.exec(description)) !== null) {
                    const quantity = parseInt(chopineMatch[1]);
                    const brand = chopineMatch[2]?.trim() || '';
                    const key = brand ? `Chopine ${brand}` : 'Chopine';
                    
                    if (!returnableItems[key]) {
                      returnableItems[key] = 0;
                    }
                    returnableItems[key] += quantity;
                  }
                  
                  const bouteillePattern = /(\d+)\s+(?:(\d+(?:\.\d+)?L)\s+)?bouteilles?(?:\s+([^,]*))?/gi;
                  let bouteilleMatch;
                  
                  while ((bouteilleMatch = bouteillePattern.exec(description)) !== null) {
                    const quantity = parseInt(bouteilleMatch[1]);
                    const size = bouteilleMatch[2]?.trim() || '';
                    const brand = bouteilleMatch[3]?.trim() || '';
                    
                    let key;
                    if (size && brand) {
                      key = `${size} ${brand}`;
                    } else if (brand) {
                      key = `Bouteille ${brand}`;
                    } else if (size) {
                      key = `${size} Bouteille`;
                    } else {
                      key = 'Bouteille';
                    }
                    
                    if (!returnableItems[key]) {
                      returnableItems[key] = 0;
                    }
                    returnableItems[key] += quantity;
                  }
                  
                  if (description.includes('bouteille') && !bouteillePattern.test(description)) {
                    const sizeMatch = description.match(/(\d+(?:\.\d+)?L)/i);
                    const brandMatch = description.match(/bouteilles?\s+([^,]*)/i);
                    const brand = brandMatch?.[1]?.trim() || '';
                    
                    let key;
                    if (sizeMatch && brand) {
                      key = `${sizeMatch[1]} ${brand}`;
                    } else if (brand) {
                      key = `Bouteille ${brand}`;
                    } else if (sizeMatch) {
                      key = `${sizeMatch[1]} Bouteille`;
                    } else {
                      key = 'Bouteille';
                    }
                    
                    if (!returnableItems[key]) {
                      returnableItems[key] = 0;
                    }
                    returnableItems[key] += 1;
                  }
                  
                  if (description.includes('chopine') && !chopinePattern.test(description)) {
                    const brandMatch = description.match(/chopines?\s+([^,]*)/i);
                    const brand = brandMatch?.[1]?.trim() || '';
                    const key = brand ? `Chopine ${brand}` : 'Chopine';
                    
                    if (!returnableItems[key]) {
                      returnableItems[key] = 0;
                    }
                    returnableItems[key] += 1;
                  }
                });
                
                const returnedQuantities: {[key: string]: number} = {};
                clientTransactions
                  .filter(transaction => transaction.type === 'debt' && transaction.description.toLowerCase().includes('returned'))
                  .forEach(transaction => {
                    const description = transaction.description.toLowerCase();
                    Object.keys(returnableItems).forEach(itemType => {
                      if (description.includes(itemType.toLowerCase())) {
                        const match = description.match(/returned:\s*(\d+)\s+/);
                        if (match) {
                          if (!returnedQuantities[itemType]) {
                            returnedQuantities[itemType] = 0;
                          }
                          returnedQuantities[itemType] += parseInt(match[1]);
                        }
                      }
                    });
                  });
                
                const truncatedItems: string[] = [];
                Object.entries(returnableItems).forEach(([itemType, total]) => {
                  const returned = returnedQuantities[itemType] || 0;
                  const remaining = Math.max(0, total - returned);
                  if (remaining > 0) {
                    let truncated = '';
                    if (itemType.includes('Chopine')) {
                      truncated = `${remaining} Ch`;
                    } else if (itemType.includes('Bouteille')) {
                      if (itemType.includes('1.5L')) {
                        truncated = `${remaining} 1.5L`;
                      } else if (itemType.includes('1L')) {
                        truncated = `${remaining} Lt`;
                      } else if (itemType.includes('2L')) {
                        truncated = `${remaining} 2L`;
                      } else if (itemType.includes('0.5L')) {
                        truncated = `${remaining} 0.5L`;
                      } else {
                        truncated = `${remaining} Bt`;
                      }
                    } else {
                      const shortName = itemType.substring(0, 3);
                      truncated = `${remaining} ${shortName}`;
                    }
                    truncatedItems.push(truncated);
                  }
                });
                
                return truncatedItems.join(', ');
              };
              
              const returnableItemsText = getReturnableItemsForCard();
              
              // Determine card background color based on debt amount (same as big cards)
              const getCardBackgroundColor = () => {
                if (totalDebt <= 300) return 'bg-green-100 border-green-200';
                if (totalDebt < 500) return 'bg-green-100 border-green-200';
                if (totalDebt <= 1000) return 'bg-orange-100 border-orange-200';
                return 'bg-red-100 border-red-200';
              };
              
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
                        ? getCardBackgroundColor()
                        : `${getCardBackgroundColor()} hover:shadow-md ${hasOverdueItems ? 'animate-urgent-glow animate-subtle-shake' : ''}`
                  } ${
                    clickedTabId === client.id 
                      ? 'animate-pulse-attention bg-yellow-200 border-yellow-400 shadow-lg scale-110 z-50' 
                      : totalDebt > 1000
                      ? 'animate-high-debt-pulsate'
                      : (() => {
                          // Check if client has returnable items
                          const clientTransactions = getClientTransactions(client.id);
                          
                          // Calculate actual unreturned items
                          const returnableItems: {[key: string]: number} = {};
                          
                          clientTransactions.forEach(transaction => {
                            if (transaction.type === 'payment' || transaction.description.toLowerCase().includes('returned')) {
                              return;
                            }
                            
                            const description = transaction.description.toLowerCase();
                            
                            if (!description.includes('chopine') && !description.includes('bouteille')) {
                              return;
                            }
                            
                            // Parse chopine items
                            const chopinePattern = /(\d+)\s+chopines?(?:\s+([^,]*))?/gi;
                            let chopineMatch;
                            
                            while ((chopineMatch = chopinePattern.exec(description)) !== null) {
                              const quantity = parseInt(chopineMatch[1]);
                              const brand = chopineMatch[2]?.trim() || '';
                              const key = brand ? `Chopine ${brand}` : 'Chopine';
                              
                              if (!returnableItems[key]) {
                                returnableItems[key] = 0;
                              }
                              returnableItems[key] += quantity;
                            }
                            
                            // Parse bouteille items
                            const bouteillePattern = /(\d+)\s+(?:(\d+(?:\.\d+)?L)\s+)?bouteilles?(?:\s+([^,]*))?/gi;
                            let bouteilleMatch;
                            
                            while ((bouteilleMatch = bouteillePattern.exec(description)) !== null) {
                              const quantity = parseInt(bouteilleMatch[1]);
                              const size = bouteilleMatch[2]?.trim() || '';
                              const brand = bouteilleMatch[3]?.trim() || '';
                              
                              let key;
                              if (size && brand) {
                                key = `${size} ${brand}`;
                              } else if (brand) {
                                key = `Bouteille ${brand}`;
                              } else if (size) {
                                key = `${size} Bouteille`;
                              } else {
                                key = 'Bouteille';
                              }
                              
                              if (!returnableItems[key]) {
                                returnableItems[key] = 0;
                              }
                              returnableItems[key] += quantity;
                            }
                            
                            // Handle items without explicit numbers
                            if (description.includes('bouteille') && !bouteillePattern.test(description)) {
                              const sizeMatch = description.match(/(\d+(?:\.\d+)?L)/i);
                              const brandMatch = description.match(/bouteilles?\s+([^,]*)/i);
                              const brand = brandMatch?.[1]?.trim() || '';
                              
                              let key;
                              if (sizeMatch && brand) {
                                key = `${sizeMatch[1]} ${brand}`;
                              } else if (brand) {
                                key = `Bouteille ${brand}`;
                              } else if (sizeMatch) {
                                key = `${sizeMatch[1]} Bouteille`;
                              } else {
                                key = 'Bouteille';
                              }
                              
                              if (!returnableItems[key]) {
                                returnableItems[key] = 0;
                              }
                              returnableItems[key] += 1;
                            }
                            
                            if (description.includes('chopine') && !chopinePattern.test(description)) {
                              const brandMatch = description.match(/chopines?\s+([^,]*)/i);
                              const brand = brandMatch?.[1]?.trim() || '';
                              const key = brand ? `Chopine ${brand}` : 'Chopine';
                              
                              if (!returnableItems[key]) {
                                returnableItems[key] = 0;
                              }
                              returnableItems[key] += 1;
                            }
                          });
                          
                          // Calculate returned quantities
                          const returnedQuantities: {[key: string]: number} = {};
                          clientTransactions
                            .filter(transaction => transaction.type === 'debt' && transaction.description.toLowerCase().includes('returned'))
                            .forEach(transaction => {
                              const description = transaction.description.toLowerCase();
                              Object.keys(returnableItems).forEach(itemType => {
                                if (description.includes(itemType.toLowerCase())) {
                                  const match = description.match(/returned:\s*(\d+)\s+/);
                                  if (match) {
                                    if (!returnedQuantities[itemType]) {
                                      returnedQuantities[itemType] = 0;
                                    }
                                    returnedQuantities[itemType] += parseInt(match[1]);
                                  }
                                }
                              });
                            });
                          
                          // Check if there are any unreturned items
                          const hasUnreturnedItems = Object.entries(returnableItems).some(([itemType, total]) => {
                            const returned = returnedQuantities[itemType] || 0;
                            const remaining = Math.max(0, total - returned);
                            return remaining > 0;
                          });
                          
                          return hasUnreturnedItems ? 'animate-small-debt-shake' : '';
                        })()
                  }`}
                  style={{
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none',
                    WebkitTouchCallout: 'none',
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'pan-x',
                    // Remove snap behavior for big card
                    ...(isBigCard && {
                      scrollSnapAlign: 'none'
                    })
                  }}
                  onClick={() => handleTabClick(client)}
                  onDoubleClick={() => onQuickAdd(client)}
                  onTouchStart={(e) => handleLongPressStart(client, e)}
                  onTouchEnd={handleLongPressEnd}
                  onTouchCancel={handleLongPressEnd}
                  onMouseDown={(e) => handleLongPressStart(client, e)}
                  onMouseUp={handleLongPressEnd}
                  onMouseLeave={handleLongPressEnd}
                  onContextMenu={(e) => e.preventDefault()} // Prevent right-click menu
                >
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-800 truncate select-none">
                      {client.name}
                    </div>
                    {clientFilter === 'returnables' ? (
                      <div className="text-xs font-semibold text-orange-600">
                        {returnableItemsText || 'No returnables'}
                      </div>
                    ) : totalDebt === 0 ? (
                      <div className="text-xs font-semibold text-orange-600">
                        {returnableItemsText || 'No returnables'}
                      </div>
                    ) : (
                      <FlipCard
                        frontContent={
                          <div className="text-xs font-semibold text-red-600">
                            Rs {totalDebt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        }
                        backContent={
                          <div className="text-xs font-semibold text-orange-600">
                            {returnableItemsText || 'No returnables'}
                          </div>
                        }
                        shouldFlip={!!returnableItemsText}
                        flipDuration={0.8}
                        flipDelay={2}
                        className="w-full"
                      />
                    )}
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
          onClose={() => {
            console.log('🎭 Modal closing, resuming timeline from stored position:', pausedPositionRef.current);
            setSelectedClientForAction(null);
            
            // Resume timeline from stored position after modal closes
            if (pausedPositionRef.current !== null) {
              console.log('🚀 Resuming timeline from stored position:', pausedPositionRef.current);
              restartTimelineFromPosition(pausedPositionRef.current);
              pausedPositionRef.current = null; // Clear stored position
            } else {
              console.log('🚀 No stored position, setting up fresh timeline');
              // Don't create fresh timeline, let the existing one continue or restart naturally
              setTimeout(() => {
                if (!timelineRef.current || !timelineRef.current.isActive()) {
                  console.log('🚀 Creating fresh timeline after modal close');
                  setupContinuousScroll();
                }
              }, 100);
            }
          }}
          onQuickAdd={onQuickAdd}
          onResetCalculator={onResetCalculator}
        />
      )}

      {/* Detail Modal */}
      {selectedClientForDetails && (
        <ClientDetailModal
          client={selectedClientForDetails}
          onClose={() => {
            console.log('🎭 Detail modal closing, resuming timeline from stored position:', pausedPositionRef.current);
            setSelectedClientForDetails(null);
            
            // Resume timeline from stored position after modal closes
            if (pausedPositionRef.current !== null) {
              console.log('🚀 Resuming timeline from stored position:', pausedPositionRef.current);
              restartTimelineFromPosition(pausedPositionRef.current);
              pausedPositionRef.current = null; // Clear stored position
            } else {
              console.log('🚀 No stored position, setting up fresh timeline');
              // Don't create fresh timeline, let the existing one continue or restart naturally
              setTimeout(() => {
                if (!timelineRef.current || !timelineRef.current.isActive()) {
                  console.log('🚀 Creating fresh timeline after modal close');
                  setupContinuousScroll();
                }
              }, 100);
            }
          }}
          onQuickAdd={onQuickAdd}
        />
      )}
    </div>
    </>
  );
};

export default ScrollingTabs;