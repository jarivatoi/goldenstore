/*
 * COMPONENTS/ADDITEMFORM.TSX - ITEM CREATION FORM COMPONENT
 * =========================================================
 * 
 * OVERVIEW:
 * Collapsible form component for adding new price list items.
 * Provides intuitive user interface with validation and error handling.
 * 
 * KEY FEATURES:
 * - Collapsible design to save screen space
 * - Real-time input validation
 * - Error handling with user feedback
 * - Optimistic UI updates
 * - Accessibility considerations
 * - Mobile-optimized input controls
 * 
 * USER EXPERIENCE:
 * - Single-click to reveal form
 * - Clear validation messages
 * - Disabled states during submission
 * - Automatic form reset on success
 * - Cancel functionality to hide form
 * 
 * TECHNICAL IMPLEMENTATION:
 * - React hooks for state management
 * - Controlled form inputs
 * - Async form submission
 * - Input sanitization and formatting
 * - Error boundary considerations
 */
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { usePriceList } from '../context/PriceListContext';

/**
 * ADD ITEM FORM COMPONENT
 * =======================
 * 
 * PURPOSE:
 * Renders a collapsible form for creating new price list items.
 * Handles user input, validation, and submission to the global state.
 * 
 * STATE MANAGEMENT:
 * - name: Item name input value
 * - price: Item price input value
 * - error: Validation/submission error messages
 * - isFormVisible: Controls form visibility (collapsed/expanded)
 * - isSubmitting: Prevents double submission and shows loading state
 * 
 * VALIDATION RULES:
 * - Name: Required, non-empty after trimming
 * - Price: Required, positive number, automatically rounded to 2 decimals
 * 
 * FORM BEHAVIOR:
 * - Starts collapsed with "Add New Item" button
 * - Expands to show input fields when activated
 * - Validates on submission, not on input change
 * - Resets and collapses on successful submission
 * - Maintains state on validation errors for user correction
 */
