import React from 'react';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Draggable } from '../../lib/draggable.js';
import { Search, X } from 'lucide-react';
import { Client } from '../../types';
import ClientCard from '../ClientCard';

// Register GSAP plugins
gsap.registerPlugin(Draggable);

interface ClientGridProps {
  clients: Client[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showAllClients: boolean;
  onClientLongPress: (client: Client) => void;
  onQuickAdd: (client: Client) => void;
  onResetCalculator: () => void;
  linkedClient: Client | null;
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
  onClientLongPress,
  onQuickAdd,
  onResetCalculator,
  linkedClient
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggableRef = useRef<Draggable[] | null>(null);

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
    
    // Only enable dragging if content overflows container
    // Always enable dragging for better UX, even with single cards
    if (true) {
      // Create draggable instance
      draggableRef.current = Draggable.create(content, {
        type: "x",
        bounds: {
          minX: Math.min(-(contentWidth - containerWidth), -100), // Allow at least 100px drag
          maxX: Math.max(0, 100) // Allow dragging in both directions
        },
        edgeResistance: 0.3, // Moderate resistance for better feel
        inertia: true,
        dragResistance: 0.1, // Lower = easier to drag
        throwResistance: 0.1, // Controls how much the throw slows down
        maxDuration: 3, // Maximum duration for inertia
        minDuration: 0.2, // Minimum duration for inertia
        overshootTolerance: 150, // Allow more overshooting for single cards
        force3D: true,
        onDragEnd: function() {
          // For big cards (overflow), don't snap back - let them stay where dragged
          // Only snap back if content is smaller than container
          const containerWidth = container.offsetWidth;
          const contentWidth = content.scrollWidth;
          
          if (contentWidth <= containerWidth) {
            // Small content: snap back to center
            gsap.to(content, {
              x: 0,
              duration: 1.2,
              ease: "elastic.out(1, 0.5)",
              force3D: true
            });
          }
          // Big content: stay where dragged (no snap)
        },
        onThrowComplete: function() {
          // For big cards (overflow), don't snap back after throw
          // Only snap back if content is smaller than container
          const containerWidth = container.offsetWidth;
          const contentWidth = content.scrollWidth;
          
          if (contentWidth <= containerWidth) {
            // Small content: snap back to center after throw
            gsap.to(content, {
              x: 0,
              duration: 1.2,
              ease: "elastic.out(1, 0.5)",
              force3D: true
            });
          }
          // Big content: stay where thrown (no snap)
        }
      });
    }

    return () => {
      if (draggableRef.current) {
        draggableRef.current.forEach(d => d.kill());
        draggableRef.current = null;
      }
    };
  }, [clients.length]); // Recalculate when number of clients changes

  // Calculate dynamic height based on card content
  const calculateCardHeight = () => {
    // Base padding: p-3 (12px) on mobile = 24px total vertical padding
    // Client header: ~40px (icon + name + ID)
    // Debt amount: ~60px (label + amount + bottles)
    // Quick add button: ~40px
    // Returnable items: 48px (3rem min-height)
    // Date and instruction text: ~60px (increased for two lines)
    // Total estimated: ~272px
    
    // Add some buffer for different screen sizes and content variations
    return 'min-h-[320px]'; // 320px should accommodate all content comfortably including two-line instructions
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">
            {showAllClients ? 'All Clients' : 'Active Clients'}
          </h3>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {clients.length} client{clients.length !== 1 ? 's' : ''}
          </span>
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
                  onQuickAdd={onQuickAdd}
                  onResetCalculator={onResetCalculator}
                  isLinked={linkedClient?.id === client.id}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 pb-4">
        <div className="relative w-full max-w-md mx-auto">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={20} className="text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by client name or ID..."
              className={`block w-full pl-10 ${searchQuery ? 'pr-12' : 'pr-4'} py-3 lg:py-4 text-lg lg:text-xl border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-3 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200`}
            />
            
            {/* Clear Button - Only visible when there's text */}
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute top-3 right-3 w-8 h-8 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-full flex items-center justify-center shadow-md border border-gray-300 transition-all duration-200"
                title="Clear search"
              >
                <X size={14} strokeWidth={3} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientGrid;