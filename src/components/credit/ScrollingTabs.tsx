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
    
    const containerWidth = 350;
    const contentWidth = content.scrollWidth;
    
    // Calculate duration based on content width
    const pixelsPerSecond = 80; // Increase for faster scrolling, decrease for slower
    const totalDistance = contentWidth + containerWidth;
    const duration = totalDistance / pixelsPerSecond;
    
    return { containerWidth, contentWidth, pixelsPerSecond, totalDistance, duration };
  };

  // Helper function to create new timeline
  const createNewTimeline = (startFromPosition?: number) => {
    if (!contentRef.current) return null;
    
    const params = getAnimationParams();
    if (!params) return null;
    
    const { containerWidth, contentWidth, duration } = params;
    const content = contentRef.current;
    
    // CRITICAL: Always kill existing timeline first
    killExistingTimeline();
    
    // Start from the provided position or from containerWidth (off-screen right)
    const startPosition = startFromPosition !== undefined ? startFromPosition : containerWidth;
    
    // Create new timeline
    timelineRef.current = gsap.timeline({ 
      repeat: -1, 
      paused: isPaused, // Start paused if we're in paused state
      ease: "none",
      immediateRender: false,
      force3D: true
    });
    
    // Calculate seamless loop: content should emerge from right as it exits left
    const endPosition = -contentWidth;
    const loopStartPosition = 0; // Start very close to visible area for immediate emergence
    
    // Calculate duration from current position to end
    const totalDistance = contentWidth + containerWidth;
    const currentToEndDistance = Math.abs(startPosition - endPosition);
    const currentToEndDuration = (currentToEndDistance / totalDistance) * duration;
    
    // Create seamless loop animation
    timelineRef.current
      .set(content, { x: startPosition })
      // Animate from start position to fully off-screen left
      .to(content, { 
        x: endPosition, 
        duration: Math.max(0.3, currentToEndDuration), // Faster minimum emergence
        ease: "none",
        force3D: true
      })
      // Instantly move to right side (off-screen right) for seamless loop
      .set(content, { x: loopStartPosition})
      // Continue the loop from right to left
      .to(content, { 
        x: endPosition, 
        duration: Math.max(0.3, duration), // Faster minimum loop duration
        ease: "none",
        force3D: true
      });
    
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
      
      const containerWidth = container.offsetWidth-820;
      const contentWidth = content.scrollWidth;
      
      // Calculate duration based on content width
      const pixelsPerSecond = 80; // Keep consistent with getAnimationParams
      const totalDistance = contentWidth + containerWidth;
      const duration = totalDistance / pixelsPerSecond;
      
      // Kill any existing timeline and draggable
      killExistingTimeline();
      
      if (draggableRef.current) {
        draggableRef.current.forEach(d => d.kill());
        draggableRef.current = null;
      }
      
      // Create initial timeline
      const newTimeline = createNewTimeline();
      if (newTimeline) {
        newTimeline.play();
      }
      
      // Create draggable instance
      draggableRef.current = Draggable.create(content, {
        type: "x",
        bounds: false,
        edgeResistance: 0,
        edgeResistance: 0.1, // Very light resistance at edges
        dragResistance: 0,
        throwResistance: 0.2,
        liveSnap: false, // No live snapping
        minimumMovement: 2, // Minimum movement to trigger drag
        activeCursor: "grabbing",
        onDragStart: function() {
          killExistingTimeline();
          setIsDragging(true);
        },
        onDragEnd: function() {
          setIsDragging(false);
          // Create new timeline from current position after drag ends
          if (contentRef.current) {
            const currentPosition = gsap.getProperty(contentRef.current, "x") as number;
            const newTimeline = createNewTimeline(currentPosition);
            if (newTimeline) {
              newTimeline.play();
            }
          }
        },
        onThrowComplete: function() {
          // Create new timeline from final position after momentum completes
        }
      });
    }
  }, [clients, clientFilter, searchQuery]);

  // Add manual timeline restart on double-tap or specific gesture
  const handleTimelineRestart = () => {
    if (contentRef.current) {
      const currentPosition = gsap.getProperty(contentRef.current, "x") as number;
      const newTimeline = createNewTimeline(currentPosition);
      if (newTimeline) {
        newTimeline.play();
      }
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

      {/* Scrolling Container */}
      <div className="p-3">
        <div 
          ref={containerRef}
          className="overflow-hidden py-4 w-full h-30 flex items-center justify-center relative z-10"
          onDoubleClick={handleTimelineRestart}
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
                      ? 'transition-none' // Disable transitions during drag
                      : 'transition-all duration-200' // Enable transitions when not dragging
                  } ${
                    isLinked 
                      ? 'bg-blue-50 border-blue-200 shadow-md'
                      : isDragging
                        ? 'bg-gray-50 border-gray-200' // No hover during drag
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100' // Normal hover when not dragging
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
                            
                            // Look for Chopine items
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
                            
                            // Look for Bouteille items
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
                            
                            // Handle items without explicit numbers (assume quantity 1)
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
                          
                          // Calculate net returnable quantities and format for display
                          const truncatedItems: string[] = [];
                          Object.entries(returnableItems).forEach(([itemType, total]) => {
                            const returned = returnedQuantities[itemType] || 0;
                            const remaining = Math.max(0, total - returned);
                            if (remaining > 0) {
                              // Truncate item names
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
                                // For other items, just truncate to first 3 chars
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
                      // Show returnables when debt is 0
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
                            
                            // Look for Chopine items
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
                            
                            // Look for Bouteille items
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
                            
                            // Handle items without explicit numbers (assume quantity 1)
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
                          
                          // Calculate net returnable quantities and format for display
                          const truncatedItems: string[] = [];
                          Object.entries(returnableItems).forEach(([itemType, total]) => {
                            const returned = returnedQuantities[itemType] || 0;
                            const remaining = Math.max(0, total - returned);
                            if (remaining > 0) {
                              // Truncate item names
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
                                // For other items, just truncate to first 3 chars
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
                    {/* Date display */}
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