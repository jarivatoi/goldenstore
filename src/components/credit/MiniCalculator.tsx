import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Edit2, Check, Calculator, Plus } from 'lucide-react';
import { gsap } from 'gsap';
import { processCalculatorInput, evaluateExpression } from '../../utils/creditCalculatorUtils';

/**
 * SIMPLE DRAGGABLE IMPLEMENTATION FOR MINI CALCULATOR
 * ===================================================
 * 
 * Custom draggable implementation that allows free movement without bounds
 */
class SimpleDraggable {
  private element: HTMLElement;
  private isDragging = false;
  private startX = 0;
  private startY = 0;
  private initialX = 0;
  private initialY = 0;
  private dragHandle: HTMLElement | null = null;

  constructor(element: HTMLElement, options: { trigger?: string } = {}) {
    this.element = element;
    this.dragHandle = options.trigger ? element.querySelector(options.trigger) : element;
    this.init();
  }

  private init() {
    if (!this.dragHandle) return;

    this.dragHandle.style.cursor = 'grab';
    this.dragHandle.addEventListener('mousedown', this.handleMouseDown);
    this.dragHandle.addEventListener('touchstart', this.handleTouchStart, { passive: false });
  }

  private handleMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    this.startDrag(e.clientX, e.clientY);
    
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
    
