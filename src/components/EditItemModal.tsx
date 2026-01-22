import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { PriceItem } from '../types';
import { usePriceList } from '../context/PriceListContext';

interface EditItemModalProps {
  item: PriceItem | null;
  onClose: () => void;
  onSave: (id: string, name: string, price: number, grossPrice?: number) => Promise<void>;
  requireGrossPrice?: boolean;
}

const EditItemModal: React.FC<EditItemModalProps> = ({ 
  item, 
  onClose, 
  onSave, 
  requireGrossPrice = false 
}) => {
  const { items } = usePriceList();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [grossPrice, setGrossPrice] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setPrice(item.price.toString());
      // Handle NaN grossPrice values - convert to 0.00
      const validGrossPrice = isNaN(item.grossPrice) ? 0 : item.grossPrice;
      setGrossPrice(validGrossPrice > 0 ? validGrossPrice.toString() : '');
    }
  }, [item]);

  if (!item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Please enter an item name');
      return;
    }
    
    // Check for duplicate item names (case-insensitive), excluding current item
    const duplicateItem = items.find(existingItem => 
      existingItem.id !== item.id && 
      existingItem.name.toLowerCase() === name.trim().toLowerCase()
    );
    
    if (duplicateItem) {
      setError(`Item "${name.trim()}" already exists in the price list`);
      return;
    }
    
    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue <= 0) {
      setError('Please enter a valid price');
      return;
    }
    
    // Only validate gross price if requireGrossPrice is true
    if (requireGrossPrice) {
      const grossPriceValue = parseFloat(grossPrice);
      if (isNaN(grossPriceValue) || grossPriceValue <= 0) {
        setError('Please enter a valid gross price');
        return;
      }
    }
    
    try {
      setIsSubmitting(true);
      setError('');
      
      // Save with price rounded to 2 decimal places
      const grossPriceValue = grossPrice ? parseFloat(grossPrice) : undefined;
      const roundedGrossPrice = grossPriceValue !== undefined && !isNaN(grossPriceValue) ? Math.round(grossPriceValue * 100) / 100 : undefined;
      await onSave(
        item.id, 
        name.trim(), 
        Math.round(priceValue * 100) / 100, 
        roundedGrossPrice
      );
    } catch (err) {
      setError('Failed to update item. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePriceChange = (value: string) => {
    // Allow only numbers and decimal point
    if (/^\d*\.?\d*$/.test(value)) {
      setPrice(value);
    }
  };

  const handleGrossPriceChange = (value: string) => {
    // Allow only numbers and decimal point
    if (/^\d*\.?\d*$/.test(value)) {
      setGrossPrice(value);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-fade-in select-none">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 select-none">
          <h2 className="text-lg font-semibold text-gray-900 select-none">Edit Item</h2>
          <button 
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-500 hover:text-gray-700 transition-colors disabled:cursor-not-allowed select-none"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 select-none">
          <div className="mb-4">
            <label htmlFor="editItemName" className="block text-sm font-medium text-gray-700 mb-1 select-none">
              Item Name
            </label>
            <input
              id="editItemName"
              type="text"
              value={name}
              onChange={(e) => {
                // Smart capitalization that handles parentheses
                const formatted = e.target.value.replace(/(^|\s)\w/g, (word) => {
                  // Don't capitalize words that are entirely within parentheses content
                  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                });
                setName(formatted);
              }}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="editItemPrice" className="block text-sm font-medium text-gray-700 mb-2 select-none">
              Price (Rs) *
            </label>
            <input
              id="editItemPrice"
              type="text"
              value={price}
              onChange={(e) => handlePriceChange(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="0.00"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="editGrossPrice" className="block text-sm font-medium text-gray-700 mb-2 select-none">
              Gross Price (Rs) {requireGrossPrice ? '*' : ''}
            </label>
            <input
              id="editGrossPrice"
              type="text"
              value={grossPrice}
              onChange={(e) => handleGrossPriceChange(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="0.00"
            />
            {!requireGrossPrice && (
              <p className="text-gray-500 text-xs mt-1 select-none">Optional</p>
            )}
          </div>
          
          {error && <p className="text-red-500 text-sm mb-4 select-none">{error}</p>}
          
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed select-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 disabled:bg-blue-300 disabled:cursor-not-allowed select-none"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditItemModal;