import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Draggable } from '../../lib/draggable';
import { Client } from '../../types';
import ClientActionModal from '../ClientActionModal';
import ClientDetailModal from '../ClientDetailModal';
import { useCredit } from '../../context/CreditContext';
import FlipCard from './FlipCard';

interface ScrollingTabsProps {
  clients: Client[];
  linkedClient: Client | null | undefined;
  onQuickAdd: (client: Client) => void;
  clientFilter: 'all' | 'returnables' | 'overdue' | 'overlimit';
  getClientTotalDebt: (clientId: string) => number;
  sortOption: 'name' | 'date' | 'debt';
  onResetCalculator?: () => void;
  isBigCard?: boolean;
}

const ScrollingTabs: React.FC<ScrollingTabsProps> = ({
  clients,
  linkedClient,
  onQuickAdd,
  clientFilter,
  getClientTotalDebt,
  sortOption,
  isBigCard = false
}) => {
  const scrollingTabsRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const draggableRef = useRef<any>(null);
  const [selectedClientForAction, setSelectedClientForAction] = React.useState<Client | null>(null);
  const [selectedClientForDetail, setSelectedClientForDetail] = React.useState<Client | null>(null);
  const { getClientTransactions } = useCredit();

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

  // Listen for credit data changes to restart timeline
  React.useEffect(() => {
    const handleCreditDataChanged = () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
        timelineRef.current = null;
      }
      
      if (draggableRef.current) {
        draggableRef.current.kill();
        draggableRef.current = null;
      }
      
      if (sortedClients.length > 0) {
        setTimeout(() => {
          setupContinuousScroll();
        }, 100);
      }
    };

    window.addEventListener('creditDataChanged', handleCreditDataChanged as EventListener);
    
    return () => {
      window.removeEventListener('creditDataChanged', handleCreditDataChanged as EventListener);
    };
  }, [clients, sortedClients]);

  const { getClientTransactions: getTransactions } = useCredit();
  
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

  const setupContinuousScroll = () => {
    const content = contentRef.current;
    const container = containerRef.current;
    
    if (!container || !content) {
      return;
    }
    
    if (timelineRef.current) {
      timelineRef.current.kill();
      timelineRef.current = null;
    }
    
    requestAnimationFrame(() => {
      const containerWidth = container.offsetWidth;
      const contentWidth = content.scrollWidth;
      const totalDistance = contentWidth + containerWidth;
      const duration = totalDistance / 60;
      
      timelineRef.current = gsap.timeline({ 
        repeat: -1, 
        ease: "none"
      });
      
      timelineRef.current
        .fromTo(content, 
          { x: containerWidth },
          { 
            x: -contentWidth,
            duration: duration,
            ease: "none"
        });
      
      // Simplified draggable without complex touch handling
      if (draggableRef.current) {
        draggableRef.current.kill();
      }
      
      draggableRef.current = Draggable.create(content, {
        type: "x",
        bounds: {
          minX: -contentWidth,
          maxX: containerWidth,
        },
        inertia: true,
        onDragStart: function() {
          if (timelineRef.current) {
            timelineRef.current.kill();
            timelineRef.current = null;
          }
        },
        onThrowComplete: function() {
          const currentX = gsap.getProperty(content, "x") as number;
          const containerWidth = containerRef.current?.offsetWidth || 0;
          const contentWidth = contentRef.current?.scrollWidth || 0;
          
          if (currentX <= -contentWidth) {
            gsap.set(content, { x: containerWidth });
          } else if (currentX >= containerWidth) {
            gsap.set(content, { x: -contentWidth });
          }
          
          timelineRef.current = gsap.timeline({ repeat: -1, ease: "none" });
          timelineRef.current.fromTo(content, 
            { x: gsap.getProperty(content, "x") },
            { 
              x: -contentWidth,
              duration: ((contentWidth + containerWidth) / 60),
              ease: "none"
            });
        }
      });
    });
  };

  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.kill();
      timelineRef.current = null;
    }
    
    if (sortedClients.length > 0) {
      setTimeout(() => {
        setupContinuousScroll();
      }, 50);
    }
  }, [sortedClients]);

  useEffect(() => {
    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
      if (draggableRef.current) {
        draggableRef.current.kill();
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

  const handleTabClick = (client: Client) => {
    setSelectedClientForAction(client);
  };

  return (
    <>
    <div ref={scrollingTabsRef} className="bg-white rounded-lg shadow-sm border border-gray-200 scrolling-tabs-component w-full" style={{ flexShrink: 0 }}>
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
            {sortedClients.map((client) => {
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
                      if (itemType.includes('Chopine')) {
                        if (itemType === 'Chopine') {
                          const genericChopinePattern = /returned:\s*(\d+)\s+chopines?(?!\s+\w)/i;
                          const match = description.match(genericChopinePattern);
                          if (match) {
                            if (!returnedQuantities[itemType]) {
                              returnedQuantities[itemType] = 0;
                            }
                            returnedQuantities[itemType] += parseInt(match[1]);
                          }
                        } else {
                          const brandedChopinePattern = new RegExp(`returned:\\s*(\\d+)\\s+${itemType.replace('Chopine', 'Chopines?')}`, 'i');
                          const match = description.match(brandedChopinePattern);
                          if (match) {
                            if (!returnedQuantities[itemType]) {
                              returnedQuantities[itemType] = 0;
                            }
                            returnedQuantities[itemType] += parseInt(match[1]);
                          }
                        }
                      } else {
                        const escapedItemType = itemType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const pattern = new RegExp(`returned:\\s*(\\d+)\\s+${escapedItemType}`, 'i');
                        const match = description.match(pattern);
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
                      truncated = sizeMatch ? `${remaining} (${sizeMatch[1]})` : `${remaining}`;
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
                  className={`flex-shrink-0 px-4 py-2 rounded-lg border cursor-pointer h-25 w-40 flex items-center transition-all duration-200 ${
                    isLinked 
                      ? 'bg-blue-50 border-blue-200 shadow-md'
                      : `${getCardBackgroundColor()} hover:shadow-md ${hasOverdueItems ? 'animate-urgent-glow animate-subtle-shake' : ''}`
                  }`}
                  style={{
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none',
                    WebkitTouchCallout: 'none',
                    WebkitTapHighlightColor: 'transparent'
                  }}
                  onClick={() => handleTabClick(client)}
                  onDoubleClick={() => onQuickAdd(client)}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <div className="text-center relative h-full flex flex-col justify-center w-full">
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

      {selectedClientForAction && (
        <ClientActionModal
          client={selectedClientForAction}
          onClose={() => {
            setSelectedClientForAction(null);
            setTimeout(() => {
              if (!timelineRef.current) {
                setupContinuousScroll();
              }
            }, 100);
          }}
          onQuickAdd={(client) => {
            onQuickAdd(client);
          }}
          onResetCalculator={() => {}}
          onViewDetails={setSelectedClientForDetail}
        />
      )}

      {selectedClientForDetail && (
        <ClientDetailModal
          client={selectedClientForDetail}
          onClose={() => {
            setSelectedClientForDetail(null);
          }}
          onQuickAdd={(client) => {
            onQuickAdd(client);
          }}
        />
      )}

    </div>
    </>
  );
};

export default ScrollingTabs;