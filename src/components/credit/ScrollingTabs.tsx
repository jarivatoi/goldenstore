import React, { useEffect, useRef } from 'react';
import { useCallback } from 'react';
import { gsap } from 'gsap';
import { Draggable } from '../../lib/draggable.js';
import { Bot as Bottle } from 'lucide-react';
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
  const [selectedClientForDetail, setSelectedClientForDetail] = React.useState<Client | null>(null);
 const dragStartPositionRef = useRef(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const pausedPositionRef = useRef<number | null>(null);
  const [clickedTabId, setClickedTabId] = React.useState<string | null>(null);
  const { getClientTransactions } = useCredit();
  const dragHasExceededThreshold = useRef(false);
  const [forceUpdate, setForceUpdate] = React.useState(0);
  const dragDirectionRef = useRef<'left' | 'right'>('left');
  
  // Listen for credit data changes to force re-render
  React.useEffect(() => {
    const handleCreditDataChanged = () => {
      // Force re-render and restart timeline
      setForceUpdate(prev => prev + 1);
      
      // Restart timeline to reflect updated data
      setTimeout(() => {
        if (timelineRef.current) {
          timelineRef.current.kill();
          timelineRef.current = null;
        }
        
        // Restart timeline with fresh data
        setupContinuousScroll();
      }, 100);
    };

    // Handle long press to show client details
    const handleLongPress = (client: Client) => {
      setSelectedClientForDetail(client);
    };
    
    return () => {
      window.removeEventListener('creditDataChanged', handleCreditDataChanged);
    };
  }, []);

  // Get transactions directly from context to ensure fresh data
  const { getClientTransactions: getTransactions } = useCredit();
  
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
  }, [clients, sortOption, getClientTotalDebt, forceUpdate]);

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
  }, [sortedClients.length]); // Remove function dependencies to prevent recreation

  // Setup continuous scroll in specific direction
  const setupContinuousScrollDirection = useCallback((direction: 'left' | 'right') => {
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
      const currentX = gsap.getProperty(content, "x") as number;
      
      // Calculate total distance including container width gap
      const totalDistance = contentWidth + containerWidth;
      const duration = totalDistance / 60; // 60px per second for consistent speed
      
      // Create timeline based on direction
      timelineRef.current = gsap.timeline({ 
        repeat: -1, 
        ease: "none",
        paused: false,
        immediateRender: true,
        overwrite: false
      });
      
      if (direction === 'right') {
        // User swiped right, so continue moving content to the right (revealing cards from left)
        timelineRef.current
          .to(content, {
            x: containerWidth,
            duration: Math.abs(containerWidth - currentX) / 60, // Time based on distance
            ease: "none"
          })
          .set(content, { x: -contentWidth }) // Jump to left edge
          .to(content, {
            x: containerWidth,
            repeat: -1,
            duration: duration,
            ease: "none"
          });
      } else {
        // User swiped left, so continue moving content to the left (revealing cards from right)
        timelineRef.current
          .to(content, {
            x: -contentWidth,
            duration: Math.abs(-contentWidth - currentX) / 60, // Time based on distance
            ease: "none"
          })
          .set(content, { x: containerWidth }) // Jump to right edge
          .to(content, {
            x: -contentWidth,
            repeat: -1,
            duration: duration,
            ease: "none"
          });
      }
    });
  }, [sortedClients.length]);

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
          })
        .call(() => {
          // Kill and reset timeline when loop completes (cards resurface)
          if (timelineRef.current) {
            timelineRef.current.kill();
            timelineRef.current = null;
          }
          
          // Clear saved position when starting fresh infinite loop
          pausedPositionRef.current = null;
          
          // Restart fresh timeline after brief delay
          setTimeout(() => {
            if (!timelineRef.current) {
              setupContinuousScroll();
            }
          }, 100);
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
        throwResistance: 0.001, // Much more momentum for natural feel
        minDuration: 0.1,
        overshootTolerance: 0, // No overshooting
        force3D: true,
        lockAxis: true, // Lock to horizontal axis only
        onDragStart: function() {
         // Store initial position and kill timeline
         const currentX = gsap.getProperty(content, "x") as number;
         dragStartPositionRef.current = currentX;
         dragDirectionRef.current = null;
         
          if (timelineRef.current) {
            timelineRef.current.kill();
            timelineRef.current = null; // Set to null after killing
          }
        },
       onDrag: function() {
         // Track drag direction based on movement
         const currentX = gsap.getProperty(content, "x") as number;
         const deltaX = currentX - dragStartPositionRef.current;
         
         // Determine direction based on significant movement (>20px)
         if (Math.abs(deltaX) > 20) {
           if (deltaX > 0) {
             dragDirectionRef.current = 'right'; // Content moving right
           } else {
             dragDirectionRef.current = 'left'; // Content moving left
           }
         }
       },
        onDragEnd: function() {
          // Kill any existing timeline when user finishes dragging
          if (timelineRef.current) {
            timelineRef.current.kill();
            timelineRef.current = null;
          }
        },
        onThrowComplete: function() {
          // Continue scrolling in the direction the user swiped
          if (dragDirectionRef.current) {
            setupContinuousScrollDirection(dragDirectionRef.current);
          } else {
           // Default to left direction if no direction was detected
            setupContinuousScrollDirection('left');
          }
          
          pausedPositionRef.current = null; // Clear any stored position
        }
      });
    });
  }, [sortedClients.length]); // Remove function dependencies to prevent recreation

  // Setup animation when clients change
  useEffect(() => {
    // Only setup once when clients are first loaded
    if (!timelineRef.current && sortedClients.length > 0) {
      // Remove timeout to prevent timing issues
      setupContinuousScroll();
    }
    
    // Only clean up if clients are truly gone for a longer period
    if (sortedClients.length === 0) {
      // Don't kill timeline immediately - let it continue running
      // Only kill if clients are gone for a very long time
    }
  }, [sortedClients.length]); // Remove setupContinuousScroll dependency to prevent re-triggering

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

  // Handle tab click - pause timeline and show modal
  const handleTabClick = (client: Client) => {
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
  };

  // Handle long press to show client details

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
            {sortedClients.map((client, index) => {
              const totalDebt = getClientTotalDebt(client.id);
              const isLinked = linkedClient?.id === client.id;
              const hasOverdueItems = hasOverdueReturnables(client);
              
              // Force recalculation of returnable items by calling the function fresh each render
              const currentReturnableItems = (() => {
                const clientTransactions = getTransactions(client.id);
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
                    const size = bouteilleMatch[2]?.trim().toUpperCase() || '';
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
                    if (sizeMatch && sizeMatch[1] && brand) {
                      key = `${sizeMatch[1].toUpperCase()} Bouteille ${brand}`;
                    } else if (brand) {
                      key = `Bouteille ${brand}`;
                    } else if (sizeMatch && sizeMatch[1]) {
                      key = `${sizeMatch[1].toUpperCase()} Bouteille`;
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
                      truncated = `${remaining} (Ch)`;
                    } else if (itemType.match(/(\d+(?:\.\d+)?L)/i)) {
                      // For sized bottles like "1.5L Green" -> "4 (1.5L)"
                      const sizeMatch = itemType.match(/(\d+(?:\.\d+)?L)/i);
                      truncated = `${remaining} (${sizeMatch[1]})`;
                    } else if (itemType.includes('Bouteille')) {
                      // For regular bottles like "Bouteille Green" -> "4 (Bt)"
                      truncated = `${remaining} (Bt)`;
                    } else {
                      // For other items, use first 3 characters
                      truncated = `${remaining} (${itemType.substring(0, 3)})`;
                    }
                    truncatedItems.push(truncated);
                  }
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
                      : (() => {
                          // Priority 1: High debt (>= 1000) gets bounce animation
                          if (totalDebt >= 1000) {
                            return 'animate-bounce';
                          }
                          
                          // Priority 2: Check if client has returnable items - gets shake animation
                          const clientTransactions = getTransactions(client.id);
                          
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
                              
                              // Capitalize brand name properly
                              const capitalizedBrand = brand ? brand.split(' ').map(word => 
                                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                              ).join(' ') : '';
                              
                              let key;
                              if (size && brand) {
                                key = `${size} ${capitalizedBrand}`;
                              } else if (brand) {
                                key = `Bouteille ${capitalizedBrand}`;
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
                              
                              // Capitalize brand name properly
                              const capitalizedBrand = brand ? brand.split(' ').map(word => 
                                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                              ).join(' ') : '';
                              
                              let key;
                              if (sizeMatch && brand) {
                                key = `${sizeMatch[1].replace(/l$/i, 'L')} ${capitalizedBrand}`;
                              } else if (brand) {
                                key = `Bouteille ${capitalizedBrand}`;
                              } else if (sizeMatch) {
                                key = `${sizeMatch[1].replace(/l$/i, 'L')} Bouteille`;
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
                              
                              // Capitalize brand name properly
                              const capitalizedBrand = brand ? brand.split(' ').map(word => 
                                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                              ).join(' ') : '';
                              
                              const key = capitalizedBrand ? `Chopine ${capitalizedBrand}` : 'Chopine';
                              
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
                          
                          // Return shake animation for clients with returnables (only if debt < 1000)
                          return hasUnreturnedItems ? 'animate-subtle-shake' : '';
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
                  onContextMenu={(e) => e.preventDefault()} // Prevent right-click menu
                >
                  <div className="text-center relative h-full flex flex-col justify-center">
                    {/* Client name with bottle icon if has returnables */}
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <div className="text-sm font-medium text-gray-800 truncate select-none">
                        {client.name}
                      </div>
                    </div>
                    
                    {clientFilter === 'returnables' ? (
                      <div className="text-xs font-semibold text-orange-600">
                        {currentReturnableItems || 'No returnables'}
                      </div>
                    ) : totalDebt === 0 ? (
                      <div className="text-xs font-semibold text-orange-600">
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
                          <div className="text-xs font-semibold text-orange-600">
                            {currentReturnableItems || 'No returnables'}
                          </div>
                        }
                        shouldFlip={!!currentReturnableItems}
                        flipDuration={0.8}
                        flipDelay={2}
                        className="w-full"
                      />
                    )}
                    <div className="text-xs text-gray-500 mt-1 text-center">
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
          onQuickAdd={(client) => {
            console.log('🔗 ScrollingTabs: onQuickAdd from detail modal called with client:', client.name);
            onQuickAdd(client);
          }}
        />
      )}

    </div>
    </>
  );
};

export default ScrollingTabs;