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
  const [clickedTabId, setClickedTabId] = React.useState<string | null>(null);
  const [selectedClientForDetails, setSelectedClientForDetails] = React.useState<Client | null>(null);
  const [longPressTimer, setLongPressTimer] = React.useState<NodeJS.Timeout | null>(null);
  const { getClientTransactions } = useCredit();

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
      if (sortedClients && sortedClients.length > 0 && !timelineRef.current) {
        // Small delay to ensure modal is fully closed
        setTimeout(() => {
          setupContinuousScroll();
        }, 100);
      }
    }
  }, [isAnyModalOpen, sortedClients, setupContinuousScroll]);

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
    
    const containerWidth = container.offsetWidth;
    const contentWidth = content.scrollWidth;
    const totalDistance = contentWidth + containerWidth;
    const duration = totalDistance / 60;
    
    // Create new timeline
    timelineRef.current = gsap.timeline({ repeat: -1, ease: "none" });
    timelineRef.current
      .fromTo(content, 
        { x: startPosition },
        { 
          x: -contentWidth,
          duration: duration * Math.abs((startPosition - (-contentWidth)) / totalDistance),
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
    
  }, []);

  // Seamless continuous scroll setup
  const setupContinuousScroll = useCallback(() => {
    // Don't setup animation if there are no clients
    if (!sortedClients || sortedClients.length === 0) {
      return;
    }
    
    if (!contentRef.current || !containerRef.current || !sortedClients || sortedClients.length === 0) return;

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
          setIsDragging(false);
          
          // Always restart the timeline after drag ends
          // Use requestAnimationFrame to ensure drag state is fully cleared
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (sortedClients.length > 0) {
                const currentX = gsap.getProperty(content, "x") as number;
                restartTimelineFromPosition(currentX);
              }
            });
          });
        },
      });
    });
  }, [sortedClients.length, calculateTimelineProgress, restartTimelineFromPosition]);

  // Setup animation when clients change
  useEffect(() => {
    // Don't setup animation if there are no clients
    if (!sortedClients || sortedClients.length === 0) {
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
  }, [setupContinuousScroll, sortedClients]);

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
          onClose={() => setSelectedClientForAction(null)}
          onQuickAdd={onQuickAdd}
          onResetCalculator={onResetCalculator}
        />
      )}

      {/* Detail Modal */}
      {selectedClientForDetails && (
        <ClientDetailModal
          client={selectedClientForDetails}
          onClose={() => setSelectedClientForDetails(null)}
          onQuickAdd={onQuickAdd}
        />
      )}
    </div>
    </>
  );
};

export default ScrollingTabs;