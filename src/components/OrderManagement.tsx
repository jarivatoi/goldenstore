import React, { useState } from 'react';
import { Plus, Calendar, Package, Trash2, Edit2, X, ShoppingCart, FileText, Eye, EyeOff, Minus, Search } from 'lucide-react';
import { useOrder } from '../context/OrderContext';
import { OrderCategory, OrderItemTemplate, Order, OrderItem } from '../types';
import ConfirmationModal from './ConfirmationModal';

/**
 * ORDER MANAGEMENT COMPONENT
 * ==========================
 */
const OrderManagement: React.FC = () => {
  const { 
    categories, 
    addCategory, 
    updateCategory, 
    deleteCategory,
    itemTemplates,
    getItemTemplatesByCategory,
    addItemTemplate,
    updateItemTemplate,
    deleteItemTemplate,
    orders,
    getOrdersByCategory,
    addOrder,
    updateOrder,
    deleteOrder,
    searchCategories,
    isLoading,
    error 
  } = useOrder();

  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<OrderCategory | null>(null);
  const [activeSection, setActiveSection] = useState<'manage' | 'order'>('manage');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryVat, setNewCategoryVat] = useState('15');
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemVatNil, setNewItemVatNil] = useState(false);
  const [newItemVatPercentage, setNewItemVatPercentage] = useState('15');
  const [editingCategory, setEditingCategory] = useState<OrderCategory | null>(null);
  const [editingItem, setEditingItem] = useState<OrderItemTemplate | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<OrderCategory | null>(null);
  const [showDeleteOrderModal, setShowDeleteOrderModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [showDuplicateOrderModal, setShowDuplicateOrderModal] = useState(false);
  const [duplicateOrderInfo, setDuplicateOrderInfo] = useState<{categoryName: string, orderDate: string} | null>(null);
  const [showDeleteItemModal, setShowDeleteItemModal] = useState(false);
  // Listen for duplicate order events from modals
  React.useEffect(() => {
    const handleDuplicateOrderEvent = (event: CustomEvent) => {
      setDuplicateOrderInfo(event.detail);
      setShowDuplicateOrderModal(true);
    };

    window.addEventListener('showDuplicateOrderModal', handleDuplicateOrderEvent as EventListener);
    
    return () => {
      window.removeEventListener('showDuplicateOrderModal', handleDuplicateOrderEvent as EventListener);
    };
  }, []);

  const [itemToDelete, setItemToDelete] = useState<OrderItemTemplate | null>(null);

  // Get filtered categories
  const filteredCategories = searchCategories(searchQuery);

  // Handle add category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCategoryName.trim() || !newCategoryVat.trim()) {
      alert('Please enter a category name and VAT percentage');
      return;
    }

    const vatPercentage = parseFloat(newCategoryVat);
    if (isNaN(vatPercentage) || vatPercentage < 0 || vatPercentage > 100) {
      alert('Please enter a valid VAT percentage (0-100)');
      return;
    }

    try {
      setIsSubmitting(true);
      await addCategory(newCategoryName.trim(), vatPercentage);
      setNewCategoryName('');
      setNewCategoryVat('15');
      setShowAddCategory(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add category');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle add item template
  const handleAddItem = async (e: React.FormEvent, isVatNil: boolean = false, vatPercentage: number = 15) => {
    e.preventDefault();
    
    if (!selectedCategory || !newItemName.trim() || !newItemPrice.trim()) {
      alert('Please fill in all fields');
      return;
    }

    const price = parseFloat(newItemPrice);
    if (isNaN(price) || price < 0) {
      alert('Please enter a valid price');
      return;
    }

    const vatPercent = parseFloat(newItemVatPercentage);
    if (isNaN(vatPercent) || vatPercent < 0 || vatPercent > 100) {
      alert('Please enter a valid VAT percentage (0-100)');
      return;
    }
    try {
      setIsSubmitting(true);
      await addItemTemplate(selectedCategory.id, newItemName.trim(), price, vatPercent === 0, vatPercent);
      setNewItemName('');
      setNewItemPrice('');
      setNewItemVatPercentage('15');
      setShowAddItem(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add item');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit category
  const handleEditCategory = async (category: OrderCategory, newName: string, newVatPercentage: number) => {
    try {
      await updateCategory(category.id, newName, 15); // Fixed 15% VAT
      setEditingCategory(null);
    } catch (err) {
      alert('Failed to update category');
    }
  };

  // Handle edit item template
  const handleEditItem = async (item: OrderItemTemplate, newName: string, newPrice: number, isVatNil: boolean) => {
    try {
      await updateItemTemplate(item.id, newName, newPrice, isVatNil);
      setEditingItem(null);
    } catch (err) {
      alert('Failed to update item');
    }
  };

  // Handle delete category
  const handleDeleteCategory = async (category: OrderCategory) => {
    setCategoryToDelete(category);
    setShowDeleteCategoryModal(true);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    
    try {
      await deleteCategory(categoryToDelete.id);
      alert(`Category "${categoryToDelete.name}" has been deleted successfully.`);
      setShowDeleteCategoryModal(false);
      setCategoryToDelete(null);
    } catch (error) {
      alert('Failed to delete category. Please try again.');
    }
  };

  const cancelDeleteCategory = () => {
    setShowDeleteCategoryModal(false);
    setCategoryToDelete(null);
  };

  // Handle delete order
  const handleDeleteOrder = async (order: Order) => {
    setOrderToDelete(order);
    setShowDeleteOrderModal(true);
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    
    const category = categories.find(c => c.id === orderToDelete.categoryId);
    const categoryName = category?.name || 'Unknown';
    
    try {
      await deleteOrder(orderToDelete.id);
      alert(`Order for "${categoryName}" has been deleted successfully.`);
      setShowDeleteOrderModal(false);
      setOrderToDelete(null);
    } catch (error) {
      alert('Failed to delete order. Please try again.');
    }
  };

  const cancelDeleteOrder = () => {
    setShowDeleteOrderModal(false);
    setOrderToDelete(null);
  };

  // Handle delete item template
  const handleDeleteItem = async (item: OrderItemTemplate) => {
    setItemToDelete(item);
    setShowDeleteItemModal(true);
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;
    
    try {
      await deleteItemTemplate(itemToDelete.id);
      alert(`Item template "${itemToDelete.name}" has been deleted successfully.`);
      setShowDeleteItemModal(false);
      setItemToDelete(null);
    } catch (error) {
      alert('Failed to delete item template. Please try again.');
    }
  };

  const cancelDeleteItem = () => {
    setShowDeleteItemModal(false);
    setItemToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center select-none">
        <div className="text-center select-none">
          <Package size={48} className="text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 select-none">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden select-none">
      
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 shadow-sm p-4 select-none">
        {!selectedCategory ? (
          // Category Management View
          <>
            {!showAddCategory ? (
              <button
                onClick={() => setShowAddCategory(true)}
                className="w-full max-w-md mx-auto bg-purple-500 hover:bg-purple-600 text-white py-3 px-6 rounded-lg flex items-center justify-center transition-colors duration-200 shadow-sm text-lg select-none"
              >
                <Plus size={22} className="mr-3" />
                <span className="select-none">Add Order Category</span>
              </button>
            ) : (
              <form onSubmit={handleAddCategory} className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 w-full max-w-2xl mx-auto select-none">
                <div className="mb-4 select-none">
                  <label htmlFor="categoryName" className="block text-base font-medium text-gray-700 mb-2 select-none">
                    Category Name
                  </label>
                  <input
                    id="categoryName"
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => {
                      // Auto-capitalize as user types
                      const formatted = e.target.value
                        .split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                        .join(' ');
                      setNewCategoryName(formatted);
                    }}
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed select-text"
                    placeholder="Enter category name"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3 select-none">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-purple-500 hover:bg-purple-600 text-white py-3 px-6 text-lg rounded-md transition-colors duration-200 disabled:bg-purple-300 disabled:cursor-not-allowed select-none"
                  >
                    {isSubmitting ? 'Adding...' : 'Add Category'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCategory(false);
                      setNewCategoryName('');
                      setNewCategoryVat('15');
                    }}
                    disabled={isSubmitting}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-6 text-lg rounded-md transition-colors duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed select-none"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </>
        ) : (
          // Category Detail View
          <div className="flex items-center justify-between select-none">
            <div className="select-none">
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-purple-600 hover:text-purple-700 mb-2 select-none"
              >
                ← Back to Categories
              </button>
              <h2 className="text-xl font-semibold text-gray-800 select-none">{selectedCategory.name}</h2>
            </div>
            
            {/* Manage and Order buttons side by side */}
            <div className="flex gap-2 select-none">
              <button
                onClick={() => setActiveSection('manage')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors select-none ${
                  activeSection === 'manage'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Edit2 size={16} className="inline mr-1" />
                <span className="select-none">Manage</span>
              </button>
              <button
                onClick={() => setActiveSection('order')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors select-none ${
                  activeSection === 'order'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Plus size={16} />
                <span className="select-none">Order</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="flex-1 overflow-y-auto p-4 select-none">
        {!selectedCategory ? (
          // Categories List
          <div className="select-none">
            {filteredCategories.length === 0 && !searchQuery && (
              <div className="flex flex-col items-center justify-center py-16 text-center select-none">
                <div className="bg-purple-50 p-6 rounded-full mb-6">
                  <Package size={48} className="text-purple-500" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-3 select-none">No order categories</h2>
                <p className="text-gray-600 mb-8 max-w-md text-lg select-none">
                  Add your first order category using the button above
                </p>
              </div>
            )}

            {filteredCategories.length === 0 && searchQuery && (
              <div className="text-center py-12 select-none">
                <p className="text-gray-500 text-lg select-none">No categories found matching "{searchQuery}"</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 select-none">
              {filteredCategories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  itemsCount={getItemTemplatesByCategory(category.id).length}
                  ordersCount={getOrdersByCategory(category.id).length}
                  vatPercentage={category.vatPercentage}
                  onManage={() => {
                    setSelectedCategory(category);
                    setActiveSection('manage');
                  }}
                  onOrder={() => {
                    setSelectedCategory(category);
                    setActiveSection('order');
                  }}
                  onEdit={() => setEditingCategory(category)}
                  onDelete={() => handleDeleteCategory(category)}
                  isEditing={editingCategory?.id === category.id}
                  onSaveEdit={(newName, newVatPercentage) => handleEditCategory(category, newName, newVatPercentage)}
                  onCancelEdit={() => setEditingCategory(null)}
                />
              ))}
            </div>
          </div>
        ) : (
          // Category Detail View - Manage or Order Section
          <div className="select-none">
            {activeSection === 'manage' ? (
              // Manage Section - Items Management
              <div className="space-y-6 select-none">
                <div className="flex items-center justify-between select-none">
                  <h3 className="text-lg font-semibold text-gray-800 select-none">Manage Items</h3>
                  <button
                    onClick={() => setShowAddItem(true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 select-none"
                  >
                    <Plus size={16} />
                    <span className="select-none">Add Item</span>
                  </button>
                </div>
                
                <div className="space-y-2 select-none">
                  {getItemTemplatesByCategory(selectedCategory.id).map((item) => (
                    <ItemTemplateCard
                      key={item.id}
                      item={item}
                      onEdit={() => setEditingItem(item)}
                      onDelete={() => handleDeleteItem(item)}
                      isEditing={editingItem?.id === item.id}
                      onSaveEdit={(newName, newPrice, isVatNil) => handleEditItem(item, newName, newPrice, isVatNil)}
                      onCancelEdit={() => setEditingItem(null)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              // Order Section - Orders Management
              <div className="space-y-6 select-none">
                <div className="flex items-center justify-between select-none">
                  <h3 className="text-lg font-semibold text-gray-800 select-none">Orders</h3>
                  <button
                    onClick={() => setShowCreateOrder(true)}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 select-none"
                  >
                    <Plus size={16} />
                    <span className="select-none">Create New Order</span>
                  </button>
                </div>
                
                <div className="space-y-4 select-none">
                  {getOrdersByCategory(selectedCategory.id).map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      itemTemplates={getItemTemplatesByCategory(selectedCategory.id)}
                      onDelete={() => handleDeleteOrder(order)}
                      onUpdate={updateOrder}
                    />
                  ))}
                </div>
                
                {/* Spacer to ensure consistent button positioning */}
                <div className="flex-1 min-h-[2rem]"></div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddItem && selectedCategory && (
        <AddItemModal
          category={selectedCategory}
          onClose={() => {
            setShowAddItem(false);
            setNewItemName('');
            setNewItemPrice('');
          }}
          onAdd={handleAddItem}
          itemName={newItemName}
          setItemName={setNewItemName}
          itemPrice={newItemPrice}
          setItemPrice={setNewItemPrice}
          isSubmitting={isSubmitting}
        />
      )}

      {showCreateOrder && selectedCategory && (
        <CreateOrderModal
          category={selectedCategory}
          itemTemplates={getItemTemplatesByCategory(selectedCategory.id)}
          onClose={() => setShowCreateOrder(false)}
          onAdd={addOrder}
        />
      )}

      {editingOrder && selectedCategory && (
        <EditOrderModal
          order={editingOrder}
          itemTemplates={getItemTemplatesByCategory(selectedCategory.id)}
          onClose={() => setEditingOrder(null)}
          onUpdate={updateOrder}
        />
      )}

      {/* Category Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteCategoryModal}
        title="Delete Category"
        message={categoryToDelete ? `Are you sure you want to delete "${categoryToDelete.name}"?\n\nThis will also delete:\n• All item templates in this category\n• All orders in this category\n\nThis action cannot be undone.` : ''}
        confirmText="Delete Category"
        cancelText="Cancel"
        type="danger"
        onConfirm={confirmDeleteCategory}
        onCancel={cancelDeleteCategory}
      />

      {/* Order Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteOrderModal}
        title="Delete Order"
        message={orderToDelete ? (() => {
          const category = categories.find(c => c.id === orderToDelete.categoryId);
          const categoryName = category?.name || 'Unknown';
          const orderDate = orderToDelete.orderDate.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          });
          return `Are you sure you want to delete the order for "${categoryName}" dated ${orderDate}?\n\nThis action cannot be undone.`;
        })() : ''}
        confirmText="Delete Order"
        cancelText="Cancel"
        type="danger"
        onConfirm={confirmDeleteOrder}
        onCancel={cancelDeleteOrder}
      />

      {/* Item Template Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteItemModal}
        title="Delete Item Template"
        message={itemToDelete ? `Are you sure you want to delete "${itemToDelete.name}"?\n\nThis will also remove this item from all existing orders in this category.\n\nThis action cannot be undone.` : ''}
        confirmText="Delete Item"
        cancelText="Cancel"
        type="danger"
        onConfirm={confirmDeleteItem}
        onCancel={cancelDeleteItem}
      />

      {/* Duplicate Order Validation Modal */}
      <ConfirmationModal
        isOpen={showDuplicateOrderModal}
        title="Duplicate Order Not Allowed"
        message={duplicateOrderInfo ? `An order for "${duplicateOrderInfo.categoryName}" already exists for ${duplicateOrderInfo.orderDate}.\n\nDuplicate orders for the same date are not allowed. Please choose a different date or edit the existing order.` : ''}
        confirmText="OK"
        type="warning"
        onConfirm={() => {
          setShowDuplicateOrderModal(false);
          setDuplicateOrderInfo(null);
        }}
        onCancel={() => {
          setShowDuplicateOrderModal(false);
          setDuplicateOrderInfo(null);
        }}
      />

    </div>
    </>
  );
};

// Category Card Component
interface CategoryCardProps {
  category: OrderCategory;
  itemsCount: number;
  ordersCount: number;
  vatPercentage: number;
  onManage: () => void;
  onOrder: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isEditing: boolean;
  onSaveEdit: (newName: string, newVatPercentage: number) => void;
  onCancelEdit: () => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  itemsCount,
  ordersCount,
  vatPercentage,
  onManage,
  onOrder,
  onEdit,
  onDelete,
  isEditing,
  onSaveEdit,
  onCancelEdit
}) => {
  const { getOrdersByCategory } = useOrder();
  const [editName, setEditName] = useState(category.name);

  // Get latest order for this category
  const categoryOrders = getOrdersByCategory(category.id);
  const latestOrder = categoryOrders.length > 0 ? categoryOrders[0] : null;
  
  const handleSave = () => {
    if (editName.trim()) {
      onSaveEdit(editName.trim(), 15); // Fixed 15% VAT
    }
  };

  if (isEditing) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200 select-none">
        <div className="mb-4 select-none">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 select-text"
            placeholder="Category name"
            autoFocus
          />
        </div>
        <div className="flex gap-2 select-none">
          <button
            onClick={handleSave}
            className="flex-1 bg-green-500 text-white px-3 py-2 rounded text-sm hover:bg-green-600 transition-colors select-none"
          >
            Save
          </button>
          <button
            onClick={onCancelEdit}
            className="flex-1 bg-gray-500 text-white px-3 py-2 rounded text-sm hover:bg-gray-600 transition-colors select-none"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow select-none flex flex-col h-64">
      <div className="flex justify-between items-start mb-3 p-4 pb-0 select-none">
        <h4 className="font-semibold text-gray-800 text-lg select-none">{category.name}</h4>
        <div className="flex gap-1 select-none">
          <button
            onClick={onEdit}
            className="text-blue-500 hover:text-blue-700 p-1 select-none"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={onDelete}
            className="text-red-500 hover:text-red-700 p-1 select-none"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      {/* Content area with fixed height */}
      <div className="flex-1 px-4 select-none">
        {/* Latest Order Info - Fixed height container */}
        <div className="h-20 mb-3 select-none">
          {latestOrder ? (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200 h-full flex flex-col justify-center select-none">
              <div className="flex items-center justify-between select-none">
                <span className="text-sm font-medium text-green-800 select-none">
                  Rs {latestOrder.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-green-600 select-none">
                  {latestOrder.orderDate.toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  }).replace(/\s/g, '-')}
                </span>
              </div>
              <p className="text-xs text-green-600 mt-1 select-none">Latest Order</p>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center select-none">
              <p className="text-gray-400 text-sm select-none">No orders yet</p>
            </div>
          )}
        </div>
        
        <div className="text-sm text-gray-600 mb-4 select-none">
          <p className="select-none">{itemsCount} items • {ordersCount} orders</p>
        </div>
      </div>
      
      {/* Buttons at bottom - Fixed position */}
      <div className="p-4 pt-0 select-none">
        <div className="flex gap-2 select-none">
          <button
            onClick={onManage}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-1 select-none"
          >
            <Edit2 size={16} />
            <span className="select-none">Manage</span>
          </button>
          <button
            onClick={onOrder}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-1 select-none"
          >
            <Plus size={16} />
            <span className="select-none">Order</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Item Template Card Component
interface ItemTemplateCardProps {
  item: OrderItemTemplate;
  onEdit: () => void;
  onDelete: () => void;
  isEditing: boolean;
  onSaveEdit: (newName: string, newPrice: number, isVatNil: boolean) => void;
  onCancelEdit: () => void;
}

const ItemTemplateCard: React.FC<ItemTemplateCardProps> = ({
  item,
  onEdit,
  onDelete,
  isEditing,
  onSaveEdit,
  onCancelEdit
}) => {
  const [editName, setEditName] = useState(item.name);
  const [editPrice, setEditPrice] = useState(item.unitPrice.toString());
  const [editVatNil, setEditVatNil] = useState(item.isVatNil);

  const handleSave = () => {
    const price = parseFloat(editPrice);
    if (editName.trim() && !isNaN(price) && price >= 0) {
      onSaveEdit(editName.trim(), price, editVatNil);
    }
  };

  // Calculate VAT amount and total price for display
  const vatAmount = item.isVatNil ? 0 : (item.unitPrice * item.vatPercentage) / 100;
  const totalPrice = item.unitPrice + vatAmount;
  
  if (isEditing) {
    return (
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 select-none">
        <div className="grid grid-cols-2 gap-3 mb-3 select-none">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 select-text"
            placeholder="Item name"
            autoFocus
          />
          <input
            type="number"
            value={editPrice}
            onChange={(e) => setEditPrice(e.target.value)}
            min="0"
            step="0.01"
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 select-text"
            placeholder="Unit price"
          />
        </div>
        <div className="mb-3 select-none">
          <label className="flex items-center select-none">
            <input
              type="checkbox"
              checked={editVatNil}
              onChange={(e) => setEditVatNil(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700 select-none">VAT Nil (No VAT applicable)</span>
          </label>
        </div>
        <div className="flex gap-2 select-none">
          <button
            onClick={handleSave}
            className="flex-1 bg-green-500 text-white px-3 py-1 rounded text-sm select-none"
          >
            Save
          </button>
          <button
            onClick={onCancelEdit}
            className="flex-1 bg-gray-500 text-white px-3 py-1 rounded text-sm select-none"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 select-none">
      <div className="flex justify-between items-center select-none">
        <div className="select-none">
          <h5 className="font-medium text-gray-800 select-none">{item.name}</h5>
          <div className="text-sm text-gray-600 select-none">
            {item.isVatNil ? (
              <p className="select-none">Rs {item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} VAT Nil → Rs {item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            ) : (
              <p className="select-none">Rs {item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} VAT{item.vatPercentage}%(Rs {vatAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) → Rs {totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            )}
          </div>
        </div>
        <div className="flex gap-1 select-none">
          <button
            onClick={onEdit}
            className="text-blue-500 hover:text-blue-700 p-1 select-none"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={onDelete}
            className="text-red-500 hover:text-red-700 p-1 select-none"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Order Card Component
interface OrderCardProps {
  order: Order;
  itemTemplates: OrderItemTemplate[];
  onDelete: () => void;
  onUpdate: (id: string, orderDate: Date, items: OrderItem[]) => Promise<void>;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, itemTemplates, onDelete, onUpdate }) => {
  const [orderItems, setOrderItems] = useState<OrderItem[]>(order.items);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showAddItems, setShowAddItems] = useState(false);

  const getItemTemplateName = (templateId: string) => {
    const template = itemTemplates.find(t => t.id === templateId);
    return template?.name || 'Unknown Item';
  };

  const addItemToOrder = (template: OrderItemTemplate) => {
    const baseAmount = template.unitPrice;
    const vatAmount = template.isVatNil ? 0 : (baseAmount * (template.vatPercentage || 15)) / 100;

    const newOrderItem: OrderItem = {
      id: crypto.randomUUID(),
      templateId: template.id,
      quantity: 1,
      unitPrice: template.unitPrice,
      isVatNil: template.isVatNil,
      vatAmount: vatAmount,
      totalPrice: template.isVatNil ? template.unitPrice : template.unitPrice + vatAmount,
      isAvailable: true
    };
    
    const updatedItems = [...orderItems, newOrderItem];
    setOrderItems(updatedItems);
    handleAutoSave(updatedItems);
    setShowAddItems(false);
  };

  const updateOrderItem = (id: string, field: keyof OrderItem, value: number | boolean) => {
    const updatedItems = orderItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // Recalculate totals when quantity, unit price, or availability changes
        if (field === 'quantity' || field === 'unitPrice' || field === 'isAvailable') {
          const subtotal = updated.quantity * updated.unitPrice;
          updated.vatAmount = updated.isVatNil ? 0 : subtotal * 0.15; // 15% VAT only if not VAT Nil
          updated.totalPrice = subtotal + updated.vatAmount;
        }
        
        return updated;
      }
      return item;
    });
    
    setOrderItems(updatedItems);
    
    // Auto-save the changes
    handleAutoSave(updatedItems);
  };

  const removeOrderItem = (id: string) => {
    const updatedItems = orderItems.filter(item => item.id !== id);
    setOrderItems(updatedItems);
    handleAutoSave(updatedItems);
  };
  
  const handleAutoSave = async (items: OrderItem[]) => {
    try {
      setIsUpdating(true);
      await onUpdate(order.id, order.orderDate, items);
    } catch (error) {
      console.error('Failed to auto-save order:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const totalCost = orderItems
    .filter(item => item.isAvailable)
    .reduce((sum, item) => sum + item.totalPrice, 0);

  // Get available templates that are not already in the order
  const availableTemplates = itemTemplates.filter(template => 
    !orderItems.some(item => item.templateId === template.id)
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200 select-none">
      <div className="flex justify-between items-start mb-3 select-none">
        <div className="flex items-center gap-2 select-none">
          <Calendar size={16} className="text-gray-500" />
          <span className="text-sm text-gray-600 select-none">
            {order.orderDate.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            }).replace(/\s/g, '-')}
          </span>
          {isUpdating && (
            <span className="text-xs text-blue-500 select-none">Saving...</span>
          )}
        </div>

        <div className="flex gap-1 select-none">
          <button
            onClick={() => setShowAddItems(true)}
            className="text-green-500 hover:text-green-700 p-1 select-none"
            title="Add items to order"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={onDelete}
            className="text-red-500 hover:text-red-700 p-1 select-none"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Order Items in the new format: [input box] ------ Item Name Price ------ Total Price ------ Available */}
      <div className="space-y-2 mb-3 select-none">
        {orderItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded select-none">
            <div className="flex items-center gap-2 select-none">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => updateOrderItem(item.id, 'quantity', Math.max(0, item.quantity - 1))}
                  disabled={item.quantity === 0}
                  className="w-6 h-6 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 rounded-full flex items-center justify-center transition-colors"
                >
                  <Minus size={12} />
                </button>
                <input
                  type="number"
                  value={item.quantity === 0 ? '' : item.quantity.toString()}
                  onChange={(e) => updateOrderItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  className="w-16 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 select-text"
                  placeholder="0"
                  style={{ textAlign: 'center' }}
                  min="0"
                />
                <button
                  type="button"
                  onClick={() => updateOrderItem(item.id, 'quantity', item.quantity + 1)}
                  className="w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-colors"
                >
                  <Plus size={12} />
                </button>
              </div>
              <span className={`font-medium select-none ${!item.isAvailable ? 'line-through text-gray-400' : ''}`}>
                {getItemTemplateName(item.templateId)}
              </span>
              <div className="text-xs text-gray-600 mt-1 select-none">
                Rs {item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} + {item.isVatNil ? 'VAT Nil' : `VAT15%(Rs ${item.vatAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`} → Rs {item.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="flex items-center gap-2 select-none">
              <span className={`text-xs select-none ${item.isAvailable ? '' : 'line-through text-gray-400'}`}>
                Available
              </span>
              <input
                type="checkbox"
                checked={item.isAvailable}
                onChange={(e) => updateOrderItem(item.id, 'isAvailable', e.target.checked)}
                className="w-4 h-4"
              />
              <button
                onClick={() => removeOrderItem(item.id)}
                className="text-red-500 hover:text-red-700 p-1 ml-1 select-none"
                title="Remove item from order"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Items Modal */}
      {showAddItems && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 select-none">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden select-none">
            <div className="p-4 border-b select-none">
              <div className="flex justify-between items-center select-none">
                <h3 className="text-lg font-semibold text-gray-900 select-none">Add Items to Order</h3>
                <button onClick={() => setShowAddItems(false)} className="text-gray-500 hover:text-gray-700 select-none">
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-4 max-h-64 overflow-y-auto select-none">
              {availableTemplates.length === 0 ? (
                <div className="text-center py-8 text-gray-500 select-none">
                  <p className="select-none">All available items are already in this order</p>
                </div>
              ) : (
                <div className="space-y-2 select-none">
                  {availableTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => addItemToOrder(template)}
                      className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left select-none"
                    >
                      <span className="font-medium text-gray-800 select-none">{template.name}</span>
                      <span className="text-sm text-gray-600 select-none">Rs {template.unitPrice.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="border-t pt-3 flex justify-between items-center select-none">
        <span className="font-semibold text-gray-800 select-none">Total Amount:</span>
        <span className="font-bold text-green-600 text-lg select-none">Rs {totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>
    </div>
  );
};

// Add Item Modal Component
interface AddItemModalProps {
  category: OrderCategory;
  onClose: () => void;
  onAdd: (e: React.FormEvent, isVatNil?: boolean, vatPercentage?: number) => void;
  itemName: string;
  setItemName: (name: string) => void;
  itemPrice: string;
  setItemPrice: (price: string) => void;
  isSubmitting: boolean;
}

const AddItemModal: React.FC<AddItemModalProps> = ({
  category,
  onClose,
  onAdd,
  itemName,
  setItemName,
  itemPrice,
  setItemPrice,
  isSubmitting
}) => {
  const [vatPercentage, setVatPercentage] = React.useState('15');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!itemName.trim()) {
      alert('Please enter an item name');
      return;
    }

    const price = parseFloat(itemPrice);
    if (isNaN(price) || price < 0) {
      alert('Please enter a valid price');
      return;
    }

    const vatPercent = parseFloat(vatPercentage);
    if (isNaN(vatPercent) || vatPercent < 0 || vatPercent > 100) {
      alert('Please enter a valid VAT percentage (0-100)');
      return;
    }

    // Call the modified onAdd function with VAT status
    onAdd(e, vatPercent === 0, vatPercent);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden select-none">
        <div className="p-6 select-none">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 select-none">
            Add Item to {category.name}
          </h3>
          
          <form onSubmit={handleSubmit} className="select-none">
            <div className="mb-4 select-none">
              <label className="block text-sm font-medium text-gray-700 mb-2 select-none">
                Item Name
              </label>
              <input
                type="text"
                value={itemName}
                onChange={(e) => {
                  // Auto-capitalize with unit preservation
                  const formatted = e.target.value
                    .split(' ')
                    .map(word => {
                      // Check if word is a unit (e.g., 2L, 1.5L, 0.5L)
                      if (/^\d+(\.\d+)?L$/i.test(word)) {
                        return word.toUpperCase();
                      }
                      // Regular capitalization for other words
                      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                    })
                    .join(' ');
                  setItemName(formatted);
                }}
                placeholder="e.g., Matinee, Palmal, Rothman"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 select-text"
                autoFocus
              />
            </div>
            
            <div className="mb-4 select-none">
              <label className="block text-sm font-medium text-gray-700 mb-2 select-none">
                Unit Price (Rs)
              </label>
              <input
                type="number"
                value={itemPrice}
               onChange={(e) => {
                 const value = e.target.value;
                 // Allow empty string, numbers, and decimal points
                 if (value === '' || /^\d*\.?\d*$/.test(value)) {
                   setItemPrice(value);
                 }
               }}
                min="0"
                step="0.01"
               inputMode="decimal"
                placeholder="0.00"
               className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white select-text"
              />
            </div>
            
            <div className="mb-4 select-none">
              <label className="block text-sm font-medium text-gray-700 mb-2 select-none">
                VAT (%)
              </label>
              <input
                type="number"
                value={vatPercentage}
               onChange={(e) => {
                 const value = e.target.value;
                 // Allow empty string, numbers, and decimal points
                 if (value === '' || /^\d*\.?\d*$/.test(value)) {
                   setVatPercentage(value);
                 }
               }}
                  const value = e.target.value;
                  // Allow empty string for clearing, or valid numbers
                  if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0 && parseFloat(value) <= 100)) {
                    setVatPercentage(value);
                  }
                }}
                min="0"
                max="100"
                step="0.01"
                placeholder="15"
               inputMode="decimal"
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 select-text"
                inputMode="decimal"
               className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white select-text"
              />
              <p className="text-xs text-gray-500 mt-1 select-none">
                Enter 0 for VAT Nil items
              </p>
            </div>
            
            <div className="flex gap-3 select-none">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 select-none"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !itemName.trim() || !itemPrice.trim()}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 select-none"
              >
                {isSubmitting ? 'Adding...' : 'Add Item'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Create Order Modal Component
interface CreateOrderModalProps {
  category: OrderCategory;
  itemTemplates: OrderItemTemplate[];
  onClose: () => void;
  onAdd: (categoryId: string, orderDate: Date, items: OrderItem[]) => Promise<Order>;
}

const CreateOrderModal: React.FC<CreateOrderModalProps> = ({ category, itemTemplates, onClose, onAdd }) => {
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { getOrdersByCategory } = useOrder();

  // Initialize order items from templates
  React.useEffect(() => {
    const initialItems: OrderItem[] = itemTemplates.map(template => ({
      id: template.id,
      templateId: template.id,
      quantity: 0,
      unitPrice: template.unitPrice,
      isVatNil: template.isVatNil,
      vatAmount: 0,
      totalPrice: 0,
      isAvailable: true
    }));
    setOrderItems(initialItems);
  }, [itemTemplates]);

  const updateOrderItem = (id: string, field: keyof OrderItem, value: number | boolean) => {
    setOrderItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // Recalculate totals when quantity or unit price changes
        if (field === 'quantity' || field === 'unitPrice') {
          const subtotal = updated.quantity * updated.unitPrice;
          updated.vatAmount = updated.isVatNil ? 0 : subtotal * 0.15; // 15% VAT
          updated.totalPrice = subtotal + updated.vatAmount;
        }
        
        return updated;
      }
      return item;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const itemsWithQuantity = orderItems.filter(item => item.quantity > 0);
    
    if (itemsWithQuantity.length === 0) {
      alert('Please add at least one item with quantity greater than 0');
      return;
    }

    // Calculate total cost of available items
    const totalCost = orderItems
      .filter(item => item.isAvailable)
      .reduce((sum, item) => sum + item.totalPrice, 0);
    
    // Prevent saving orders with 0.00 total cost
    if (totalCost === 0) {
      alert('Cannot create an order with Rs 0.00 total cost. Please add items or mark items as available.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onAdd(category.id, new Date(orderDate), itemsWithQuantity);
      onClose();
    } catch (err) {
      // Check if it's a duplicate order error
      if (err instanceof Error && err.message.includes('already exists for')) {
        // Extract date from error message for display
        const formattedDate = new Date(orderDate).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
        
        // Show duplicate order modal instead of generic alert
        const duplicateInfo = {
          categoryName: category.name,
          orderDate: formattedDate
        };
        
        // Access parent component's modal state through a custom event
        window.dispatchEvent(new CustomEvent('showDuplicateOrderModal', { 
          detail: duplicateInfo 
        }));
      } else {
        alert('Failed to create order');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCost = orderItems
    .filter(item => item.isAvailable)
    .reduce((sum, item) => sum + item.totalPrice, 0);

  const getItemTemplateName = (templateId: string) => {
    const template = itemTemplates.find(t => t.id === templateId);
    return template?.name || 'Unknown Item';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-6xl max-h-[90vh] overflow-hidden select-none">
        <div className="p-6 border-b select-none">
          <div className="flex justify-between items-center select-none">
            <h3 className="text-lg font-semibold text-gray-900 select-none">
              Create Order - {category.name}
            </h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 select-none">
              <X size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col h-full select-none">
          <div className="p-6 border-b select-none">
            <label className="block text-sm font-medium text-gray-700 mb-2 select-none">
              Order Date
            </label>
            <input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 select-none"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-6 select-none">
            {itemTemplates.length === 0 ? (
              <div className="text-center py-12 select-none">
                <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 select-none">
                  <h4 className="text-lg font-medium text-yellow-800 mb-2 select-none">No Items Available</h4>
                  <p className="text-yellow-700 select-none">
                    Please add items to this category first before creating an order.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto select-none">
                <table className="w-full border-collapse select-none">
                  <thead className="select-none">
                    <tr className="bg-gray-50 select-none">
                      <th className="border border-gray-300 px-4 py-2 text-left select-none">Item</th>
                      <th className="border border-gray-300 px-4 py-2 text-center select-none">Quantity</th>
                      <th className="border border-gray-300 px-4 py-2 text-center select-none">Unit Price</th>
                      <th className="border border-gray-300 px-4 py-2 text-center select-none">VAT (15%)</th>
                      <th className="border border-gray-300 px-4 py-2 text-center select-none">Total Price</th>
                    </tr>
                  </thead>
                  <tbody className="select-none">
                    {itemTemplates.map((template) => (
                      <tr key={template.id} className="hover:bg-gray-50 select-none">
                        <td className="border border-gray-300 px-4 py-2 select-none">
                          <div className="select-none">
                            <div className="font-medium text-gray-800 select-none">{template.name}</div>
                          </div>
                        </td>
                        <td className="border border-gray-300 px-4 py-2 select-none">
                          <div className="flex items-center gap-1 justify-center">
                            <button
                              type="button"
                              onClick={() => {
                                const currentQuantity = orderItems.find(oi => oi.templateId === template.id)?.quantity || 0;
                                const newQuantity = Math.max(0, currentQuantity - 1);
                                const existingIndex = orderItems.findIndex(oi => oi.templateId === template.id);
                                
                                if (newQuantity === 0) {
                                  if (existingIndex >= 0) {
                                    setOrderItems(prev => prev.filter((_, i) => i !== existingIndex));
                                  }
                                } else {
                                  const vatAmount = template.isVatNil ? 0 : (template.unitPrice * newQuantity * template.vatPercentage) / 100;
                                  const totalPrice = (template.unitPrice * newQuantity) + vatAmount;
                                  
                                  const newOrderItem: OrderItem = {
                                    id: existingIndex >= 0 ? orderItems[existingIndex].id : crypto.randomUUID(),
                                    templateId: template.id,
                                    quantity: newQuantity,
                                    unitPrice: template.unitPrice,
                                    isVatNil: template.isVatNil,
                                    vatAmount,
                                    totalPrice,
                                    isAvailable: true
                                  };
                                  
                                  if (existingIndex >= 0) {
                                    setOrderItems(prev => prev.map((item, i) => i === existingIndex ? newOrderItem : item));
                                  } else {
                                    setOrderItems(prev => [...prev, newOrderItem]);
                                  }
                                }
                              }}
                              disabled={(() => {
                                const currentQuantity = orderItems.find(oi => oi.templateId === template.id)?.quantity || 0;
                                return currentQuantity === 0;
                              })()}
                              className="w-6 h-6 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 rounded-full flex items-center justify-center transition-colors"
                            >
                              <Minus size={12} />
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={(() => {
                                const quantity = orderItems.find(oi => oi.templateId === template.id)?.quantity || 0;
                                return quantity === 0 ? '' : quantity.toString();
                              })()}
                              onChange={(e) => {
                                const quantity = parseInt(e.target.value) || 0;
                                const existingIndex = orderItems.findIndex(oi => oi.templateId === template.id);
                                
                                if (quantity === 0) {
                                  if (existingIndex >= 0) {
                                    setOrderItems(prev => prev.filter((_, i) => i !== existingIndex));
                                  }
                                } else {
                                  const vatAmount = template.isVatNil ? 0 : (template.unitPrice * quantity * template.vatPercentage) / 100;
                                  const totalPrice = (template.unitPrice * quantity) + vatAmount;
                                  
                                  const newOrderItem: OrderItem = {
                                    id: existingIndex >= 0 ? orderItems[existingIndex].id : crypto.randomUUID(),
                                    templateId: template.id,
                                    quantity,
                                    unitPrice: template.unitPrice,
                                    isVatNil: template.isVatNil,
                                    vatAmount,
                                    totalPrice,
                                    isAvailable: true
                                  };
                                  
                                  if (existingIndex >= 0) {
                                    setOrderItems(prev => prev.map((item, i) => i === existingIndex ? newOrderItem : item));
                                  } else {
                                    setOrderItems(prev => [...prev, newOrderItem]);
                                  }
                                }
                              }}
                              onFocus={(e) => e.target.select()}
                              className="w-16 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 select-text"
                              placeholder="0"
                              style={{ textAlign: 'center' }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const currentQuantity = orderItems.find(oi => oi.templateId === template.id)?.quantity || 0;
                                const newQuantity = currentQuantity + 1;
                                const existingIndex = orderItems.findIndex(oi => oi.templateId === template.id);
                                
                                const vatAmount = template.isVatNil ? 0 : (template.unitPrice * newQuantity * template.vatPercentage) / 100;
                                const totalPrice = (template.unitPrice * newQuantity) + vatAmount;
                                
                                const newOrderItem: OrderItem = {
                                  id: existingIndex >= 0 ? orderItems[existingIndex].id : crypto.randomUUID(),
                                  templateId: template.id,
                                  quantity: newQuantity,
                                  unitPrice: template.unitPrice,
                                  isVatNil: template.isVatNil,
                                  vatAmount,
                                  totalPrice,
                                  isAvailable: true
                                };
                                
                                if (existingIndex >= 0) {
                                  setOrderItems(prev => prev.map((item, i) => i === existingIndex ? newOrderItem : item));
                                } else {
                                  setOrderItems(prev => [...prev, newOrderItem]);
                                }
                              }}
                              className="w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-colors"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-right select-none">
                          Rs {template.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-right select-none">
                          {(() => {
                            const orderItem = orderItems.find(oi => oi.templateId === template.id);
                            if (!orderItem || orderItem.quantity === 0) return 'Rs 0.00';
                            return template.isVatNil ? 'VAT Nil' : `Rs ${orderItem.vatAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                          })()}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-right font-semibold select-none">
                          {(() => {
                            const orderItem = orderItems.find(oi => oi.templateId === template.id);
                            if (!orderItem || orderItem.quantity === 0) return 'Rs 0.00';
                            return `Rs ${orderItem.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="p-6 border-t bg-gray-50 select-none">
            <div className="flex justify-between items-center mb-4 select-none">
              <span className="text-xl font-semibold text-gray-800 select-none">Total Amount:</span>
              <span className="text-2xl font-bold text-green-600 select-none">Rs {totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            
            <div className="flex gap-3 select-none">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 select-none"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || itemTemplates.length === 0 || totalCost === 0}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors select-none ${
                  totalCost === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {isSubmitting ? 'Creating...' : 'Create Order'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Order Modal Component
interface EditOrderModalProps {
  order: Order;
  itemTemplates: OrderItemTemplate[];
  onClose: () => void;
  onUpdate: (id: string, orderDate: Date, items: OrderItem[]) => Promise<void>;
}

const EditOrderModal: React.FC<EditOrderModalProps> = ({ order, itemTemplates, onClose, onUpdate }) => {
  const [orderDate, setOrderDate] = useState(order.orderDate.toISOString().split('T')[0]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>(order.items);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateOrderItem = (id: string, field: keyof OrderItem, value: number | boolean) => {
    setOrderItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // Recalculate totals when quantity, unit price, or availability changes
        if (field === 'quantity' || field === 'unitPrice' || field === 'isAvailable') {
          const subtotal = updated.quantity * updated.unitPrice;
          const template = itemTemplates.find(t => t.id === updated.templateId);
          const baseAmount = subtotal;
          const vatAmount = template && template.isVatNil ? 0 : (baseAmount * (template && template.vatPercentage || 15)) / 100;
          updated.vatAmount = updated.isVatNil ? 0 : vatAmount;
          updated.totalPrice = subtotal + updated.vatAmount;
          
          // If not available, set totals to 0 for calculation purposes
          if (!updated.isAvailable) {
            updated.vatAmount = 0;
            updated.totalPrice = 0;
          }
        }
        
        return updated;
      }
      return item;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (itemTemplates.length === 0) {
      alert('Cannot update order: No items available in this category');
      return;
    }
    
    const itemsWithQuantity = orderItems.filter(item => item.quantity > 0);
    
    if (itemsWithQuantity.length === 0) {
      alert('Please add at least one item with quantity greater than 0');
      return;
    }

    try {
      setIsSubmitting(true);
      await onUpdate(order.id, new Date(orderDate), itemsWithQuantity);
      onClose();
    } catch (err) {
      alert('Failed to update order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCost = orderItems
    .filter(item => item.isAvailable)
    .reduce((sum, item) => sum + item.totalPrice, 0);

  const getItemTemplateName = (templateId: string) => {
    const template = itemTemplates.find(t => t.id === templateId);
    return template?.name || 'Unknown Item';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-6xl max-h-[90vh] overflow-hidden select-none">
        <div className="p-6 border-b select-none">
          <div className="flex justify-between items-center select-none">
            <h3 className="text-lg font-semibold text-gray-900 select-none">
              Edit Order
            </h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 select-none">
              <X size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col h-full select-none">
          <div className="p-6 border-b select-none">
            <label className="block text-sm font-medium text-gray-700 mb-2 select-none">
              Order Date
            </label>
            <input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 select-none"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-6 select-none">
            {itemTemplates.length === 0 ? (
              <div className="text-center py-12 select-none">
                <div className="bg-red-50 p-6 rounded-lg border border-red-200 select-none">
                  <h4 className="text-lg font-medium text-red-800 mb-2 select-none">No Items Available</h4>
                  <p className="text-red-700 select-none">
                    Cannot edit this order because there are no items in this category.
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 select-none"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 select-none">
                {orderItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg select-none">
                    <div className="flex items-center gap-3 select-none">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateOrderItem(item.id, 'quantity', Math.max(0, item.quantity - 1))}
                          disabled={item.quantity === 0}
                          className="w-6 h-6 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 rounded-full flex items-center justify-center transition-colors"
                        >
                          <Minus size={12} />
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={item.quantity === 0 ? '' : item.quantity.toString()}
                          onChange={(e) => updateOrderItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          className="w-16 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 select-text"
                          placeholder="0"
                          style={{ textAlign: 'center' }}
                        />
                        <button
                          type="button"
                          onClick={() => updateOrderItem(item.id, 'quantity', item.quantity + 1)}
                          className="w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <span className={`font-medium select-none ${!item.isAvailable ? 'line-through text-gray-400' : ''}`}>
                        {getItemTemplateName(item.templateId)}
                      </span>
                      <div className="text-xs text-gray-600 mt-1 select-none">
                        Rs {item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} + {item.isVatNil ? 'VAT Nil' : `VAT15%(Rs ${item.vatAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`} → Rs {item.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 select-none">
                      <span className={`text-xs select-none ${!item.isAvailable ? 'line-through text-gray-400' : ''}`}>
                        {item.isVatNil ? 'VAT Nil' : `VAT(Rs ${item.vatAmount.toFixed(2)})`}
                      </span>
                      <span className={`font-medium select-none ${!item.isAvailable ? 'line-through text-gray-400' : ''}`}>
                        Rs {item.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <input
                        type="checkbox"
                        checked={item.isAvailable}
                        onChange={(e) => updateOrderItem(item.id, 'isAvailable', e.target.checked)}
                        className="w-4 h-4"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 border-t bg-gray-50 select-none">
            <div className="flex justify-between items-center mb-4 select-none">
              <span className="text-xl font-semibold text-gray-800 select-none">Total Amount:</span>
              <span className="text-2xl font-bold text-green-600 select-none">Rs {totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            
            <div className="flex gap-3 select-none">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 select-none"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || itemTemplates.length === 0 || totalCost === 0}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors select-none ${
                  totalCost === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {isSubmitting ? 'Updating...' : 'Update Order'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderManagement;