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

  // Helper function to calculate timeline progress from drag distance
  const calculateTimelineProgress = useCallback(() => {
    // Implementation here
  }, []);

  // Seamless continuous scroll setup
  const setupContinuousScroll = React.useCallback(() => {
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
      
      // Calculate total distance for seamless loop
      const totalDistance = contentWidth + containerWidth;
      const duration = totalDistance / 40; // 40px per second for smooth readable speed
      
      console.log('Animation params - Distance:', totalDistance, 'Duration:', duration);
      
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
          if (timelineRef.current) {
            timelineRef.current.pause();
            console.log('🎯 Timeline paused on drag start');
          }
          setIsDragging(true);
        },
        onDragEnd: function() {
          setIsDragging(false);
          
          // Simple approach: just restart the timeline from the beginning
          if (timelineRef.current) {
            console.log('🎯 Restarting timeline from beginning');
            timelineRef.current.restart();
          }
        }
      });
    });
  }, [clients.length]);

  const handleTabClick = useCallback((client: Client) => {
    if (timelineRef.current) {
      timelineRef.current.pause();
      console.log('🎯 Timeline paused for modal');
    }
    setSelectedClientForAction(client);
  }, []);

  const handleModalClose = useCallback(() => {
    setSelectedClientForAction(null);
    
    // Resume timeline when modal closes
    if (timelineRef.current) {
      if (timelineRef.current.isActive()) {
        console.log('🎯 Timeline already active, no need to resume');
      } else {
        requestAnimationFrame(() => {
          if (timelineRef.current) {
            console.log('🎯 Timeline isActive before resume:', timelineRef.current.isActive());
            console.log('🎯 Timeline paused state:', timelineRef.current.paused());
            
            // If timeline has completed (progress = 1), restart it
            if (timelineRef.current.progress() >= 1) {
              console.log('🎯 Timeline completed, restarting from beginning');
              timelineRef.current.restart();
            } else {
              console.log('🎯 Timeline resuming from current progress');
              timelineRef.current.resume();
            }
            
            console.log('🎯 Timeline progress after resume:', timelineRef.current.progress());
            console.log('🎯 Timeline isActive after resume:', timelineRef.current.isActive());
            console.log('🎯 Timeline paused state after resume:', timelineRef.current.paused());
          } else {
            console.log('🎯 No timeline exists, recreating...');
            // Recreate the timeline if it doesn't exist
            const container = containerRef.current;
            const content = contentRef.current;
            
            if (container && content) {
              const containerWidth = container.offsetWidth;
              const contentWidth = content.scrollWidth;
              const totalDistance = contentWidth + containerWidth;
              const duration = totalDistance / 40;
              
              timelineRef.current = gsap.timeline({ repeat: -1, ease: "none" });
              timelineRef.current
                .fromTo(content, 
                  { x: containerWidth },
                  { 
                    x: -contentWidth,
                    duration: duration,
                    ease: "none"
                  });
              
              console.log('🎯 New timeline created and started');
            }
          }
        });
      }
    }
  }, []);

  const getClientTransactions = useCallback((clientId: string) => {
    // Implementation here
    return [];
  }, []);

  // Duplicate content for seamless looping
  const duplicatedClients = clients.length > 0 ? [...clients, ...clients] : clients;

  // Setup animation when clients change
  useEffect(() => {
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

  return (
    <>
    <div className="relative w-full h-20 bg-gray-50 border-b border-gray-200 overflow-hidden">
      <div className="absolute inset-0 flex items-center">
        <div 
          ref={containerRef}
          className="w-full h-full overflow-hidden"
        >
          <div 
            ref={contentRef}
            className="flex items-center h-full whitespace-nowrap"
          >
            {duplicatedClients.map((client, index) => {
              const totalDebt = getClientTotalDebt(client.id);
              const isLinked = linkedClient?.id === client.id;
              
              return (
                <div
                  key={`${client.id}-${index}`}
                  onClick={() => handleTabClick(client)}
                  className={`
                    flex-shrink-0 mx-2 px-4 py-2 rounded-lg cursor-pointer transition-all duration-200
                    ${isLinked 
                      ? 'bg-blue-100 border-2 border-blue-500 shadow-md' 
                      : 'bg-white border border-gray-200 hover:bg-gray-50'
                    }
                    min-w-[120px] max-w-[160px]
                  `}
                >
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {client.name}
                    </div>
                    {clientFilter === 'returnables' ? (
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
    </div>
    </>
  );
};

export default ScrollingTabs;