/*
 * COMPONENTS/SWIPEABLEITEM.TSX - INTERACTIVE LIST ITEM COMPONENT
 * ==============================================================
 * 
 * OVERVIEW:
 * Advanced swipeable list item component with touch/mouse interactions.
 * Provides intuitive swipe-to-reveal actions for edit and delete operations.
 * 
 * KEY FEATURES:
 * - Touch and mouse swipe support
 * - Smooth animations and transitions
 * - Visual feedback for user actions
 * - Accessibility considerations
 * - Text overflow handling with popup
 * - Click-outside-to-close behavior
 * 
 * INTERACTION PATTERNS:
 * - Swipe left to reveal action buttons
 * - Tap buttons to perform actions
 * - Tap card or price to close actions
 * - Tap truncated text to view full content
 * - Click outside to reset position
 * 
 * TECHNICAL IMPLEMENTATION:
 * - Custom drag/swipe detection
 * - State-driven animations
 * - Event delegation and cleanup
 * - Performance optimizations
 * - Cross-platform compatibility
 */
import React, { useState, useRef, useEffect } from 'react';
import { Edit, Trash2, X } from 'lucide-react';
import { PriceItem } from '../types';

/**
 * COMPONENT PROPS INTERFACE
 * =========================
 * 
 * DESCRIPTION:
 * TypeScript interface defining the props required by SwipeableItem component.
 * Ensures type safety and clear API contract.
 * 
 * @param item - PriceItem object containing all item data
 * @param onEdit - Callback function triggered when edit button is pressed
 * @param onDelete - Callback function triggered when delete button is pressed
 * 
 * CALLBACK PATTERNS:
 * - onEdit receives the complete item object for editing
 * - onDelete receives only the item ID for deletion
 * - Both callbacks should handle async operations gracefully
 */
interface SwipeableItemProps {
  item: PriceItem;
  onEdit: (item: PriceItem) => void;
  onDelete: (id: string) => void;
}

/**
 * SWIPEABLE ITEM COMPONENT
 * ========================
 * 
 * PURPOSE:
 * Renders a single price list item with swipe-to-reveal functionality.
 * Handles complex touch interactions and provides smooth user experience.
 * 
 * STATE MANAGEMENT:
 * - revealWidth: Controls how much of action buttons are visible (0-150px)
 * - isDragging: Tracks active drag/swipe state
 * - dragStartX: Records initial touch/mouse position
 * - showTextPopup: Controls full text display modal
 * - isAnimating: Prevents interaction during transitions
 * 
 * PERFORMANCE CONSIDERATIONS:
 * - Efficient event handling with proper cleanup
 * - Minimal re-renders through careful state updates
 * - Optimized animations using CSS transitions
 * - Debounced position updates during drag
 * 
 * ACCESSIBILITY:
 * - Keyboard navigation support could be added
 * - Screen reader compatibility considerations
 * - High contrast mode support
 * - Touch target size optimization
 */
