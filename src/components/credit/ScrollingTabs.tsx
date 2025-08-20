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
  const { getClientTransactions } = useCredit();

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
          }
        );
      
      // Create draggable with matching bounds
      draggableRef.current = Draggable.create(content, {
        type: "x",
        bounds: {
          minX: -(contentWidth + 100), // Allow dragging beyond content
          maxX: containerWidth
        },
        edgeResistance: 0.3,
        inertia: true,
        onDragStart: function() {
          if (timelineRef.current) {
            timelineRef.current.pause();
          }
          setIsDragging(true);
        },
        onDragEnd: function() {
          setIsDragging(false);
          // Calculate current progress and resume
          if (timelineRef.current) {
            // Calculate where we are in the animation cycle
            const currentX = gsap.getProperty(content, "x") as number;
            
            // Map current position to timeline progress (0 to 1)
            // Timeline goes from containerWidth to -contentWidth
            const progress = (containerWidth - currentX) / totalDistance;
            const normalizedProgress = ((progress % 1) + 1) % 1; // Keep between 0-1
            
            // Set timeline to current position and resume
            timelineRef.current.progress(normalizedProgress);
            timelineRef.current.resume();
          }
        },
        onThrowComplete: function() {
          // Resume after inertia completes
          if (timelineRef.current) {
            const currentX = gsap.getProperty(content, "x") as number;
            
            // Map current position to timeline progress
            const progress = (containerWidth - currentX) / totalDistance;
            const normalizedProgress = ((progress % 1) + 1) % 1; // Keep between 0-1
            
            // Set timeline to current position and resume
            timelineRef.current.progress(normalizedProgress);
            timelineRef.current.resume();
          }
        }
      });
    });
  }, [clients.length]);

  // Duplicate content for seamless looping
  const duplicatedClients = clients.length > 0 ? [...clients, ...clients] : clients;

  // Setup animation when clients change
  useEffect(() => {
    setupContinuousScroll();
  }, [setupContinuousScroll]);

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
    // Pause the timeline
    if (timelineRef.current) {
      timelineRef.current.pause();
    }
    setSelectedClientForAction(client);
  };

  // Handle modal close - resume timeline
  const handleModalClose = () => {
    setSelectedClientForAction(null);
    // Resume timeline
    if (timelineRef.current) {
      timelineRef.current.resume();
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
            {clients.length} client{clients.length !== 1 ? 's' : ''}
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
            {duplicatedClients.map((client, index) => {
              const totalDebt = getClientTotalDebt(client.id);
              const isLinked = linkedClient?.id === client.id;
              
              return (
                <div
                  key={`${client.id}-${index}`} // Unique key for duplicated items
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