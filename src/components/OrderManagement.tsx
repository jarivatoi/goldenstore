import React, { useState } from 'react';
import { Plus, Search, Calendar, Package, Edit2, Trash2, X, AlertTriangle, ShoppingCart, Calculator, Eye, EyeOff } from 'lucide-react';
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
    searchCategories,
    isLoading,
    error
  } = useOrder();

  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<OrderCategory | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [editingCategory, setEditingCategory] = useState<OrderCategory | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<OrderItemTemplate | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Form states
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryVat, setNewCategoryVat] = useState(15);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplatePrice, setNewTemplatePrice] = useState('');
  const [newTemplateVatNil, setNewTemplateVatNil] = useState(false);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'category' | 'template' | 'order';
    id: string;
    name: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  // Get filtered categories
  const filteredCategories = searchCategories(searchQuery);

  // Handle category operations
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      await addCategory(newCategoryName, newCategoryVat);
      setNewCategoryName('');
      setNewCategoryVat(15);
      setShowAddCategory(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add category');
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !newCategoryName.trim()) return;

    try {
      await updateCategory(editingCategory.id, newCategoryName, newCategoryVat);
      setEditingCategory(null);
      setNewCategoryName('');
      setNewCategoryVat(15);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update category');
    }
  };

  const handleDeleteCategory = async (category: OrderCategory) => {
    setDeleteTarget({
      type: 'category',
      id: category.id,
      name: category.name,
      onConfirm: async () => {
        await deleteCategory(category.id);
        if (selectedCategory?.id === category.id) {
          setSelectedCategory(null);
        }
      }
    });
    setShowDeleteModal(true);
  };

  // Handle template operations
  const handleAddTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !newTemplateName.trim() || !newTemplatePrice) return;

    try {
      const price = parseFloat(newTemplatePrice);
      if (isNaN(price) || price <= 0) {
        alert('Please enter a valid price');
        return;
      }

      await addItemTemplate(selectedCategory.id, newTemplateName, price, newTemplateVatNil);
      setNewTemplateName('');
      setNewTemplatePrice('');
      setNewTemplateVatNil(false);
      setShowAddTemplate(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add item template');
    }
  };

  const handleUpdateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate || !newTemplateName.trim() || !newTemplatePrice) return;

    try {
      const price = parseFloat(newTemplatePrice);
      if (isNaN(price) || price <= 0) {
        alert('Please enter a valid price');
        return;
      }

      await updateItemTemplate(editingTemplate.id, newTemplateName, price, newTemplateVatNil);
      setEditingTemplate(null);
      setNewTemplateName('');
      setNewTemplatePrice('');
      setNewTemplateVatNil(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update template');
    }
  };

  const handleDeleteTemplate = async (template: OrderItemTemplate) => {
    setDeleteTarget({
      type: 'template',
      id: template.id,
      name: template.name,
      onConfirm: async () => {
        await deleteItemTemplate(template.id);
      }
    });
    setShowDeleteModal(true);
  };

  // Handle order operations
  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || orderItems.length === 0) return;

    try {
      await addOrder(selectedCategory.id, new Date(orderDate), orderItems);
      setOrderDate(new Date().toISOString().split('T')[0]);
      setOrderItems([]);
      setShowAddOrder(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add order');
    }
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder || orderItems.length === 0) return;

    try {
      await updateOrder(editingOrder.id, new Date(orderDate), orderItems);
      setEditingOrder(null);
      setOrderDate(new Date().toISOString().split('T')[0]);
      setOrderItems([]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update order');
    }
  };

  const handleDeleteOrder = async (order: Order) => {
    const category = categories.find(c => c.id === order.categoryId);
    const categoryName = category?.name || 'Unknown Category';
    const orderDateStr = order.orderDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    setDeleteTarget({
      type: 'order',
      id: order.id,
      name: `${categoryName} order from ${orderDateStr}`,
      onConfirm: async () => {
        await deleteOrder(order.id);
        if (selectedOrder?.id === order.id) {
          setSelectedOrder(null);
        }
      }
    });
    setShowDeleteModal(true);
  };

  // Order item management
  const addOrderItem = (template: OrderItemTemplate) => {
    const existingItem = orderItems.find(item => item.templateId === template.id);
    
    if (existingItem) {
      // Increase quantity
      setOrderItems(prev => prev.map(item => 
        item.templateId === template.id 
          ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * item.unitPrice + ((item.quantity + 1) * item.unitPrice * (item.isVatNil ? 0 : item.vatPercentage / 100)) }
          : item
      ));
    } else {
      // Add new item
      const vatAmount = template.isVatNil ? 0 : template.unitPrice * (template.vatPercentage / 100);
      const newOrderItem: OrderItem = {
        id: crypto.randomUUID(),
        templateId: template.id,
        quantity: 1,
        unitPrice: template.unitPrice,
        isVatNil: template.isVatNil,
        vatAmount,
        totalPrice: template.unitPrice + vatAmount,
        isAvailable: true
      };
      setOrderItems(prev => [...prev, newOrderItem]);
    }
  };

  const updateOrderItemQuantity = (templateId: string, quantity: number) => {
    if (quantity <= 0) {
      setOrderItems(prev => prev.filter(item => item.templateId !== templateId));
    } else {
      setOrderItems(prev => prev.map(item => 
        item.templateId === templateId 
          ? { 
              ...item, 
              quantity,
              vatAmount: item.isVatNil ? 0 : item.unitPrice * quantity * (item.vatPercentage / 100),
              totalPrice: (item.unitPrice * quantity) + (item.isVatNil ? 0 : item.unitPrice * quantity * (item.vatPercentage / 100))
            }
          : item
      ));
    }
  };

  const toggleOrderItemAvailability = (templateId: string) => {
    setOrderItems(prev => prev.map(item => 
      item.templateId === templateId 
        ? { ...item, isAvailable: !item.isAvailable }
        : item
    ));
  };

  // Calculate order total
  const calculateOrderTotal = () => {
    return orderItems
      .filter(item => item.isAvailable)
      .reduce((sum, item) => sum + item.totalPrice, 0);
  };

  // Start editing category
  const startEditingCategory = (category: OrderCategory) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryVat(category.vatPercentage);
  };

  // Start editing template
  const startEditingTemplate = (template: OrderItemTemplate) => {
    setEditingTemplate(template);
    setNewTemplateName(template.name);
    setNewTemplatePrice(template.unitPrice.toString());
    setNewTemplateVatNil(template.isVatNil);
  };

  // Start editing order
  const startEditingOrder = (order: Order) => {
    setEditingOrder(order);
    setOrderDate(order.orderDate.toISOString().split('T')[0]);
    setOrderItems([...order.items]);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingCategory(null);
    setEditingTemplate(null);
    setEditingOrder(null);
    setNewCategoryName('');
    setNewCategoryVat(15);
    setNewTemplateName('');
    setNewTemplatePrice('');
    setNewTemplateVatNil(false);
    setOrderDate(new Date().toISOString().split('T')[0]);
    setOrderItems([]);
  };

  // Confirmation Modal Component
  const ConfirmDeleteModal = () => {
    if (!showDeleteModal || !deleteTarget) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 select-none">
        <div className="bg-white rounded-xl shadow-lg w-full max-w-sm overflow-hidden animate-fade-in select-none">
          <div className="p-6 select-none">
            {/* Icon and header */}
            <div className="flex items-start justify-between mb-4 select-none">
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="text-red-600" size={24} />
              </div>
              <button 
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteTarget(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors select-none"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="mb-6 select-none">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 select-none">
                Delete {deleteTarget.type === 'category' ? 'Category' : deleteTarget.type === 'template' ? 'Template' : 'Order'}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed select-none">
                Are you sure you want to delete "{deleteTarget.name}"? This action cannot be undone.
                {deleteTarget.type === 'category' && ' All templates and orders in this category will also be deleted.'}
                {deleteTarget.type === 'template' && ' This template will be removed from all existing orders.'}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 select-none">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteTarget(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200 font-medium select-none"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await deleteTarget.onConfirm();
                    setShowDeleteModal(false);
                    setDeleteTarget(null);
                  } catch (err) {
                    alert(err instanceof Error ? err.message : 'Failed to delete');
                  }
                }}
                className="flex-1 px-4 py-2 text-white rounded-lg transition-colors duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 bg-red-500 hover:bg-red-600 focus:ring-red-500 select-none"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    );
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
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden select-none">
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 select-none">
        <div className="flex items-center justify-between mb-4 select-none">
          <h2 className="text-xl font-semibold text-gray-800 select-none">Order Management</h2>
          <button
            onClick={() => setShowAddCategory(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors select-none"
          >
            <Plus size={18} />
            Add Category
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative select-none">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={20} className="text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories..."
            className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 select-none">
        
        {/* Categories Grid */}
        {!selectedCategory ? (
          <div className="select-none">
            {filteredCategories.length === 0 ? (
              <div className="text-center py-16 select-none">
                <ShoppingCart size={48} className="text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 mb-2 select-none">No Categories</h3>
                <p className="text-gray-600 mb-6 select-none">Create your first order category to get started</p>
                <button
                  onClick={() => setShowAddCategory(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 mx-auto transition-colors select-none"
                >
                  <Plus size={20} />
                  Add Category
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 select-none">
                {filteredCategories.map((category) => (
                  <CategoryCard
                    key={category.id}
                    category={category}
                    onSelect={setSelectedCategory}
                    onEdit={startEditingCategory}
                    onDelete={handleDeleteCategory}
                    orderCount={getOrdersByCategory(category.id).length}
                    templateCount={getItemTemplatesByCategory(category.id).length}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Category Detail View */
          <CategoryDetailView
            category={selectedCategory}
            templates={getItemTemplatesByCategory(selectedCategory.id)}
            orders={getOrdersByCategory(selectedCategory.id)}
            onBack={() => setSelectedCategory(null)}
            onAddTemplate={() => setShowAddTemplate(true)}
            onEditTemplate={startEditingTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onAddOrder={() => setShowAddOrder(true)}
            onEditOrder={startEditingOrder}
            onDeleteOrder={handleDeleteOrder}
            onViewOrder={setSelectedOrder}
          />
        )}
      </div>

      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 select-none">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md select-none">
            <div className="p-6 select-none">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 select-none">Add New Category</h3>
              <form onSubmit={handleAddCategory} className="select-none">
                <div className="mb-4 select-none">
                  <label className="block text-sm font-medium text-gray-700 mb-2 select-none">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Cigarette, Rum, Soft Drinks"
                    required
                  />
                </div>
                <div className="mb-6 select-none">
                  <label className="block text-sm font-medium text-gray-700 mb-2 select-none">
                    VAT Percentage (%)
                  </label>
                  <input
                    type="number"
                    value={newCategoryVat}
                    onChange={(e) => setNewCategoryVat(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>
                <div className="flex gap-3 select-none">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCategory(false);
                      setNewCategoryName('');
                      setNewCategoryVat(15);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors select-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors select-none"
                  >
                    Add Category
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 select-none">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md select-none">
            <div className="p-6 select-none">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 select-none">Edit Category</h3>
              <form onSubmit={handleUpdateCategory} className="select-none">
                <div className="mb-4 select-none">
                  <label className="block text-sm font-medium text-gray-700 mb-2 select-none">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-6 select-none">
                  <label className="block text-sm font-medium text-gray-700 mb-2 select-none">
                    VAT Percentage (%)
                  </label>
                  <input
                    type="number"
                    value={newCategoryVat}
                    onChange={(e) => setNewCategoryVat(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>
                <div className="flex gap-3 select-none">
                  <button
                    type="button"
                    onClick={cancelEditing}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors select-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors select-none"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Template Modal */}
      {showAddTemplate && selectedCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 select-none">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md select-none">
            <div className="p-6 select-none">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 select-none">
                Add Item Template - {selectedCategory.name}
              </h3>
              <form onSubmit={handleAddTemplate} className="select-none">
                <div className="mb-4 select-none">
                  <label className="block text-sm font-medium text-gray-700 mb-2 select-none">
                    Item Name
                  </label>
                  <input
                    type="text"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Matinee, Palmal"
                    required
                  />
                </div>
                <div className="mb-4 select-none">
                  <label className="block text-sm font-medium text-gray-700 mb-2 select-none">
                    Unit Price (Rs)
                  </label>
                  <input
                    type="number"
                    value={newTemplatePrice}
                    onChange={(e) => setNewTemplatePrice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.01"
                    min="0.01"
                    required
                  />
                </div>
                <div className="mb-6 select-none">
                  <label className="flex items-center gap-2 select-none">
                    <input
                      type="checkbox"
                      checked={newTemplateVatNil}
                      onChange={(e) => setNewTemplateVatNil(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 select-none">VAT Exempt</span>
                  </label>
                </div>
                <div className="flex gap-3 select-none">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddTemplate(false);
                      setNewTemplateName('');
                      setNewTemplatePrice('');
                      setNewTemplateVatNil(false);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors select-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors select-none"
                  >
                    Add Template
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Template Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 select-none">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md select-none">
            <div className="p-6 select-none">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 select-none">Edit Template</h3>
              <form onSubmit={handleUpdateTemplate} className="select-none">
                <div className="mb-4 select-none">
                  <label className="block text-sm font-medium text-gray-700 mb-2 select-none">
                    Item Name
                  </label>
                  <input
                    type="text"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-4 select-none">
                  <label className="block text-sm font-medium text-gray-700 mb-2 select-none">
                    Unit Price (Rs)
                  </label>
                  <input
                    type="number"
                    value={newTemplatePrice}
                    onChange={(e) => setNewTemplatePrice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.01"
                    min="0.01"
                    required
                  />
                </div>
                <div className="mb-6 select-none">
                  <label className="flex items-center gap-2 select-none">
                    <input
                      type="checkbox"
                      checked={newTemplateVatNil}
                      onChange={(e) => setNewTemplateVatNil(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 select-none">VAT Exempt</span>
                  </label>
                </div>
                <div className="flex gap-3 select-none">
                  <button
                    type="button"
                    onClick={cancelEditing}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors select-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors select-none"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Order Modal */}
      {showAddOrder && selectedCategory && (
        <OrderFormModal
          category={selectedCategory}
          templates={getItemTemplatesByCategory(selectedCategory.id)}
          orderDate={orderDate}
          orderItems={orderItems}
          onOrderDateChange={setOrderDate}
          onAddItem={addOrderItem}
          onUpdateQuantity={updateOrderItemQuantity}
          onToggleAvailability={toggleOrderItemAvailability}
          onSubmit={handleAddOrder}
          onCancel={() => {
            setShowAddOrder(false);
            setOrderDate(new Date().toISOString().split('T')[0]);
            setOrderItems([]);
          }}
          calculateTotal={calculateOrderTotal}
          isEditing={false}
        />
      )}

      {/* Edit Order Modal */}
      {editingOrder && selectedCategory && (
        <OrderFormModal
          category={selectedCategory}
          templates={getItemTemplatesByCategory(selectedCategory.id)}
          orderDate={orderDate}
          orderItems={orderItems}
          onOrderDateChange={setOrderDate}
          onAddItem={addOrderItem}
          onUpdateQuantity={updateOrderItemQuantity}
          onToggleAvailability={toggleOrderItemAvailability}
          onSubmit={handleUpdateOrder}
          onCancel={cancelEditing}
          calculateTotal={calculateOrderTotal}
          isEditing={true}
        />
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          category={categories.find(c => c.id === selectedOrder.categoryId)!}
          templates={itemTemplates}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal />
    </div>
  );
};

/**
 * CATEGORY CARD COMPONENT
 * =======================
 */
interface CategoryCardProps {
  category: OrderCategory;
  onSelect: (category: OrderCategory) => void;
  onEdit: (category: OrderCategory) => void;
  onDelete: (category: OrderCategory) => void;
  orderCount: number;
  templateCount: number;
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  onSelect,
  onEdit,
  onDelete,
  orderCount,
  templateCount
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow select-none">
      <div className="flex items-start justify-between mb-3 select-none">
        <h3 className="text-lg font-semibold text-gray-800 select-none">{category.name}</h3>
        <div className="flex gap-1 select-none">
          <button
            onClick={() => onEdit(category)}
            className="p-1 text-gray-400 hover:text-blue-600 transition-colors select-none"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => onDelete(category)}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors select-none"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      <div className="space-y-2 mb-4 select-none">
        <div className="flex justify-between text-sm select-none">
          <span className="text-gray-600 select-none">VAT Rate:</span>
          <span className="font-medium select-none">{category.vatPercentage}%</span>
        </div>
        <div className="flex justify-between text-sm select-none">
          <span className="text-gray-600 select-none">Templates:</span>
          <span className="font-medium select-none">{templateCount}</span>
        </div>
        <div className="flex justify-between text-sm select-none">
          <span className="text-gray-600 select-none">Orders:</span>
          <span className="font-medium select-none">{orderCount}</span>
        </div>
      </div>
      
      <button
        onClick={() => onSelect(category)}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors select-none"
      >
        Manage Category
      </button>
    </div>
  );
};

/**
 * CATEGORY DETAIL VIEW COMPONENT
 * ==============================
 */
interface CategoryDetailViewProps {
  category: OrderCategory;
  templates: OrderItemTemplate[];
  orders: Order[];
  onBack: () => void;
  onAddTemplate: () => void;
  onEditTemplate: (template: OrderItemTemplate) => void;
  onDeleteTemplate: (template: OrderItemTemplate) => void;
  onAddOrder: () => void;
  onEditOrder: (order: Order) => void;
  onDeleteOrder: (order: Order) => void;
  onViewOrder: (order: Order) => void;
}

const CategoryDetailView: React.FC<CategoryDetailViewProps> = ({
  category,
  templates,
  orders,
  onBack,
  onAddTemplate,
  onEditTemplate,
  onDeleteTemplate,
  onAddOrder,
  onEditOrder,
  onDeleteOrder,
  onViewOrder
}) => {
  return (
    <div className="select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 select-none">
        <div className="flex items-center gap-3 select-none">
          <button
            onClick={onBack}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors select-none"
          >
            <X size={20} />
          </button>
          <div className="select-none">
            <h2 className="text-xl font-semibold text-gray-800 select-none">{category.name}</h2>
            <p className="text-sm text-gray-600 select-none">VAT: {category.vatPercentage}%</p>
          </div>
        </div>
        <div className="flex gap-2 select-none">
          <button
            onClick={onAddTemplate}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors select-none"
          >
            <Plus size={18} />
            Add Template
          </button>
          <button
            onClick={onAddOrder}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors select-none"
          >
            <Plus size={18} />
            Add Order
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 select-none">
        
        {/* Templates Section */}
        <div className="select-none">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 select-none">Item Templates</h3>
          {templates.length === 0 ? (
            <div className="text-center py-8 text-gray-500 select-none">
              <Package size={32} className="mx-auto mb-2 text-gray-400" />
              <p className="select-none">No templates yet</p>
            </div>
          ) : (
            <div className="space-y-2 select-none">
              {templates.map((template) => (
                <div key={template.id} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between select-none">
                  <div className="select-none">
                    <h4 className="font-medium text-gray-800 select-none">{template.name}</h4>
                    <p className="text-sm text-gray-600 select-none">
                      Rs {template.unitPrice.toFixed(2)}
                      {template.isVatNil && <span className="text-orange-600 ml-2">(VAT Exempt)</span>}
                    </p>
                  </div>
                  <div className="flex gap-1 select-none">
                    <button
                      onClick={() => onEditTemplate(template)}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors select-none"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => onDeleteTemplate(template)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors select-none"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Orders Section */}
        <div className="select-none">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 select-none">Recent Orders</h3>
          {orders.length === 0 ? (
            <div className="text-center py-8 text-gray-500 select-none">
              <Calendar size={32} className="mx-auto mb-2 text-gray-400" />
              <p className="select-none">No orders yet</p>
            </div>
          ) : (
            <div className="space-y-2 select-none">
              {orders.slice(0, 10).map((order) => (
                <div key={order.id} className="bg-gray-50 rounded-lg p-3 select-none">
                  <div className="flex items-center justify-between mb-2 select-none">
                    <div className="select-none">
                      <p className="font-medium text-gray-800 select-none">
                        {order.orderDate.toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                      <p className="text-sm text-gray-600 select-none">
                        Rs {order.totalCost.toFixed(2)} • {order.items.length} items
                      </p>
                    </div>
                    <div className="flex gap-1 select-none">
                      <button
                        onClick={() => onViewOrder(order)}
                        className="p-1 text-gray-400 hover:text-green-600 transition-colors select-none"
                        title="View order"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => onEditOrder(order)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors select-none"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => onDeleteOrder(order)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors select-none"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * ORDER FORM MODAL COMPONENT
 * ==========================
 */
interface OrderFormModalProps {
  category: OrderCategory;
  templates: OrderItemTemplate[];
  orderDate: string;
  orderItems: OrderItem[];
  onOrderDateChange: (date: string) => void;
  onAddItem: (template: OrderItemTemplate) => void;
  onUpdateQuantity: (templateId: string, quantity: number) => void;
  onToggleAvailability: (templateId: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  calculateTotal: () => number;
  isEditing: boolean;
}

const OrderFormModal: React.FC<OrderFormModalProps> = ({
  category,
  templates,
  orderDate,
  orderItems,
  onOrderDateChange,
  onAddItem,
  onUpdateQuantity,
  onToggleAvailability,
  onSubmit,
  onCancel,
  calculateTotal,
  isEditing
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto select-none">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden select-none">
        <div className="p-6 border-b border-gray-200 select-none">
          <h3 className="text-lg font-semibold text-gray-900 select-none">
            {isEditing ? 'Edit' : 'Add'} Order - {category.name}
          </h3>
        </div>
        
        <div className="p-6 overflow-y-auto select-none" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          <form onSubmit={onSubmit} className="select-none">
            {/* Order Date */}
            <div className="mb-6 select-none">
              <label className="block text-sm font-medium text-gray-700 mb-2 select-none">
                Order Date
              </label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => onOrderDateChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Available Templates */}
            <div className="mb-6 select-none">
              <h4 className="text-md font-medium text-gray-800 mb-3 select-none">Available Items</h4>
              {templates.length === 0 ? (
                <p className="text-gray-500 text-center py-4 select-none">No templates available. Add templates first.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 select-none">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => onAddItem(template)}
                      className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors select-none"
                    >
                      <div className="font-medium text-gray-800 select-none">{template.name}</div>
                      <div className="text-sm text-gray-600 select-none">
                        Rs {template.unitPrice.toFixed(2)}
                        {template.isVatNil && <span className="text-orange-600 ml-1">(VAT Exempt)</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Order Items */}
            {orderItems.length > 0 && (
              <div className="mb-6 select-none">
                <h4 className="text-md font-medium text-gray-800 mb-3 select-none">Order Items</h4>
                <div className="space-y-2 select-none">
                  {orderItems.map((item) => {
                    const template = templates.find(t => t.id === item.templateId);
                    return (
                      <OrderItemRow
                        key={item.templateId}
                        item={item}
                        template={template}
                        onUpdateQuantity={onUpdateQuantity}
                        onToggleAvailability={onToggleAvailability}
                      />
                    );
                  })}
                </div>
                
                {/* Order Total */}
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 select-none">
                  <div className="flex justify-between items-center select-none">
                    <span className="text-lg font-semibold text-gray-800 select-none">Total Cost:</span>
                    <span className="text-xl font-bold text-blue-600 select-none">
                      Rs {calculateTotal().toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 select-none">
                    (Only available items included in total)
                  </p>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex gap-3 select-none">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors select-none"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={orderItems.length === 0}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors select-none"
              >
                {isEditing ? 'Update Order' : 'Create Order'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

/**
 * ORDER ITEM ROW COMPONENT
 * ========================
 */
interface OrderItemRowProps {
  item: OrderItem;
  template: OrderItemTemplate | undefined;
  onUpdateQuantity: (templateId: string, quantity: number) => void;
  onToggleAvailability: (templateId: string) => void;
}

const OrderItemRow: React.FC<OrderItemRowProps> = ({
  item,
  template,
  onUpdateQuantity,
  onToggleAvailability
}) => {
  return (
    <div className={`p-3 rounded-lg border transition-colors select-none ${
      item.isAvailable ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300'
    }`}>
      <div className="flex items-center justify-between select-none">
        <div className="flex-1 select-none">
          <div className="flex items-center gap-2 mb-1 select-none">
            <button
              onClick={() => onToggleAvailability(item.templateId)}
              className={`p-1 rounded transition-colors select-none ${
                item.isAvailable 
                  ? 'text-green-600 hover:bg-green-50' 
                  : 'text-gray-400 hover:bg-gray-100'
              }`}
              title={item.isAvailable ? 'Mark as unavailable' : 'Mark as available'}
            >
              {item.isAvailable ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
            <h4 className={`font-medium select-none ${
              item.isAvailable ? 'text-gray-800' : 'text-gray-500 line-through'
            }`}>
              {template?.name || 'Unknown Item'}
            </h4>
          </div>
          <div className="text-sm text-gray-600 ml-7 select-none">
            Rs {item.unitPrice.toFixed(2)} × {item.quantity}
            {!item.isVatNil && <span className="ml-2">+ VAT ({template?.vatPercentage || 15}%)</span>}
            {item.isVatNil && <span className="text-orange-600 ml-2">(VAT Exempt)</span>}
          </div>
        </div>
        
        <div className="flex items-center gap-3 select-none">
          <div className="flex items-center gap-2 select-none">
            <button
              onClick={() => onUpdateQuantity(item.templateId, item.quantity - 1)}
              className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition-colors select-none"
            >
              -
            </button>
            <span className="w-8 text-center font-medium select-none">{item.quantity}</span>
            <button
              onClick={() => onUpdateQuantity(item.templateId, item.quantity + 1)}
              className="w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-colors select-none"
            >
              +
            </button>
          </div>
          
          <div className="text-right select-none">
            <div className={`font-semibold select-none ${
              item.isAvailable ? 'text-gray-800' : 'text-gray-500'
            }`}>
              Rs {item.totalPrice.toFixed(2)}
            </div>
            {!item.isAvailable && (
              <div className="text-xs text-red-600 select-none">Not included</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * ORDER DETAIL MODAL COMPONENT
 * ============================
 */
interface OrderDetailModalProps {
  order: Order;
  category: OrderCategory;
  templates: OrderItemTemplate[];
  onClose: () => void;
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  category,
  templates,
  onClose
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto select-none">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden select-none">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 select-none">
          <div className="select-none">
            <h2 className="text-xl font-semibold text-gray-900 select-none">{category.name} Order</h2>
            <p className="text-gray-600 select-none">
              {order.orderDate.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors select-none"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto select-none" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          
          {/* Order Items */}
          <div className="space-y-3 mb-6 select-none">
            {order.items.map((item) => {
              const template = templates.find(t => t.id === item.templateId);
              return (
                <div key={item.id} className={`p-4 rounded-lg border select-none ${
                  item.isAvailable ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300'
                }`}>
                  <div className="flex justify-between items-start select-none">
                    <div className="flex-1 select-none">
                      <div className="flex items-center gap-2 mb-1 select-none">
                        {item.isAvailable ? (
                          <Eye size={16} className="text-green-600" />
                        ) : (
                          <EyeOff size={16} className="text-gray-400" />
                        )}
                        <h4 className={`font-medium select-none ${
                          item.isAvailable ? 'text-gray-800' : 'text-gray-500 line-through'
                        }`}>
                          {template?.name || 'Unknown Item'}
                        </h4>
                      </div>
                      <div className="text-sm text-gray-600 ml-6 select-none">
                        Quantity: {item.quantity} × Rs {item.unitPrice.toFixed(2)}
                        {!item.isVatNil && (
                          <span className="ml-2">+ VAT Rs {item.vatAmount.toFixed(2)}</span>
                        )}
                        {item.isVatNil && <span className="text-orange-600 ml-2">(VAT Exempt)</span>}
                      </div>
                    </div>
                    
                    <div className="text-right select-none">
                      <div className={`text-lg font-semibold select-none ${
                        item.isAvailable ? 'text-gray-800' : 'text-gray-500'
                      }`}>
                        Rs {item.totalPrice.toFixed(2)}
                      </div>
                      {!item.isAvailable && (
                        <div className="text-xs text-red-600 select-none">Not included</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 select-none">
            <div className="flex justify-between items-center mb-2 select-none">
              <span className="text-lg font-semibold text-gray-800 select-none">Order Total:</span>
              <span className="text-2xl font-bold text-blue-600 select-none">
                Rs {order.totalCost.toFixed(2)}
              </span>
            </div>
            <div className="text-sm text-gray-600 select-none">
              {order.items.filter(item => item.isAvailable).length} of {order.items.length} items included
            </div>
            {order.lastEditedAt && (
              <div className="text-xs text-gray-500 mt-2 select-none">
                Last edited: {order.lastEditedAt.toLocaleDateString('en-GB')} at {order.lastEditedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end select-none">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors select-none"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderManagement;