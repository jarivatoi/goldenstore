import React, { useState } from 'react';
import { Plus, Search, Calendar, Package, Edit2, Trash2, X, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { useOrder } from '../context/OrderContext';
import { OrderCategory, OrderItemTemplate, Order, OrderItem } from '../types';

/**
 * CONFIRMATION MODAL COMPONENT
 * ============================
 * 
 * Reusable modal for confirmation dialogs
 */
interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'danger'
}) => {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          confirmBtn: 'bg-red-500 hover:bg-red-600 focus:ring-red-500'
        };
      case 'warning':
        return {
          iconBg: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          confirmBtn: 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500'
        };
      case 'info':
        return {
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          confirmBtn: 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500'
        };
      default:
        return {
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          confirmBtn: 'bg-red-500 hover:bg-red-600 focus:ring-red-500'
        };
    }
  };

  const styles = getTypeStyles();

  // Handle keyboard events
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onCancel]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-sm overflow-hidden animate-fade-in select-none">
        <div className="p-6 select-none">
          {/* Icon and close button */}
          <div className="flex items-start justify-between mb-4 select-none">
            <div className={`${styles.iconBg} p-3 rounded-full`}>
              <AlertTriangle className={`${styles.iconColor}`} size={24} />
            </div>
            <button 
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors select-none"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="mb-6 select-none">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 select-none">
              {title}
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed select-none">
              {message}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 select-none">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200 font-medium select-none"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${styles.confirmBtn} select-none`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

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
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [editingCategory, setEditingCategory] = useState<OrderCategory | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<OrderItemTemplate | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  // Form states
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryVat, setNewCategoryVat] = useState(15);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplatePrice, setNewTemplatePrice] = useState('');
  const [newTemplateVatNil, setNewTemplateVatNil] = useState(false);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  // Confirmation modal states
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger'
  });

  // Helper function to show confirmation modal
  const showConfirmation = (
    title: string,
    message: string,
    onConfirm: () => void,
    type: 'danger' | 'warning' | 'info' = 'danger',
    confirmText = 'Confirm',
    cancelText = 'Cancel'
  ) => {
    setConfirmationModal({
      isOpen: true,
      title,
      message,
      onConfirm,
      type,
      confirmText,
      cancelText
    });
  };

  // Helper function to hide confirmation modal
  const hideConfirmation = () => {
    setConfirmationModal(prev => ({ ...prev, isOpen: false }));
  };

  // Get filtered categories
  const filteredCategories = searchCategories(searchQuery);

  // Category management
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

  const handleDeleteCategory = (category: OrderCategory) => {
    const templates = getItemTemplatesByCategory(category.id);
    const orders = getOrdersByCategory(category.id);
    
    let message = `Are you sure you want to delete "${category.name}"?`;
    if (templates.length > 0 || orders.length > 0) {
      message += `\n\nThis will also delete:\n• ${templates.length} item template(s)\n• ${orders.length} order(s)\n\nThis action cannot be undone.`;
    } else {
      message += '\n\nThis action cannot be undone.';
    }

    showConfirmation(
      'Delete Category',
      message,
      async () => {
        try {
          await deleteCategory(category.id);
          if (selectedCategory?.id === category.id) {
            setSelectedCategory(null);
          }
          hideConfirmation();
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Failed to delete category');
        }
      },
      'danger',
      'Delete Category'
    );
  };

  // Template management
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
      alert(err instanceof Error ? err.message : 'Failed to update item template');
    }
  };

  const handleDeleteTemplate = (template: OrderItemTemplate) => {
    showConfirmation(
      'Delete Item Template',
      `Are you sure you want to delete "${template.name}"?\n\nThis will also remove this item from all existing orders.\n\nThis action cannot be undone.`,
      async () => {
        try {
          await deleteItemTemplate(template.id);
          hideConfirmation();
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Failed to delete item template');
        }
      },
      'danger',
      'Delete Template'
    );
  };

  // Order management
  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || orderItems.length === 0) return;

    try {
      const orderDateObj = new Date(orderDate);
      await addOrder(selectedCategory.id, orderDateObj, orderItems);
      setOrderItems([]);
      setOrderDate(new Date().toISOString().split('T')[0]);
      setShowAddOrder(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add order');
    }
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder || orderItems.length === 0) return;

    try {
      const orderDateObj = new Date(orderDate);
      await updateOrder(editingOrder.id, orderDateObj, orderItems);
      setEditingOrder(null);
      setOrderItems([]);
      setOrderDate(new Date().toISOString().split('T')[0]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update order');
    }
  };

  const handleDeleteOrder = (order: Order) => {
    const category = categories.find(c => c.id === order.categoryId);
    const categoryName = category?.name || 'Unknown';
    const orderDateStr = order.orderDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    showConfirmation(
      'Delete Order',
      `Are you sure you want to delete the ${categoryName} order from ${orderDateStr}?\n\nThis action cannot be undone.`,
      async () => {
        try {
          await deleteOrder(order.id);
          hideConfirmation();
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Failed to delete order');
        }
      },
      'danger',
      'Delete Order'
    );
  };

  // Order item management
  const addOrderItem = (template: OrderItemTemplate) => {
    const existingItem = orderItems.find(item => item.templateId === template.id);
    
    if (existingItem) {
      // Increase quantity
      setOrderItems(prev => prev.map(item => 
        item.templateId === template.id 
          ? { ...item, quantity: item.quantity + 1, totalPrice: calculateItemTotal(item.quantity + 1, item.unitPrice, item.isVatNil, template.vatPercentage) }
          : item
      ));
    } else {
      // Add new item
      const newItem: OrderItem = {
        id: crypto.randomUUID(),
        templateId: template.id,
        quantity: 1,
        unitPrice: template.unitPrice,
        isVatNil: template.isVatNil,
        vatAmount: template.isVatNil ? 0 : (template.unitPrice * template.vatPercentage / 100),
        totalPrice: calculateItemTotal(1, template.unitPrice, template.isVatNil, template.vatPercentage),
        isAvailable: true
      };
      setOrderItems(prev => [...prev, newItem]);
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
              totalPrice: calculateItemTotal(quantity, item.unitPrice, item.isVatNil, getTemplateVatPercentage(templateId))
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

  // Helper functions
  const calculateItemTotal = (quantity: number, unitPrice: number, isVatNil: boolean, vatPercentage: number): number => {
    const subtotal = quantity * unitPrice;
    const vatAmount = isVatNil ? 0 : (subtotal * vatPercentage / 100);
    return subtotal + vatAmount;
  };

  const getTemplateVatPercentage = (templateId: string): number => {
    const template = itemTemplates.find(t => t.id === templateId);
    return template?.vatPercentage || 15;
  };

  const getTemplateName = (templateId: string): string => {
    const template = itemTemplates.find(t => t.id === templateId);
    return template?.name || 'Unknown Item';
  };

  const calculateOrderTotal = (): number => {
    return orderItems
      .filter(item => item.isAvailable)
      .reduce((sum, item) => sum + item.totalPrice, 0);
  };

  // Edit handlers
  const startEditCategory = (category: OrderCategory) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryVat(category.vatPercentage);
  };

  const startEditTemplate = (template: OrderItemTemplate) => {
    setEditingTemplate(template);
    setNewTemplateName(template.name);
    setNewTemplatePrice(template.unitPrice.toString());
    setNewTemplateVatNil(template.isVatNil);
  };

  const startEditOrder = (order: Order) => {
    setEditingOrder(order);
    setOrderDate(order.orderDate.toISOString().split('T')[0]);
    setOrderItems([...order.items]);
    setShowAddOrder(true);
  };

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
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
            <Plus size={16} />
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
        
        {/* Categories List */}
        {filteredCategories.length === 0 ? (
          <div className="text-center py-12 select-none">
            <Package size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2 select-none">
              {searchQuery ? 'No categories found' : 'No categories yet'}
            </h3>
            <p className="text-gray-500 select-none">
              {searchQuery ? `No categories match "${searchQuery}"` : 'Create your first category to start managing orders'}
            </p>
          </div>
        ) : (
          <div className="space-y-4 select-none">
            {filteredCategories.map((category) => {
              const templates = getItemTemplatesByCategory(category.id);
              const categoryOrders = getOrdersByCategory(category.id);
              const isSelected = selectedCategory?.id === category.id;

              return (
                <div key={category.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden select-none">
                  
                  {/* Category Header */}
                  <div 
                    className={`p-4 cursor-pointer transition-colors select-none ${
                      isSelected ? 'bg-blue-50 border-b border-blue-200' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedCategory(isSelected ? null : category)}
                  >
                    <div className="flex items-center justify-between select-none">
                      <div className="flex-1 select-none">
                        <h3 className="text-lg font-semibold text-gray-800 select-none">{category.name}</h3>
                        <p className="text-sm text-gray-600 select-none">
                          VAT: {category.vatPercentage}% • {templates.length} template(s) • {categoryOrders.length} order(s)
                        </p>
                      </div>
                      <div className="flex items-center gap-2 select-none">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditCategory(category);
                          }}
                          className="p-2 text-gray-500 hover:text-blue-600 transition-colors select-none"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCategory(category);
                          }}
                          className="p-2 text-gray-500 hover:text-red-600 transition-colors select-none"
                        >
                          <Trash2 size={16} />
                        </button>
                        <ChevronDown 
                          size={20} 
                          className={`text-gray-400 transition-transform select-none ${
                            isSelected ? 'rotate-180' : ''
                          }`} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Category Content */}
                  {isSelected && (
                    <div className="border-t border-gray-200 select-none">
                      
                      {/* Templates Section */}
                      <div className="p-4 border-b border-gray-100 select-none">
                        <div className="flex items-center justify-between mb-3 select-none">
                          <h4 className="font-medium text-gray-800 select-none">Item Templates</h4>
                          <button
                            onClick={() => setShowAddTemplate(true)}
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors select-none"
                          >
                            <Plus size={14} />
                            Add Template
                          </button>
                        </div>

                        {templates.length === 0 ? (
                          <p className="text-gray-500 text-sm select-none">No item templates yet</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 select-none">
                            {templates.map((template) => (
                              <div key={template.id} className="bg-gray-50 rounded p-3 flex items-center justify-between select-none">
                                <div className="flex-1 select-none">
                                  <h5 className="font-medium text-gray-800 select-none">{template.name}</h5>
                                  <p className="text-sm text-gray-600 select-none">
                                    Rs {template.unitPrice.toFixed(2)}
                                    {template.isVatNil && <span className="text-orange-600 ml-1">(VAT Nil)</span>}
                                  </p>
                                </div>
                                <div className="flex gap-1 select-none">
                                  <button
                                    onClick={() => startEditTemplate(template)}
                                    className="p-1 text-gray-500 hover:text-blue-600 transition-colors select-none"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTemplate(template)}
                                    className="p-1 text-gray-500 hover:text-red-600 transition-colors select-none"
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
                      <div className="p-4 select-none">
                        <div className="flex items-center justify-between mb-3 select-none">
                          <h4 className="font-medium text-gray-800 select-none">Orders</h4>
                          <button
                            onClick={() => {
                              setOrderItems([]);
                              setOrderDate(new Date().toISOString().split('T')[0]);
                              setShowAddOrder(true);
                            }}
                            className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors select-none"
                          >
                            <Plus size={14} />
                            New Order
                          </button>
                        </div>

                        {categoryOrders.length === 0 ? (
                          <p className="text-gray-500 text-sm select-none">No orders yet</p>
                        ) : (
                          <div className="space-y-2 select-none">
                            {categoryOrders.map((order) => {
                              const isExpanded = expandedOrders.has(order.id);
                              
                              return (
                                <div key={order.id} className="bg-gray-50 rounded-lg border border-gray-200 select-none">
                                  
                                  {/* Order Header */}
                                  <div 
                                    className="p-3 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                                    onClick={() => toggleOrderExpansion(order.id)}
                                  >
                                    <div className="flex items-center justify-between select-none">
                                      <div className="flex-1 select-none">
                                        <div className="flex items-center gap-2 select-none">
                                          <Calendar size={16} className="text-gray-500" />
                                          <span className="font-medium text-gray-800 select-none">
                                            {order.orderDate.toLocaleDateString('en-GB', {
                                              day: '2-digit',
                                              month: 'short',
                                              year: 'numeric'
                                            })}
                                          </span>
                                        </div>
                                        <p className="text-sm text-gray-600 select-none">
                                          {order.items.length} item(s) • Total: Rs {order.totalCost.toFixed(2)}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2 select-none">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            startEditOrder(order);
                                          }}
                                          className="p-1 text-gray-500 hover:text-blue-600 transition-colors select-none"
                                        >
                                          <Edit2 size={14} />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteOrder(order);
                                          }}
                                          className="p-1 text-gray-500 hover:text-red-600 transition-colors select-none"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                        {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Order Items */}
                                  {isExpanded && (
                                    <div className="border-t border-gray-200 p-3 bg-white select-none">
                                      <div className="space-y-2 select-none">
                                        {order.items.map((item) => (
                                          <div key={item.id} className={`flex items-center justify-between p-2 rounded select-none ${
                                            item.isAvailable ? 'bg-green-50' : 'bg-red-50'
                                          }`}>
                                            <div className="flex-1 select-none">
                                              <span className={`font-medium select-none ${
                                                item.isAvailable ? 'text-gray-800' : 'text-gray-500 line-through'
                                              }`}>
                                                {getTemplateName(item.templateId)}
                                              </span>
                                              <div className="text-xs text-gray-600 select-none">
                                                {item.quantity} × Rs {item.unitPrice.toFixed(2)}
                                                {item.isVatNil ? ' (VAT Nil)' : ` + VAT Rs ${item.vatAmount.toFixed(2)}`}
                                              </div>
                                            </div>
                                            <div className="text-right select-none">
                                              <span className={`font-semibold select-none ${
                                                item.isAvailable ? 'text-gray-800' : 'text-gray-500'
                                              }`}>
                                                Rs {item.totalPrice.toFixed(2)}
                                              </span>
                                              <div className="text-xs text-gray-500 select-none">
                                                {item.isAvailable ? 'Available' : 'Not Available'}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 select-none">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md select-none">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 select-none">
              <h3 className="text-lg font-semibold text-gray-900 select-none">Add Category</h3>
              <button onClick={() => setShowAddCategory(false)} className="text-gray-500 hover:text-gray-700 select-none">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddCategory} className="p-6 select-none">
              <div className="mb-4 select-none">
                <label className="block text-sm font-medium text-gray-700 mb-2 select-none">Category Name</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2 select-none">VAT Percentage</label>
                <input
                  type="number"
                  value={newCategoryVat}
                  onChange={(e) => setNewCategoryVat(parseFloat(e.target.value) || 15)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>
              
              <div className="flex gap-3 select-none">
                <button
                  type="button"
                  onClick={() => setShowAddCategory(false)}
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
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 select-none">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md select-none">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 select-none">
              <h3 className="text-lg font-semibold text-gray-900 select-none">Edit Category</h3>
              <button onClick={() => setEditingCategory(null)} className="text-gray-500 hover:text-gray-700 select-none">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateCategory} className="p-6 select-none">
              <div className="mb-4 select-none">
                <label className="block text-sm font-medium text-gray-700 mb-2 select-none">Category Name</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div className="mb-6 select-none">
                <label className="block text-sm font-medium text-gray-700 mb-2 select-none">VAT Percentage</label>
                <input
                  type="number"
                  value={newCategoryVat}
                  onChange={(e) => setNewCategoryVat(parseFloat(e.target.value) || 15)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>
              
              <div className="flex gap-3 select-none">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
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
      )}

      {/* Add Template Modal */}
      {showAddTemplate && selectedCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 select-none">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md select-none">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 select-none">
              <h3 className="text-lg font-semibold text-gray-900 select-none">Add Item Template</h3>
              <button onClick={() => setShowAddTemplate(false)} className="text-gray-500 hover:text-gray-700 select-none">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddTemplate} className="p-6 select-none">
              <div className="mb-4 select-none">
                <label className="block text-sm font-medium text-gray-700 mb-2 select-none">Item Name</label>
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Matinee, Palmal, Old Oak"
                  required
                />
              </div>
              
              <div className="mb-4 select-none">
                <label className="block text-sm font-medium text-gray-700 mb-2 select-none">Unit Price (Rs)</label>
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
                  <span className="text-sm text-gray-700 select-none">VAT Nil (No VAT applicable)</span>
                </label>
              </div>
              
              <div className="flex gap-3 select-none">
                <button
                  type="button"
                  onClick={() => setShowAddTemplate(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors select-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors select-none"
                >
                  Add Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Template Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 select-none">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md select-none">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 select-none">
              <h3 className="text-lg font-semibold text-gray-900 select-none">Edit Item Template</h3>
              <button onClick={() => setEditingTemplate(null)} className="text-gray-500 hover:text-gray-700 select-none">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateTemplate} className="p-6 select-none">
              <div className="mb-4 select-none">
                <label className="block text-sm font-medium text-gray-700 mb-2 select-none">Item Name</label>
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div className="mb-4 select-none">
                <label className="block text-sm font-medium text-gray-700 mb-2 select-none">Unit Price (Rs)</label>
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
                  <span className="text-sm text-gray-700 select-none">VAT Nil (No VAT applicable)</span>
                </label>
              </div>
              
              <div className="flex gap-3 select-none">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
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
      )}

      {/* Add/Edit Order Modal */}
      {showAddOrder && selectedCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto select-none">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl my-8 select-none">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 select-none">
              <h3 className="text-lg font-semibold text-gray-900 select-none">
                {editingOrder ? 'Edit Order' : 'New Order'} - {selectedCategory.name}
              </h3>
              <button 
                onClick={() => {
                  setShowAddOrder(false);
                  setEditingOrder(null);
                  setOrderItems([]);
                }} 
                className="text-gray-500 hover:text-gray-700 select-none"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={editingOrder ? handleUpdateOrder : handleAddOrder} className="p-6 select-none">
              {/* Order Date */}
              <div className="mb-6 select-none">
                <label className="block text-sm font-medium text-gray-700 mb-2 select-none">Order Date</label>
                <input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Available Templates */}
              <div className="mb-6 select-none">
                <h4 className="text-sm font-medium text-gray-700 mb-3 select-none">Available Items</h4>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3 select-none">
                  {getItemTemplatesByCategory(selectedCategory.id).map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => addOrderItem(template)}
                      className="text-left p-2 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 transition-colors select-none"
                    >
                      <div className="font-medium text-gray-800 text-sm select-none">{template.name}</div>
                      <div className="text-xs text-gray-600 select-none">
                        Rs {template.unitPrice.toFixed(2)}
                        {template.isVatNil && <span className="text-orange-600 ml-1">(VAT Nil)</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Items */}
              <div className="mb-6 select-none">
                <h4 className="text-sm font-medium text-gray-700 mb-3 select-none">Order Items</h4>
                {orderItems.length === 0 ? (
                  <p className="text-gray-500 text-sm select-none">No items added yet</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto select-none">
                    {orderItems.map((item) => (
                      <div key={item.templateId} className={`p-3 rounded-lg border select-none ${
                        item.isAvailable ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex items-center justify-between mb-2 select-none">
                          <span className="font-medium text-gray-800 select-none">{getTemplateName(item.templateId)}</span>
                          <button
                            type="button"
                            onClick={() => toggleOrderItemAvailability(item.templateId)}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors select-none ${
                              item.isAvailable 
                                ? 'bg-green-500 text-white hover:bg-green-600' 
                                : 'bg-red-500 text-white hover:bg-red-600'
                            }`}
                          >
                            {item.isAvailable ? 'Available' : 'Not Available'}
                          </button>
                        </div>
                        
                        <div className="flex items-center gap-3 select-none">
                          <div className="flex items-center gap-2 select-none">
                            <button
                              type="button"
                              onClick={() => updateOrderItemQuantity(item.templateId, item.quantity - 1)}
                              className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center select-none"
                            >
                              -
                            </button>
                            <span className="w-12 text-center font-medium select-none">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateOrderItemQuantity(item.templateId, item.quantity + 1)}
                              className="w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center select-none"
                            >
                              +
                            </button>
                          </div>
                          
                          <div className="flex-1 text-right select-none">
                            <div className="text-sm text-gray-600 select-none">
                              {item.quantity} × Rs {item.unitPrice.toFixed(2)}
                              {!item.isVatNil && <span> + VAT Rs {item.vatAmount.toFixed(2)}</span>}
                            </div>
                            <div className="font-semibold text-gray-800 select-none">
                              Rs {item.totalPrice.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Order Total */}
              {orderItems.length > 0 && (
                <div className="mb-6 bg-blue-50 rounded-lg p-4 select-none">
                  <div className="flex justify-between items-center select-none">
                    <span className="font-medium text-gray-800 select-none">Total Cost:</span>
                    <span className="text-xl font-bold text-blue-600 select-none">
                      Rs {calculateOrderTotal().toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 select-none">
                    (Only available items included in total)
                  </p>
                </div>
              )}
              
              <div className="flex gap-3 select-none">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddOrder(false);
                    setEditingOrder(null);
                    setOrderItems([]);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors select-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={orderItems.length === 0}
                  className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors select-none"
                >
                  {editingOrder ? 'Update Order' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        title={confirmationModal.title}
        message={confirmationModal.message}
        confirmText={confirmationModal.confirmText}
        cancelText={confirmationModal.cancelText}
        onConfirm={() => {
          confirmationModal.onConfirm();
          hideConfirmation();
        }}
        onCancel={hideConfirmation}
        type={confirmationModal.type}
      />
    </div>
  );
};

export default OrderManagement;