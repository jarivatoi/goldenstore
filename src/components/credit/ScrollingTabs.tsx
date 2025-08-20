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

  // Helper function to calculate timeline progress from drag distance
  // Helper function to track timeline progress
  const getTimelineProgress = useCallback(() => {
    const totalDistance = containerWidth + contentWidth;
    
    // Current position in the animation cycle
    // dragDistance is how far we've moved from the starting position
    const currentPosition = containerWidth - dragDistance;
    
    // Calculate progress (0 to 1) in the animation cycle
    const progress = (containerWidth - currentPosition) / totalDistance;
    
    // Normalize to 0-1 range for seamless looping
    const normalizedProgress = ((progress % 1) + 1) % 1;
    
    console.log('📊 Progress calculation:', {
      dragDistance,
      containerWidth,
      contentWidth,
      totalDistance,
      currentPosition,
      progress,
      normalizedProgress
    });
    
    return normalizedProgress;
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
      const containerWidth = container.offsetWidth - 320;
      const contentWidth = content.scrollWidth - 320;
      
      console.log('Setting up continuous scroll - Container:', containerWidth, 'Content:', contentWidth);
      
      // Only animate if content is wider than container
      if (contentWidth <= containerWidth) {
        console.log('Content fits in container, no animation needed');
        return;
      }
      
      // Only animate if content is wider than container
      if (contentWidth <= containerWidth) {
        console.log('Content fits in container, no animation needed');
        return;
      }
      
      // Calculate total distance for seamless loop
      const totalDistance = contentWidth + containerWidth;
      const duration = totalDistance / 40; // 40px per second
      
      // Store current position for drag handling
      let currentPosition = containerWidth;
      
      console.log('Animation params - Distance:', totalDistance, 'Duration:', duration);
      
      console.log('Animation params - Distance:', totalDistance, 'Duration:', duration);
      
      // Create seamless infinite timeline with proper loop logic
      timelineRef.current = gsap.timeline({ 
        repeat: -1, 
        ease: "none",
        immediateRender: false,
        immediateRender: false,
        onRepeat: function() {
          // When timeline repeats, reset position for seamless loop
          gsap.set(content, { x: containerWidth });
          currentPosition = containerWidth;
          console.log('Timeline repeating - reset to position:', containerWidth);
          console.log('Timeline repeating - reset to position:', containerWidth);
        }
      });
      
      timelineRef.current
        .set(content, { x: containerWidth }) // Start from right side
        .set(content, { x: containerWidth }) // Start from right side
        .to(content, { 
          x: -contentWidth,
          duration: duration,
          ease: "none",
          modifiers: {
            x: function(x) {
              currentPosition = parseFloat(x);
              return x + "px";
            }
          }
        });

      console.log('Timeline created and starting...');
      
      console.log('Timeline created and starting...');
      
      // Create draggable instance with proper event handling
      draggableRef.current = Draggable.create(content, {
        type: "x",
        bounds: {
          minX: -contentWidth,
          maxX: containerWidth
        },
        onPress: function() {
          // Store the current timeline progress when drag starts
          this.startProgress = timelineRef.current ? timelineRef.current.progress() : 0;
          if (timelineRef.current) {
            timelineRef.current.pause();
            console.log('🎯 Drag started - timeline paused at progress:', this.startProgress);
          }
          setIsDragging(true);
        },
        onDrag: function() {
          // Update current position during drag
          currentPosition = this.x;
        },
        onRelease: function() {
          setIsDragging(false);
          
          if (timelineRef.current) {
            // Calculate progress: how far we've moved through the animation
            const totalAnimationDistance = containerWidth + contentWidth;
            const distanceTraveled = containerWidth - currentPosition;
            const progress = Math.max(0, Math.min(1, distanceTraveled / totalAnimationDistance));
            const totalAnimationDistance = containerWidth + contentWidth;
            const distanceTraveled = containerWidth - currentPosition;
            const progress = Math.max(0, Math.min(1, distanceTraveled / totalAnimationDistance));
            
            // Restart timeline from the correct position
            timelineRef.current.progress(progress);
            timelineRef.current.play();
            
            console.log('🎯 Drag ended - resuming from progress:', progress, 'position:', currentPosition);
          }
        },
        onThrowComplete: function() {
          // Handle throw completion
          if (timelineRef.current) {
            const totalAnimationDistance = containerWidth + contentWidth;
            const distanceTraveled = containerWidth - currentPosition;
            const progress = Math.max(0, Math.min(1, distanceTraveled / totalAnimationDistance));
            const distanceTraveled = containerWidth - currentPosition;
            const progress = Math.max(0, Math.min(1, distanceTraveled / totalAnimationDistance));
            timelineRef.current.progress(progress);
            timelineRef.current.play();
            console.log('🎯 Throw complete - resuming from progress:', progress, 'position:', currentPosition);
            console.log('🎯 Throw complete - resuming from progress:', progress, 'position:', currentPosition);
          }
        }
      });
    });
  }, [clients.length]);

  const getFilterLabel = () => {
    switch (clientFilter) {
      case 'returnables': return 'Returnable Items';
      case 'overdue': return 'Overdue Clients';
      case 'overlimit': return 'Over Limit';
      default: return 'Active Clients';
    }
  };

  // Seamless continuous scroll setup
  const handleTabClick = (client: Client) => {
    if (!contentRef.current || !containerRef.current || clients.length === 0) return;
    if (timelineRef.current) {
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
        
        // Calculate total distance for seamless loop
        const totalDistance = contentWidth + containerWidth;
        const duration = totalDistance / 40; // 40px per second for smooth readable speed
        
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
        
        // Create draggable instance
        draggableRef.current = Draggable.create(content, {
          type: "x",
          bounds: {
            minX: -contentWidth,
            maxX: containerWidth
          },
          onDragStart: function() {
            console.log('🎯 Drag started - killing timeline');
            // Kill timeline on drag start
            if (timelineRef.current) {
              timelineRef.current.kill();
              timelineRef.current = null;
            }
            setIsDragging(true);
          },
          onDragEnd: function() {
            console.log('🎯 Drag ended - creating new timeline');
            setIsDragging(false);
            
            // Get current position
            const currentPosition = gsap.getProperty(content, "x") as number;
            const progress = getTimelineProgress();
            
            console.log('🎯 Current position:', currentPosition, 'Progress:', progress);
            
            // Create new timeline starting from current position
            const containerWidth = container.offsetWidth;
            const contentWidth = content.scrollWidth;
            const totalDistance = contentWidth + containerWidth;
            const duration = totalDistance / 40;
            
            timelineRef.current = gsap.timeline({ repeat: -1, ease: "none" });
            
            timelineRef.current
              .fromTo(content, 
                { x: currentPosition }, // Start from current position
                { 
                  x: -contentWidth, // Exit to left
                  duration: duration,
                  ease: "none"
                });
            
            console.log('🎯 New timeline created and started from position:', currentPosition);
          }
        });
      });
    }
  };

  // GSAP animation setup with length-based calculation
  useEffect(() => {
    setupContinuousScroll();
  }, [clients, clientFilter, searchQuery]);

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

  const handleModalClose = () => {
    setSelectedClientForAction(null);
  };

  const getClientTransactions = (clientId: string) => {
    // This function should be implemented to return client transactions
    return [];
  };

  return (
    <>
      <div className="scrolling-tabs-container">
        <div ref={containerRef} className="overflow-hidden">
          <div ref={contentRef} className="flex">
            {clients.map((client) => {
              const totalDebt = getClientTotalDebt(client.id);
              
              return (
                <div
                  key={client.id}
                  className="tab-item"
                  onClick={() => handleTabClick(client)}
                >
                  <div className="tab-content">
                    <div className="client-name">{client.name}</div>
                    {clientFilter === 'returnables' ? (
                      <div className="text-xs font-semibold text-blue-600">
                        {(() => {
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
                        })()}
                      </div>
                    ) : totalDebt === 0 ? (
                      <div className="text-xs font-semibold text-orange-600">
                        {(() => {
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
                          
                          return truncatedItems.join(', ') || 'No returnables';
                        })()}
                      </div>
                    ) : (
                      <div className={`text-xs font-semibold ${
                        totalDebt > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        Rs {totalDebt.toFixed(2)}
                      </div>
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
          onClose={handleModalClose}
          onResetCalculator={onResetCalculator}
        />
      )}
    </>
  );
};

export default ScrollingTabs;