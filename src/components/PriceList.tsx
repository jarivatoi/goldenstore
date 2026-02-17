import React, { useState } from 'react';
import { usePriceList } from '../context/PriceListContext';
import SwipeableItem from './SwipeableItem';
import EditItemModal from './EditItemModal';
import ConfirmationModal from './ConfirmationModal';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import { PriceItem } from '../types';

const PriceList: React.FC = () => {
  const { items, updateItem, deleteItem, searchItems, searchQuery, isLoading, error } = usePriceList();
  const [editingItem, setEditingItem] = useState<PriceItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<PriceItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const filteredItems = searchItems(searchQuery);
  
  const handleEdit = (item: PriceItem) => {
    setEditingItem(item);
  };
  
  const handleSave = async (id: string, name: string, price: number, grossPrice: number) => {
    try {
      await updateItem(id, name, price, grossPrice);
      setEditingItem(null);
    } catch (err) {
      // Error is handled in context
    }
  };
  
  const handleDeleteRequest = (id: string) => {
    const item = items.find(item => item.id === id);
    if (item) {
      setDeletingItem(item);
    }
  };

  const handleConfirmDelete = async () => {
    if (deletingItem) {
      try {
        setIsDeleting(true);
        await deleteItem(deletingItem.id);
        setDeletingItem(null);
      } catch (err) {
        // Error is handled in context
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleCancelDelete = () => {
    setDeletingItem(null);
  };

  const handleRetry = () => {
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div 
        className="overflow-y-auto"
        style={{ 
          height: 'calc(100vh - 60px - 84px - 64px)',
          minHeight: '200px'
        }}
      >
        <LoadingSpinner message="Loading your price list..." />
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className="overflow-y-auto"
        style={{ 
          height: 'calc(100vh - 60px - 84px - 64px)',
          minHeight: '200px'
        }}
      >
        <ErrorMessage message={error} onRetry={handleRetry} />
      </div>
    );
  }

  return (
    <div 
      className="overflow-y-auto"
      style={{ 
        height: 'calc(100vh - 64px - 84px - 64px)',
        minHeight: '200px'
      }}
    >
      <div className="w-full px-6 pb-6">
        <div style={{ height: '25px' }} />
        
        {filteredItems.length === 0 && (
          searchQuery ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No items found matching "{searchQuery}"</p>
            </div>
          ) : (
            <EmptyState />
          )
        )}
        
        {filteredItems.map((item) => (
          <div key={item.id} className="mb-3">
            <SwipeableItem
              item={item}
              onEdit={handleEdit}
              onDelete={handleDeleteRequest}
            />
          </div>
        ))}
      </div>
        
      {/* Edit Modal */}
      {editingItem && (
        <EditItemModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={handleSave}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deletingItem}
        title="Delete Item"
        message={`Are you sure you want to delete "${deletingItem?.name}"? This action cannot be undone.`}
        confirmText={isDeleting ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        type="danger"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
};

export default PriceList;