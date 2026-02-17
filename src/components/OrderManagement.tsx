import React, { useState } from 'react';
import { Plus, Search, Package, Edit2, Trash2, Calendar, DollarSign, X } from 'lucide-react';
import { useOrder } from '../context/OrderContext';
import { OrderCategory, OrderItemTemplate, Order, OrderItem } from '../types';

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
      await addItemTemplate(selectedCategory.id, newItemName.trim(), price, isVatNil, vatPercent);
      setNewItemName('');
      setNewItemPrice('');
      setNewItemVatPercentage('15');
      setNewItemVatNil(false);
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
      await updateCategory(category.id, newName, newVatPercentage);
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
    const confirmed = window.confirm(
      `Are you sure you want to delete "${category.name}"? This will also delete all items and orders in this category.`
    );
    
    if (confirmed) {
      try {
        await deleteCategory(category.id);
        if (selectedCategory?.id === category.id) {
          setSelectedCategory(null);
        }
      } catch (err) {
        alert('Failed to delete category');
      }
    }
  };

  // Handle delete item template
  const handleDeleteItem = async (item: OrderItemTemplate) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${item.name}"? This will also remove it from all orders.`
    );
    
    if (confirmed) {
      try {
        await deleteItemTemplate(item.id);
      } catch (err) {
        alert('Failed to delete item');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Package size={48} className="text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
      
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 shadow-sm p-4">
        {!selectedCategory ? (
          // Category Management View
          <>
            {!showAddCategory ? (
              <button
                onClick={() => setShowAddCategory(true)}
                className="w-full max-w-md mx-auto bg-purple-500 hover:bg-purple-600 text-white py-3 px-6 rounded-lg flex items-center justify-center transition-colors duration-200 shadow-sm text-lg"
              >
                <Plus size={22} className="mr-3" />
                <span>Add Order Category</span>
              </button>
            ) : (
              <form onSubmit={handleAddCategory} className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 w-full max-w-2xl mx-auto">
                <div className="mb-4">
                  <label htmlFor="categoryName" className="block text-base font-medium text-gray-700 mb-2">
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
                    className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Enter category name"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-purple-500 hover:bg-purple-600 text-white py-3 px-6 text-lg rounded-md transition-colors duration-200 disabled:bg-purple-300 disabled:cursor-not-allowed"
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
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-6 text-lg rounded-md transition-colors duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Search Bar */}
            <div className="mt-4">
              <div className="relative w-full max-w-md mx-auto">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={20} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search categories..."
                  className="block w-full pl-10 pr-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
          </>
        ) : (
          // Category Detail View
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-purple-600 hover:text-purple-700 mb-2"
              >
                ← Back to Categories
              </button>
              <h2 className="text-xl font-semibold text-gray-800">{selectedCategory.name}</h2>
            </div>
            
            {/* Manage and Order buttons side by side */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveSection('manage')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  activeSection === 'manage'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Edit2 size={16} />
                Manage
              </button>
              <button
                onClick={() => setActiveSection('order')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  activeSection === 'order'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Plus size={16} />
                Order
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="flex-1 overflow-y-auto p-4">
        {!selectedCategory ? (
          // Categories List
          <div>
            {filteredCategories.length === 0 && !searchQuery && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="bg-purple-50 p-6 rounded-full mb-6">
                  <Package size={48} className="text-purple-500" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-3">No order categories</h2>
                <p className="text-gray-600 mb-8 max-w-md text-lg">
                  Add your first order category using the button above
                </p>
              </div>
            )}

            {filteredCategories.length === 0 && searchQuery && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No categories found matching "{searchQuery}"</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <div>
            {activeSection === 'manage' ? (
              // Manage Section - Items Management
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-800">Manage Items</h3>
                  <button
                    onClick={() => setShowAddItem(true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Add Item
                  </button>
                </div>
                
                <div className="space-y-2">
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
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-800">Orders</h3>
                  <button
                    onClick={() => setShowCreateOrder(true)}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Create New Order
                  </button>
                </div>
                
                <div className="space-y-4">
                  {getOrdersByCategory(selectedCategory.id).map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      itemTemplates={getItemTemplatesByCategory(selectedCategory.id)}
                      onDelete={() => {
                        const confirmed = window.confirm('Are you sure you want to delete this order?');
                        if (confirmed) deleteOrder(order.id);
                      }}
                      onUpdate={updateOrder}
                    />
                  ))}
                </div>
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
    </div>
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
  const [editVatPercentage, setEditVatPercentage] = useState(category.vatPercentage.toString());

  // Get latest order for this category
  const categoryOrders = getOrdersByCategory(category.id);
  const latestOrder = categoryOrders.length > 0 ? categoryOrders[0] : null;
  const handleSave = () => {
    const vatPercentage = parseFloat(editVatPercentage);
    if (editName.trim() && !isNaN(vatPercentage) && vatPercentage >= 0 && vatPercentage <= 100) {
      onSaveEdit(editName.trim(), vatPercentage);
    }
  };

  if (isEditing) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
        <div className="space-y-3">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Category name"
            autoFocus
          />
          <input
            type="number"
            value={editVatPercentage}
            onChange={(e) => setEditVatPercentage(e.target.value)}
            min="0"
            max="100"
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="VAT percentage"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 bg-green-500 text-white px-3 py-1 rounded text-sm"
          >
            Save
          </button>
          <button
            onClick={onCancelEdit}
            className="flex-1 bg-gray-500 text-white px-3 py-1 rounded text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <h4 className="font-semibold text-gray-800 text-lg">{category.name}</h4>
        <div className="flex gap-1">
          <button
            onClick={onEdit}
            className="text-blue-500 hover:text-blue-700 p-1"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={onDelete}
            className="text-red-500 hover:text-red-700 p-1"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      {/* Latest Order Info */}
      {latestOrder && (
        <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-green-800">
              Rs {latestOrder.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-green-600">
              {latestOrder.orderDate.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })}
            </span>
          </div>
          <p className="text-xs text-green-600 mt-1">Latest Order</p>
        </div>
      )}
      
      <div className="text-sm text-gray-600 mb-4">
        <p>{itemsCount} items • {ordersCount} orders • VAT {vatPercentage}%</p>
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={onManage}
          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-1"
        >
          <Edit2 size={16} />
          Manage
        </button>
        <button
          onClick={onOrder}
          className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-1"
        >
          <Plus size={16} />
          Order
        </button>
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
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Item name"
            autoFocus
          />
          <input
            type="number"
            value={editPrice}
            onChange={(e) => setEditPrice(e.target.value)}
            min="0"
            step="0.01"
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Unit price"
          />
        </div>
        <div className="mb-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={editVatNil}
              onChange={(e) => setEditVatNil(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">VAT Nil (No VAT applicable)</span>
          </label>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 bg-green-500 text-white px-3 py-1 rounded text-sm"
          >
            Save
          </button>
          <button
            onClick={onCancelEdit}
            className="flex-1 bg-gray-500 text-white px-3 py-1 rounded text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
      <div className="flex justify-between items-center">
        <div>
          <h5 className="font-medium text-gray-800">{item.name}</h5>
          <div className="text-sm text-gray-600">
            {item.isVatNil ? (
              <p>Rs {item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} VAT Nil → Rs {item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            ) : (
              <p>Rs {item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} VAT{item.vatPercentage}%(Rs {vatAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) → Rs {totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onEdit}
            className="text-blue-500 hover:text-blue-700 p-1"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={onDelete}
            className="text-red-500 hover:text-red-700 p-1"
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
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-gray-500" />
          <span className="text-sm text-gray-600">
            {order.orderDate.toLocaleDateString('en-GB')}
          </span>
          {isUpdating && (
            <span className="text-xs text-blue-500">Saving...</span>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setShowAddItems(true)}
            className="text-green-500 hover:text-green-700 p-1"
            title="Add items to order"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={onDelete}
            className="text-red-500 hover:text-red-700 p-1"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Order Items in the new format: [input box] ------ Item Name Price ------ Total Price ------ Available */}
      <div className="space-y-2 mb-3">
        {orderItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={item.quantity === 0 ? '' : item.quantity.toString()}
                onChange={(e) => updateOrderItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                onFocus={(e) => e.target.select()}
                className="w-16 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                placeholder="0"
                style={{ textAlign: 'center' }}
                min="0"
              />
              <span className={`text-xs ${item.isAvailable ? '' : 'line-through text-gray-400'}`}>
                {getItemTemplateName(item.templateId)} @{item.unitPrice.toFixed(2)} + {item.isVatNil ? 'VAT Nil' : `VAT(Rs ${item.vatAmount.toFixed(2)})`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${item.isAvailable ? '' : 'line-through text-gray-400'}`}>
                Rs {item.totalPrice.toFixed(2)}
              </span>
              <input
                type="checkbox"
                checked={item.isAvailable}
                onChange={(e) => updateOrderItem(item.id, 'isAvailable', e.target.checked)}
                className="w-4 h-4"
              />
              <button
                onClick={() => removeOrderItem(item.id)}
                className="text-red-500 hover:text-red-700 p-1 ml-1"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Add Items to Order</h3>
                <button onClick={() => setShowAddItems(false)} className="text-gray-500 hover:text-gray-700">
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-4 max-h-64 overflow-y-auto">
              {availableTemplates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>All available items are already in this order</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => addItemToOrder(template)}
                      className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
                    >
                      <span className="font-medium text-gray-800">{template.name}</span>
                      <span className="text-sm text-gray-600">Rs {template.unitPrice.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="border-t pt-3 flex justify-between items-center">
        <span className="font-semibold text-gray-800">Total Amount:</span>
        <span className="font-bold text-green-600 text-lg">Rs {totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>
    </div>
  );
};

// Add Item Modal Component
interface AddItemModalProps {
  category: OrderCategory;
  onClose: () => void;
  onAdd: (e: React.FormEvent, isVatNil?: boolean) => void;
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
  const [isVatNil, setIsVatNil] = React.useState(false);

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

    // Call the modified onAdd function with VAT status
    onAdd(e, isVatNil);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Add Item to {category.name}
          </h3>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit Price (Rs)
              </label>
              <input
                type="number"
                value={itemPrice}
                onChange={(e) => setItemPrice(e.target.value)}
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isVatNil}
                  onChange={(e) => setIsVatNil(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  VAT Nil (Override {category.vatPercentage}% VAT)
                </span>
              </label>
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !itemName.trim() || !itemPrice.trim()}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
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

  // Initialize order items from templates
  React.useEffect(() => {
    const initialItems: OrderItem[] = itemTemplates.map(template => ({
      id: template.id,
      templateId: template.id,
      quantity: 0,
      unitPrice: template.unitPrice,
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
          updated.vatAmount = subtotal * 0.15; // 15% VAT
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

    try {
      setIsSubmitting(true);
      await onAdd(category.id, new Date(orderDate), itemsWithQuantity);
      onClose();
    } catch (err) {
      alert('Failed to create order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCost = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);

  const getItemTemplateName = (templateId: string) => {
    const template = itemTemplates.find(t => t.id === templateId);
    return template?.name || 'Unknown Item';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              Create Order - {category.name}
            </h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="p-6 border-b">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Order Date
            </label>
            <input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {itemTemplates.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
                  <h4 className="text-lg font-medium text-yellow-800 mb-2">No Items Available</h4>
                  <p className="text-yellow-700">
                    Please add items to this category first before creating an order.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-4 py-2 text-left">Item</th>
                      <th className="border border-gray-300 px-4 py-2 text-center">Quantity</th>
                      <th className="border border-gray-300 px-4 py-2 text-center">Unit Price</th>
                      <th className="border border-gray-300 px-4 py-2 text-center">VAT (15%)</th>
                      <th className="border border-gray-300 px-4 py-2 text-center">Total Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemTemplates.map((template) => (
                      <tr key={template.id}>
                        <td className="border border-gray-300 px-4 py-2 font-medium">
                          <div>
                            <div className="font-medium text-gray-800">{template.name}</div>
                            <div className="text-xs text-gray-600 mt-1">
                              Rs {template.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} + {template.isVatNil ? 'VAT Nil' : `VAT${template.vatPercentage}%(Rs ${((template.unitPrice * template.vatPercentage) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`} → Rs {(template.unitPrice + (template.isVatNil ? 0 : (template.unitPrice * template.vatPercentage) / 100)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
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
                            className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                            placeholder="0"
                            style={{ textAlign: 'center' }}
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-right">
                          Rs {template.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-right">
                          {(() => {
                            const orderItem = orderItems.find(oi => oi.templateId === template.id);
                            if (!orderItem || orderItem.quantity === 0) return 'Rs 0.00';
                            return template.isVatNil ? 'VAT Nil' : `Rs ${orderItem.vatAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                          })()}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-right font-semibold">
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

          <div className="p-6 border-t bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xl font-semibold text-gray-800">Total Amount:</span>
              <span className="text-2xl font-bold text-green-600">Rs {totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || itemTemplates.length === 0}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              Edit Order
            </h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="p-6 border-b">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Order Date
            </label>
            <input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {itemTemplates.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                  <h4 className="text-lg font-medium text-red-800 mb-2">No Items Available</h4>
                  <p className="text-red-700">
                    Cannot edit this order because there are no items in this category.
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {orderItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="0"
                        value={item.quantity === 0 ? '' : item.quantity.toString()}
                        onChange={(e) => updateOrderItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        className="w-16 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                        placeholder="0"
                        style={{ textAlign: 'center' }}
                      />
                      <span className={`font-medium ${!item.isAvailable ? 'line-through text-gray-400' : ''}`}>
                        @{item.unitPrice.toFixed(2)} --------------------------------- {getItemTemplateName(item.templateId)}
                        {getItemTemplateName(item.templateId)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Rs {item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} + {item.isVatNil ? 'VAT Nil' : `VAT15%(Rs ${item.vatAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`} → Rs {item.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${item.isAvailable ? '' : 'line-through text-gray-400'}`}>
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs ${!item.isAvailable ? 'line-through text-gray-400' : ''}`}>
                        {item.isVatNil ? 'VAT Nil' : `VAT(Rs ${item.vatAmount.toFixed(2)})`}
                      </span>
                      <span className={`font-medium ${!item.isAvailable ? 'line-through text-gray-400' : ''}`}>
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

          <div className="p-6 border-t bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xl font-semibold text-gray-800">Total Amount:</span>
              <span className="text-2xl font-bold text-green-600">Rs {totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || itemTemplates.length === 0}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
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