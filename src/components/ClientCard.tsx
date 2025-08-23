import React, { useState, useRef } from 'react';
import { User, TrendingUp, Calendar, Plus } from 'lucide-react';
import { Client } from '../types';
import { useCredit } from '../context/CreditContext';
import ClientDetailModal from './ClientDetailModal';
import ClientActionModal from './ClientActionModal';
import { ScrollingText } from './ScrollingText';

interface ClientCardProps {
  client: Client;
  onLongPress: () => void;
  onQuickAdd?: (client: Client) => void;
  onResetCalculator?: () => void;
  isLinked?: boolean;
}

/**
 * CLIENT CARD COMPONENT
 * ====================
 * 
 * Displays individual client information with swipe and long press interactions
 */
const ClientCard: React.FC<ClientCardProps> = ({ client, onLongPress, onQuickAdd, onResetCalculator, isLinked = false }) => {
  const { getClientTotalDebt, getClientBottlesOwed, getClientTransactions } = useCredit();
  const [showDetails, setShowDetails] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // Listen for credit data changes to force re-render
  React.useEffect(() => {
    const handleCreditDataChanged = () => {
      setForceUpdate(prev => prev + 1);
    };

    window.addEventListener('creditDataChanged', handleCreditDataChanged);
    
    return () => {
      window.removeEventListener('creditDataChanged', handleCreditDataChanged);
    };
  }, []);
  
  // Get returnable items for scrolling display
  const getReturnableItemsText = React.useMemo((): string => {
    const clientTransactions = getClientTransactions(client.id);
    
    const returnableItems: {[key: string]: number} = {};
    
    clientTransactions.forEach(transaction => {
      // Only process debt transactions (not payments) AND exclude return transactions
      if (transaction.type === 'payment' || transaction.description.toLowerCase().includes('returned')) {
        return;
      }
      
      const description = transaction.description.toLowerCase();
      
      // Only process items that contain "chopine" or "bouteille"
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
      const bouteillePattern = /(\d+)\s+(?:(\d+(?:\.\d+)?[Ll])\s+)?bouteilles?(?:\s+([^,\(\)]*))?/gi;
      let bouteilleMatch;
      
      while ((bouteilleMatch = bouteillePattern.exec(description)) !== null) {
        const quantity = parseInt(bouteilleMatch[1]);
        const size = bouteilleMatch[2]?.trim().replace(/l$/i, 'L') || '';
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
      
      // Handle items without explicit numbers (assume quantity 1)
      if (description.includes('bouteille') && !bouteillePattern.test(description)) {
        const sizeMatch = description.match(/(\d+(?:\.\d+)?[Ll])/i);
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
    
    // Calculate net returnable quantities
    const netReturnableItems: string[] = [];
    Object.entries(returnableItems).forEach(([itemType, total]) => {
      const returned = returnedQuantities[itemType] || 0;
      const remaining = Math.max(0, total - returned);
      if (remaining > 0) {
        // Get the most recent transaction date for this item type
        const recentTransaction = clientTransactions
        const bouteillePattern = /(\d+)\s+(?:(\d+(?:\.\d+)?[Ll])\s+)?bouteilles?(?:\s+([^,\(\)]*))?/gi;
            transaction.type === 'debt' && 
            !transaction.description.toLowerCase().includes('returned') &&
            transaction.description.toLowerCase().includes(itemType.toLowerCase().split(' ')[0])
          const sizeMatch = description.match(/(\d+(?:\.\d+)?[Ll])/i);
          const size = bouteilleMatch[2]?.trim().replace(/l$/i, 'L') || '';
          const brand = bouteilleMatch[3]?.trim() || '';
        const dateStr = transactionDate.toLocaleDateString('en-GB', {
          // Properly capitalize brand name
          const capitalizedBrand = brand ? brand.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' ') : '';
        
        // Format the display text properly
        let displayText = '';
            key = `${sizeMatch[1].replace(/l$/i, 'L')} Bouteille ${capitalizedBrand}`;
          // For Chopine items: "8 Chopines beer" or "1 Chopine beer"
          const brand = itemType.replace('Chopine', '').trim();
          if (brand) {
            displayText = `${remaining} Chopine${remaining > 1 ? 's' : ''} ${brand}`;
          } else {
            displayText = `${remaining} Chopine${remaining > 1 ? 's' : ''}`;
          }
        } else if (itemType.includes('Bouteille')) {
          // For Bouteille items: keep original format
          displayText = `${remaining} ${itemType}${remaining > 1 ? 's' : ''}`;
        } else {
          // For other items: keep original format
          displayText = `${remaining} ${itemType}${remaining > 1 ? 's' : ''}`;
        }
        
        netReturnableItems.push(`${displayText} (${dateStr})`);
      }
    });
    
    // Fix bottle size capitalization (1l → 1L, 1.5l → 1.5L, etc.)
    const formattedText = netReturnableItems.length > 0 ? netReturnableItems.join(', ') : '';
    return formattedText.replace(/(\d+(?:\.\d+)?)l\b/gi, '$1L');
  }, [client.id, getClientTransactions, forceUpdate]);
  
  const returnableItemsText = getReturnableItemsText;
  const [startY, setStartY] = useState(0);
  const [startX, setStartX] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const totalDebt = getClientTotalDebt(client.id);
  const bottlesOwed = getClientBottlesOwed(client.id);

  // Determine card background color based on debt amount
  const getCardBackgroundColor = () => {
    if (totalDebt <= 300) return 'bg-green-100 border-green-200';
    if (totalDebt < 500) return 'bg-green-100 border-green-200';
    if (totalDebt <= 1000) return 'bg-orange-100 border-orange-200';
    return 'bg-red-100 border-red-200';
  };

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    
    longPressTimer.current = setTimeout(() => {
      setShowDetails(true);
    }, 2000); // 2000ms for long press
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  // Mouse event handlers for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left mouse button
    
    longPressTimer.current = setTimeout(() => {
      setShowDetails(true);
    }, 2000);
    
    e.preventDefault(); // Prevent text selection
  };

  const handleMouseUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  // Handle double click to show actions
  const handleDoubleClick = () => {
    setShowActions(true);
  };

  return (
    <>
      <div
        ref={cardRef}
        className={`flex-shrink-0 w-56 sm:w-64 mx-auto rounded-lg shadow-md p-3 sm:p-4 border hover:shadow-lg transition-all duration-300 cursor-pointer select-none transform hover:scale-105 min-h-[320px] ${getCardBackgroundColor()}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'pan-x pan-y',
          cursor: 'pointer',
          zIndex: 1
        }}
      >
        {/* Client Header */}
        <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
          <div className="bg-blue-100 p-2 rounded-full flex-shrink-0">
            <User size={18} className="text-blue-600 sm:w-5 sm:h-5" />
          </div>
          <div className="flex-1 text-center min-w-0">
            <h3 className="font-semibold text-gray-800 text-sm sm:text-base">{client.name}</h3>
            <p className="text-xs sm:text-sm text-gray-500">ID: {client.id}</p>
          </div>
          <div className="w-10 flex-shrink-0"></div>
        </div>

        {/* Debt Amount */}
        <div className="mb-2 sm:mb-3 text-center">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-red-500 sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm text-gray-600">Outstanding</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-red-600">
            Rs {totalDebt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          {(bottlesOwed.beer > 0 || bottlesOwed.guinness > 0 || bottlesOwed.malta > 0 || bottlesOwed.coca > 0 || bottlesOwed.chopines > 0) && (
            <p className="text-xs text-orange-600 mt-1">
              + Bottles: {Object.entries(bottlesOwed)
                .filter(([_, count]) => count > 0)
                .map(([type, count]) => `${count} ${type.charAt(0).toUpperCase() + type.slice(1)}`)
                .join(', ')}
            </p>
          )}
        </div>

        {/* Quick Add Button */}
        {onQuickAdd && (
          <div className="mb-2 sm:mb-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!isLinked) {
                  onQuickAdd(client);
                }
              }}
              className={`w-full py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium ${
                isLinked
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
              disabled={isLinked}
            >
              <Plus size={16} />
              {isLinked ? 'Linked to Calculator' : 'Quick Add'}
            </button>
          </div>
        )}

        {/* Returnable Items or Last Transaction Date */}
        <div className="text-xs sm:text-sm text-gray-500 min-h-[3rem] flex flex-col justify-end">
          {returnableItemsText ? (
            <div className="mb-2">
              <ScrollingText 
                text={returnableItemsText}
                className="text-orange-600 font-medium"
                pauseDuration={0.5}
                scrollDuration={2.5}
                easing="power1.inOut"
              />
            </div>
          ) : (
            <div className="mb-2 h-5"></div>
          )}
          <div className="flex items-center gap-2">
            <Calendar size={12} className="sm:w-3.5 sm:h-3.5" />
            <span>
              {client.lastTransactionAt.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              }).replace(/\s/g, '-')} {client.lastTransactionAt.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              })}
            </span>
          </div>
        </div>

        {/* Swipe Indicator */}
        <div className="mt-2 sm:mt-3 text-center">
          <div className="inline-block w-8 h-1 bg-gray-300 rounded-full"></div>
          <div className="absolute left-0 right-0 mt-1">
            <div className="text-xs text-gray-400 hidden sm:block text-center">
              <p className="select-none">Double click for actions</p>
              <p className="select-none">Long press for details</p>
            </div>
            <p className="text-xs text-gray-400 sm:hidden text-center select-none">Double click for actions</p>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {showDetails && (
        <ClientDetailModal
          client={client}
          onClose={() => setShowDetails(false)}
          onQuickAdd={onQuickAdd}
        />
      )}

      {/* Actions Modal */}
      {showActions && (
        <ClientActionModal
          client={client}
          onClose={() => setShowActions(false)}
          onResetCalculator={onResetCalculator}
        />
      )}
    </>
  );
};

export default ClientCard;