    if (this.dragHandle) {
      this.dragHandle.style.cursor = 'grabbing';
    }
  };

  private handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    this.startDrag(touch.clientX, touch.clientY);
    
    document.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd);
    
    if (this.dragHandle) {
      this.dragHandle.style.cursor = 'grabbing';
    }
  };

  private startDrag(clientX: number, clientY: number) {
    this.isDragging = true;
    this.startX = clientX;
    this.startY = clientY;
    
    const rect = this.element.getBoundingClientRect();
    this.initialX = rect.left;
    this.initialY = rect.top;
    
    // Bring to front
    this.element.style.zIndex = '10000';
  }

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.isDragging) return;
    e.preventDefault();
    this.updatePosition(e.clientX, e.clientY);
  };

  private handleTouchMove = (e: TouchEvent) => {
    if (!this.isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    this.updatePosition(touch.clientX, touch.clientY);
  };

  private updatePosition(clientX: number, clientY: number) {
    const deltaX = clientX - this.startX;
    const deltaY = clientY - this.startY;
    
    const newX = this.initialX + deltaX;
    const newY = this.initialY + deltaY;
    
    // Allow free movement - no bounds checking
    gsap.set(this.element, { x: newX, y: newY });
  }

  private handleMouseUp = () => {
    this.endDrag();
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
  };

  private handleTouchEnd = () => {
    this.endDrag();
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);
  };

  private endDrag() {
    this.isDragging = false;
    
    if (this.dragHandle) {
      this.dragHandle.style.cursor = 'grab';
    }
    
    // Reset z-index after a delay
    setTimeout(() => {
      this.element.style.zIndex = '9999';
    }, 100);
  }

  public destroy() {
    if (this.dragHandle) {
      this.dragHandle.removeEventListener('mousedown', this.handleMouseDown);
      this.dragHandle.removeEventListener('touchstart', this.handleTouchStart);
    }
    
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);
  }
}

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
  const [isVisible, setIsVisible] = useState(false);
  
  const calculatorRef = useRef<HTMLDivElement>(null);
  const draggableRef = useRef<SimpleDraggable | null>(null);

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

    // Create simple draggable instance with free movement
    draggableRef.current = new SimpleDraggable(element, {
      trigger: ".drag-handle"
    });

    return () => {
      if (draggableRef.current) {
        draggableRef.current.destroy();
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
    if (isNaN(amount) || !isFinite(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      onAddToClient(amount, description.trim(), label);
      
      // Reset calculator and form
      setCalculatorValue('0');
      setIsCalculatorActive(false);
      setDescription('');
      setShowAddForm(false);
      setError('');
    } catch (err) {
      setError('Failed to add transaction');
    }
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
        width: '280px',
        zIndex: 9999,
        maxHeight: '90vh',
        overflow: 'hidden',
        left: 0,
        top: 0
      }}
    >
      {/* Header - Drag Handle */}
      <div className="drag-handle bg-blue-500 text-white p-3 rounded-t-lg cursor-grab active:cursor-grabbing flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <Calculator size={16} />
          {!isEditingLabel ? (
            <div className="flex items-center gap-2 flex-1">
              <span className="font-medium truncate">{label}</span>
              <button
                onClick={() => setIsEditingLabel(true)}
                className="text-blue-200 hover:text-white transition-colors"
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveLabel();
                  if (e.key === 'Escape') handleCancelEditLabel();
                }}
              />
              <button
                onClick={handleSaveLabel}
                className="text-blue-200 hover:text-white transition-colors"
              >
                <Check size={14} />
              </button>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-blue-200 hover:text-white transition-colors ml-2"
        >
          <X size={16} />
        </button>
      </div>

      {/* Calculator Display */}
      <div className="p-3 bg-gray-50">
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

      {/* Calculator Buttons */}
      <div className="p-3 bg-white">
        <div className="grid grid-cols-4 gap-1 mb-3">
          {/* Row 1 */}
          <button
            onClick={() => handleCalculatorInput('C')}
            className="bg-red-500 hover:bg-red-600 text-white p-2 rounded text-sm font-semibold"
          >
            C
          </button>
          <button
            onClick={() => handleCalculatorInput('CE')}
            className="bg-orange-500 hover:bg-orange-600 text-white p-2 rounded text-sm font-semibold"
          >
            CE
          </button>
          <button
            onClick={() => handleCalculatorInput('⌫')}
            className="bg-gray-500 hover:bg-gray-600 text-white p-2 rounded text-sm font-semibold"
          >
            ⌫
          </button>
          <button
            onClick={() => handleCalculatorInput('/')}
            className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded text-sm font-semibold"
          >
            ÷
          </button>

          {/* Row 2 */}
          <button
            onClick={() => handleCalculatorInput('7')}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-2 rounded text-sm font-semibold"
          >
            7
          </button>
          <button
            onClick={() => handleCalculatorInput('8')}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-2 rounded text-sm font-semibold"
          >
            8
          </button>
          <button
            onClick={() => handleCalculatorInput('9')}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-2 rounded text-sm font-semibold"
          >
            9
          </button>
          <button
            onClick={() => handleCalculatorInput('*')}
            className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded text-sm font-semibold"
          >
            ×
          </button>

          {/* Row 3 */}
          <button
            onClick={() => handleCalculatorInput('4')}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-2 rounded text-sm font-semibold"
          >
            4
          </button>
          <button
            onClick={() => handleCalculatorInput('5')}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-2 rounded text-sm font-semibold"
          >
            5
          </button>
          <button
            onClick={() => handleCalculatorInput('6')}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-2 rounded text-sm font-semibold"
          >
            6
          </button>
          <button
            onClick={() => handleCalculatorInput('-')}
            className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded text-sm font-semibold"
          >
            −
          </button>

          {/* Row 4 */}
          <button
            onClick={() => handleCalculatorInput('1')}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-2 rounded text-sm font-semibold"
          >
            1
          </button>
          <button
            onClick={() => handleCalculatorInput('2')}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-2 rounded text-sm font-semibold"
          >
            2
          </button>
          <button
            onClick={() => handleCalculatorInput('3')}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-2 rounded text-sm font-semibold"
          >
            3
          </button>
          <button
            onClick={() => handleCalculatorInput('+')}
            className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded text-sm font-semibold"
          >
            +
          </button>

          {/* Row 5 */}
          <button
            onClick={() => handleCalculatorInput('0')}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-2 rounded text-sm font-semibold col-span-2"
          >
            0
          </button>
          <button
            onClick={() => handleCalculatorInput('.')}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-2 rounded text-sm font-semibold"
          >
            .
          </button>
          <button
            onClick={() => handleCalculatorInput('=')}
            className="bg-green-500 hover:bg-green-600 text-white p-2 rounded text-sm font-semibold"
          >
            =
          </button>

          {/* Row 6 - Memory Functions */}
          <button
            onClick={() => handleCalculatorInput('M+')}
            className="bg-purple-500 hover:bg-purple-600 text-white p-2 rounded text-xs font-semibold"
          >
            M+
          </button>
          <button
            onClick={() => handleCalculatorInput('MR')}
            className="bg-purple-500 hover:bg-purple-600 text-white p-2 rounded text-xs font-semibold"
          >
            MR
          </button>
          <button
            onClick={() => handleCalculatorInput('MC')}
            className="bg-purple-500 hover:bg-purple-600 text-white p-2 rounded text-xs font-semibold"
          >
            MC
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            disabled={calculatorValue === '0' || calculatorValue === 'Error'}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-2 rounded text-xs font-semibold"
          >
            Add
          </button>
        </div>

        {/* Add Transaction Form */}
        {showAddForm && (
          <div className="border-t border-gray-200 pt-3 mt-3">
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => {
                  const formatted = e.target.value
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(' ');
                  setDescription(formatted);
                }}
                placeholder="Enter item description..."
                className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Quick Action Buttons */}
            <div className="mb-3">
              <div className="grid grid-cols-3 gap-1 mb-2">
                {['Cig', 'Rum', 'Can', 'Soft', 'Cake', 'Juice'].map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => handleQuickAction(action)}
                    className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 rounded transition-colors"
                  >
                    {action}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => handleQuickAction('Chopine')}
                  className="px-2 py-1 text-xs bg-orange-100 hover:bg-orange-200 text-orange-800 rounded transition-colors"
                >
                  Chopine
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAction('Bouteille')}
                  className="px-2 py-1 text-xs bg-orange-100 hover:bg-orange-200 text-orange-800 rounded transition-colors"
                >
                  Bouteille
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setDescription('');
                  setError('');
                }}
                className="flex-1 px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTransaction}
                disabled={!description.trim() || calculatorValue === '0' || calculatorValue === 'Error'}
                className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded text-sm transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default MiniCalculator;