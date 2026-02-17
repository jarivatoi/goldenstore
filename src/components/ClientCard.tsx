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
}

/**
 * CLIENT CARD COMPONENT
 * ====================
 * 
 * Displays individual client information with swipe and long press interactions
 */
const ClientCard: React.FC<ClientCardProps> = ({ client, onLongPress, onQuickAdd, onResetCalculator }) => {
  const { getClientTotalDebt, getClientBottlesOwed } = useCredit();
  const [showDetails, setShowDetails] = useState(false);
  const [showActions, setShowActions] = useState(false);
  
  // Get returnable items for scrolling display
  const getReturnableItemsText = (): string => {
    const { getClientTransactions } = useCredit();
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
    
    // Calculate net returnable quantities
    const netReturnableItems: string[] = [];
    Object.entries(returnableItems).forEach(([itemType, total]) => {
      const returned = returnedQuantities[itemType] || 0;
      const remaining = Math.max(0, total - returned);
      if (remaining > 0) {
        // Get the most recent transaction date for this item type
        const recentTransaction = clientTransactions
          .filter(transaction => 
            transaction.type === 'debt' && 
            !transaction.description.toLowerCase().includes('returned') &&
            transaction.description.toLowerCase().includes(itemType.toLowerCase().split(' ')[0])
          )
          .sort((a, b) => new Date(b.date || Date.now()).getTime() - new Date(a.date || Date.now()).getTime())[0];
        const transactionDate = recentTransaction ? new Date(recentTransaction.date || Date.now()) : new Date();
        const dateStr = transactionDate.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        netReturnableItems.push(`${remaining} ${itemType}${remaining > 1 ? 's' : ''} (${dateStr})`);
      }
    });
    
    return netReturnableItems.length > 0 ? netReturnableItems.join(', ') : '';
  };
  
  const returnableItemsText = getReturnableItemsText();
  const [startY, setStartY] = useState(0);
  const [startX, setStartX] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);
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
    setStartY(touch.clientY);
    setStartX(touch.clientX);
    setCurrentY(touch.clientY);
    setCurrentX(touch.clientX);
    setIsDragging(false);
    
    longPressTimer.current = setTimeout(() => {
      if (!isDragging) {
        setShowDetails(true);
      }
    }, 500); // 500ms for long press
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!startY) return; // Ensure we have a start position
    
    const touch = e.touches[0];
    setCurrentY(touch.clientY);
    setCurrentX(touch.clientX);
    
    const deltaY = startY - touch.clientY;
    
    // Detect swipe direction
    if (Math.abs(deltaY) > 20) {
      setIsDragging(true);
      e.preventDefault(); // Prevent scrolling when we detect a swipe
      
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
      
      // Swipe up detection
      if (deltaY > 60) {
        setShowActions(true);
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    setIsDragging(false);
    setStartY(0);
    setStartX(0);
    setCurrentY(0);
    setCurrentX(0);
  };

  // Mouse event handlers for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left mouse button
    
    setIsMouseDown(true);
    setStartY(e.clientY);
    setStartX(e.clientX);
    setCurrentY(e.clientY);
    setCurrentX(e.clientX);
    setIsDragging(false);
    setCurrentY(e.clientY);
    setCurrentX(e.clientX);
    
    longPressTimer.current = setTimeout(() => {
      if (!isDragging) {
        setShowDetails(true);
      }
    }, 500);
    
    e.preventDefault(); // Prevent text selection
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown) return;
    
    setCurrentY(e.clientY);
    setCurrentX(e.clientX);
    
    const deltaY = startY - e.clientY; // Positive when moving up
    const totalMovement = Math.abs(deltaY);
    
    // Detect any significant movement in any direction
    if (totalMovement > 8) {
      setIsDragging(true);
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
      
      // Upward movement - show actions
      if (deltaY > 25) {
        setShowActions(true);
        setIsMouseDown(false);
        setIsDragging(false);
      }
    }
  };

  const handleMouseUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    setIsMouseDown(false);
    setIsDragging(false);
    setStartY(0);
    setStartX(0);
    setCurrentY(0);
    setCurrentX(0);
  };

  // Global mouse event handlers
  React.useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isMouseDown) return;
      
      setCurrentY(e.clientY);
      setCurrentX(e.clientX);
      
      const deltaY = startY - e.clientY; // Positive when moving up
      const totalMovement = Math.abs(deltaY);
      
      // Detect any significant movement
      if (totalMovement > 5) {
        setIsDragging(true);
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
        }
        
        // Upward movement - show actions
        if (deltaY > 20) {
          setShowActions(true);
          setIsMouseDown(false);
          setIsDragging(false);
        }
      }
    };

    const handleGlobalMouseUp = () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
      setIsMouseDown(false);
      setIsDragging(false);
      setStartY(0);
      setStartX(0);
      setCurrentY(0);
      setCurrentX(0);
    };

    if (isMouseDown) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isMouseDown, startY, startX]);

  // Wheel event handler for trackpad/mouse wheel
  const handleWheel = (e: React.WheelEvent) => {
    // Handle both vertical and horizontal wheel movements
    const isVerticalScroll = Math.abs(e.deltaY) > Math.abs(e.deltaX);
    
    // Vertical scroll up (trackpad swipe up)
    if (isVerticalScroll && e.deltaY < -40) {
      setShowActions(true);
      e.preventDefault();
    }
  };

  return (
    <>
      <div
        ref={cardRef}
        className={`flex-shrink-0 w-56 sm:w-64 rounded-lg shadow-md p-3 sm:p-4 border hover:shadow-lg transition-all duration-300 cursor-pointer select-none transform hover:scale-105 ${getCardBackgroundColor()}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={() => !isDragging && setShowDetails(true)}
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'pan-x pan-y',
          cursor: isMouseDown ? 'grabbing' : 'grab'
        }}
      >
        {/* Client Header */}
        <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
          <div className="bg-blue-100 p-2 rounded-full">
            <User size={18} className="text-blue-600 sm:w-5 sm:h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-800 truncate text-sm sm:text-base">{client.name}</h3>
            <p className="text-xs sm:text-sm text-gray-500">ID: {client.id}</p>
          </div>
        </div>

        {/* Debt Amount */}
        <div className="mb-2 sm:mb-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-red-500 sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm text-gray-600">Outstanding</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-red-600">
            Rs {totalDebt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                onQuickAdd(client);
              }}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Plus size={16} />
              Quick Add
            </button>
          </div>
        )}

        {/* Returnable Items or Last Transaction Date */}
        <div className="text-xs sm:text-sm text-gray-500 min-h-[3rem] flex flex-col justify-end">
          {returnableItemsText ? (
            <div className="mb-2">
              <ScrollingText 
                text={`Returnable: ${returnableItemsText}`}
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
                month: '2-digit',
                year: 'numeric'
              })} {client.lastTransactionAt.toLocaleTimeString('en-GB', {
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
          <p className="text-xs text-gray-400 mt-1 hidden sm:block">↑ Actions | Long press for details</p>
          <p className="text-xs text-gray-400 mt-1 sm:hidden">↑ Actions</p>
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