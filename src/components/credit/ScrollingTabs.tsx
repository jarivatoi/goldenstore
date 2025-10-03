                 const sizeMatch = description.match(/(\d+(?:\.\d+)?L)/i);
                                const brandMatch = description.match(/bouteilles?\s+([^,]*)/i);
                                const brand = brandMatch?.[1]?.trim() || '';
                                
                                // Capitalize brand name properly
                                const capitalizedBrand = brand ? brand.split(' ').map((word: string) => 
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
                                const capitalizedBrand = brand ? brand.split(' ').map((word: string) => 
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
                  onClick={() => handleTabClick(client)}
                  onDoubleClick={() => onQuickAdd(client)}
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