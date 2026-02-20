import React from 'react';
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { Draggable, DraggableInstance } from '../../lib/draggable';
import { Search, X, Users, UserCheck, Mic, MicOff } from 'lucide-react';
import { Client } from '../../types';
import ClientCard from '../ClientCard';

// Register GSAP plugins
gsap.registerPlugin(Draggable, InertiaPlugin);

interface ClientGridProps {
  clients: Client[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showAllClients: boolean;
  onToggleAllClients: () => void;
  onClientLongPress: (client: Client) => void;
  onQuickAdd: (client: Client) => void;
  onResetCalculator: () => void;
  linkedClient: Client | null | undefined;
  recentTransactionClient: Client | null;
  onCloseWobble: () => void;
}

/**
 * CLIENT GRID COMPONENT
 * =====================
 * 
 * Displays client cards in a scrollable grid with search functionality
 */
const ClientGrid: React.FC<ClientGridProps> = ({
  clients,
  searchQuery,
  onSearchChange,
  showAllClients,
  onToggleAllClients,
  onClientLongPress,
  onQuickAdd,
  onResetCalculator,
  linkedClient,
  recentTransactionClient,
  onCloseWobble
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggableRef = useRef<DraggableInstance[] | null>(null);
  const dragStartXRef = useRef(0);
  const dragDirectionRef = useRef<'left' | 'right' | null>(null);

  // Voice recognition state
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Check if voice recognition is supported
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onSearchChange(transcript);
        setIsListening(false);
        // Auto-switch to show all clients when voice input is used
        if (transcript.trim() && !showAllClients) {
          onToggleAllClients();
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Voice recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onSearchChange, onToggleAllClients, showAllClients]);

  const handleVoiceSearch = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Error starting voice recognition:', error);
      }
    }
  };

  // GSAP Draggable setup
  useEffect(() => {
    if (!contentRef.current || !containerRef.current || clients.length === 0) return;

    const container = containerRef.current;
    const content = contentRef.current;
    
    // Kill any existing draggable
    if (draggableRef.current) {
      draggableRef.current.forEach(d => d.kill());
      draggableRef.current = null;
    }

    // Force layout calculation
    gsap.set(content, { x: 0 });
    container.offsetWidth;
    content.offsetWidth;
    
    const containerWidth = container.offsetWidth;
    const contentWidth = content.scrollWidth;
    
    // Always enable dragging for better UX, even with single card
    const overflowAmount = contentWidth - containerWidth;
    const hasOverflow = overflowAmount > 0;
    
    // Determine bounds based on content vs container size
    let bounds;
    if (hasOverflow) {
      // Content overflows container - use container bounds with snapping
      const maxDrag = Math.max(0, contentWidth - containerWidth);
      bounds = {
        minX: -maxDrag,
        maxX: 0
      };
    } else {
      // Content fits in container - use screen bounds, no snapping
      const screenWidth = window.innerWidth;
      const contentRect = content.getBoundingClientRect();
      
      // Use full screen boundaries - no container constraints
      bounds = {
        minX: -contentRect.left, // Left edge of screen
        maxX: screenWidth - contentRect.left - contentWidth // Right edge of screen
      };
    }
    
    // Always create draggable instance
    draggableRef.current = Draggable.create(content, {
      type: "x",
      bounds: bounds,
      edgeResistance: hasOverflow ? 0.5 : 0, // No resistance for free movement
      inertia: true,
      snap: hasOverflow ? false : false, // No snapping for either case
      dragResistance: hasOverflow ? 0.1 : 0, // No drag resistance for free movement
      throwResistance: hasOverflow ? 0.005 : 0.001, // More momentum for free movement
      maxDuration: 2,
      minDuration: 0.02,
      overshootTolerance: 0,
      force3D: true,
      onDragStart: function() {
        const currentX = gsap.getProperty(content, "x") as number;
        dragStartXRef.current = currentX;
        dragDirectionRef.current = null;
      },
      onDrag: function() {
        const currentX = gsap.getProperty(content, "x") as number;
        const deltaX = currentX - dragStartXRef.current;
        
        // Determine drag direction based on movement
        if (Math.abs(deltaX) > 10) {
          if (deltaX > 0) {
            dragDirectionRef.current = 'right';
          } else {
            dragDirectionRef.current = 'left';
          }
        }
      },
      onDragEnd: function(this: any) {
        
        // Only apply snapping logic if content overflows container
        if (hasOverflow) {
          // No snapping - let it stay where dragged within bounds
        }
        // For non-overflowing content, absolutely no snapping - complete free movement
        // The card stays exactly where the user dragged it
        
        dragDirectionRef.current = null;
      }
    });

    return () => {
      if (draggableRef.current) {
        draggableRef.current.forEach(d => d.kill());
        draggableRef.current = null;
      }
    };
  }, [clients.length]); // Recalculate when number of clients changes

  const handleQuickAdd = (client: Client) => {
    onQuickAdd(client);
    // Remove focus from any input fields to dismiss keyboard
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    // Auto-scroll to top to access calculator
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">
            {showAllClients ? 'All Clients' : 'Active Clients'}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {clients.length} client{clients.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={onToggleAllClients}
              className={`text-xs px-2 py-1 rounded-full transition-colors ${
                showAllClients 
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  : 'bg-blue-100 text-blue-700 font-medium' 
              }`}
            >
              <div className="flex items-center gap-1">
                {showAllClients ? <Users size={12} /> : <UserCheck size={12} />}
                <span>{showAllClients ? 'All' : 'Active'}</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Client Cards - Horizontal Scroll */}
      <div className="p-3">
        <div 
          ref={containerRef}
          className="overflow-x-auto overflow-y-visible relative z-10 py-4"
          style={{ 
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <div 
            ref={contentRef}
            className="flex gap-3 whitespace-nowrap py-2"
            style={{ minWidth: 'max-content' }}
          >
            {clients.length === 0 ? (
              <div className="flex items-center justify-center w-full h-32 text-gray-500">
                <div className="text-center">
                  <p className="text-base sm:text-lg">
                    {showAllClients 
                      ? (searchQuery ? `No clients found matching "${searchQuery}"` : 'No clients found')
                      : 'No clients with outstanding debts'
                    }
                  </p>
                  <p className="text-xs sm:text-sm">Use the calculator to add transactions</p>
                </div>
              </div>
            ) : (
              clients.map((client) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  onLongPress={() => onClientLongPress(client)}
                  onQuickAdd={handleQuickAdd}
                  onResetCalculator={onResetCalculator}
                  isLinked={linkedClient?.id === client.id}
                  showWobble={recentTransactionClient?.id === client.id}
                  onCloseWobble={onCloseWobble}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 pb-4">
        <div className="relative w-full max-w-md mx-auto">
          <div className="flex items-center gap-2">
            {/* Voice Search Button */}
            {voiceSupported && (
              <button
                onClick={handleVoiceSearch}
                className={`flex-shrink-0 w-12 h-12 lg:w-14 lg:h-14 rounded-xl flex items-center justify-center shadow-md border-2 transition-all duration-200 ${
                  isListening
                    ? 'bg-red-500 hover:bg-red-600 border-red-600 text-white animate-pulse'
                    : 'bg-blue-500 hover:bg-blue-600 border-blue-600 text-white'
                }`}
                title={isListening ? 'Stop listening' : 'Voice search'}
              >
                {isListening ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
            )}

            <div className="relative flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={20} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    const newQuery = e.target.value;
                    onSearchChange(newQuery);
                    // Auto-switch to show all clients when user starts typing
                    if (newQuery.trim() && !showAllClients) {
                      onToggleAllClients();
                    }
                  }}
                  placeholder="Search by client name or ID..."
                  className={`block w-full pl-10 ${searchQuery ? 'pr-20' : 'pr-4'} py-3 lg:py-4 text-lg lg:text-xl border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-3 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200`}
                />

                {/* Clear Button - Only visible when there's text */}
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="absolute inset-y-0 right-3 my-auto px-3 h-8 bg-red-500 hover:bg-red-600 text-white rounded-md flex items-center justify-center shadow-md border border-red-600 transition-all duration-200 text-sm font-medium"
                    title="Clear search"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientGrid;