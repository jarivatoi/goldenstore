import React, { useState } from 'react';
import { Plus, Search, Edit, Trash2, Package, ShoppingCart, Calendar, X, Check, AlertTriangle } from 'lucide-react';
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

  // UI State
  const [activeTab, setActiveTab] = useState<'categories' | 'items' | 'orders'>('categories');
  const [selectedCategory, setSelectedCategory] = useState<OrderCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Category form state
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryVatPercentage, setCategoryVatPercentage] = useState(15);
  const [editingCategory, setEditingCategory] = useState<OrderCategory | null>(null);
  
  // Item template form state
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemIsVatNil, setItemIsVatNil] = useState(false);
  const [itemIsVatIncluded, setItemIsVatIncluded] = useState(false);
  const [itemVatPercentage, setItemVatPercentage] = useState(15);
  const [editingItem, setEditingItem] = useState<OrderItemTemplate | null>(null);
  
  // Order form state
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  
  // Modal states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'category' | 'item' | 'order'; id: string; name: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get filtered categories
  const filteredCategories = searchCategories(searchQuery);

  // Handle category operations
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!categoryName.trim()) {
      alert('Please enter a category name');
      return;
    }

    try {
      setIsSubmitting(true);
      
      if (editingCategory) {
        await updateCategory(editingCategory.id, categoryName, categoryVatPercentage);
      } else {
        await addCategory(categoryName, categoryVatPercentage);
      }
      
      // Reset form
      setCategoryName('');
      setCategoryVatPercentage(15);
      setShowCategoryForm(false);
      setEditingCategory(null);
    } catch (err) {
      console.error('Failed to save category:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCategory = (category: OrderCategory) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryVatPercentage(category.vatPercentage);
    setShowCategoryForm(true);
  };

  const handleDeleteCategory = (category: OrderCategory) => {
    setDeleteTarget({ type: 'category', id: category.id, name: category.name });
    setShowDeleteConfirm(true);
  };

  // Handle item template operations
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCategory) {
      alert('Please select a category first');
      return;
    }
    
    if (!itemName.trim()) {
      alert('Please enter an item name');
      return;
    }
    
    const price = parseFloat(itemPrice);
    if (isNaN(price) || price <= 0) {
      alert('Please enter a valid price');
      return;
    }

    try {
      setIsSubmitting(true);
      
      if (editingItem) {
        await updateItemTemplate(
          editingItem.id, 
          itemName, 
          price, 
          itemIsVatNil, 
          itemIsVatIncluded,
          itemVatPercentage
        );
      } else {
        await addItemTemplate(
          selectedCategory.id, 
          itemName, 
          price, 
          itemIsVatNil, 
          itemIsVatIncluded,
          itemVatPercentage
        );
      }
      
      // Reset form
      setItemName('');
      setItemPrice('');
      setItemIsVatNil(false);
      setItemIsVatIncluded(false);
      setItemVatPercentage(15);
      setShowItemForm(false);
      setEditingItem(null);
    } catch (err) {
      console.error('Failed to save item:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditItem = (item: OrderItemTemplate) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemPrice(item.unitPrice.toString());
    setItemIsVatNil(item.isVatNil);
    setItemIsVatIncluded(item.isVatIncluded || false);
    setItemVatPercentage(item.vatPercentage);
    setShowItemForm(true);
  };

  const handleDeleteItem = (item: OrderItemTemplate) => {
    setDeleteTarget({ type: 'item', id: item.id, name: item.name });
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
            setActiveTab('categories');
          }
          break;
        case 'item':
          await deleteItemTemplate(deleteTarget.id);
          break;
        case 'order':
          await deleteOrder(deleteTarget.id);
          break;
      }
      
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate VAT amount for display
  const calculateVatAmount = (unitPrice: number, quantity: number, isVatNil: boolean, isVatIncluded: boolean, vatPercentage: number): number => {
    if (isVatNil) return 0;
    
    const subtotal = unitPrice * quantity;
    
    if (isVatIncluded) {
      // VAT is already included in the price, so calculate the VAT portion
      return (subtotal * vatPercentage) / (100 + vatPercentage);
    } else {
      // VAT is added on top of the price
      return (subtotal * vatPercentage) / 100;
    }
  };

  // Calculate total price including VAT
  const calculateTotalPrice = (unitPrice: number, quantity: number, isVatNil: boolean, isVatIncluded: boolean, vatPercentage: number): number => {
    const subtotal = unitPrice * quantity;
    
    if (isVatNil || isVatIncluded) {
      return subtotal;
    } else {
      const vatAmount = calculateVatAmount(unitPrice, quantity, isVatNil, isVatIncluded, vatPercentage);
      return subtotal + vatAmount;
    }
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
      <div className="bg-white border-b border-gray-200 shadow-sm select-none">
        <div className="flex overflow-x-auto select-none">
          {[
            { id: 'categories', label: 'Categories', icon: Package },
            { id: 'items', label: 'Manage Items', icon: ShoppingCart },
            { id: 'orders', label: 'Orders', icon: Calendar }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 min-w-0 flex items-center justify-center py-3 px-4 text-sm font-medium transition-colors duration-200 whitespace-nowrap select-none ${
                  isActive
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <Icon size={18} className="mr-2" />
                <span className="select-none">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 select-none">
        
        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="select-none">
            
            {/* Add Category Section */}
            <div className="bg-white border-b border-gray-200 shadow-sm p-4 mb-4 rounded-lg select-none">
              {!showCategoryForm ? (
                <button
                  onClick={() => setShowCategoryForm(true)}
                  className="w-full max-w-md mx-auto bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-lg flex items-center justify-center transition-colors duration-200 shadow-sm text-lg select-none"
                >
                  <Plus size={22} className="mr-3" />
                  <span className="select-none">Add Category</span>
                </button>
              ) : (
                <form onSubmit={handleAddCategory} className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 w-full max-w-2xl mx-auto select-none">
                  <div className="mb-4">
                    <label htmlFor="categoryName" className="block text-base font-medium text-gray-700 mb-2 select-none">
                      Category Name
                    </label>
                    <input
                      id="categoryName"
                      type="text"
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="Enter category name"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="categoryVat" className="block text-base font-medium text-gray-700 mb-2 select-none">
                      Default VAT Percentage (%)
                    </label>
                    <input
                      id="categoryVat"
                      type="number"
                      value={categoryVatPercentage}
                      onChange={(e) => setCategoryVatPercentage(parseFloat(e.target.value) || 15)}
                      step="0.01"
                      min="0"
                      max="100"
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="15.00"
                    />
                  </div>
                  
                  {error && <p className="text-red-500 text-base mb-4 select-none">{error}</p>}
                  
                  <div className="flex gap-4 select-none">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 text-lg rounded-md transition-colors duration-200 disabled:bg-blue-300 disabled:cursor-not-allowed select-none"
                    >
                      {isSubmitting ? 'Saving...' : (editingCategory ? 'Update Category' : 'Add Category')}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setShowCategoryForm(false);
                        setCategoryName('');
                        setCategoryVatPercentage(15);
                        setEditingCategory(null);
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
            <div className="space-y-3 select-none">
              {filteredCategories.length === 0 ? (
                <div className="text-center py-12 select-none">
                  <Package size={48} className="text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg select-none">No categories found</p>
                </div>
              ) : (
                filteredCategories.map((category) => (
                  <div key={category.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 select-none">
                    <div className="flex items-center justify-between select-none">
                      <div className="flex-1 select-none">
                        <h3 className="text-lg font-semibold text-gray-800 select-none">{category.name}</h3>
                        <p className="text-sm text-gray-600 select-none">Default VAT: {category.vatPercentage}%</p>
                        <p className="text-xs text-gray-500 select-none">
                          Created: {category.createdAt.toLocaleDateString('en-GB')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 select-none">
                        <button
                          onClick={() => {
                            setSelectedCategory(category);
                            setActiveTab('items');
                          }}
                          className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm select-none"
                        >
                          Manage Items
                        </button>
                        <button
                          onClick={() => handleEditCategory(category)}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors select-none"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors select-none"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Manage Items Tab */}
        {activeTab === 'items' && (
          <div className="select-none">
            
            {/* Category Selection */}
            {!selectedCategory ? (
              <div className="text-center py-12 select-none">
                <Package size={48} className="text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg mb-4 select-none">Select a category to manage items</p>
                <button
                  onClick={() => setActiveTab('categories')}
                  className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors select-none"
                >
                  Go to Categories
                </button>
              </div>
            ) : (
              <>
                {/* Category Header */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4 select-none">
                  <div className="flex items-center justify-between select-none">
                    <div className="select-none">
                      <h2 className="text-xl font-semibold text-gray-800 select-none">{selectedCategory.name} Items</h2>
                      <p className="text-sm text-gray-600 select-none">Default VAT: {selectedCategory.vatPercentage}%</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedCategory(null);
                        setActiveTab('categories');
                      }}
                      className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors select-none"
                    >
                      Back to Categories
                    </button>
                  </div>
                </div>

                {/* Add Item Section */}
                <div className="bg-white border-b border-gray-200 shadow-sm p-4 mb-4 rounded-lg select-none">
                  {!showItemForm ? (
                    <button
                      onClick={() => setShowItemForm(true)}
                      className="w-full max-w-md mx-auto bg-green-500 hover:bg-green-600 text-white py-3 px-6 rounded-lg flex items-center justify-center transition-colors duration-200 shadow-sm text-lg select-none"
                    >
                      <Plus size={22} className="mr-3" />
                      <span className="select-none">Add Item</span>
                    </button>
                  ) : (
                    <form onSubmit={handleAddItem} className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 w-full max-w-2xl mx-auto select-none">
                      <div className="mb-4">
                        <label htmlFor="itemName" className="block text-base font-medium text-gray-700 mb-2 select-none">
                          Item Name
                        </label>
                        <input
                          id="itemName"
                          type="text"
                          value={itemName}
                          onChange={(e) => setItemName(e.target.value)}
                          disabled={isSubmitting}
                          className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="Enter item name"
                        />
                      </div>
                      
                      <div className="mb-4">
                        <label htmlFor="itemPrice" className="block text-base font-medium text-gray-700 mb-2 select-none">
                          Unit Price (Rs)
                        </label>
                        <input
                          id="itemPrice"
                          type="number"
                          value={itemPrice}
                          onChange={(e) => setItemPrice(e.target.value)}
                          step="0.01"
                          min="0.01"
                          disabled={isSubmitting}
                          className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="0.00"
                        />
                      </div>

                      {/* VAT Configuration */}
                      <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 select-none">
                        <h4 className="text-base font-medium text-gray-700 mb-3 select-none">VAT Configuration</h4>
                        
                        {/* VAT Exempt Toggle */}
                        <div className="flex items-center justify-between mb-3 select-none">
                          <label className="text-sm font-medium text-gray-700 select-none">
                            VAT Exempt
                          </label>
                          <label className="relative inline-flex items-center cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={itemIsVatNil}
                              onChange={(e) => {
                                setItemIsVatNil(e.target.checked);
                                if (e.target.checked) {
                                  setItemIsVatIncluded(false); // Disable VAT included when VAT exempt is enabled
                                }
                              }}
                              className="sr-only"
                            />
                            <div className={`w-11 h-6 rounded-full transition-colors ${itemIsVatNil ? 'bg-red-500' : 'bg-gray-300'}`}>
                              <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${itemIsVatNil ? 'translate-x-5' : 'translate-x-0'} mt-0.5 ml-0.5`} />
                            </div>
                          </label>
                        </div>

                        {/* VAT Included Toggle */}
                        <div className="flex items-center justify-between mb-3 select-none">
                          <label className="text-sm font-medium text-gray-700 select-none">
                            VAT Included
                          </label>
                          <label className="relative inline-flex items-center cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={itemIsVatIncluded}
                              onChange={(e) => {
                                setItemIsVatIncluded(e.target.checked);
                                if (e.target.checked) {
                                  setItemIsVatNil(false); // Disable VAT exempt when VAT included is enabled
                                }
                              }}
                              className="sr-only"
                            />
                            <div className={`w-11 h-6 rounded-full transition-colors ${itemIsVatIncluded ? 'bg-green-500' : 'bg-gray-300'}`}>
                              <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${itemIsVatIncluded ? 'translate-x-5' : 'translate-x-0'} mt-0.5 ml-0.5`} />
                            </div>
                          </label>
                        </div>

                        {/* VAT Percentage Input */}
                        <div className="select-none">
                          <label htmlFor="itemVatPercentage" className="block text-sm font-medium text-gray-700 mb-2 select-none">
                            VAT Percentage (%)
                          </label>
                          <input
                            id="itemVatPercentage"
                            type="number"
                            value={itemVatPercentage}
                            onChange={(e) => setItemVatPercentage(parseFloat(e.target.value) || 15)}
                            step="0.01"
                            min="0"
                            max="100"
                            disabled={isSubmitting || itemIsVatNil || itemIsVatIncluded}
                            className={`w-full px-4 py-3 text-lg border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                              itemIsVatNil || itemIsVatIncluded 
                                ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                                : 'bg-white'
                            } disabled:bg-gray-100 disabled:cursor-not-allowed`}
                            placeholder="15.00"
                          />
                          {(itemIsVatNil || itemIsVatIncluded) && (
                            <p className="text-xs text-gray-500 mt-1 select-none">
                              {itemIsVatNil ? 'VAT percentage is disabled when VAT exempt is enabled' : 'VAT percentage is disabled when VAT included is enabled'}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {error && <p className="text-red-500 text-base mb-4 select-none">{error}</p>}
                      
                      <div className="flex gap-4 select-none">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 px-6 text-lg rounded-md transition-colors duration-200 disabled:bg-green-300 disabled:cursor-not-allowed select-none"
                        >
                          {isSubmitting ? 'Saving...' : (editingItem ? 'Update Item' : 'Add Item')}
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => {
                            setShowItemForm(false);
                            setItemName('');
                            setItemPrice('');
                            setItemIsVatNil(false);
                            setItemIsVatIncluded(false);
                            setItemVatPercentage(15);
                            setEditingItem(null);
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

                {/* Items List */}
                <div className="space-y-3 select-none">
                  {(() => {
                    const categoryItems = getItemTemplatesByCategory(selectedCategory.id);
                    
                    if (categoryItems.length === 0) {
                      return (
                        <div className="text-center py-12 select-none">
                          <ShoppingCart size={48} className="text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600 text-lg select-none">No items in this category</p>
                        </div>
                      );
                    }

                    return categoryItems.map((item) => (
                      <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 select-none">
                        <div className="flex items-center justify-between select-none">
                          <div className="flex-1 select-none">
                            <h4 className="text-lg font-semibold text-gray-800 select-none">{item.name}</h4>
                            <div className="text-sm text-gray-600 select-none">
                              {item.isVatIncluded ? (
                                <span className="text-green-600 font-medium select-none">
                                  Rs {item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (VAT Included)
                                </span>
                              ) : item.isVatNil ? (
                                <span className="text-red-600 font-medium select-none">
                                  Rs {item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (VAT Exempt)
                                </span>
                              ) : (
                                <span className="select-none">
                                  Rs {item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({item.vatPercentage}% VAT)
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 select-none">
                              Created: {item.createdAt.toLocaleDateString('en-GB')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 select-none">
                            <button
                              onClick={() => handleEditItem(item)}
                              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors select-none"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item)}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors select-none"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </>
            )}
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="select-none">
            <div className="text-center py-12 select-none">
              <Calendar size={48} className="text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg select-none">Orders functionality coming soon</p>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 select-none">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden select-none">
            
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 select-none">
              <div className="flex items-center gap-3 select-none">
                <div className="bg-red-100 p-2 rounded-full select-none">
                  <AlertTriangle size={20} className="text-red-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 select-none">
                  Delete {deleteTarget.type === 'category' ? 'Category' : deleteTarget.type === 'item' ? 'Item' : 'Order'}
                </h2>
              </div>
              <button 
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteTarget(null);
                }}
                className="text-gray-500 hover:text-gray-700 transition-colors select-none"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 select-none">
              <p className="text-gray-700 mb-4 select-none">
                Are you sure you want to delete "{deleteTarget.name}"? This action cannot be undone.
              </p>
              
              {deleteTarget.type === 'category' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 select-none">
                  <p className="text-sm text-yellow-800 select-none">
                    ⚠️ Deleting this category will also delete all associated items and orders.
                  </p>
                </div>
              )}

              <div className="flex gap-3 select-none">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteTarget(null);
                  }}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 select-none"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 select-none"
                >
                  {isSubmitting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;