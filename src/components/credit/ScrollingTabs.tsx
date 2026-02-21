import React, { useEffect, useRef } from 'react';
import { useCallback } from 'react';
import { gsap } from 'gsap';
import { Draggable, DraggableInstance } from '../../lib/draggable';
import { Client } from '../../types';
import ClientActionModal from '../ClientActionModal';
import ClientDetailModal from '../ClientDetailModal';
import { useCredit } from '../../context/CreditContext';
import FlipCard from './FlipCard';
import { calculateReturnableItems } from '../../utils/returnableItemsUtils';

// Register GSAP plugins
gsap.registerPlugin(Draggable);

interface ScrollingTabsProps {
  clients: Client[];
  linkedClient: Client | null | undefined;
  onQuickAdd: (client: Client) => void;
  clientFilter: 'all' | 'returnables' | 'overdue' | 'overlimit';
  getClientTotalDebt: (clientId: string) => number;
  sortOption: 'name' | 'date' | 'date-oldest' | 'debt';
  onResetCalculator?: () => void;
  isBigCard?: boolean; // New prop to identify if it's the big card
}

const ScrollingTabs: React.FC<ScrollingTabsProps> = ({
  clients,
  linkedClient,
  onQuickAdd,
  clientFilter,
  getClientTotalDebt,
  sortOption,
  isBigCard = false // Default to false for backward compatibility
}) => {
  const scrollingTabsRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const draggableRef = useRef<DraggableInstance[] | null>(null);
  const [selectedClientForAction, setSelectedClientForAction] = React.useState<Client | null>(null);
  const [selectedClientForDetail, setSelectedClientForDetail] = React.useState<Client | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const pausedPositionRef = useRef<number | null>(null);
  const [clickedTabId, setClickedTabId] = React.useState<string | null>(null);
  const { getClientTransactions } = useCredit();
  const [forceUpdate, setForceUpdate] = React.useState(0);
  const [recentlyUpdatedClient, setRecentlyUpdatedClient] = React.useState<string | null>(null);
  
  // Add a custom hook to compare array contents
  const useArrayComparison = (array: any[]) => {
    const ref = useRef(array);
    
    if (array.length !== ref.current.length) {
      ref.current = array;
      return array;
    }
    
    for (let i = 0; i < array.length; i++) {
      if (array[i] !== ref.current[i]) {
        ref.current = array;
        return array;
      }
    }
    
    return ref.current;
  };
  
  const sortedClients = React.useMemo(() => {
    const clientsToSort = [...clients];
    
    switch (sortOption) {
      case 'name':
        return clientsToSort.sort((a, b) => a.name.localeCompare(b.name));
      
      case 'date':
        // Sort by lastTransactionAt descending, but prioritize recently updated client
        return clientsToSort.sort((a, b) => {
          // If one of them is the recently updated client, prioritize it
          if (recentlyUpdatedClient) {
            if (a.id === recentlyUpdatedClient) {
              return -1; // a comes first
            }
            if (b.id === recentlyUpdatedClient) {
              return 1; // b comes first
            }
          }
          
          // Otherwise sort by lastTransactionAt descending
          return b.lastTransactionAt.getTime() - a.lastTransactionAt.getTime();
        });
      
      case 'date-oldest':
        // Sort by lastTransactionAt ascending (oldest first), but prioritize recently updated client
        return clientsToSort.sort((a, b) => {
          // If one of them is the recently updated client, prioritize it
          if (recentlyUpdatedClient) {
            if (a.id === recentlyUpdatedClient) {
              return -1; // a comes first
            }
            if (b.id === recentlyUpdatedClient) {
              return 1; // b comes first
            }
          }
          
          // Otherwise sort by lastTransactionAt ascending
          return a.lastTransactionAt.getTime() - b.lastTransactionAt.getTime();
        });
      
      case 'debt':
        return clientsToSort.sort((a, b) => getClientTotalDebt(b.id) - getClientTotalDebt(a.id));
      
      default:
        // For default case, preserve the order from the context (which handles moveClientToFront)
        return clientsToSort;
    }
  }, [clients, sortOption, getClientTotalDebt, recentlyUpdatedClient]); // Depend on clients array, sort option, getClientTotalDebt function, and recentlyUpdatedClient
  
  // Use the custom hook to prevent unnecessary re-renders
  const stableSortedClients = useArrayComparison(sortedClients);
  
  // Expose timelineRef to parent component
  useEffect(() => {
    if (scrollingTabsRef.current) {
      (scrollingTabsRef.current as any).__timelineRef = timelineRef;
    }
    return () => {
      if (scrollingTabsRef.current) {
        delete (scrollingTabsRef.current as any).__timelineRef;
      }
    };
  }, []);
  
  // Listen for credit data changes to force re-render
  React.useEffect(() => {
    const handleCreditDataChanged = (event: CustomEvent) => {
      // Check if this is a calculator interaction - if so, ignore it
      const isCalculatorInteraction = event && event.detail && event.detail.source === 'calculator';
      if (isCalculatorInteraction) {
        return;
      }

      // Check if this is a duplicate card interaction - if so, ignore it to prevent timeline restart
      const isDuplicateCardInteraction = event && event.detail && event.detail.source === 'duplicateCard';
      if (isDuplicateCardInteraction) {
        return;
      }

      // Check if this is a client action interaction for adding transactions - if so, ignore it to prevent timeline restart
      const isClientActionAddInteraction = event && event.detail && event.detail.source === 'clientActionAdd';
      if (isClientActionAddInteraction) {
        return;
      }

      // Check if this is a transaction interaction - ignore BOTH 'transaction' and 'addTransaction' sources
      const isTransactionInteraction = event && event.detail &&
        (event.detail.source === 'transaction' || event.detail.source === 'addTransaction');
      if (isTransactionInteraction) {
        return;
      }

      // Check if this is a client action interaction for returns - allow UI update but prevent timeline restart
      const isClientActionReturnInteraction = event && event.detail && event.detail.source === 'clientActionReturn';

      // Check if this is a specific client update
      const updatedClientId = event && event.detail && event.detail.clientId;
      if (updatedClientId) {
        setRecentlyUpdatedClient(updatedClientId);
        // Clear the recently updated flag after 5 seconds
        setTimeout(() => {
          setRecentlyUpdatedClient(null);
        }, 5000);
      }

      // Kill existing timeline
      if (timelineRef.current) {
        timelineRef.current.kill();
        timelineRef.current = null;
      }

      // Kill existing draggable
      if (draggableRef.current) {
        draggableRef.current.forEach(d => d.kill());
        draggableRef.current = null;
      }

      // Clear any stored position
      pausedPositionRef.current = null;

      // For return actions, we want to update UI but not restart timeline
      if (isClientActionReturnInteraction) {
        // Force a re-render without restarting timeline
        setForceUpdate(prev => prev + 1);
        return;
      }

      // Restart timeline after a short delay to ensure DOM updates
      setTimeout(() => {
        if (stableSortedClients.length > 0) {
          setupContinuousScroll();
        }
      }, 100);
    };

    window.addEventListener('creditDataChanged', handleCreditDataChanged as EventListener);

    return () => {
      window.removeEventListener('creditDataChanged', handleCreditDataChanged as EventListener);
    };
  }, [clients, recentlyUpdatedClient, stableSortedClients]); // Depend on all relevant variables

  // Get transactions directly from context to ensure fresh data
  const { getClientTransactions: getTransactions } = useCredit();
  
  // Helper function to check if client has overdue returnables (3+ weeks old)
  const hasOverdueReturnables = (client: Client): boolean => {
    const clientTransactions = getTransactions(client.id);
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

  // Add this helper function to restart the timeline from a specific position
  const restartTimelineFromPosition = useCallback((startPosition: number) => {
    // Prevent multiple timeline creation
    if (timelineRef.current && timelineRef.current.isActive()) {
      return;
    }
    
    const container = containerRef.current;
    const content = contentRef.current;
    
    if (!container || !content) {
      return;
    }
    
    const containerWidth = container.offsetWidth;
    const contentWidth = content.scrollWidth;
    
    // Only reset position if it's completely off-screen (beyond content boundaries)
    let adjustedPosition = startPosition;
    if (startPosition > containerWidth + 100) {
      adjustedPosition = containerWidth; // Start from right edge
    } else if (startPosition < -contentWidth - 100) {
      adjustedPosition = -contentWidth; // Start from left boundary
    }
    
    // Kill any existing timeline
    if (timelineRef.current) {
      timelineRef.current.kill();
      timelineRef.current = null;
    }
    
    // Calculate total distance for full cycle
    const totalDistance = contentWidth + containerWidth;
    const fullCycleDuration = totalDistance / 60; // 60px per second
    
    // Create new infinite timeline that matches setupContinuousScroll
    timelineRef.current = gsap.timeline({ repeat: -1, ease: "none" });
    
    // Set initial position
    gsap.set(content, { x: adjustedPosition });
    
    // Calculate remaining distance from current position to end
    const remainingDistance = Math.abs(adjustedPosition - (-contentWidth));
    const remainingDuration = (remainingDistance / (contentWidth + containerWidth)) * fullCycleDuration; // Proportional to full cycle
    
    // Continue from current position to end, then start infinite loop
    if (remainingDuration > 0) {
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
        });
    } else {
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
        });
    }
  }, [stableSortedClients]); // Update dependency to stableSortedClients

  const setupContinuousScroll = useCallback(() => {
    const content = contentRef.current;
    const container = containerRef.current;

    if (!container || !content) {
      return;
    }

    // Prevent multiple timeline creation
    if (timelineRef.current && timelineRef.current.isActive()) {
      return;
    }

    // Kill any existing timeline before creating new one
    if (timelineRef.current) {
      timelineRef.current.kill();
      timelineRef.current = null;
    }

    requestAnimationFrame(() => {
      const containerWidth = container.offsetWidth;
      const contentWidth = content.scrollWidth;

      // Calculate total distance including container width gap
      const totalDistance = contentWidth + containerWidth;
      const duration = totalDistance / 60; // 60px per second for faster speed

      // Create seamless infinite timeline with protection against external interference
      timelineRef.current = gsap.timeline({
        repeat: -1,
        ease: "none",
        paused: false,
        immediateRender: true,
        overwrite: false // Don't let other animations overwrite this
      });

      timelineRef.current
        .fromTo(content,
          { x: containerWidth }, // Enter from right
          {
            x: -contentWidth, // Exit to left
            duration: duration,
            ease: "none",
            overwrite: false // Prevent external interference
        });

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
            timelineRef.current.kill();
            timelineRef.current = null; // Set to null after killing
          }
        },
        onThrowComplete: function() {
          // Always resume timeline after throw completes
          const currentX = gsap.getProperty(contentRef.current, "x") as number;
          restartTimelineFromPosition(currentX);
          pausedPositionRef.current = null; // Clear any stored position
        }
      });
    });
  }, [stableSortedClients]); // Update dependency to stableSortedClients

  // Setup animation when clients change
  useEffect(() => {
    // Kill existing timeline and recreate immediately when client list changes
    if (timelineRef.current) {
      timelineRef.current.kill();
      timelineRef.current = null;
    }

    // Only setup if we have clients
    if (stableSortedClients.length > 0) {
      // Small delay to ensure DOM has updated with new client list
      setTimeout(() => {
        setupContinuousScroll();
      }, 50);
    }
  }, [stableSortedClients]); // Depend on stableSortedClients instead of sortedClients

  // Additional effect to handle filter changes that might not change length
  useEffect(() => {
    // Force timeline restart when clients array reference changes (filter changes)
    if (timelineRef.current && stableSortedClients.length > 0) {
      timelineRef.current.kill();
      timelineRef.current = null;

      // Immediate restart for filter changes
      setupContinuousScroll();
    }
  }, [stableSortedClients]);

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

  // Prevent timeline interference from linkedClient changes
  useEffect(() => {
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

  // Handle touch end with double tap detection
  const handleTouchEndWithDoubleTap = (client: Client, e: React.TouchEvent) => {
    // Don't process if long press was triggered
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }

    const currentTime = Date.now();
    const timeSinceLastTap = currentTime - lastTapTimeRef.current;

    // Double tap detected (within 300ms)
    if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      e.preventDefault();
      e.stopPropagation();

      // Clear any pending single tap timeout
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }

      // Add click animation immediately
      setClickedTabId(client.id);

      // Store current position before opening modal (if timeline is active)
      if (timelineRef.current && timelineRef.current.isActive()) {
        const currentX = gsap.getProperty(contentRef.current, "x") as number;
        pausedPositionRef.current = currentX;

        // Kill timeline when opening modal
        timelineRef.current.kill();
        timelineRef.current = null;
      }

      setSelectedClientForAction(client);
      lastTapTimeRef.current = 0; // Reset to prevent triple tap issues
    } else {
      // Single tap - wait to see if double tap follows
      lastTapTimeRef.current = currentTime;

      // Set timeout for single tap action (do nothing for single tap on scrolling tabs)
      tapTimeoutRef.current = window.setTimeout(() => {
        tapTimeoutRef.current = null;
        // Single tap does nothing - user needs to double tap
      }, 300);
    }
  };

  return (
    <>
    <div ref={scrollingTabsRef} className="bg-white rounded-lg shadow-sm border border-gray-200 scrolling-tabs-component w-full" style={{ flexShrink: 0 }}>
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">
            {getFilterLabel()}
          </h3>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {stableSortedClients.length} client{stableSortedClients.length !== 1 ? 's' : ''}
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
            height: '116px',
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
            {stableSortedClients.map((client) => {
              const totalDebt = getClientTotalDebt(client.id);
              const isLinked = linkedClient?.id === client.id;
              const hasOverdueItems = hasOverdueReturnables(client);
              
              // Force recalculation of returnable items by calling the function fresh each render
              const currentReturnableItems = (() => {
                // Use the shared utility function to calculate returnable items
                const clientTransactions = getTransactions(client.id);
                const fullReturnableItems = calculateReturnableItems(clientTransactions, client.name);
                
                // Truncate the returnable items for display in scrolling tabs
                const truncatedItems: string[] = [];
                fullReturnableItems.forEach(itemText => {
                  let truncated = '';
                  if (itemText.includes('Chopine')) {
                    // For Chopine items: "8 Chopines Beer" -> "8 (Ch)"
                    const quantityMatch = itemText.match(/^(\d+)/);
                    if (quantityMatch) {
                      truncated = `${quantityMatch[1]} (Ch)`;
                    } else {
                      truncated = itemText.substring(0, 10); // Fallback
                    }
                  } else if (itemText.match(/(\d+(?:\.\d+)?L)\b/i)) {
                    // For sized bottles like "3 1.5L Bouteilles Green" -> "3 (1.5L)"
                    // \b ensures L is at a word boundary (not part of a longer word like "2les")
                    const quantityMatch = itemText.match(/^(\d+)/);
                    const sizeMatch = itemText.match(/(\d+(?:\.\d+)?L)\b/i);
                    if (quantityMatch && sizeMatch) {
                      truncated = `${quantityMatch[1]} (${sizeMatch[1]})`;
                    } else {
                      truncated = itemText.substring(0, 10); // Fallback
                    }
                  } else if (itemText.includes('Bouteille')) {
                    // For regular bottles like "3 Bouteilles Green" -> "3 (Bt)"
                    const quantityMatch = itemText.match(/^(\d+)/);
                    if (quantityMatch) {
                      truncated = `${quantityMatch[1]} (Bt)`;
                    } else {
                      truncated = itemText.substring(0, 10); // Fallback
                    }
                  } else {
                    // For other items, use first 3 characters of item type
                    const quantityMatch = itemText.match(/^(\d+)/);
                    if (quantityMatch) {
                      // Extract item type name for abbreviation
                      const itemTypeMatch = itemText.match(/\(([^)]+)\)/);
                      if (itemTypeMatch) {
                        const itemType = itemTypeMatch[1];
                        truncated = `${quantityMatch[1]} (${itemType.substring(0, 3)})`;
                      } else {
                        truncated = itemText.substring(0, 10); // Fallback
                      }
                    } else {
                      truncated = itemText.substring(0, 10); // Fallback
                    }
                  }
                  truncatedItems.push(truncated);
                });
                
                return truncatedItems.join(', ');
              })();
              
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
                  className={`flex-shrink-0 px-4 py-2 rounded-lg border cursor-pointer h-25 w-40 flex items-center ${
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
                      : recentlyUpdatedClient === client.id
                        ? 'animate-pulse-attention bg-green-200 border-green-400 shadow-lg scale-105 z-40'
                        : (() => {
                            // Priority 1: High debt (>= 1000) gets bounce animation
                            if (totalDebt >= 1000) {
                              return 'animate-bounce';
                            }
                            
                            // Priority 2: Check if client has returnable items - gets shake animation
                            const clientTransactions = getTransactions(client.id);

                            // Use the shared utility function to check if there are any unreturned items
                            const fullReturnableItems = calculateReturnableItems(clientTransactions, client.name);
                            const hasUnreturnedItems = fullReturnableItems.length > 0;
                            
                            // Return shake animation for clients with returnables (only if debt < 1000)
                            return hasUnreturnedItems && recentlyUpdatedClient !== client.id ? 'animate-subtle-shake' : '';
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
                  onTouchStart={handleLongPressStart}
                  onTouchEnd={(e) => {
                    handleLongPressEnd();
                    handleTouchEndWithDoubleTap(client, e);
                  }}
                  onTouchMove={handleLongPressEnd}
                  onMouseDown={handleLongPressStart}
                  onMouseUp={handleLongPressEnd}
                  onMouseLeave={handleLongPressEnd}
                  onContextMenu={(e) => e.preventDefault()} // Prevent right-click menu
                >
                  <div className="text-center relative h-full flex flex-col justify-center w-full">
                    {/* Client name with bottle icon if has returnables */}
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <div className="text-sm font-medium text-gray-800 truncate select-none max-w-[120px]" title={client.name}>
                        {client.name}
                      </div>
                    </div>
                    
                    {clientFilter === 'returnables' ? (
                      <div className="text-xs font-semibold text-orange-600 max-w-[120px] truncate" title={currentReturnableItems}>
                        {currentReturnableItems || 'No returnables'}
                      </div>
                    ) : totalDebt === 0 ? (
                      <div className="text-xs font-semibold text-orange-600 max-w-[120px] truncate" title={currentReturnableItems}>
                        {currentReturnableItems || 'No returnables'}
                      </div>
                    ) : (
                      <FlipCard
                        frontContent={
                          <div className="text-xs font-semibold text-red-600">
                            Rs {totalDebt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        }
                        backContent={
                          <div className="text-xs font-semibold text-orange-600 max-w-[120px] truncate" title={currentReturnableItems}>
                            {currentReturnableItems || 'No returnables'}
                          </div>
                        }
                        shouldFlip={!!currentReturnableItems}
                        flipDuration={0.8}
                        flipDelay={2}
                        className="w-full"
                      />
                    )}
                    <div className="text-xs text-gray-500 mt-1 text-center max-w-[120px] truncate">
                      <FlipCard
                        frontContent={<span>{client.lastTransactionAt.toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        }).replace(/\s/g, '-')}</span>}
                        backContent={<span>{client.lastTransactionAt.toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        })}</span>}
                        shouldFlip={true}
                        flipDuration={0.6}
                        flipDelay={2}
                        className="inline-block text-xs"
                      />
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
            // Clear modal and clicked state immediately
            setSelectedClientForAction(null);
            setClickedTabId(null);
            
            setTimeout(() => {
              if (!timelineRef.current || !timelineRef.current.isActive()) {
                if (pausedPositionRef.current !== null) {
                  restartTimelineFromPosition(pausedPositionRef.current);
                  pausedPositionRef.current = null;
                } else {
                  setupContinuousScroll();
                }
              } else {
              }
            }, 100);
          }}
          onQuickAdd={(client) => {
            onQuickAdd(client);
            // Don't close modal here - let ClientActionModal handle it
          }}
          onResetCalculator={() => {
            // Don't reset calculator when closing modal - only reset when explicitly requested
          }}
          onViewDetails={setSelectedClientForDetail}
        />
      )}

      {/* Detail Modal */}
      {selectedClientForDetail && (
        <ClientDetailModal
          client={selectedClientForDetail}
          onClose={() => {
            setSelectedClientForDetail(null);
          }}
        />
      )}

    </div>
    </>
  );
};

export default ScrollingTabs;