const AddItemForm: React.FC = () => {
  // Access global state management
  const { addItem, items } = usePriceList();
  
  // Form input state
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [grossPrice, setGrossPrice] = useState('');
  
  // UI state management
  const [error, setError] = useState('');
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * FORM SUBMISSION HANDLER
   * =======================
   * 
   * PURPOSE:
   * Processes form submission with validation and error handling.
   * Integrates with global state management for data persistence.
   * 
   * VALIDATION PROCESS:
   * 1. Prevent default form submission
   * 2. Validate item name (required, non-empty)
   * 3. Validate price (positive number)
   * 4. Format and sanitize input data
   * 5. Submit to global state management
   * 6. Handle success/error scenarios
   * 
   * ERROR HANDLING:
   * - Client-side validation with immediate feedback
   * - Server/database error handling with user messages
   * - Form state preservation on errors
   * - Loading state management
   * 
   * SUCCESS BEHAVIOR:
   * - Clear form inputs
   * - Hide form (collapse)
   * - Clear any previous errors
   * - Provide visual feedback through state changes
   * 
   * @param e - Form submission event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🚀 Form submission started (Mobile):', { name, price, grossPrice });
    
    // Mobile Safari form validation
    if (!name || name.trim().length === 0) {
      setError('Please enter an item name');
      return;
    }
    
    if (!price || price.trim().length === 0) {
      setError('Please enter a price');
      return;
    }
    
    if (!grossPrice || grossPrice.trim().length === 0) {
      setError('Please enter a gross price');
      return;
    }
    
    // Validate item name
    if (!name.trim()) {
      setError('Please enter an item name');
      return;
    }
    
    // Check for duplicate item names (case-insensitive)
    const duplicateItem = items.find(item => 
      item.name.toLowerCase() === name.trim().toLowerCase()
    );
    
    if (duplicateItem) {
      setError(`Item "${name.trim()}" already exists in the price list`);
      return;
    }
    
    // Validate and parse price
    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue <= 0) {
      setError('Please enter a valid price');
      return;
    }
    
    const grossPriceValue = parseFloat(grossPrice);
    if (isNaN(grossPriceValue) || grossPriceValue <= 0) {
      setError('Please enter a valid gross price');
      return;
    }
    
    try {
      // Set loading state to prevent double submission
      setIsSubmitting(true);
      setError('');
      
      console.log('📝 Calling addItem with (Mobile):', { 
        name: name.trim(), 
        price: Math.round(priceValue * 100) / 100, 
        grossPrice: Math.round(grossPriceValue * 100) / 100 
      });
      
      // Mobile Safari: Add timeout wrapper
      const addItemPromise = addItem(name.trim(), Math.round(priceValue * 100) / 100, Math.round(grossPriceValue * 100) / 100);
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Operation timed out. Please try again.')), 20000);
      });
      
      await Promise.race([addItemPromise, timeoutPromise]);
      
      console.log('✅ Item added successfully (Mobile), resetting form');
      // Reset form on successful submission
      setName('');
      setPrice('');
      setGrossPrice('');
      setIsFormVisible(false);
    } catch (err) {
      // Handle submission errors
      console.error('❌ Form submission error (Mobile):', err);
      
      // Mobile-specific error messages
      if (err instanceof Error) {
        if (err.message.includes('timeout') || err.message.includes('network')) {
          setError('Connection timeout. Please check your internet and try again.');
        } else if (err.message.includes('duplicate')) {
          setError('This item already exists in your price list.');
        } else {
          setError(err.message || 'Failed to add item. Please try again.');
        }
      } else {
        setError('Failed to add item. Please try again.');
      }
    } finally {
      // Always clear loading state
      setIsSubmitting(false);
    }
  };

  /**
   * COMPONENT RENDER
   * ================
   * 
   * STRUCTURE:
   * - Sticky container below header
   * - Conditional rendering: button OR form
   * - Form with two input fields and action buttons
   * - Error message display area
   * 
   * STYLING APPROACH:
   * - Clean white background with subtle borders
   * - Consistent spacing and typography
   * - Disabled states for loading feedback
   * - Responsive design for mobile devices
   * 
   * ACCESSIBILITY:
   * - Proper form labels and input associations
   * - Semantic HTML structure
   * - Keyboard navigation support
   * - Screen reader friendly error messages
   */
  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      {/* Sticky Container: Positioned below header */}
      <div className="w-full px-6 py-4">
        {!isFormVisible ? (
          <button
            onClick={() => setIsFormVisible(true)}
            className="w-full max-w-md mx-auto bg-blue-500 hover:bg-blue-600 text-white py-4 px-6 rounded-lg flex items-center justify-center transition-colors duration-200 shadow-sm text-lg"
          >
            {/* Collapsed State: Show add button */}
            <Plus size={22} className="mr-3" />
            <span>Add New Item</span>
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 w-full max-w-2xl mx-auto">
            {/* Expanded State: Show form */}
            {/* Item Name Input */}
            <div className="mb-4">
              <label htmlFor="itemName" className="block text-base font-medium text-gray-700 mb-2">
                Item Name
              </label>
              <input
                id="itemName"
                type="text"
                value={name}
               onChange={(e) => {
                 // Auto-capitalize as user types
                 const formatted = e.target.value
                   .split(' ')
                   .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                   .join(' ');
                 setName(formatted);
               }}
                disabled={isSubmitting}
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter item name"
              />
            </div>
            
            {/* Item Price Input */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="itemPrice" className="block text-base font-medium text-gray-700">
                  Price (Rs)
                </label>
                <label htmlFor="grossPrice" className="block text-base font-medium text-gray-700">
                  Gross Price (Rs)
                </label>
              </div>
              <div className="flex gap-4">
                <input
                  id="itemPrice"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  step="0.01"
                  min="0.01"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 text-lg border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="0.00"
                />
                <input
                  id="grossPrice"
                  type="number"
                  value={grossPrice}
                  onChange={(e) => setGrossPrice(e.target.value)}
                  step="0.01"
                  min="0.01"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 text-lg border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="0.00"
                />
              </div>
            </div>
            
            {/* Error Message Display */}
            {error && <p className="text-red-500 text-base mb-4">{error}</p>}
            
            {/* Action Buttons */}
            <div className="flex gap-4">
              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 text-lg rounded-md transition-colors duration-200 disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Adding...' : 'Add Item'}
              </button>
              
              {/* Cancel Button */}
              <button
                type="button"
                onClick={() => {
                  // Reset form and hide
                  setIsFormVisible(false);
                  setName('');
                  setPrice('');
                  setGrossPrice('');
                  setError('');
                }}
                disabled={isSubmitting}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-6 text-lg rounded-md transition-colors duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddItemForm;