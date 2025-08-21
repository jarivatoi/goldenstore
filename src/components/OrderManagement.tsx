import React, { useState } from 'react';
import { Plus, Calendar, Package, Trash2, Edit, X, AlertTriangle } from 'lucide-react';
import { useOrder } from '../context/OrderContext';
import { OrderCategory, OrderItemTemplate, Order, OrderItem } from '../types';

/**
 * ORDER MANAGEMENT COMPONENT
 * ==========================
 * 
 * Manages order categories, item templates, and orders
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
    isLoading,
    error 
  } = useOrder();

  // State management
  const [selectedCategory, setSelectedCategory] = useState<OrderCategory | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [editingCategory, setEditingCategory] = useState<OrderCategory | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<OrderItemTemplate | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  
  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'category' | 'template' | 'order';
    id: string;
    name: string;
  } | null>(null);

  // Form states
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryVat, setNewCategoryVat] = useState('15');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplatePrice, setNewTemplatePrice] = useState('');
  const [newTemplateVatNil, setNewTemplateVatNil] = useState(false);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  // Handle delete request
  const handleDeleteRequest = (type: 'category' | 'template' | 'order', id: string, name: string) => {
    setDeleteTarget({ type, id, name });
    setShowDeleteModal(true);
  };

  // Handle delete confirmation
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      switch (deleteTarget.type) {
        case 'category':
          await deleteCategory(deleteTarget.id);
          if (selectedCategory?.id === deleteTarget.id) {
            setSelectedCategory(null);
          }
          break;
        case 'template':
          await deleteItemTemplate(deleteTarget.id);
          break;
        case 'order':
          await deleteOrder(deleteTarget.id);
          break;
      }
      setShowDeleteModal(false);
      setDeleteTarget(null);
    } catch (err) {
      alert('Failed to delete item');
    }
  };

  // Handle delete cancellation
  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  // Add category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCategoryName.trim()) {
      alert('Please enter a category name');
      return;
    }

    try {
      const vatPercentage = parseFloat(newCategoryVat);
      if (isNaN(vatPercentage) || vatPercentage < 0 || vatPercentage > 100) {
        alert('Please enter a valid VAT percentage (0-100)');
        return;
      }

      await addCategory(newCategoryName.trim(), vatPercentage);
      setNewCategoryName('');
      setNewCategoryVat('15');
      setShowAddCategory(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add category');
    }
  };

  // Add item template
  const handleAddTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCategory) {
      alert('Please select a category first');
      return;
    }

    if (!newTemplateName.trim()) {
      alert('Please enter an item name');
      return;
    }

    const price = parseFloat(newTemplatePrice);
    if (isNaN(price) || price <= 0) {
      alert('Please enter a valid price');
      return;
    }

    try {
      await addItemTemplate(selectedCategory.id, newTemplateName.trim(), price, newTemplateVatNil);
      setNewTemplateName('');
      setNewTemplatePrice('');
      setNewTemplateVatNil(false);
      setShowAddTemplate(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add item template');
    }
  };

  // Add order
  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCategory) {
      alert('Please select a category first');
      return;
    }

    if (orderItems.length === 0) {
      alert('Please add at least one item to the order');
      return;
    }

    try {
      await addOrder(selectedCategory.id, new Date(orderDate), orderItems);
      setOrderDate(new Date().toISOString().split('T')[0]);
      setOrderItems([]);
      setShowAddOrder(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add order');
    }
  };

  // Add item to order
  const addItemToOrder = (template: OrderItemTemplate) => {
    const existingItem = orderItems.find(item => item.templateId === template.id);
    
    if (existingItem) {
      // Increase quantity
      setOrderItems(prev => prev.map(item => 
        item.templateId === template.id 
          ? { 
              ...item, 
              quantity: item.quantity + 1,
              vatAmount: item.isVatNil ? 0 : (item.unitPrice * (item.quantity + 1) * template.vatPercentage / 100),
              totalPrice: (item.unitPrice * (item.quantity + 1)) + (item.isVatNil ? 0 : (item.unitPrice * (item.quantity + 1) * template.vatPercentage / 100))
            }
          : item
      ));
    } else {
      // Add new item
      const vatAmount = template.isVatNil ? 0 : (template.unitPrice * template.vatPercentage / 100);
      const totalPrice = template.unitPrice + vatAmount;
      
      const newOrderItem: OrderItem = {
        id: crypto.randomUUID(),
        templateId: template.id,
        quantity: 1,
        unitPrice: template.unitPrice,
        isVatNil: template.isVatNil,
        vatAmount,
        totalPrice,
        isAvailable: true
      };
      
      setOrderItems(prev => [...prev, newOrderItem]);
    }
  };

  // Remove item from order
  const removeItemFromOrder = (templateId: string) => {
    setOrderItems(prev => prev.filter(item => item.templateId !== templateId));
  };

  // Update item availability
  const toggleItemAvailability = (templateId: string) => {
    setOrderItems(prev => prev.map(item => 
      item.templateId === templateId 
        ? { ...item, isAvailable: !item.isAvailable }
        : item
    ));
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Package size={48} className="text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Loading order data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">Order Management</h2>
          <button
            onClick={() => setShowAddCategory(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus size={18} />
            Add Category
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        
        {/* Categories Grid */}
        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-blue-50 p-6 rounded-full mb-6">
              <Package size={48} className="text-blue-500" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-3">No categories yet</h3>
            <p className="text-gray-600 mb-8 max-w-md text-lg">
              Create your first order category to start managing orders
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                isSelected={selectedCategory?.id === category.id}
                onSelect={() => setSelectedCategory(category)}
                onEdit={() => setEditingCategory(category)}
                onDelete={() => handleDeleteRequest('category', category.id, category.name)}
                orderCount={getOrdersByCategory(category.id).length}
                templateCount={getItemTemplatesByCategory(category.id).length}
              />
            ))}
          </div>
        )}

        {/* Selected Category Details */}
        {selectedCategory && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-800">
                {selectedCategory.name} - Details
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddTemplate(true)}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Plus size={16} />
                  Add Item
                </button>
                <button
                  onClick={() => setShowAddOrder(true)}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Plus size={16} />
                  New Order
                </button>
              </div>
            </div>

            {/* Item Templates */}
            <div className="mb-8">
              <h4 className="text-lg font-medium text-gray-700 mb-4">Available Items</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getItemTemplatesByCategory(selectedCategory.id).map((template) => (
                  <div key={template.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-800">{template.name}</h5>
                        <p className="text-sm text-gray-600">
                          Rs {template.unitPrice.toFixed(2)}
                          {template.isVatNil && <span className="text-red-500 ml-2">(VAT Exempt)</span>}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingTemplate(template)}
                          className="p-2 text-blue-500 hover:text-blue-700 transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteRequest('template', template.id, template.name)}
                          className="p-2 text-red-500 hover:text-red-700 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Orders */}
            <div>
              <h4 className="text-lg font-medium text-gray-700 mb-4">Recent Orders</h4>
              <div className="space-y-4">
                {getOrdersByCategory(selectedCategory.id).map((order) => (
                  <div key={order.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h5 className="font-medium text-gray-800">
                          Order - {order.orderDate.toLocaleDateString('en-GB')}
                        </h5>
                        <p className="text-sm text-gray-600">
                          Total: Rs {order.totalCost.toFixed(2)} ({order.items.length} items)
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingOrder(order)}
                          className="p-2 text-blue-500 hover:text-blue-700 transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteRequest('order', order.id, `Order from ${order.orderDate.toLocaleDateString('en-GB')}`)}
                          className="p-2 text-red-500 hover:text-red-700 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    {/* Order Items */}
                    <div className="space-y-2">
                      {order.items.map((item) => {
                        const template = itemTemplates.find(t => t.id === item.templateId);
                        return (
                          <div key={item.id} className="flex items-center justify-between text-sm">
                            <span className={`${!item.isAvailable ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                              {template?.name} x{item.quantity}
                            </span>
                            <span className={`font-medium ${!item.isAvailable ? 'text-gray-400' : 'text-gray-800'}`}>
                              Rs {item.totalPrice.toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-fade-in">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-red-100 p-2 rounded-full">
                    <AlertTriangle size={20} className="text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Delete {deleteTarget.type === 'category' ? 'Category' : deleteTarget.type === 'template' ? 'Item Template' : 'Order'}
                    </h3>
                  </div>
                </div>
                <button 
                  onClick={handleCancelDelete}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Are you sure you want to delete "{deleteTarget.name}"?
                </p>
                
                {deleteTarget.type === 'category' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-yellow-800 text-sm">
                      ⚠️ This will also delete all item templates and orders in this category.
                    </p>
                  </div>
                )}
                
                {deleteTarget.type === 'template' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-yellow-800 text-sm">
                      ⚠️ This will also remove this item from all existing orders.
                    </p>
                  </div>
                )}
                
                <p className="text-red-600 text-sm mt-3">
                  This action cannot be undone.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleCancelDelete}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Category</h3>
              
              <form onSubmit={handleAddCategory}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Cigarette, Rum, Beer"
                  />
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default VAT Percentage
                  </label>
                  <input
                    type="number"
                    value={newCategoryVat}
                    onChange={(e) => setNewCategoryVat(e.target.value)}
                    min="0"
                    max="100"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCategory(false);
                      setNewCategoryName('');
                      setNewCategoryVat('15');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Add Category
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Template Modal */}
      {showAddTemplate && selectedCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Add Item to {selectedCategory.name}
              </h3>
              
              <form onSubmit={handleAddTemplate}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item Name
                  </label>
                  <input
                    type="text"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Matinee, Palmal"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit Price (Rs)
                  </label>
                  <input
                    type="number"
                    value={newTemplatePrice}
                    onChange={(e) => setNewTemplatePrice(e.target.value)}
                    min="0.01"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0.00"
                  />
                </div>
                
                <div className="mb-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newTemplateVatNil}
                      onChange={(e) => setNewTemplateVatNil(e.target.checked)}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">VAT Exempt</span>
                  </label>
                </div>
                
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddTemplate(false);
                      setNewTemplateName('');
                      setNewTemplatePrice('');
                      setNewTemplateVatNil(false);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    Add Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Order Modal */}
      {showAddOrder && selectedCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                New Order - {selectedCategory.name}
              </h3>
            </div>
            
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
              <form onSubmit={handleAddOrder}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Order Date
                  </label>
                  <input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Available Items */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Add Items to Order</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {getItemTemplatesByCategory(selectedCategory.id).map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => addItemToOrder(template)}
                        className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                      >
                        <div className="font-medium text-gray-800">{template.name}</div>
                        <div className="text-sm text-gray-600">Rs {template.unitPrice.toFixed(2)}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Order Items */}
                {orderItems.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Order Items</h4>
                    <div className="space-y-2">
                      {orderItems.map((item) => {
                        const template = itemTemplates.find(t => t.id === item.templateId);
                        return (
                          <div key={item.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => toggleItemAvailability(item.templateId)}
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                  item.isAvailable 
                                    ? 'bg-green-500 border-green-500 text-white' 
                                    : 'border-gray-300 bg-white'
                                }`}
                              >
                                {item.isAvailable && '✓'}
                              </button>
                              <div className={item.isAvailable ? '' : 'line-through text-gray-400'}>
                                <div className="font-medium">{template?.name}</div>
                                <div className="text-sm text-gray-600">
                                  {item.quantity} × Rs {item.unitPrice.toFixed(2)}
                                  {!item.isVatNil && ` + VAT Rs ${item.vatAmount.toFixed(2)}`}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${item.isAvailable ? 'text-gray-800' : 'text-gray-400'}`}>
                                Rs {item.totalPrice.toFixed(2)}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeItemFromOrder(item.templateId)}
                                className="p-1 text-red-500 hover:text-red-700 transition-colors"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Order Total */}
                    <div className="mt-4 p-3 bg-purple-100 rounded-lg border border-purple-200">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-800">Total Cost:</span>
                        <span className="text-lg font-bold text-purple-600">
                          Rs {orderItems
                            .filter(item => item.isAvailable)
                            .reduce((sum, item) => sum + item.totalPrice, 0)
                            .toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddOrder(false);
                      setOrderDate(new Date().toISOString().split('T')[0]);
                      setOrderItems([]);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={orderItems.length === 0}
                    className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Create Order
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * CATEGORY CARD COMPONENT
 * =======================
 */
interface CategoryCardProps {
  category: OrderCategory;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  orderCount: number;
  templateCount: number;
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  orderCount,
  templateCount
}) => {
  return (
    <div
      className={`bg-white rounded-lg shadow-sm border p-4 cursor-pointer transition-all duration-200 ${
        isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:shadow-md'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800">{category.name}</h3>
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-2 text-blue-500 hover:text-blue-700 transition-colors"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 text-red-500 hover:text-red-700 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <Package size={14} />
          <span>{templateCount} item template{templateCount !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={14} />
          <span>{orderCount} order{orderCount !== 1 ? 's' : ''}</span>
        </div>
        <div className="text-xs text-gray-500">
          VAT: {category.vatPercentage}%
        </div>
      </div>
    </div>
  );
};

export default OrderManagement;