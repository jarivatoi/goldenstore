import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { PriceItem } from '../types';
import { usePriceList } from '../context/PriceListContext';

interface EditItemModalProps {
  item: PriceItem | null;
  onClose: () => void;
  onSave: (id: string, name: string, price: number) => Promise<void>;
}

const EditItemModal: React.FC<EditItemModalProps> = ({ item, onClose, onSave }) => {
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
      setGrossPrice(item.grossPrice.toString());
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
    
    const grossPriceValue = parseFloat(grossPrice);
    if (isNaN(grossPriceValue) || grossPriceValue <= 0) {
      setError('Please enter a valid gross price');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError('');
      
      // Save with price rounded to 2 decimal places
      await onSave(item.id, name.trim(), Math.round(priceValue * 100) / 100, Math.round(grossPriceValue * 100) / 100);
    } catch (err) {
      setError('Failed to update item. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-fade-in">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Edit Item</h2>
          <button 
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-500 hover:text-gray-700 transition-colors disabled:cursor-not-allowed"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label htmlFor="editItemName" className="block text-sm font-medium text-gray-700 mb-1">
              Item Name
            </label>
            <input
              id="editItemName"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
          
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="editItemPrice" className="block text-sm font-medium text-gray-700">
                Price (Rs)
              </label>
              <label htmlFor="editGrossPrice" className="block text-sm font-medium text-gray-700">
                Gross Price (Rs)
              </label>
            </div>
            <div className="flex gap-4">
              <input
                id="editItemPrice"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                step="0.01"
                min="0.01"
                disabled={isSubmitting}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <input
                id="editGrossPrice"
                type="number"
                value={grossPrice}
                onChange={(e) => setGrossPrice(e.target.value)}
                step="0.01"
                min="0.01"
                disabled={isSubmitting}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>
          
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200 disabled:bg-blue-300 disabled:cursor-not-allowed"
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