const SwipeableItem: React.FC<SwipeableItemProps> = ({ item, onEdit, onDelete }) => {
  // COMPONENT STATE
  // ===============
  
  // Swipe interaction state
  const [revealWidth, setRevealWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  
  // UI state
  const [showTextPopup, setShowTextPopup] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // DOM references
  const containerRef = useRef<HTMLDivElement>(null);
  const itemTextRef = useRef<HTMLDivElement>(null);
  
  /**
   * PRICE FORMATTING
   * ================
   * 
   * PURPOSE:
   * Formats the price value with currency symbol and proper decimal places.
   * Ensures consistent price display across the application.
   * 
   * FORMAT:
   * - Currency: "Rs" prefix
   * - Decimals: Always 2 decimal places
   * - Examples: "Rs 10.00", "Rs 1234.56"
   */
  const formattedPrice = `Rs ${item.price.toFixed(2)}`;

  /**
   * TEXT TRUNCATION DETECTION
   * =========================
   * 
   * PURPOSE:
   * Determines if the item name is truncated due to container width.
   * Used to show clickable indicator for full text popup.
   * 
   * LOGIC:
   * - Compares scrollWidth (full content) with clientWidth (visible area)
   * - Returns true if content overflows container
   * - Handles edge case where ref is not available
   * 
   * @returns boolean - True if text is truncated, false otherwise
   */
  const isTextTruncated = () => {
    if (!itemTextRef.current) return false;
    return itemTextRef.current.scrollWidth > itemTextRef.current.clientWidth;
  };

  /**
   * RESET POSITION METHOD
   * =====================
   * 
   * PURPOSE:
   * Smoothly animates the item back to its default position.
   * Hides action buttons and restores normal appearance.
   * 
   * ANIMATION:
   * - Sets isAnimating flag to prevent interactions
   * - Uses CSS transition for smooth movement
   * - Clears animation flag after transition completes
   * - 300ms duration matches CSS transition timing
   * 
   * USAGE:
   * - Called when clicking outside the item
   * - Called when tapping the card or price area
   * - Called after performing actions (edit/delete)
   */
  const resetPosition = () => {
    if (revealWidth > 0) {
      setIsAnimating(true);
      // Allow animation to complete before clearing animating state
      setTimeout(() => setIsAnimating(false), 300);
    }
    setRevealWidth(0);
  };

  /**
   * CLICK OUTSIDE HANDLER EFFECT
   * ============================
   * 
   * PURPOSE:
   * Sets up event listeners to detect clicks outside the component.
   * Automatically resets position when user clicks elsewhere.
   * 
   * BEHAVIOR:
   * - Only active when action buttons are revealed (revealWidth > 0)
   * - Listens for both mouse and touch events
   * - Checks if click target is outside container
   * - Automatically cleans up event listeners
   * 
   * PERFORMANCE:
   * - Event listeners added/removed based on state
   * - Prevents memory leaks with proper cleanup
   * - Minimal overhead when buttons are hidden
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node) && revealWidth > 0) {
        resetPosition();
      }
    };

    if (revealWidth > 0) {
      // Add event listeners when buttons are revealed
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      
      return () => {
        // Clean up event listeners
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [revealWidth]);

  /**
   * DRAG START HANDLER
   * ==================
   * 
   * PURPOSE:
   * Initializes drag/swipe interaction by recording start position.
   * Works for both mouse and touch events.
   * 
   * PROCESS:
   * 1. Set dragging state to true
   * 2. Record initial X coordinate
   * 3. Prepare for subsequent move events
   * 
   * @param clientX - Initial X coordinate from mouse or touch event
   */
  const handleDragStart = (clientX: number) => {
    setIsDragging(true);
    setDragStartX(clientX);
  };

  /**
   * DRAG MOVE HANDLER
   * =================
   * 
   * PURPOSE:
   * Processes drag/swipe movement and updates reveal width accordingly.
   * Provides real-time visual feedback during interaction.
   * 
   * LOGIC:
   * 1. Calculate horizontal distance moved
   * 2. Check if movement is still within item bounds
   * 3. Update reveal width based on movement
   * 4. Constrain width to valid range (0-150px)
   * 
   * BOUNDARY CHECKING:
   * - Stops drag if touch/mouse moves outside item vertically
   * - Prevents accidental activation during scrolling
   * - Maintains smooth interaction within bounds
   * 
   * @param clientX - Current X coordinate
   * @param clientY - Current Y coordinate (for boundary checking)
   */
  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    
    // Check if touch/mouse is still within the item bounds
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const isWithinBounds = clientY >= rect.top && clientY <= rect.bottom;
      
      // If dragging outside the item vertically, stop the drag
      if (!isWithinBounds) {
        handleDragEnd();
        return;
      }
    }
    
    const deltaX = dragStartX - clientX; // Reversed for left swipe
    
    // Only allow positive values (revealing actions) and limit to 160px
    if (deltaX >= 0) {
      setRevealWidth(Math.min(deltaX, 140));
    }
  };

  /**
   * DRAG END HANDLER
   * ================
   * 
   * PURPOSE:
   * Completes drag/swipe interaction with snap-to-position behavior.
   * Determines final state based on how far the user swiped.
   * 
   * SNAP LOGIC:
   * - If swiped >= 25px: Snap to fully revealed (150px)
   * - If swiped < 25px: Snap back to hidden (0px)
   * - Low threshold encourages discoverability
   * 
   * ANIMATION:
   * - Sets animation flag during transition
   * - Uses CSS transitions for smooth snapping
   * - Clears flag after animation completes
   */
  const handleDragEnd = () => {
    setIsDragging(false);
    
    // Snap to positions
    if (revealWidth >= 25) {  // Adjusted threshold for new button width
      setIsAnimating(true);
      setRevealWidth(140); // Full reveal (action buttons)
      setTimeout(() => setIsAnimating(false), 300);
    } else {
      setIsAnimating(true);
      setRevealWidth(0);   // Reset position
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  /**
   * TOUCH EVENT HANDLERS
   * ====================
   * 
   * PURPOSE:
   * Handle touch-based interactions for mobile devices.
   * Provides native mobile swipe experience.
   * 
   * EVENTS:
   * - touchstart: Initialize swipe interaction
   * - touchmove: Track swipe progress with preventDefault
   * - touchend: Complete swipe interaction
   * 
   * PERFORMANCE:
   * - preventDefault only during active dragging
   * - Minimal event processing overhead
   * - Smooth 60fps interaction
   */
  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging) {
      e.preventDefault(); // Only prevent default when actively dragging
    }
    handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    handleDragEnd();
  };

  /**
   * MOUSE EVENT HANDLERS
   * ====================
   * 
   * PURPOSE:
   * Handle mouse-based interactions for desktop devices.
   * Provides consistent experience across input methods.
   * 
   * MOUSE DOWN:
   * - Only responds to left mouse button
   * - Prevents default to avoid text selection
   * - Initializes drag interaction
   */
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left mouse button
    e.preventDefault();
    handleDragStart(e.clientX);
  };

  /**
   * GLOBAL MOUSE EVENT EFFECT
   * =========================
   * 
   * PURPOSE:
   * Sets up global mouse event listeners during drag operations.
   * Ensures drag continues even when mouse leaves component.
   * 
   * BEHAVIOR:
   * - Only active during mouse drag operations
   * - Tracks mouse movement globally
   * - Handles mouse release anywhere on page
   * - Automatically cleans up listeners
   */
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      handleDragEnd();
    };

    if (isDragging) {
      // Add global listeners during drag
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        // Clean up global listeners
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStartX, revealWidth]);

  /**
   * CARD CLICK HANDLER
   * ==================
   * 
   * PURPOSE:
   * Handles clicks on the main card area with context-aware behavior.
   * Different actions based on current state and text truncation.
   * 
   * BEHAVIOR LOGIC:
   * - If text is truncated AND buttons hidden: Show text popup
   * - If buttons are revealed: Reset to normal position
   * - Otherwise: No action
   * 
   * USER EXPERIENCE:
   * - Intuitive click behavior based on visual state
   * - Clear feedback for different interaction modes
   * - Consistent with mobile interaction patterns
   */
  const handleCardClick = () => {
    if (isTextTruncated() && revealWidth === 0) {
      setShowTextPopup(true);
    } else if (revealWidth > 0) {
      // If buttons are revealed, just reset position when clicking on card
      resetPosition();
    }
  };

  /**
   * ACTION BUTTON HANDLERS
   * ======================
   * 
   * PURPOSE:
   * Handle clicks on edit and delete action buttons.
   * Prevent event bubbling and trigger appropriate callbacks.
   * 
   * PROCESS:
   * 1. Stop event propagation to prevent card click
   * 2. Call appropriate callback function
   * 3. Reset position to hide buttons
   * 
   * ERROR HANDLING:
   * - Callbacks should handle their own error states
   * - Component resets position regardless of callback success
   */
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(item);
    resetPosition();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(item.id);
    resetPosition();
  };

  /**
   * COMPONENT RENDER
   * ================
   * 
   * STRUCTURE:
   * - Container div with relative positioning
   * - Action buttons container (slides in from right)
   * - Price text (moves with swipe)
   * - Main card (stays in place)
   * - Text popup modal (conditional)
   * 
   * STYLING APPROACH:
   * - CSS transforms for smooth animations
   * - Absolute positioning for layered elements
   * - Responsive design with proper touch targets
   * - Consistent spacing and visual hierarchy
   */
  return (
    <>
      {/* Main Container: Fixed height with overflow hidden */}
      <div 
        ref={containerRef}
        className="relative h-16 overflow-hidden rounded-lg"
      >
        {/* Action Buttons Container: Slides in from right */}
        {/* Action buttons container - revealed on swipe */}
        <div 
          className="absolute top-0 right-0 h-full flex"
          style={{ 
            width: '150px',
            // Transform based on reveal width (150px total, slide from right)
            transform: `translateX(${150 - revealWidth}px)`,
            // Smooth transitions when not actively dragging
            transition: (isAnimating || !isDragging) ? 'transform 0.3s ease-out' : 'none',
            zIndex: 20
          }}
        >
          {/* Edit Button: Blue background with edit icon */}
          <button 
            className="w-[75px] bg-blue-500 flex items-center justify-center hover:bg-blue-600 transition-colors"
            onClick={handleEditClick}
          >
            <Edit className="text-white" size={20} />
          </button>
          
          {/* Delete Button: Red background with trash icon */}
          <button 
            className="w-[75px] bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors"
            onClick={handleDeleteClick}
          >
            <Trash2 className="text-white" size={20} />
          </button>
        </div>

        {/* Price Text: Initially visible, moves with swipe */}
        <div 
          className="absolute top-0 right-0 h-full flex items-center justify-center font-semibold text-gray-800 whitespace-nowrap rounded-r-lg"
          // Touch event handlers for swipe interaction (same as main card)
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          // Mouse event handler for desktop interaction (same as main card)
          onMouseDown={handleMouseDown}
          // Click handler for position reset
          onClick={revealWidth > 0 ? resetPosition : undefined}
          style={{ 
            // Dynamic width based on price text length
            width: `${formattedPrice.length * 8 + 16}px`,
            fontSize: '16px',
            zIndex: 15, // Higher z-index to ensure it's above main card but below action buttons
            // Move left as buttons are revealed
            transform: `translateX(-${revealWidth}px)`,
            // Smooth transitions when not actively dragging
            transition: (isAnimating || !isDragging) ? 'transform 0.3s ease-out' : 'none',
            // Prevent text selection
            userSelect: 'none',
            WebkitUserSelect: 'none',
            // Cursor feedback based on state
            cursor: revealWidth > 0 ? 'pointer' : 'grab',
            backgroundColor: '#fef3c7', // Pale golden color (yellow-100)
            // Touch action for swipe support
            touchAction: 'pan-y', // Allow vertical scrolling, prevent horizontal
          }}
        >
          {formattedPrice}
        </div>

        {/* Main Card: Stays in place, contains item name */}
        <div 
          className="absolute top-0 left-0 h-full cursor-pointer rounded-l-lg"
          style={{ 
            width: `calc(100% - ${formattedPrice.length * 8 + 16}px)`, // Leave space for price
            // Prevent text selection during swipe
            userSelect: 'none',
            WebkitUserSelect: 'none',
            touchAction: 'pan-y', // Allow vertical scrolling, prevent horizontal
            backgroundColor: '#fef3c7', // Pale golden color (yellow-100)
            zIndex: 10, // Lower than price but higher than background
          }}
          // Touch event handlers for swipe interaction
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          // Mouse event handler for desktop interaction
          onMouseDown={handleMouseDown}
          // Click handler for text popup and position reset
          onClick={handleCardClick}
        >
          {/* Content Container: Proper padding and layout */}
          <div className="relative h-full flex items-center px-4 pointer-events-none">
            {/* Item Text: Truncated with ellipsis, clickable if truncated */}
            <div className="flex flex-col justify-center w-full">
              <div 
                ref={itemTextRef}
                className="font-semibold text-gray-900 truncate"
                style={{ 
                  fontSize: '16px',
                  zIndex: 12, // Above main card background
                  maxWidth: '100%'
                }}
              >
                {item.name}
              </div>
              {/* Gross Price display */}
              <div 
                className="text-xs text-gray-500 truncate"
                style={{ 
                  fontSize: '11px',
                  zIndex: 12, // Above main card background
                  maxWidth: '100%'
                }}
              >
                Gross Price: Rs {item.grossPrice.toFixed(2)}
              </div>
              {/* Last edited date display */}
              {item.lastEditedAt && (
                <div 
                  className="text-xs text-gray-500 truncate"
                  style={{ 
                    fontSize: '11px',
                    zIndex: 12, // Above main card background
                    maxWidth: '100%'
                  }}
                >
                  Last edited on {item.lastEditedAt.toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })} {item.lastEditedAt.toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Text Popup Modal: Shows full text when truncated */}
      {showTextPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="p-6">
              {/* Modal Header: Title and close button */}
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Item Details</h3>
                <button 
                  onClick={() => setShowTextPopup(false)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Full Item Text: Complete name without truncation */}
              <div className="mb-3">
                <p className="text-gray-800 font-medium leading-relaxed">
                  {item.name}
                </p>
              </div>
              
              {/* Price Display: Formatted price in modal */}
              <div className="text-right">
                <span className="text-lg font-semibold text-gray-900">
                  {formattedPrice}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * EXPORT STATEMENT
 * ================
 * 
 * PURPOSE:
 * Exports the SwipeableItem component as the default export.
 * Allows other components to import and use this swipeable list item.
 */
export default SwipeableItem;