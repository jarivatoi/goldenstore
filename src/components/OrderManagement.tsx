import React, { useState } from 'react';
import { Plus, Search, Edit, Trash2, Package, ShoppingCart, X, Check, AlertTriangle } from 'lucide-react';
import { useOrder } from '../context/OrderContext';
import { OrderCategory, OrderItemTemplate, Order, OrderItem } from '../types';
import ConfirmationModal from './ConfirmationModal';

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

  // UI State
  const [activeTab, setActiveTab] = useState<'categories' | 'templates' | 'orders'>('categories');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<OrderCategory | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Form states
  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);
  const [showAddTemplateForm, setShowAddTemplateForm] = useState(false);
  const [showAddOrderForm, setShowAddOrderForm] = useState(false);
  const [showEditCategoryForm, setShowEditCategoryForm] = useState(false);
  const [showEditTemplateForm, setShowEditTemplateForm] = useState(false);
  const [showEditOrderForm, setShowEditOrderForm] = useState(false);
  
  // Form data
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryVat, setNewCategoryVat] = useState('15');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplatePrice, setNewTemplatePrice] = useState('');
  const [newTemplateVatNil, setNewTemplateVatNil] = useState(false);
  const [newTemplateVatIncluded, setNewTemplateVatIncluded] = useState(false);
  const [newTemplateVatPercentage, setNewTemplateVatPercentage] = useState('15');
  
  // Edit states
  const [editingCategory, setEditingCategory] = useState<OrderCategory | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<OrderItemTemplate | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryVat, setEditCategoryVat] = useState('15');
  const [editTemplateName, setEditTemplateName] = useState('');
  const [editTemplatePrice, setEditTemplatePrice] = useState('');
  const [editTemplateVatNil, setEditTemplateVatNil] = useState(false);
  const [editTemplateVatIncluded, setEditTemplateVatIncluded] = useState(false);
  const [editTemplateVatPercentage, setEditTemplateVatPercentage] = useState('15');
  
  // Order form states
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [editOrderDate, setEditOrderDate] = useState('');
  const [editOrderItems, setEditOrderItems] = useState<OrderItem[]>([]);
  
  // Modal states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'category' | 'template' | 'order'; id: string; name: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get filtered data
  const filteredCategories = searchCategories(searchQuery);
  const categoryTemplates = selectedCategory ? getItemTemplatesByCategory(selectedCategory.id) : [];
  const categoryOrders = selectedCategory ? getOrdersByCategory(selectedCategory.id) : [];

  // Calculate VAT amount based on template settings
  const calculateVatAmount = (template: OrderItemTemplate, quantity: number): number => {
    if (template.isVatNil) {
      return 0; // No VAT
    }
    
    if (template.isVatIncluded) {
      return 0; // VAT already included in price, don't add extra
    }
    
    // VAT not included, calculate and add VAT
    const baseAmount = template.unitPrice * quantity;
    return (baseAmount * template.vatPercentage) / 100;
  };

  // Calculate total price for an order item
  const calculateTotalPrice = (template: OrderItemTemplate, quantity: number): number => {
    const baseAmount = template.unitPrice * quantity;
    const vatAmount = calculateVatAmount(template, quantity);
    return baseAmount + vatAmount;
  };

  // Handle category operations
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCategoryName.trim()) {
      alert('Please enter a category name');
      return;
    }

    try {
      setIsSubmitting(true);
      const vatPercentage = parseFloat(newCategoryVat) || 15;
      await addCategory(newCategoryName.trim(), vatPercentage);
      setNewCategoryName('');
      setNewCategoryVat('15');
      setShowAddCategoryForm(false);
    } catch (err) {
      console.error('Error adding category:', err);
      alert(err instanceof Error ? err.message : 'Failed to add category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCategory = (category: OrderCategory) => {
    setEditingCategory(category);
    setEditCategoryName(category.name);
    setEditCategoryVat(category.vatPercentage.toString());
    setShowEditCategoryForm(true);
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingCategory || !editCategoryName.trim()) {
      return;
    }

    try {
      setIsSubmitting(true);
      const vatPercentage = parseFloat(editCategoryVat) || 15;
      await updateCategory(editingCategory.id, editCategoryName.trim(), vatPercentage);
      setShowEditCategoryForm(false);
      setEditingCategory(null);
    } catch (err) {
      console.error('Error updating category:', err);
      alert('Failed to update category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = (category: OrderCategory) => {
    setDeleteTarget({ type: 'category', id: category.id, name: category.name });
    setShowDeleteConfirm(true);
  };

  // Handle template operations
  const handleAddTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCategory || !newTemplateName.trim() || !newTemplatePrice) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      const unitPrice = parseFloat(newTemplatePrice);
      const vatPercentage = parseFloat(newTemplateVatPercentage) || 15;
      
      await addItemTemplate(
        selectedCategory.id, 
        newTemplateName.trim(), 
        unitPrice, 
        newTemplateVatNil,
        newTemplateVatIncluded,
        vatPercentage
      );
      
      // Reset form
      setNewTemplateName('');
      setNewTemplatePrice('');
      setNewTemplateVatNil(false);
      setNewTemplateVatIncluded(false);
      setNewTemplateVatPercentage('15');
      setShowAddTemplateForm(false);
    } catch (err) {
      console.error('Error adding template:', err);
      alert(err instanceof Error ? err.message : 'Failed to add item template');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTemplate = (template: OrderItemTemplate) => {
    setEditingTemplate(template);
    setEditTemplateName(template.name);
    setEditTemplatePrice(template.unitPrice.toString());
    setEditTemplateVatNil(template.isVatNil);
    setEditTemplateVatIncluded(template.isVatIncluded);
    setEditTemplateVatPercentage(template.vatPercentage.toString());
    setShowEditTemplateForm(true);
  };

  const handleUpdateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingTemplate || !editTemplateName.trim() || !editTemplatePrice) {
      return;
    }

    try {
      setIsSubmitting(true);
      const unitPrice = parseFloat(editTemplatePrice);
      const vatPercentage = parseFloat(editTemplateVatPercentage) || 15;
      
      console.log('🔧 Updating template with values:', {
        id: editingTemplate.id,
        name: editTemplateName.trim(),
        unitPrice,
        isVatNil: editTemplateVatNil,
        isVatIncluded: editTemplateVatIncluded,
        vatPercentage
      });
      
      await updateItemTemplate(
        editingTemplate.id,
        editTemplateName.trim(),
        unitPrice,
        editTemplateVatNil,
        editTemplateVatIncluded,
        vatPercentage
      );
      
      setShowEditTemplateForm(false);
      setEditingTemplate(null);
    } catch (err) {
      console.error('Error updating template:', err);
      alert('Failed to update item template');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTemplate = (template: OrderItemTemplate) => {
    setDeleteTarget({ type: 'template', id: template.id, name: template.name });
    setShowDeleteConfirm(true);
  };

  // Handle order operations
  const handleAddOrderItem = (template: OrderItemTemplate) => {
    const existingItem = orderItems.find(item => item.templateId === template.id);
    
    if (existingItem) {
      // Increase quantity
      setOrderItems(prev => prev.map(item => 
        item.templateId === template.id 
          ? { 
              ...item, 
              quantity: item.quantity + 1,
              vatAmount: calculateVatAmount(template, item.quantity + 1),
              totalPrice: calculateTotalPrice(template, item.quantity + 1)
            }
          : item
      ));
    } else {
      // Add new item
      const newOrderItem: OrderItem = {
        id: crypto.randomUUID(),
        templateId: template.id,
        quantity: 1,
        unitPrice: template.unitPrice,
        isVatNil: template.isVatNil,
        vatAmount: calculateVatAmount(template, 1),
        totalPrice: calculateTotalPrice(template, 1),
        isAvailable: true
      };
      
      setOrderItems(prev => [...prev, newOrderItem]);
    }
  };

  const handleUpdateOrderItemQuantity = (templateId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setOrderItems(prev => prev.filter(item => item.templateId !== templateId));
      return;
    }

    const template = itemTemplates.find(t => t.id === templateId);
    if (!template) return;

    setOrderItems(prev => prev.map(item => 
      item.templateId === templateId 
        ? { 
            ...item, 
            quantity: newQuantity,
            vatAmount: calculateVatAmount(template, newQuantity),
            totalPrice: calculateTotalPrice(template, newQuantity)
          }
        : item
    ));
  };

  const handleToggleOrderItemAvailability = (templateId: string) => {
    setOrderItems(prev => prev.map(item => 
      item.templateId === templateId 
        ? { ...item, isAvailable: !item.isAvailable }
        : item
    ));
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCategory || orderItems.length === 0) {
      alert('Please select a category and add items to the order');
      return;
    }

    try {
      setIsSubmitting(true);
      await addOrder(selectedCategory.id, new Date(orderDate), orderItems);
      
      // Reset form
      setOrderItems([]);
      setOrderDate(new Date().toISOString().split('T')[0]);
      setShowAddOrderForm(false);
    } catch (err) {
      console.error('Error creating order:', err);
      alert(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setEditOrderDate(order.orderDate.toISOString().split('T')[0]);
    setEditOrderItems([...order.items]);
    setShowEditOrderForm(true);
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingOrder || editOrderItems.length === 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      await updateOrder(editingOrder.id, new Date(editOrderDate), editOrderItems);
      setShowEditOrderForm(false);
      setEditingOrder(null);
    } catch (err) {
      console.error('Error updating order:', err);
      alert('Failed to update order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOrder = (order: Order) => {
    setDeleteTarget({ type: 'order', id: order.id, name: `Order from ${order.orderDate.toLocaleDateString()}` });
    setShowDeleteConfirm(true);
  };

  // Handle delete confirmation
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      setIsSubmitting(true);
      
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
      
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    } catch (err) {
      console.error('Error deleting:', err);
      alert(`Failed to delete ${deleteTarget.type}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate order total
  const calculateOrderTotal = (items: OrderItem[]): number => {
    return items
      .filter(item => item.isAvailable)
      .reduce((sum, item) => sum + item.totalPrice, 0);
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
      
      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 shadow-sm p-4 select-none">
        <div className="flex gap-2 mb-4 select-none">
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 rounded-lg transition-colors select-none ${
              activeTab === 'categories'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Categories ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            disabled={!selectedCategory}
            className={`px-4 py-2 rounded-lg transition-colors select-none ${
              activeTab === 'templates'
                ? 'bg-blue-500 text-white'
                : selectedCategory
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-gray-50 text-gray-400 cursor-not-allowed'
            }`}
          >
            Items ({selectedCategory ? categoryTemplates.length : 0})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            disabled={!selectedCategory}
            className={`px-4 py-2 rounded-lg transition-colors select-none ${
              activeTab === 'orders'
                ? 'bg-blue-500 text-white'
                : selectedCategory
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-gray-50 text-gray-400 cursor-not-allowed'
            }`}
          >
            Orders ({selectedCategory ? categoryOrders.length : 0})
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md select-none">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={20} className="text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories..."
            className="block w-full pl-10 pr-4 py-3 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-3 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
          />
        </div>

        {selectedCategory && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200 select-none">
            <h3 className="font-medium text-blue-800 select-none">
              Selected: {selectedCategory.name} (VAT: {selectedCategory.vatPercentage}%)
            </h3>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 select-none">
        
        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="select-none">
            {/* Add Category Button */}
            <div className="mb-6 select-none">
              {!showAddCategoryForm ? (
                <button
                  onClick={() => setShowAddCategoryForm(true)}
                  className="w-full max-w-md mx-auto bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-lg flex items-center justify-center transition-colors duration-200 shadow-sm text-lg select-none"
                >
                  <Plus size={22} className="mr-3" />
                  <span className="select-none">Add Category</span>
                </button>
              ) : (
                <form onSubmit={handleAddCategory} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 w-full max-w-2xl mx-auto select-none">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-2 select-none">
                        Category Name
                      </label>
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        disabled={isSubmitting}
                        className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="Enter category name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-2 select-none">
                        Default VAT Percentage
                      </label>
                      <input
                        type="number"
                        value={newCategoryVat}
                        onChange={(e) => setNewCategoryVat(e.target.value)}
                        step="0.01"
                        min="0"
                        max="100"
                        disabled={isSubmitting}
                        className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="15"
                      />
                    </div>
                  </div>
                  
                  {error && <p className="text-red-500 text-base mb-4 select-none">{error}</p>}
                  
                  <div className="flex gap-4 select-none">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 text-lg rounded-md transition-colors duration-200 disabled:bg-blue-300 disabled:cursor-not-allowed select-none"
                    >
                      {isSubmitting ? 'Adding...' : 'Add Category'}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddCategoryForm(false);
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
            </div>

            {/* Categories List */}
            {filteredCategories.length === 0 ? (
              <div className="text-center py-12 select-none">
                <Package size={48} className="text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 mb-2 select-none">No categories found</h3>
                <p className="text-gray-600 select-none">
                  {searchQuery ? `No categories match "${searchQuery}"` : 'Create your first category to get started'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 select-none">
                {filteredCategories.map((category) => (
                  <div
                    key={category.id}
                    className={`bg-white rounded-lg shadow-sm border p-4 cursor-pointer transition-all duration-200 select-none ${
                      selectedCategory?.id === category.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:shadow-md hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedCategory(category)}
                  >
                    <div className="flex items-center justify-between mb-2 select-none">
                      <h3 className="font-semibold text-gray-800 select-none">{category.name}</h3>
                      <div className="flex gap-1 select-none">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditCategory(category);
                          }}
                          className="p-1 text-gray-500 hover:text-blue-600 transition-colors select-none"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCategory(category);
                          }}
                          className="p-1 text-gray-500 hover:text-red-600 transition-colors select-none"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 select-none">VAT: {category.vatPercentage}%</p>
                    <p className="text-xs text-gray-500 select-none">
                      {getItemTemplatesByCategory(category.id).length} items, {getOrdersByCategory(category.id).length} orders
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && selectedCategory && (
          <div className="select-none">
            {/* Add Template Button */}
            <div className="mb-6 select-none">
              {!showAddTemplateForm ? (
                <button
                  onClick={() => setShowAddTemplateForm(true)}
                  className="w-full max-w-md mx-auto bg-green-500 hover:bg-green-600 text-white py-3 px-6 rounded-lg flex items-center justify-center transition-colors duration-200 shadow-sm text-lg select-none"
                >
                  <Plus size={22} className="mr-3" />
                  <span className="select-none">Add Item Template</span>
                </button>
              ) : (
                <form onSubmit={handleAddTemplate} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 w-full max-w-2xl mx-auto select-none">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-2 select-none">
                        Item Name
                      </label>
                      <input
                        type="text"
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        disabled={isSubmitting}
                        className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="Enter item name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-2 select-none">
                        Unit Price (Rs)
                      </label>
                      <input
                        type="number"
                        value={newTemplatePrice}
                        onChange={(e) => setNewTemplatePrice(e.target.value)}
                        step="0.01"
                        min="0.01"
                        disabled={isSubmitting}
                        className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* VAT Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="newTemplateVatNil"
                        checked={newTemplateVatNil}
                        onChange={(e) => {
                          setNewTemplateVatNil(e.target.checked);
                          if (e.target.checked) {
                            setNewTemplateVatIncluded(false); // Can't be both nil and included
                          }
                        }}
                        disabled={isSubmitting}
                        className="mr-2"
                      />
                      <label htmlFor="newTemplateVatNil" className="text-sm font-medium text-gray-700 select-none">
                        VAT Exempt
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="newTemplateVatIncluded"
                        checked={newTemplateVatIncluded}
                        onChange={(e) => {
                          setNewTemplateVatIncluded(e.target.checked);
                          if (e.target.checked) {
                            setNewTemplateVatNil(false); // Can't be both nil and included
                          }
                        }}
                        disabled={isSubmitting || newTemplateVatNil}
                        className="mr-2"
                      />
                      <label htmlFor="newTemplateVatIncluded" className="text-sm font-medium text-gray-700 select-none">
                        VAT Included
                      </label>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 select-none">
                        VAT %
                      </label>
                      <input
                        type="number"
                        value={newTemplateVatPercentage}
                        onChange={(e) => setNewTemplateVatPercentage(e.target.value)}
                        step="0.01"
                        min="0"
                        max="100"
                        disabled={isSubmitting || newTemplateVatNil}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
                        placeholder="15"
                      />
                    </div>
                  </div>
                  
                  {error && <p className="text-red-500 text-base mb-4 select-none">{error}</p>}
                  
                  <div className="flex gap-4 select-none">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 px-6 text-lg rounded-md transition-colors duration-200 disabled:bg-green-300 disabled:cursor-not-allowed select-none"
                    >
                      {isSubmitting ? 'Adding...' : 'Add Template'}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddTemplateForm(false);
                        setNewTemplateName('');
                        setNewTemplatePrice('');
                        setNewTemplateVatNil(false);
                        setNewTemplateVatIncluded(false);
                        setNewTemplateVatPercentage('15');
                      }}
                      disabled={isSubmitting}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-6 text-lg rounded-md transition-colors duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed select-none"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Templates List */}
            {categoryTemplates.length === 0 ? (
              <div className="text-center py-12 select-none">
                <Package size={48} className="text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 mb-2 select-none">No item templates</h3>
                <p className="text-gray-600 select-none">Add item templates for {selectedCategory.name}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 select-none">
                {categoryTemplates.map((template) => (
                  <div key={template.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 select-none">
                    <div className="flex items-center justify-between mb-2 select-none">
                      <h4 className="font-semibold text-gray-800 select-none">{template.name}</h4>
                      <div className="flex gap-1 select-none">
                        <button
                          onClick={() => handleEditTemplate(template)}
                          className="p-1 text-gray-500 hover:text-blue-600 transition-colors select-none"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template)}
                          className="p-1 text-gray-500 hover:text-red-600 transition-colors select-none"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-green-600 mb-2 select-none">
                      Rs {template.unitPrice.toFixed(2)}
                    </p>
                    <div className="space-y-1 text-xs text-gray-600 select-none">
                      <p className="select-none">
                        VAT: {template.isVatNil ? 'Exempt' : template.isVatIncluded ? 'Included' : 'Not Included'} ({template.vatPercentage}%)
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && selectedCategory && (
          <div className="select-none">
            {/* Add Order Button */}
            <div className="mb-6 select-none">
              {!showAddOrderForm ? (
                <button
                  onClick={() => setShowAddOrderForm(true)}
                  className="w-full max-w-md mx-auto bg-purple-500 hover:bg-purple-600 text-white py-3 px-6 rounded-lg flex items-center justify-center transition-colors duration-200 shadow-sm text-lg select-none"
                >
                  <Plus size={22} className="mr-3" />
                  <span className="select-none">Create Order</span>
                </button>
              ) : (
                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 w-full max-w-4xl mx-auto select-none">
                  <form onSubmit={handleCreateOrder} className="select-none">
                    <div className="mb-4 select-none">
                      <label className="block text-base font-medium text-gray-700 mb-2 select-none">
                        Order Date
                      </label>
                      <input
                        type="date"
                        value={orderDate}
                        onChange={(e) => setOrderDate(e.target.value)}
                        disabled={isSubmitting}
                        className="px-4 py-3 text-lg border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* Available Templates */}
                    <div className="mb-6 select-none">
                      <h4 className="text-lg font-medium text-gray-800 mb-3 select-none">Available Items</h4>
                      {categoryTemplates.length === 0 ? (
                        <p className="text-gray-600 select-none">No item templates available. Add templates first.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 select-none">
                          {categoryTemplates.map((template) => (
                            <button
                              key={template.id}
                              type="button"
                              onClick={() => handleAddOrderItem(template)}
                              className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors text-left select-none"
                            >
                              <div className="select-none">
                                <h5 className="font-medium text-gray-800 select-none">{template.name}</h5>
                                <p className="text-sm text-gray-600 select-none">
                                  Rs {template.unitPrice.toFixed(2)} 
                                  {template.isVatNil ? ' (VAT Exempt)' : template.isVatIncluded ? ' (VAT Included)' : ' + VAT'}
                                </p>
                              </div>
                              <Plus size={20} className="text-green-600" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Order Items */}
                    {orderItems.length > 0 && (
                      <div className="mb-6 select-none">
                        <h4 className="text-lg font-medium text-gray-800 mb-3 select-none">Order Items</h4>
                        <div className="space-y-2 select-none">
                          {orderItems.map((item) => {
                            const template = itemTemplates.find(t => t.id === item.templateId);
                            if (!template) return null;
                            
                            return (
                              <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 select-none">
                                <div className="flex-1 select-none">
                                  <h5 className="font-medium text-gray-800 select-none">{template.name}</h5>
                                  <p className="text-sm text-gray-600 select-none">
                                    Rs {template.unitPrice.toFixed(2)} × {item.quantity} = Rs {(template.unitPrice * item.quantity).toFixed(2)}
                                    {!template.isVatNil && !template.isVatIncluded && (
                                      <span> + VAT Rs {item.vatAmount.toFixed(2)}</span>
                                    )}
                                    {template.isVatIncluded && (
                                      <span> (VAT Included)</span>
                                    )}
                                    {template.isVatNil && (
                                      <span> (VAT Exempt)</span>
                                    )}
                                  </p>
                                  <p className="text-lg font-bold text-purple-600 select-none">
                                    Total: Rs {item.totalPrice.toFixed(2)}
                                  </p>
                                </div>
                                
                                <div className="flex items-center gap-2 select-none">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateOrderItemQuantity(item.templateId, item.quantity - 1)}
                                    className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center select-none"
                                  >
                                    <Minus size={16} />
                                  </button>
                                  <span className="w-8 text-center font-medium select-none">{item.quantity}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateOrderItemQuantity(item.templateId, item.quantity + 1)}
                                    className="w-8 h-8 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center select-none"
                                  >
                                    <Plus size={16} />
                                  </button>
                                  
                                  <button
                                    type="button"
                                    onClick={() => handleToggleOrderItemAvailability(item.templateId)}
                                    className={`ml-2 px-3 py-1 rounded-full text-xs font-medium transition-colors select-none ${
                                      item.isAvailable
                                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                                    }`}
                                  >
                                    {item.isAvailable ? 'Available' : 'Unavailable'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                        <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200 select-none">
                          <div className="flex justify-between items-center select-none">
                            <span className="text-lg font-semibold text-gray-800 select-none">Order Total:</span>
                            <span className="text-2xl font-bold text-purple-600 select-none">
                              Rs {calculateOrderTotal(orderItems).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {error && <p className="text-red-500 text-base mb-4 select-none">{error}</p>}
                    
                    <div className="flex gap-4 select-none">
                      <button
                        type="submit"
                        disabled={isSubmitting || orderItems.length === 0}
                        className="flex-1 bg-purple-500 hover:bg-purple-600 text-white py-3 px-6 text-lg rounded-md transition-colors duration-200 disabled:bg-purple-300 disabled:cursor-not-allowed select-none"
                      >
                        {isSubmitting ? 'Creating...' : 'Create Order'}
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddOrderForm(false);
                          setOrderItems([]);
                          setOrderDate(new Date().toISOString().split('T')[0]);
                        }}
                        disabled={isSubmitting}
                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-6 text-lg rounded-md transition-colors duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed select-none"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Templates List */}
            {categoryTemplates.length === 0 ? (
              <div className="text-center py-12 select-none">
                <Package size={48} className="text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 mb-2 select-none">No item templates</h3>
                <p className="text-gray-600 select-none">Add item templates for {selectedCategory.name}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 select-none">
                {categoryTemplates.map((template) => (
                  <div key={template.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 select-none">
                    <div className="flex items-center justify-between mb-2 select-none">
                      <h4 className="font-semibold text-gray-800 select-none">{template.name}</h4>
                      <div className="flex gap-1 select-none">
                        <button
                          onClick={() => handleEditTemplate(template)}
                          className="p-1 text-gray-500 hover:text-blue-600 transition-colors select-none"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template)}
                          className="p-1 text-gray-500 hover:text-red-600 transition-colors select-none"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-green-600 mb-2 select-none">
                      Rs {template.unitPrice.toFixed(2)}
                    </p>
                    <div className="space-y-1 text-xs text-gray-600 select-none">
                      <p className="select-none">
                        VAT: {template.isVatNil ? 'Exempt' : template.isVatIncluded ? 'Included' : 'Not Included'} ({template.vatPercentage}%)
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && selectedCategory && (
          <div className="select-none">
            {categoryOrders.length === 0 ? (
              <div className="text-center py-12 select-none">
                <ShoppingCart size={48} className="text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 mb-2 select-none">No orders</h3>
                <p className="text-gray-600 select-none">Create orders for {selectedCategory.name}</p>
              </div>
            ) : (
              <div className="space-y-4 select-none">
                {categoryOrders.map((order) => (
                  <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 select-none">
                    <div className="flex items-center justify-between mb-3 select-none">
                      <div className="select-none">
                        <h4 className="font-semibold text-gray-800 select-none">
                          Order - {order.orderDate.toLocaleDateString('en-GB')}
                        </h4>
                        <p className="text-sm text-gray-600 select-none">
                          {order.items.length} items • Total: Rs {order.totalCost.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex gap-1 select-none">
                        <button
                          onClick={() => handleEditOrder(order)}
                          className="p-2 text-gray-500 hover:text-blue-600 transition-colors select-none"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(order)}
                          className="p-2 text-gray-500 hover:text-red-600 transition-colors select-none"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2 select-none">
                      {order.items.map((item) => {
                        const template = itemTemplates.find(t => t.id === item.templateId);
                        if (!template) return null;
                        
                        return (
                          <div key={item.id} className="flex justify-between items-center p-2 bg-gray-50 rounded select-none">
                            <div className="select-none">
                              <span className="font-medium select-none">{template.name}</span>
                              <span className="text-sm text-gray-600 ml-2 select-none">
                                × {item.quantity}
                                {!item.isAvailable && <span className="text-red-600 ml-1">(Unavailable)</span>}
                              </span>
                            </div>
                            <span className="font-semibold text-gray-800 select-none">
                              Rs {item.totalPrice.toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Category Modal */}
      {showEditCategoryForm && editingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 select-none">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden select-none">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 select-none">
              <h2 className="text-xl font-semibold text-gray-900 select-none">Edit Category</h2>
              <button 
                onClick={() => {
                  setShowEditCategoryForm(false);
                  setEditingCategory(null);
                }}
                className="text-gray-500 hover:text-gray-700 transition-colors select-none"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateCategory} className="p-6 select-none">
              <div className="mb-4 select-none">
                <label className="block text-sm font-medium text-gray-700 mb-2 select-none">
                  Category Name
                </label>
                <input
                  type="text"
                  value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
              
              <div className="mb-4 select-none">
                <label className="block text-sm font-medium text-gray-700 mb-2 select-none">
                  Default VAT Percentage
                </label>
                <input
                  type="number"
                  value={editCategoryVat}
                  onChange={(e) => setEditCategoryVat(e.target.value)}
                  step="0.01"
                  min="0"
                  max="100"
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
              
              <div className="flex justify-end gap-2 select-none">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditCategoryForm(false);
                    setEditingCategory(null);
                  }}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 select-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 select-none"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Template Modal */}
      {showEditTemplateForm && editingTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 select-none">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden select-none">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 select-none">
              <h2 className="text-xl font-semibold text-gray-900 select-none">Edit Item Template</h2>
              <button 
                onClick={() => {
                  setShowEditTemplateForm(false);
                  setEditingTemplate(null);
                }}
                className="text-gray-500 hover:text-gray-700 transition-colors select-none"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateTemplate} className="p-6 select-none">
              <div className="mb-4 select-none">
                <label className="block text-sm font-medium text-gray-700 mb-2 select-none">
                  Item Name
                </label>
                <input
                  type="text"
                  value={editTemplateName}
                  onChange={(e) => setEditTemplateName(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
              
              <div className="mb-4 select-none">
                <label className="block text-sm font-medium text-gray-700 mb-2 select-none">
                  Unit Price (Rs)
                </label>
                <input
                  type="number"
                  value={editTemplatePrice}
                  onChange={(e) => setEditTemplatePrice(e.target.value)}
                  step="0.01"
                  min="0.01"
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              {/* VAT Settings */}
              <div className="mb-4 space-y-3 select-none">
                <div className="flex items-center select-none">
                  <input
                    type="checkbox"
                    id="editTemplateVatNil"
                    checked={editTemplateVatNil}
                    onChange={(e) => {
                      console.log('🔧 VAT Exempt changed to:', e.target.checked);
                      setEditTemplateVatNil(e.target.checked);
                      if (e.target.checked) {
                        setEditTemplateVatIncluded(false); // Can't be both nil and included
                        console.log('🔧 VAT Included set to false due to VAT Exempt');
                      }
                    }}
                    disabled={isSubmitting}
                    className="mr-2"
                  />
                  <label htmlFor="editTemplateVatNil" className="text-sm font-medium text-gray-700 select-none">
                    VAT Exempt
                  </label>
                </div>
                
                <div className="flex items-center select-none">
                  <input
                    type="checkbox"
                    id="editTemplateVatIncluded"
                    checked={editTemplateVatIncluded}
                    onChange={(e) => {
                      console.log('🔧 VAT Included changed to:', e.target.checked);
                      setEditTemplateVatIncluded(e.target.checked);
                      if (e.target.checked) {
                        setEditTemplateVatNil(false); // Can't be both nil and included
                        console.log('🔧 VAT Exempt set to false due to VAT Included');
                      }
                    }}
                    disabled={isSubmitting || editTemplateVatNil}
                    className="mr-2"
                  />
                  <label htmlFor="editTemplateVatIncluded" className="text-sm font-medium text-gray-700 select-none">
                    VAT Included in Price
                  </label>
                </div>
                
                <div className="select-none">
                  <label className="block text-sm font-medium text-gray-700 mb-1 select-none">
                    VAT Percentage
                  </label>
                  <input
                    type="number"
                    value={editTemplateVatPercentage}
                    onChange={(e) => {
                      console.log('🔧 VAT Percentage changed to:', e.target.value);
                      setEditTemplateVatPercentage(e.target.value);
                    }}
                    step="0.01"
                    min="0"
                    max="100"
                    disabled={isSubmitting || editTemplateVatNil}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    placeholder="15"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 select-none">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditTemplateForm(false);
                    setEditingTemplate(null);
                  }}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 select-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 select-none"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title={`Delete ${deleteTarget?.type || 'Item'}`}
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText={isSubmitting ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        type="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
};

export default OrderManagement;