import React, { useState } from 'react';
import { Plus, Search, Check, X, ShoppingCart, Package, Trash2 } from 'lucide-react';
import { useOver } from '../context/OverContext';
import { OverItem } from '../types';

/**
 * OVER MANAGEMENT COMPONENT
 * =========================
 * 
 * Manages items that are over/out of stock and need to be bought
 */
const OverManagement: React.FC = () => {
  const { 
    addItem, 
    toggleItem, 
    deleteItem, 
    searchQuery, 
    setSearchQuery, 
    searchItems,
    isLoading,
    error 
  } = useOver();

  // Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get filtered and sorted items
  const filteredItems = searchItems(searchQuery);
  const pendingItems = filteredItems.filter(item => !item.isCompleted);
  const completedItems = filteredItems.filter(item => item.isCompleted);

  // Handle add item
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newItemName.trim()) {
      alert('Please enter an item name');
      return;
    }

    try {
      setIsSubmitting(true);
      await addItem(newItemName.trim());
      setNewItemName('');
      setShowAddForm(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add item');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle toggle completion
  const handleToggleItem = async (id: string) => {
    try {
      await toggleItem(id);
    } catch (err) {
      alert('Failed to update item');
    }
  };

  // Handle delete item
  const handleDeleteItem = async (id: string, itemName: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${itemName}"?`);
    if (confirmed) {
      try {
        await deleteItem(id);
      } catch (err) {
        alert('Failed to delete item');
      }
    }
  };

  // Handle clear all pending items
  const handleClearAllPending = async () => {
    if (pendingItems.length === 0) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to clear all ${pendingItems.length} items from "Need to Buy"? This action cannot be undone.`
    );
    
    if (confirmed) {
      try {
        for (const item of pendingItems) {
          await deleteItem(item.id);
        }
      } catch (err) {
        alert('Failed to clear items');
      }
    }
  };

  // Handle clear all completed items
  const handleClearAllCompleted = async () => {
    if (completedItems.length === 0) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to clear all ${completedItems.length} bought items? This action cannot be undone.`
    );
    
    if (confirmed) {
      try {
        for (const item of completedItems) {
          await deleteItem(item.id);
        }
      } catch (err) {
        alert('Failed to clear items');
      }
    }
  };
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Package size={48} className="text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Loading items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden select-none">
      
      {/* Add Item Section */}
      <div className="bg-white border-b border-gray-200 shadow-sm p-4">
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full max-w-md mx-auto bg-orange-500 hover:bg-orange-600 text-white py-3 px-6 rounded-lg flex items-center justify-center transition-colors duration-200 shadow-sm text-lg"
          >
            <Plus size={22} className="mr-3" />
            <span>Add Item to Buy</span>
          </button>
        ) : (
          <form onSubmit={handleAddItem} className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 w-full max-w-2xl mx-auto">
            <div className="mb-4">
              <label htmlFor="itemName" className="block text-base font-medium text-gray-700 mb-2">
                Item Name
              </label>
              <input
                id="itemName"
                type="text"
                value={newItemName}
                onChange={(e) => {
                  const formatted = e.target.value
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(' ');
                  setNewItemName(formatted);
                }}
                disabled={isSubmitting}
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed select-text"
                placeholder="Enter item name"
                autoFocus
              />
            </div>
            
            {error && <p className="text-red-500 text-base mb-4">{error}</p>}
            
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 px-6 text-lg rounded-md transition-colors duration-200 disabled:bg-orange-300 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Adding...' : 'Add Item'}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewItemName('');
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

      {/* Search Bar */}
      <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
        <div className="relative w-full max-w-md mx-auto">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={20} className="text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items..."
            className="block w-full pl-10 pr-4 py-4 text-xl border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-3 focus:ring-orange-500 focus:border-orange-500 shadow-sm select-text"
          />
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-4">
        
        {/* Empty State */}
        {filteredItems.length === 0 && !searchQuery && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-orange-50 p-6 rounded-full mb-6">
              <ShoppingCart size={48} className="text-orange-500" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">No items to buy</h2>
            <p className="text-gray-600 mb-8 max-w-md text-lg">
              Add items that are over or out of stock using the button above
            </p>
          </div>
        )}

        {/* No Search Results */}
        {filteredItems.length === 0 && searchQuery && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No items found matching "{searchQuery}"</p>
          </div>
        )}

        {/* Pending Items */}
        {pendingItems.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <ShoppingCart size={20} className="mr-2 text-orange-500" />
                Need to Buy ({pendingItems.length})
              </h3>
              <button
                onClick={handleClearAllPending}
                className="flex items-center gap-1 px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                title={`Clear all ${pendingItems.length} items`}
              >
                <Trash2 size={14} />
                <span>Clear All</span>
              </button>
            </div>
            <div className="space-y-2">
              {pendingItems.map((item) => (
                <OverItemCard
                  key={item.id}
                  item={item}
                  onToggle={handleToggleItem}
                  onDelete={handleDeleteItem}
                />
              ))}
            </div>
          </div>
        )}

        {/* Completed Items */}
        {completedItems.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <Check size={20} className="mr-2 text-green-500" />
                Bought ({completedItems.length})
              </h3>
              <button
                onClick={handleClearAllCompleted}
                className="flex items-center gap-1 px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                title={`Clear all ${completedItems.length} items`}
              >
                <Trash2 size={14} />
                <span>Clear All</span>
              </button>
            </div>
            <div className="space-y-2">
              {completedItems.map((item) => (
                <OverItemCard
                  key={item.id}
                  item={item}
                  onToggle={handleToggleItem}
                  onDelete={handleDeleteItem}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * OVER ITEM CARD COMPONENT
 * ========================
 */
interface OverItemCardProps {
  item: OverItem;
  onToggle: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}

const OverItemCard: React.FC<OverItemCardProps> = ({ item, onToggle, onDelete }) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 transition-all duration-200 ${
      item.isCompleted ? 'bg-green-50 border-green-200' : 'border-gray-200 hover:shadow-md'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center flex-1">
          <button
            onClick={() => onToggle(item.id)}
            className={`mr-3 p-1 rounded-full transition-colors ${
              item.isCompleted 
                ? 'bg-green-500 text-white' 
                : 'border-2 border-gray-300 hover:border-orange-500'
            }`}
          >
            {item.isCompleted && <Check size={16} />}
            {!item.isCompleted && <div className="w-4 h-4" />}
          </button>
          
          <div className="flex-1">
            <h4 className={`font-medium ${
              item.isCompleted ? 'text-gray-500 line-through' : 'text-gray-800'
            }`}>
              {item.name}
            </h4>
            <p className="text-sm text-gray-500">
              {item.isCompleted && item.completedAt
                ? `Bought on ${item.completedAt.toLocaleDateString('en-GB')} ${item.completedAt.toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  })}`
                : `Added on ${item.createdAt.toLocaleDateString('en-GB')} ${item.createdAt.toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  })}`
              }
            </p>
          </div>
        </div>
        
        <button
          onClick={() => onDelete(item.id, item.name)}
          className="ml-3 p-2 text-gray-400 hover:text-red-500 transition-colors"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default OverManagement;