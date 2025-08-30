import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Edit2, Check, Calculator, Plus, Minus, Maximize2 } from 'lucide-react';
import { gsap } from 'gsap';
import { DraggableCalculator } from '../../lib/draggableCalculator.js';
import { processCalculatorInput, evaluateExpression } from '../../utils/creditCalculatorUtils';
import ClientSearchModal from '../ClientSearchModal';

interface MiniCalculatorProps {
  id: string;
  initialLabel?: string;
  initialPosition?: { x: number; y: number };
  onClose: () => void;
  onAddToClient: (amount: number, description: string, label: string) => void;
}

/**
 * MINI CALCULATOR COMPONENT
 * =========================
 * 
 * Floating, draggable mini calculator for quick client transactions
 */
const MiniCalculator: React.FC<MiniCalculatorProps> = ({
  id,
  initialLabel = 'Quick Calc',
  initialPosition = { x: 100, y: 100 },
  onClose,
  onAddToClient
}) => {
  const [calculatorValue, setCalculatorValue] = useState('0');
  const [calculatorMemory, setCalculatorMemory] = useState(0);
  const [isCalculatorActive, setIsCalculatorActive] = useState(false);
  const [label, setLabel] = useState(initialLabel);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [editedLabel, setEditedLabel] = useState(label);
  const [description, setDescription] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState('');
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const calculatorRef = useRef<HTMLDivElement>(null);
  const draggableRef = useRef<DraggableCalculator | null>(null);

  // Show calculator after mount to prevent render issues
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 50);
    
    return () => clearTimeout(timer);
  }, []);

  // Initialize draggable functionality
  useEffect(() => {
    if (!calculatorRef.current || !isVisible) return;

    const element = calculatorRef.current;
    
    // Set initial position
    gsap.set(element, { x: initialPosition.x, y: initialPosition.y });

    // Create draggable calculator instance with momentum and free movement
    draggableRef.current = DraggableCalculator.create(element, {
      inertia: true, // Enable momentum
      throwResistance: 30, // Lower = more momentum
      maxDuration: 3, // Maximum momentum duration
      minDuration: 0.3, // Minimum momentum duration
      onDragStart: function() {
        // Bring to front during drag
        gsap.set(element, { zIndex: 10000 });
      },
      onThrowComplete: function() {
        // Reset z-index after throw
        gsap.set(element, { zIndex: 9999 });
      }
    });

    return () => {
      if (draggableRef.current) {
        draggableRef.current.kill();
      }
    };
  }, [initialPosition, id, isVisible]);

  const handleCalculatorInput = (value: string) => {
    const result = processCalculatorInput(calculatorValue, value, calculatorMemory);
    setCalculatorValue(result.value);
    setCalculatorMemory(result.memory);
    setIsCalculatorActive(result.isActive);
  };

  const handleSaveLabel = () => {
    if (editedLabel.trim()) {
      setLabel(editedLabel.trim());
    } else {
      setEditedLabel(label);
    }
    setIsEditingLabel(false);
  };

  const handleCancelEditLabel = () => {
    setEditedLabel(label);
    setIsEditingLabel(false);
  };

  const handleAddTransaction = () => {
    if (!description.trim()) {
      setError('Please enter a description');
      return;
    }

    const amount = evaluateExpression(calculatorValue);
    if (isNaN(amount) || !isFinite(amount) || amount < 0) {
      setError('Please enter a valid amount');
      return;
    }

    // Show client search modal instead of directly adding
    setShowClientSearch(true);
    setShowAddForm(false);
  };

  const handleQuickAction = (action: string) => {
    if (description.trim() === '') {
      setDescription(action);
    } else {
      setDescription(prev => prev + ', ' + action);
    }
  };

  // Don't render until visible to prevent React warnings
  if (!isVisible) {
    return null;
  }

  const modalContent = (
    <div
      ref={calculatorRef}
      className="fixed bg-white rounded-lg shadow-2xl border border-gray-300 select-none"
      style={{
        width: isMinimized ? '200px' : '280px',
        zIndex: 9999,
        maxHeight: isMinimized ? 'auto' : '90vh',
        overflow: 'hidden',
        left: 0,
        top: 0,
        transition: 'width 0.3s ease-in-out'
      }}
      onTouchStart={(e) => {
        // Prevent dragging when clicking on interactive elements
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('input') || target.closest('select')) {
          e.stopPropagation();
          e.preventDefault();
        }
      }}
    >
      {/* Header - Drag Handle */}
      <div className="bg-blue-500 text-white p-3 rounded-t-lg cursor-grab active:cursor-grabbing flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <Calculator size={16} />
          {!isEditingLabel ? (
            <div className="flex items-center gap-2 flex-1">
              <span className="font-medium truncate">{label}</span>
              <button
                onTouchStart={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setIsEditingLabel(true);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setIsEditingLabel(true);
                }}
                className="text-blue-200 hover:text-white transition-colors"
                style={{ 
                  touchAction: 'manipulation', 
                  zIndex: 10001,
                  position: 'relative',
                  pointerEvents: 'auto'
                }}
              >
                <Edit2 size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                value={editedLabel}
                onChange={(e) => setEditedLabel(e.target.value)}
                className="bg-blue-400 text-white placeholder-blue-200 border-none outline-none rounded px-2 py-1 text-sm flex-1"
                placeholder="Enter label..."
                autoFocus
                onTouchStart={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                style={{ 
                  touchAction: 'manipulation',
                  zIndex: 10001,
                  position: 'relative',
                  pointerEvents: 'auto'
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') handleSaveLabel();
                  if (e.key === 'Escape') handleCancelEditLabel();
                }}
              />
              <button
                onTouchStart={(e) => {
                  e.preventDefault();
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleSaveLabel();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleSaveLabel();
                }}
                className="text-blue-200 hover:text-white transition-colors"
                style={{ 
                  touchAction: 'manipulation', 
                  zIndex: 10001,
                  position: 'relative',
                  pointerEvents: 'auto'
                }}
              >
                <Check size={14} />
              </button>
            </div>
          )}
        </div>
        <button
          onTouchStart={(e) => {
            e.preventDefault();
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setIsMinimized(!isMinimized);
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setIsMinimized(!isMinimized);
          }}
          className="text-blue-200 hover:text-white transition-colors ml-2"
          style={{ 
            touchAction: 'manipulation', 
            zIndex: 10001,
            position: 'relative',
            pointerEvents: 'auto'
          }}
          title={isMinimized ? 'Maximize calculator' : 'Minimize calculator'}
        >
          {isMinimized ? <Maximize2 size={16} /> : <Minus size={16} />}
        </button>
        {!isMinimized && (
          <button
            onTouchStart={(e) => {
              e.preventDefault();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onClose();
            }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onClose();
            }}
            className="text-blue-200 hover:text-white transition-colors ml-2"
            style={{ 
              touchAction: 'manipulation', 
              zIndex: 10001,
              position: 'relative',
              pointerEvents: 'auto'
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Calculator Display */}
      <div 
        className="bg-gray-50 overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: isMinimized ? '0px' : '200px',
          padding: isMinimized ? '0 12px' : '12px',
          opacity: isMinimized ? 0 : 1
        }}
      >
        <div className="bg-gray-100 rounded-lg p-3 text-right relative">
          {calculatorMemory !== 0 && (
            <div className="absolute top-1 left-2 text-xs text-blue-600 font-semibold">
              M
            </div>
          )}
          <div className="text-lg font-mono text-gray-800 min-h-[1.5rem] flex items-center justify-end overflow-hidden">
            <div className="truncate max-w-full" title={calculatorValue}>
              {calculatorValue}
            </div>
          </div>
        </div>
      </div>

      {/* Minimized Amount Display */}
      {isMinimized && (
        <div className="px-3 py-2 bg-blue-50 border-t border-blue-200">
          <div className="text-center">
            <div className="text-lg font-mono font-bold text-blue-800">
              {calculatorValue}
            </div>
            {calculatorMemory !== 0 && (
              <div className="text-xs text-blue-600 font-semibold">
                Memory: {calculatorMemory}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Calculator Buttons */}
      <div 
        className="bg-white overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: isMinimized ? '0px' : '500px',
          padding: isMinimized ? '0 12px' : '12px',
          opacity: isMinimized ? 0 : 1
        }}
      >
        <div className="grid grid-cols-4 gap-1 mb-3">
          {/* Row 1 */}
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleCalculatorInput('C');
            }}
            onClick={() => handleCalculatorInput('C')}
            className="bg-red-500 hover:bg-red-600 text-white p-2 rounded text-sm font-semibold"
            style={{ 
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}
          >
            C
          </button>
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleCalculatorInput('CE');
            }}
            onClick={() => handleCalculatorInput('CE')}
            className="bg-orange-500 hover:bg-orange-600 text-white p-2 rounded text-sm font-semibold"
            style={{ 
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}
          >
            CE
          </button>
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleCalculatorInput('⌫');
            }}
            onClick={() => handleCalculatorInput('⌫')}
            className="bg-gray-500 hover:bg-gray-600 text-white p-2 rounded text-sm font-semibold"
            style={{ 
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}
          >
            ⌫
          </button>
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleCalculatorInput('/');
            }}
            onClick={() => handleCalculatorInput('/')}
            className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded text-sm font-semibold"
            style={{ 
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}
          >
            ÷
          </button>

          {/* Row 2 */}
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleCalculatorInput('7');
            }}
            onClick={() => handleCalculatorInput('7')}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-2 rounded text-sm font-semibold"
            style={{ 
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}
          >
            7
          </button>
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleCalculatorInput('8');
            }}
            onClick={() => handleCalculatorInput('8')}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-2 rounded text-sm font-semibold"
            style={{ 
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}
          >
            8
          </button>
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleCalculatorInput('9');
            }}
            onClick={() => handleCalculatorInput('9')}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-2 rounded text-sm font-semibold"
            style={{ 
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}
          >
            9
          </button>
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleCalculatorInput('*');
            }}
            onClick={() => handleCalculatorInput('*')}
            className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded text-sm font-semibold"
            style={{ 
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}
          >
            ×
          </button>

          {/* Row 3 */}
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleCalculatorInput('4');
            }}
            onClick={() => handleCalculatorInput('4')}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-2 rounded text-sm font-semibold"
            style={{ 
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}
          >
            4
          </button>
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleCalculatorInput('5');
            }}
            onClick={() => handleCalculatorInput('5')}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-2 rounded text-sm font-semibold"
            style={{ 
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}
          >
            5
          </button>
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleCalculatorInput('6');
            }}
            onClick={() => handleCalculatorInput('6')}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-2 rounded text-sm font-semibold"
            style={{ 
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}
          >
            6
          </button>
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleCalculatorInput('-');
            }}
            onClick={() => handleCalculatorInput('-')}
            className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded text-sm font-semibold"
            style={{ 
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}
          >
            −
          </button>

          {/* Row 4 */}
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleCalculatorInput('1');
            }}
            onClick={() => handleCalculatorInput('1')}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-2 rounded text-sm font-semibold"
            style={{ 
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}
          >
            1
          </button>
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleCalculatorInput('2');
            }}
            onClick={() => handleCalculatorInput('2')}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-2 rounded text-sm font-semibold"
            style={{ 
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}
          >
            2
          </button>
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleCalculatorInput('3');
            }}
            onClick={() => handleCalculatorInput('3')}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-2 rounded text-sm font-semibold"
            style={{ 
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}
          >
            3
          </button>
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleCalculatorInput('+');
            }}
            onClick={() => handleCalculatorInput('+')}
            className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded text-sm font-semibold"
            style={{ 
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}
          >
            +
          </button>

          {/* Row 5 */}
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleCalculatorInput('0');
            }}
            onClick={() => handleCalculatorInput('0')}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-2 rounded text-sm font-semibold col-span-2"
            style={{ 
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}
          >
            0
          </button>
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleCalculatorInput('.');
            }}
            onClick={() => handleCalculatorInput('.')}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-2 rounded text-sm font-semibold"
            style={{ 
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}
          >
            .
          </button>
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleCalculatorInput('=');
            }}
            onClick={() => handleCalculatorInput('=')}
            className="bg-green-500 hover:bg-green-600 text-white p-2 rounded text-sm font-semibold"
            style={{ 
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}
          >
            =
          </button>

          {/* Row 6 - Memory Functions */}
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleCalculatorInput('M+');
            }}
            onClick={() => handleCalculatorInput('M+')}
            className="bg-purple-500 hover:bg-purple-600 text-white p-2 rounded text-xs font-semibold"
            style={{ 
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}
          >
            M+
          </button>
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleCalculatorInput('MR');
            }}
            onClick={() => handleCalculatorInput('MR')}
            className="bg-purple-500 hover:bg-purple-600 text-white p-2 rounded text-xs font-semibold"
            style={{ 
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}
          >
            MR
          </button>
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleCalculatorInput('MC');
            }}
            onClick={() => handleCalculatorInput('MC')}
            className="bg-purple-500 hover:bg-purple-600 text-white p-2 rounded text-xs font-semibold"
            style={{ 
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}
          >
            MC
          </button>
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (calculatorValue !== 'Error') {
                setShowClientSearch(true);
              }
            }}
            disabled={calculatorValue === 'Error'}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (calculatorValue !== 'Error') {
                setShowClientSearch(true);
              }
            }}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-2 rounded text-xs font-semibold"
            style={{ 
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}
          >
            Add
          </button>
        </div>

        {/* Add Transaction Form */}
      </div>

      {/* Client Search Modal */}
      {showClientSearch && (
        <ClientSearchModal
          calculatorValue={calculatorValue}
          onClose={() => {
            setShowClientSearch(false);
            setError('');
          }}
          onAddToClient={async (client, description) => {
            try {
              const amount = evaluateExpression(calculatorValue);
              await onAddToClient(amount, description, label);
              
              // Reset calculator and form
              setCalculatorValue('0');
              setIsCalculatorActive(false);
              setShowClientSearch(false);
              setError('');
            } catch (err) {
              setError('Failed to add transaction');
            }
          }}
        />
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default MiniCalculator;