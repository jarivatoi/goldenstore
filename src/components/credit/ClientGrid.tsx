import React from 'react';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { Draggable } from '../../lib/draggable.js';
import { Search, X, Users, UserCheck } from 'lucide-react';
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
  onToggleAllClients,
  onClientLongPress,
  onQuickAdd,
  onResetCalculator,
  linkedClient
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggableRef = useRef<Draggable[] | null>(null);
  const dragStartXRef = useRef(0);
  const dragDirectionRef = useRef<'left' | 'right' | null>(null);

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
    // Calculate bounds based on content and container width
    const maxDrag = Math.max(0, contentWidth - containerWidth);
    
    // Smart drag detection: only enable if there's significant overflow
    const overflowAmount = contentWidth - containerWidth;
    const shouldEnableDrag = overflowAmount > 100; // Require at least 100px overflow
    
    // Create draggable instance
    if (shouldEnableDrag) {
      // Only create draggable for overflowing content
      draggableRef.current = Draggable.create(content, {
        type: "x",
        bounds: {
          minX: -maxDrag,
          maxX: 0
        },
        edgeResistance: 0.5,
        inertia: true,
        snap: false,
        dragResistance: 0.1,
        throwResistance: 0.005,
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
          const currentX = gsap.getProperty(content, "x") as number;
          const dragDirection = dragDirectionRef.current;
          const velocity = InertiaPlugin ? InertiaPlugin.getVelocity(content, "x") : 0;
          
          // Normal snapping logic for overflowing content only
          let shouldSnap = false;
          let snapTo = currentX;
          
          const edgeThreshold = 50;
          const highVelocityThreshold = 1000;
          
          if (Math.abs(velocity) > highVelocityThreshold) {
            if (velocity > 0 && currentX > -edgeThreshold) {
              shouldSnap = true;
              snapTo = 0;
            } else if (velocity < 0 && currentX < -(maxDrag - edgeThreshold)) {
              shouldSnap = true;
              snapTo = -maxDrag;
            }
          } else {
            if (currentX > -edgeThreshold && dragDirection !== 'left') {
              shouldSnap = true;
              snapTo = 0;
            } else if (currentX < -(maxDrag - edgeThreshold) && dragDirection !== 'right') {
              shouldSnap = true;
              snapTo = -maxDrag;
            }
          }
          
          if (shouldSnap && Math.abs(currentX - snapTo) > 5) {
            gsap.to(content, {
              x: snapTo,
              duration: 0.8,
              ease: "power2.out",
              force3D: true
            });
          }
          
          dragDirectionRef.current = null;
        }
      });
    } else {
      // For single card, ensure it stays centered and disable dragging
      gsap.set(content, { x: 0 });
      draggableRef.current = null;
    }

    return () => {
      if (draggableRef.current) {
        draggableRef.current.forEach(d => d.kill());
        draggableRef.current = null;
      }
    };
  }, [clients.length]); // Recalculate when number of clients changes

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
                  ? 'bg-blue-100 text-blue-700 font-medium' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center gap-1">
                {showAllClients ? <UserCheck size={12} /> : <Users size={12} />}
                <span>{showAllClients ? 'Active' : 'All'}</span>
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