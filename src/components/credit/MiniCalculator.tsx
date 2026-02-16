import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Edit2, Check, Calculator, Plus, Minus, Maximize2 } from 'lucide-react';
import { gsap } from 'gsap';
// @ts-ignore
import { DraggableCalculator } from '../../lib/draggableCalculator.js';
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
  // Helper function to format calculator value with styled operators
  const formatCalculatorValue = (value: string) => {
    // Check if we're in a calculation state (contains operators)
    const hasOperator = /[+\-×÷*/]/.test(value);
    
    // If we're in a calculation state, only show the final result (last number after last operator)
    if (hasOperator) {
      // Find the position of the last operator
      let lastOpIndex = -1;
      for (let i = value.length - 1; i >= 0; i--) {
        if (['+', '-', '×', '÷', '*', '/'].includes(value[i])) {
          lastOpIndex = i;
          break;
        }
      }
      
      // If we found an operator, only show what comes after it (the current number being entered)
      if (lastOpIndex !== -1) {
        const currentNumber = value.substring(lastOpIndex + 1);
        // If there's no number after the operator, show the previous number
        if (currentNumber === '') {
          // Extract the number before the operator
          const previousNumber = value.substring(0, lastOpIndex);
          // Handle cases where previousNumber might still contain operators (e.g., "2+3+")
          const lastPrevOpIndex = Math.max(
            previousNumber.lastIndexOf('+'),
            previousNumber.lastIndexOf('-'),
            previousNumber.lastIndexOf('*'),
            previousNumber.lastIndexOf('/'),
            previousNumber.lastIndexOf('×'),
            previousNumber.lastIndexOf('÷')
          );
          
          if (lastPrevOpIndex !== -1) {
            return previousNumber.substring(lastPrevOpIndex + 1);
          }
          return previousNumber;
        }
        return currentNumber;
      }
    }
    
    // For all other cases (no operators or error states), show the full value
    return value;
  };

  const [calculatorValue, setCalculatorValue] = useState('0');
  const [memory, setMemory] = useState(0);
  const [lastOperation, setLastOperation] = useState<string | null>(null);
  const [lastOperand, setLastOperand] = useState<number | null>(null);
  const [originalOperand, setOriginalOperand] = useState<number | null>(null); // Store the original operand for continuous operations
  const [isNewNumber, setIsNewNumber] = useState(true);
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

  // Simple calculator logic for mini calculator - standard calculator behavior
  const handleCalculatorInput = (input: string) => {
    if (input >= '0' && input <= '9') {
      if (isNewNumber || calculatorValue === '0') {
        setCalculatorValue(input);
        setIsNewNumber(false);
      } else {
        setCalculatorValue(calculatorValue + input);
      }
    } else if (input === '.') {
      if (isNewNumber) {
        setCalculatorValue('0.');
        setIsNewNumber(false);
      } else if (!calculatorValue.includes('.')) {
        setCalculatorValue(calculatorValue + '.');
      }
    } else if (input === 'C' || input === 'AC') {
      setCalculatorValue('0');
      setMemory(0);
      setLastOperation(null);
      setLastOperand(null);
      setOriginalOperand(null);
      setIsNewNumber(true);
    } else if (input === 'CE') {
      setCalculatorValue('0');
      setIsNewNumber(true);
    } else if (input === '⌫') {
      if (calculatorValue.length > 1) {
        setCalculatorValue(calculatorValue.slice(0, -1));
      } else {
        setCalculatorValue('0');
        setIsNewNumber(true);
      }
    } else if (['+', '-', '*', '/'].includes(input)) {
      // Handle operator input with standard calculator logic
      if (lastOperation && lastOperand !== null && !isNewNumber) {
        // Complete the previous operation first
        const currentNumber = parseFloat(calculatorValue);
        if (!isNaN(currentNumber)) {
          const result = performOperation(lastOperand, currentNumber, lastOperation);
          setCalculatorValue(result.toString());
          setLastOperand(result);
        }
      } else if (lastOperation && lastOperand !== null && isNewNumber) {
        // User pressed operator after operator or after equals, just change the operation
        // Keep the last operand, just update the operation
        // Check if calculatorValue ends with an operator
        if (/[+\-*/]$/.test(calculatorValue)) {
          // If it ends with an operator, replace it with the new one
          setCalculatorValue(calculatorValue.slice(0, -1) + input);
        } else {
          // If it doesn't end with an operator, append the new operator
          setCalculatorValue(calculatorValue + input);
        }
      } else {
        // First operation, store the current number
        const currentNumber = parseFloat(calculatorValue);
        if (!isNaN(currentNumber)) {
          setLastOperand(currentNumber);
          setOriginalOperand(currentNumber);
        }
      }
      
      // If we haven't already updated the display, do it now
      if (!(lastOperation && lastOperand !== null && isNewNumber)) {
        setCalculatorValue(calculatorValue + input);
      }
      setLastOperation(input);
      setIsNewNumber(true);
    } else if (input === '=') {
      if (lastOperation && lastOperand !== null) {
        // Extract the second operand correctly
        // Find the position of the last operator
        let lastOpIndex = -1;
        for (let i = calculatorValue.length - 1; i >= 0; i--) {
          if (['+', '-', '*', '/'].includes(calculatorValue[i])) {
            lastOpIndex = i;
            break;
          }
        }
        
        if (lastOpIndex !== -1) {
          // Normal case: we have an operator in the expression
          const secondOperandStr = calculatorValue.substring(lastOpIndex + 1);
          const secondOperand = parseFloat(secondOperandStr);
          
          if (!isNaN(secondOperand)) {
            const result = performOperation(lastOperand, secondOperand, lastOperation);
            setCalculatorValue(result.toString());
            setLastOperand(result);
            setIsNewNumber(true);
          }
        } else {
          // Special case: no operator found, which means we're completing a previous operation
          // This happens when calculatorValue is just a number like "2" after pressing "="
          // We need to repeat the last operation with the last operand and current number
          const currentNumber = parseFloat(calculatorValue);
          if (!isNaN(currentNumber)) {
            const result = performOperation(lastOperand, currentNumber, lastOperation);
            setCalculatorValue(result.toString());
            setLastOperand(result);
            setIsNewNumber(true);
          }
        }
      }
    } else if (input === 'M+') {
      const currentValue = parseFloat(calculatorValue);
      if (!isNaN(currentValue)) {
        setMemory(memory + currentValue);
      }
    } else if (input === 'MR') {
      setCalculatorValue(memory.toString());
      setIsNewNumber(true);
    } else if (input === 'MC') {
      setMemory(0);
    }
  };

  const performOperation = (operand1: number, operand2: number, operation: string): number => {
    switch (operation) {
      case '+':
        return operand1 + operand2;
      case '-':
        return operand1 - operand2;
      case '*':
        return operand1 * operand2;
      case '/':
        return operand2 !== 0 ? operand1 / operand2 : 0;
      default:
        return operand2;
    }
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

    const amount = parseFloat(calculatorValue);
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
  // Move this check to the rendering logic rather than returning null
  // This ensures hooks are always called in the same order
  const modalContent = isVisible ? (
    <div
      ref={calculatorRef}
      className="fixed bg-white rounded-lg shadow-2xl border border-gray-300 select-none"
      style={{
        width: isMinimized && !isEditingLabel ? '200px' : '280px',
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
        {/* Only show the minimize/maximize and close buttons when not editing in minimized mode */}
        {!(isMinimized && isEditingLabel) && (
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
        )}
        {/* Only show the close button when not minimized or when editing in minimized mode */}
        {(!isMinimized || isEditingLabel) && (
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
          {memory !== 0 && (
            <div className="absolute top-1 left-2 text-xs text-blue-600 font-semibold">
              M
            </div>
          )}
          <div className="text-lg font-mono text-gray-800 min-h-[1.5rem] flex items-center justify-end overflow-hidden">
            <div className="truncate max-w-full" title={calculatorValue}>
              {formatCalculatorValue(calculatorValue)}
            </div>
          </div>
        </div>
      </div>

      {/* Minimized Amount Display */}
      {isMinimized && (
        <div className="px-3 py-2 bg-blue-50 border-t border-blue-200">
          <div className="text-center">
            <div className="text-lg font-mono font-bold text-blue-800">
              {formatCalculatorValue(calculatorValue)}
            </div>
            {memory !== 0 && (
              <div className="text-xs text-blue-600 font-semibold">
                Memory: {memory}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Calculator Buttons */}
      <div
        className="bg-white overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: isMinimized ? '0px' : '600px',
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
              const amount = parseFloat(calculatorValue);
              await onAddToClient(amount, description, label);
              
              // Dispatch creditDataChanged event with client ID for scrolling tabs update
              const event = new CustomEvent('creditDataChanged', {
                detail: {
                  clientId: client.id,
                  source: 'transaction'
                  }
              });
              window.dispatchEvent(event);
              console.log('📤 Dispatched creditDataChanged event for client:', client.id);
              
              // Reset calculator and form
              setCalculatorValue('0');
              setMemory(0);
              setLastOperation(null);
              setLastOperand(null);
              setIsNewNumber(true);
              setShowClientSearch(false);
              setError('');
            } catch (err) {
              setError('Failed to add transaction');
            }
          }}
        />
      )}
    </div>
  ) : null; // Return null when not visible

  return createPortal(modalContent, document.body);
};

export default MiniCalculator;