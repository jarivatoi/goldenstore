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
  isBigCard?: boolean;
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
  isBigCard = false
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const draggableRef = useRef<Draggable[] | null>(null);
  const [selectedClientForDetail, setSelectedClientForDetail] = React.useState<Client | null>(null);
  const [selectedClientForAction, setSelectedClientForAction] = React.useState<Client | null>(null);
  const [clickedTabId, setClickedTabId] = React.useState<string | null>(null);
  const { getClientTransactions } = useCredit();
  const [forceUpdate, setForceUpdate] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  
  // Listen for credit data changes to force re-render
  React.useEffect(() => {
    const handleCreditDataChanged = () => {
      setForceUpdate(prev => prev + 1);
      
      setTimeout(() => {
        setupContinuousScroll();
      }, 100);
    };

    window.addEventListener('creditDataChanged', handleCreditDataChanged);
    
    return () => {
      window.removeEventListener('creditDataChanged', handleCreditDataChanged);
    };
  }, []);

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
    const threeWeeksAgo = Date.now() - (21 * 24 * 60 * 60 * 1000);
    
    return clientTransactions.some(transaction => {
      if (transaction.type === 'payment' || transaction.description.toLowerCase().includes('returned')) {
        return false;
      }
      
      const description = transaction.description.toLowerCase();
      const hasReturnableItems = description.includes('chopine') || description.includes('bouteille');
      const isOlderThan3Weeks = transaction.date.getTime() < threeWeeksAgo;
      
      return hasReturnableItems && isOlderThan3Weeks;
    });
  };
  
  const setupContinuousScroll = useCallback(() => {
    const content = contentRef.current;
    const container = containerRef.current;
    
    if (!container || !content) {
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
      
      // Only create timeline if content is wider than container
      if (contentWidth <= containerWidth) {
        console.log('📏 Content fits in container, no scrolling needed');
        return;
      }
      
      // Calculate total distance including container width gap
      const totalDistance = contentWidth + containerWidth;
      const duration = totalDistance / 60; // 60px per second for comfortable viewing speed
      
      console.log('🎬 Creating new timeline:', {
        containerWidth,
        contentWidth,
        totalDistance,
        duration
      });
      
      // Create timeline and pause it before draggable setup
      timelineRef.current = gsap.timeline({ 
        repeat: -1, 
        ease: "none",
        paused: true, // Start paused to prevent draggable interference
        immediateRender: true,
        overwrite: "auto"
      });
      
      timelineRef.current
        .fromTo(content, 
          { x: containerWidth },
          { 
            x: -contentWidth,
            duration: duration,
            ease: "none",
            immediateRender: false
          })
        .set(content, { x: containerWidth }, ">")
        .to(content, {
          x: -contentWidth,
          duration: duration,
          ease: "none",
          repeat: -1
        }, ">");
      
      // Now resume the timeline after it's fully configured
      timelineRef.current.timeScale(1).resume();
      
      console.log('✅ Timeline created and should be running');
    });
  }, [sortedClients.length]);

  const getFilterLabel = () => {
    switch (clientFilter) {
      case 'returnables':
        return 'Clients with Returnables';
      case 'overdue':
        return 'Overdue Clients';
      case 'overlimit':
        return 'Over Limit Clients';
      default:
        return 'All Clients';
    }
  };

  const handleTabClick = (client: Client) => {
    console.log('🎯 Tab clicked for client:', client.name);
    console.log('📊 Timeline state before pause:', {
      exists: !!timelineRef.current,
      isActive: timelineRef.current?.isActive(),
      paused: timelineRef.current?.paused(),
      progress: timelineRef.current?.progress()
    });
    
    // Pause the timeline
    if (timelineRef.current && !timelineRef.current.paused()) {
      timelineRef.current.pause();
      console.log('⏸️ Timeline paused successfully');
    } else {
      console.log('⏸️ Timeline already paused or no timeline');
    }
    
    // Add click animation
    setClickedTabId(client.id);
    
    // Show action modal
    setSelectedClientForAction(client);
  };

  // Setup draggable functionality
  useEffect(() => {
    const content = contentRef.current;
    const container = containerRef.current;
    
    if (!content || !container) {
      return;
    }
    
    // Clean up existing draggable instances
    if (draggableRef.current) {
      draggableRef.current.forEach(d => d.kill());
      draggableRef.current = null;
    }
    
    requestAnimationFrame(() => {
      const containerWidth = container.offsetWidth;
      const contentWidth = content.scrollWidth;
      
      // Create draggable instance
      draggableRef.current = Draggable.create(content, {
        type: "x",
        allowEventDefault: false,
        allowNativeTouchScrolling: false,
        bounds: {
          minX: -contentWidth,
          maxX: containerWidth,
        },
        edgeResistance: 0.8,
        inertia: true,
        dragResistance: 0.5,
        throwResistance: 300,
        minDuration: 0.1,
        overshootTolerance: 0,
        force3D: true,
        lockAxis: true,
        onDragStart: function() {
          console.log('🎯 Drag started - pausing timeline');
          if (timelineRef.current && !timelineRef.current.paused()) {
            // Pause timeline properly before drag
            timelineRef.current.pause();
            console.log('⏸️ Timeline paused for drag');
          } else {
            console.log('⏸️ Timeline already paused or no timeline during drag start');
          }
          setIsDragging(true);
        },
        onDrag: function() {
          console.log('🎯 Dragging... timeline state:', {
            exists: !!timelineRef.current,
            paused: timelineRef.current?.paused()
          });
        },
        onDragEnd: function() {
          console.log('🎯 Drag ended - checking timeline state');
          if (timelineRef.current && timelineRef.current.paused()) {
            // Resume timeline with proper timeScale management to prevent jumps
            timelineRef.current.timeScale(timelineRef.current.timeScale() || 0.001).resume();
            console.log('▶️ Timeline resumed after drag end');
          } else {
            console.log('▶️ Timeline not paused or missing after drag end');
          }
          setIsDragging(false);
        },
        onThrowComplete: function() {
          console.log('🎯 Throw completed - ensuring timeline is running');
          // Use proper timeScale management to prevent abrupt jumps
          if (timelineRef.current) {
            timelineRef.current.timeScale(timelineRef.current.timeScale() || 0.001).resume();
          }
          console.log('▶️ Timeline resumed after throw complete');
        }
      });
    });
  }, [sortedClients.length, setupContinuousScroll]);

  // Setup animation when clients change
  useEffect(() => {
    if (sortedClients.length > 0) {
      console.log('👥 Clients changed, setting up timeline');
      setupContinuousScroll();
    } else {
      console.log('👥 No clients, killing timeline');
      if (timelineRef.current) {
        timelineRef.current.kill();
        timelineRef.current = null;
      }
    }
  }, [sortedClients.length, setupContinuousScroll]);

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
                ...(isBigCard && {
                  scrollSnapAlign: 'none'
                })
              }}
            >
              {sortedClients.map((client, index) => {
                const totalDebt = getClientTotalDebt(client.id);
                const isLinked = linkedClient?.id === client.id;
                const hasOverdueItems = hasOverdueReturnables(client);
                
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
                      if (sizeMatch && brand) {
                        key = `${sizeMatch[1].replace(/l$/i, 'L')} ${brand}`;
                      } else if (brand) {
                        key = `Bouteille ${brand}`;
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
                        const sizeMatch = itemType.match(/(\d+(?:\.\d+)?L)/i);
                        truncated = `${remaining} (${sizeMatch[1]})`;
                      } else if (itemType.includes('Bouteille')) {
                        truncated = `${remaining} (Bt)`;
                      } else {
                        truncated = `${remaining} (${itemType.substring(0, 3)})`;
                      }
                      truncatedItems.push(truncated);
                    }
                  });
                  
                  return truncatedItems.join(', ');
                })();
                
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
                            if (totalDebt >= 1000) {
                              return 'animate-bounce';
                            }
                            
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
                                  key = `${sizeMatch[1].replace(/l$/i, 'L')} ${brand}`;
                                } else if (brand) {
                                  key = `Bouteille ${brand}`;
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
                            
                            const hasUnreturnedItems = Object.entries(returnableItems).some(([itemType, total]) => {
                              const returned = returnedQuantities[itemType] || 0;
                              const remaining = Math.max(0, total - returned);
                              return remaining > 0;
                            });
                            
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
                      ...(isBigCard && {
                        scrollSnapAlign: 'none'
                      })
                    }}
                    onClick={() => handleTabClick(client)}
                    onDoubleClick={() => onQuickAdd(client)}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    <div className="text-center relative h-full flex flex-col justify-center">
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
              console.log('🔄 Action Modal closing...');
              setSelectedClientForAction(null);
              setClickedTabId(null);
              
              console.log('📊 Timeline state before resume:', {
                exists: !!timelineRef.current,
                isActive: timelineRef.current?.isActive(),
                paused: timelineRef.current?.paused(),
                progress: timelineRef.current?.progress()
              });
              
              if (timelineRef.current && timelineRef.current.paused()) {
                // Resume with proper timeScale management to prevent jumps
                timelineRef.current.timeScale(timelineRef.current.timeScale() || 0.001).resume();
                console.log('✅ Timeline resumed after Action Modal close');
                
                setTimeout(() => {
                  console.log('📊 Timeline state after resume (1s later):', {
                    exists: !!timelineRef.current,
                    isActive: timelineRef.current?.isActive(),
                    paused: timelineRef.current?.paused(),
                    progress: timelineRef.current?.progress()
                  });
                  
                  const content = contentRef.current;
                  const container = containerRef.current;
                  if (content) {
                    const currentX = gsap.getProperty(content, "x") as number;
                    const containerWidth = container?.offsetWidth || 0;
                    const contentWidth = content.scrollWidth || 0;
                    
                    console.log('📍 Element position details:', {
                      currentX: currentX,
                      containerWidth: containerWidth,
                      contentWidth: contentWidth,
                      totalDistance: contentWidth + containerWidth,
                      expectedDuration: (contentWidth + containerWidth) / 80
                    });
                    
                    setTimeout(() => {
                      const newX = gsap.getProperty(content, "x") as number;
                      const movement = Math.abs(newX - currentX);
                      console.log('🏃‍♂️ Movement test:', {
                        oldX: currentX,
                        newX: newX,
                        movement: movement,
                        isMoving: movement > 0.1
                      });
                      
                      if (movement < 0.1) {
                        console.log('❌ Timeline not moving! Recreating...');
                        setupContinuousScroll();
                      }
                    }, 1000);
                  }
                }, 1000);
              } else {
                console.log('❌ No timeline to resume, creating new one...');
                setupContinuousScroll();
              }
            }}
            onQuickAdd={(client) => {
              console.log('🚀 Quick Add from Action Modal');
              setSelectedClientForAction(null);
              setClickedTabId(null);
              if (timelineRef.current && timelineRef.current.paused()) {
                timelineRef.current.resume();
                console.log('✅ Timeline resumed after Quick Add');
              } else {
                console.log('❌ No timeline after Quick Add, creating new one...');
                setupContinuousScroll();
              }
              
              onQuickAdd(client);
            }}
            onResetCalculator={() => {
              console.log('🔄 Reset Calculator from Action Modal');
              if (timelineRef.current && timelineRef.current.paused()) {
                timelineRef.current.resume();
                console.log('✅ Timeline resumed after Reset Calculator');
              } else {
                console.log('❌ No timeline after Reset Calculator, creating new one...');
                setupContinuousScroll();
              }
            }}
            onViewDetails={setSelectedClientForDetail}
          />
        )}

        {/* Detail Modal */}
        {selectedClientForDetail && (
          <ClientDetailModal
            client={selectedClientForDetail}
            onClose={() => {
              console.log('🔄 Detail Modal closing...');
              setSelectedClientForDetail(null);
              
              console.log('📊 Timeline state before resume:', {
                exists: !!timelineRef.current,
                isActive: timelineRef.current?.isActive(),
                paused: timelineRef.current?.paused(),
                progress: timelineRef.current?.progress()
              });
              
              if (timelineRef.current && timelineRef.current.paused()) {
                // Properly resume with timeScale management to avoid jumps
                timelineRef.current.timeScale(timelineRef.current.timeScale() || 0.001).resume();
                console.log('✅ Timeline resumed after Detail Modal close');
                
                setTimeout(() => {
                  console.log('📊 Timeline state after resume (1s later):', {
                    exists: !!timelineRef.current,
                    isActive: timelineRef.current?.isActive(),
                    paused: timelineRef.current?.paused(),
                    progress: timelineRef.current?.progress()
                  });
                }, 1000);
              } else {
                console.log('❌ No timeline to resume, creating new one...');
                setupContinuousScroll();
              }
            }}
            onQuickAdd={(client) => {
              console.log('🚀 Quick Add from Detail Modal');
              setSelectedClientForDetail(null);
              if (timelineRef.current && timelineRef.current.paused()) {
                timelineRef.current.resume();
                console.log('✅ Timeline resumed after Detail Quick Add');
              } else {
                console.log('❌ No timeline after Detail Quick Add, creating new one...');
                setupContinuousScroll();
              }
              
              onQuickAdd(client);
            }}
          />
        )}
      </div>
    </>
  );
};

export default ScrollingTabs;