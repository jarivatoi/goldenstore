import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { User, TrendingUp, Plus, Calendar } from 'lucide-react';
import { Client } from '../types';
import { useCredit } from '../context/CreditContext';
import ClientDetailModal from './ClientDetailModal';
import ClientActionModal from './ClientActionModal';
import { ScrollingText } from './ScrollingText';
import FlipCard from './credit/FlipCard';
import { calculateReturnableItemsWithDates } from '../utils/returnableItemsUtils';

interface ClientCardProps {
  client: Client;
  onLongPress: () => void;
  onQuickAdd?: (client: Client) => void;
  onResetCalculator?: () => void;
  isLinked?: boolean;
  showWobble?: boolean;
  onCloseWobble?: () => void;
}

/**
 * CLIENT CARD COMPONENT
 * ====================
 * 
 * Displays individual client information with swipe and long press interactions
 */
const ClientCard: React.FC<ClientCardProps> = ({ client, onLongPress, onQuickAdd, onResetCalculator, isLinked = false, showWobble = false, onCloseWobble }) => {
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
  const getReturnableItemsText = React.useMemo((): {text: string, date: string, time: string}[] => {
    const clientTransactions = getClientTransactions(client.id);
    return calculateReturnableItemsWithDates(clientTransactions, client.name);
  }, [client.id, client.name, getClientTransactions, forceUpdate]);
  
  const returnableItemsText = getReturnableItemsText;
  const [startY, setStartY] = useState(0);
  const [startX, setStartX] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<number>(0);
  const tapCountRef = useRef<number>(0);
  const [showZoomedImage, setShowZoomedImage] = useState(false);
  const zoomPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActive = useRef<boolean>(false);

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
    
    // Handle double tap for iPhone
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    
    if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      // Double tap detected
      tapCountRef.current += 1;
      if (tapCountRef.current === 2) {
        setShowActions(true);
        tapCountRef.current = 0;
      }
    } else {
      // Single tap or first tap of potential double tap
      tapCountRef.current = 1;
      setTimeout(() => {
        tapCountRef.current = 0;
      }, 300);
    }
    
    lastTapRef.current = now;
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

  // Zoom handlers for profile picture
  const handleImagePressStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!client.profilePictureUrl) return;

    // Clear card long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    zoomPressTimer.current = setTimeout(() => {
      setShowZoomedImage(true);
      // Prevent scrolling when zoomed image is shown
      document.body.style.overflow = 'hidden';
    }, 500);
  };

  const handleImagePressEnd = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (zoomPressTimer.current) {
      clearTimeout(zoomPressTimer.current);
      zoomPressTimer.current = null;
    }
  };

  const handleCloseZoom = () => {
    setShowZoomedImage(false);
    isLongPressActive.current = false;
    // Re-enable scrolling
    document.body.style.overflow = '';
  };

  return (
    <>
      <div
        ref={cardRef}
        className={`flex-shrink-0 w-56 sm:w-64 mx-auto rounded-lg shadow-md p-3 sm:p-4 border hover:shadow-lg transition-all duration-300 cursor-pointer select-none transform hover:scale-105 min-h-[320px] relative ${getCardBackgroundColor()} ${showWobble ? 'animate-wobble' : ''}`}
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
        {/* Client Header with Profile Picture */}
        <div className="mb-2 sm:mb-3">
          {/* Profile Picture or Icon - Centered */}
          <div className="flex justify-center mb-2">
            {client.profilePictureUrl ? (
              <div
                className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg relative flex-shrink-0 cursor-zoom-in"
                style={{
                  background: `url(${client.profilePictureUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  WebkitTouchCallout: 'none'
                }}
                onMouseDown={handleImagePressStart}
                onMouseUp={handleImagePressEnd}
                onMouseLeave={handleImagePressEnd}
                onTouchStart={handleImagePressStart}
                onTouchEnd={handleImagePressEnd}
                onTouchCancel={handleImagePressEnd}
                onContextMenu={(e) => e.preventDefault()}
              >
                {/* Vignette overlay */}
                <div className="absolute inset-0 rounded-full pointer-events-none" style={{
                  boxShadow: 'inset 0 0 15px rgba(0,0,0,0.3)'
                }}></div>
              </div>
            ) : (
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 border-4 border-white shadow-lg">
                <User size={40} className="text-blue-600" />
              </div>
            )}
          </div>

          {/* Name and ID - Centered */}
          <div className="w-full">
            <h3 className="font-semibold text-gray-800 text-sm sm:text-base">
              <ScrollingText
                className="font-semibold text-gray-800 text-sm sm:text-base text-center"
                pauseDuration={1}
                scrollDuration={3}
                easing="power1.inOut"
              >
                {client.name}
              </ScrollingText>
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 text-center">ID: {client.id}</p>
          </div>
        </div>

        {/* Debt Amount */}
        <div className="mb-2 sm:mb-3 text-center">
          <div className="flex items-center gap-2 mb-1 justify-center">
            <TrendingUp size={14} className="text-red-500 sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm text-gray-600">Outstanding</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-red-600 text-center">
            Rs {totalDebt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          {(bottlesOwed.beer > 0 || bottlesOwed.guinness > 0 || bottlesOwed.malta > 0 || bottlesOwed.coca > 0 || bottlesOwed.chopines > 0) && (
            <p className="text-xs text-orange-600 mt-1 text-center">
              + Bottles: {Object.entries(bottlesOwed)
                .filter(([_, count]) => count > 0)
                .map(([type, count]) => `${count} ${type.charAt(0).toUpperCase() + type.slice(1)}`)
                .join(', ')}
            </p>
          )}
        </div>

        {/* Quick Add Button */}
        {onQuickAdd && (
          <div className="mb-2 sm:mb-3 text-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!isLinked) {
                  onQuickAdd(client);
                  // Remove focus from any input fields to dismiss keyboard
                  if (document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                  }
                  // Scroll to top to ensure calculator is visible
                  window.scrollTo({ top: 0, behavior: 'smooth' });
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
        <div className="text-xs sm:text-sm text-gray-500 min-h-[3.5rem] flex flex-col justify-end">
          {returnableItemsText.length > 0 ? (
            <div className="mb-2 flex items-center">
              <ScrollingText 
                className="text-orange-600 font-medium text-sm text-center"
                pauseDuration={0.5}
                scrollDuration={2.5}
                easing="power1.inOut"
              >
                {returnableItemsText.map((item, index) => (
                  <span key={index} className="inline-flex items-center align-middle">
                    {index > 0 && ', '}
                    {item.text} (<FlipCard
                      frontContent={<span>{item.date}</span>}
                      backContent={<span>{item.time}</span>}
                      shouldFlip={true}
                      flipDuration={0.6}
                      flipDelay={2}
                      className="inline-block align-middle min-h-[1.2em] min-w-[3em]"
                    />)
                  </span>
                ))}
              </ScrollingText>
            </div>
          ) : (
            <div className="mb-2 h-5"></div>
          )}
          <div className="flex items-center gap-2 h-4">
            <Calendar size={12} className="sm:w-3.5 sm:h-3.5 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-gray-500 truncate text-center">
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
          <div className="mt-1">
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
          onQuickAdd={onQuickAdd}
          onResetCalculator={onResetCalculator}
          onViewDetails={() => setShowDetails(true)}
        />
      )}

      {/* Zoomed Image Modal */}
      {showZoomedImage && client.profilePictureUrl && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center z-[10000] overflow-hidden"
          onClick={(e) => {
            e.preventDefault();
            handleCloseZoom();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleCloseZoom();
          }}
          onTouchStart={(e) => {
            e.preventDefault();
          }}
          onTouchMove={(e) => {
            e.preventDefault();
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none',
            touchAction: 'none'
          }}
        >
          <img
            src={client.profilePictureUrl}
            alt={client.name}
            className="max-w-full max-h-screen object-contain"
            style={{
              pointerEvents: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none',
              MozUserSelect: 'none',
              msUserSelect: 'none'
            }}
            draggable={false}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              return false;
            }}
            onTouchStart={(e) => e.preventDefault()}
            onTouchEnd={(e) => e.preventDefault()}
          />
        </div>,
        document.body
      )}
    </>
  );
};

export default ClientCard;