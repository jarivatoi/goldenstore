import React, { createContext, useContext, useState, useEffect } from 'react';
import { OrderCategory, OrderItemTemplate, Order, OrderItem } from '../types';
import { supabase } from '../lib/supabase';

/**
 * ORDER CONTEXT TYPE DEFINITION
 * =============================
 */
interface OrderContextType {
  // Categories
  categories: OrderCategory[];
  addCategory: (name: string, vatPercentage?: number) => Promise<OrderCategory>;
  updateCategory: (id: string, name: string, vatPercentage: number) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  
  // Item Templates
  itemTemplates: OrderItemTemplate[];
  getItemTemplatesByCategory: (categoryId: string) => OrderItemTemplate[];
  addItemTemplate: (categoryId: string, name: string, unitPrice: number, isVatNil?: boolean, isVatIncluded?: boolean, vatPercentage?: number) => Promise<OrderItemTemplate>;
  updateItemTemplate: (id: string, name: string, unitPrice: number, isVatNil?: boolean, isVatIncluded?: boolean, vatPercentage?: number) => Promise<void>;
  deleteItemTemplate: (id: string) => Promise<void>;
  
  // Orders
  orders: Order[];
  getOrdersByCategory: (categoryId: string) => Order[];
  addOrder: (categoryId: string, orderDate: Date, items: OrderItem[]) => Promise<Order>;
  updateOrder: (id: string, orderDate: Date, items: OrderItem[]) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  
  // Utility
  searchCategories: (query: string) => OrderCategory[];
  
  // State
  isLoading: boolean;
  error: string | null;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

/**
 * CUSTOM HOOK FOR ORDER CONTEXT ACCESS
 * ====================================
 */
export const useOrder = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
};

/**
 * FORMAT NAME UTILITY
 * ===================
 */
const formatName = (name: string): string => {
  return name
    .trim()
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * ORDER PROVIDER COMPONENT
 * ========================
 */
export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  
  // State management
  const [categories, setCategories] = useState<OrderCategory[]>([]);
  const [itemTemplates, setItemTemplates] = useState<OrderItemTemplate[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data from localStorage on initialization
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        if (supabase) {
          try {
            // Load from Supabase
            
            // Test connection first
            let connectionTest, connectionError;
            try {
              const result = await Promise.race([
                supabase.from('order_categories').select('id').limit(1),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 5000))
              ]);
              connectionTest = result.data;
              connectionError = result.error;
            } catch (timeoutError) {
              connectionError = timeoutError;
            }
            
            if (connectionError) {
              if (connectionError.message?.includes('timeout') || 
                  connectionError.message?.includes('fetch') || 
                  connectionError.message?.includes('Failed to fetch')) {
                throw new Error('Unable to connect to database. Using offline mode.');
              }
              throw connectionError;
            }
            
            // Check if tables exist by trying to query one record
            const { data: testData, error: testError } = await supabase
              .from('order_categories')
              .select('id')
              .limit(1);
            
            if (testError && testError.code === '42P01') {
              // Table doesn't exist, throw error to fall back to localStorage
              throw new Error('Database tables not found. Please apply migrations first.');
            }
            
            if (testError) {
              throw testError;
            }
            
            // Tables exist, proceed with loading data
            try {
              // Load categories
              const { data: categoriesData, error: categoriesError } = await supabase
                .from('order_categories')
                .select('*')
                .order('created_at', { ascending: false });
              
              if (categoriesError) throw categoriesError;
              
              const transformedCategories: OrderCategory[] = (categoriesData || []).map((category: any) => ({
                id: category.id,
                name: category.name,
                vatPercentage: category.vat_percentage || 15,
                createdAt: new Date(category.created_at)
              }));
              
              // Load item templates
              const { data: templatesData, error: templatesError } = await supabase
                .from('order_item_templates')
                .select('*')
                .order('created_at', { ascending: false });
              
              if (templatesError) throw templatesError;
              
              const transformedTemplates: OrderItemTemplate[] = (templatesData || []).map((template: any) => ({
                id: template.id,
                categoryId: template.category_id,
                name: template.name,
                unitPrice: template.unit_price,
                isVatNil: template.is_vat_nil || false,
                isVatIncluded: template.is_vat_included || false,
                vatPercentage: template.vat_percentage || 15,
                createdAt: new Date(template.created_at)
              }));
              
              // Load orders with items
              const { data: ordersData, error: ordersError } = await supabase
                .from('orders')
                .select(`
                  *,
                  order_items (*)
                `)
                .order('created_at', { ascending: false });
              
              if (ordersError) throw ordersError;
              
              const transformedOrders: Order[] = (ordersData || []).map((order: any) => ({
                id: order.id,
                categoryId: order.category_id,
                orderDate: new Date(order.order_date),
                items: (order.order_items || []).map((item: any) => ({
                  id: item.id,
                  templateId: item.template_id,
                  quantity: item.quantity,
                  unitPrice: item.unit_price,
                  isVatNil: item.is_vat_nil || false,
                  isVatIncluded: item.is_vat_included || false,
                  vatAmount: item.vat_amount || 0,
                  totalPrice: item.total_price,
                  isAvailable: item.is_available !== false
                })),
                totalCost: order.total_cost || 0,
                createdAt: new Date(order.created_at),
                lastEditedAt: order.last_edited_at ? new Date(order.last_edited_at) : undefined
              }));
              
              setCategories(transformedCategories);
              setItemTemplates(transformedTemplates);
              setOrders(transformedOrders);
              
              // Update localStorage with Supabase data
              localStorage.setItem('orderCategories', JSON.stringify(transformedCategories.map(category => ({
                ...category,
                createdAt: category.createdAt.toISOString()
              }))));
              
              localStorage.setItem('orderItemTemplates', JSON.stringify(transformedTemplates.map(template => ({
                ...template,
                createdAt: template.createdAt.toISOString()
              }))));
              
              localStorage.setItem('orders', JSON.stringify(transformedOrders.map(order => ({
                ...order,
                orderDate: order.orderDate.toISOString(),
                createdAt: order.createdAt.toISOString(),
                lastEditedAt: order.lastEditedAt?.toISOString()
              }))));
              
              
            } catch (dataError) {
              throw dataError;
            }
            
          } catch (supabaseError) {
            setError('Database tables not found. Using offline data only. Please apply migrations to enable online sync.');
            
            // Fallback to localStorage if Supabase fails
            const storedCategories = localStorage.getItem('orderCategories');
            const transformedCategories: OrderCategory[] = storedCategories ? JSON.parse(storedCategories).map((category: any) => ({
              ...category,
              createdAt: new Date(category.createdAt)
            })) : [];
            
            const storedTemplates = localStorage.getItem('orderItemTemplates');
            const transformedTemplates: OrderItemTemplate[] = storedTemplates ? JSON.parse(storedTemplates).map((template: any) => ({
              ...template,
              isVatIncluded: template.isVatIncluded || false,
              createdAt: new Date(template.createdAt)
            })) : [];
            
            const storedOrders = localStorage.getItem('orders');
            const transformedOrders: Order[] = storedOrders ? JSON.parse(storedOrders).map((order: any) => ({
              ...order,
              orderDate: new Date(order.orderDate),
              createdAt: new Date(order.createdAt),
              lastEditedAt: order.lastEditedAt ? new Date(order.lastEditedAt) : undefined,
              items: (order.items || []).map((item: any) => ({
                ...item,
                isVatIncluded: item.isVatIncluded || false
              }))
            })) : [];
            
            setCategories(transformedCategories);
            setItemTemplates(transformedTemplates);
            setOrders(transformedOrders);
          }
        } else {
          // Fallback to localStorage when Supabase is not available
          console.log('Using localStorage for order data');
          const storedCategories = localStorage.getItem('orderCategories');
          const transformedCategories: OrderCategory[] = storedCategories ? JSON.parse(storedCategories).map((category: any) => ({
            ...category,
            createdAt: new Date(category.createdAt)
          })) : [];
          
          const storedTemplates = localStorage.getItem('orderItemTemplates');
          const transformedTemplates: OrderItemTemplate[] = storedTemplates ? JSON.parse(storedTemplates).map((template: any) => ({
            ...template,
            createdAt: new Date(template.createdAt)
          })) : [];
          
          const storedOrders = localStorage.getItem('orders');
          const transformedOrders: Order[] = storedOrders ? JSON.parse(storedOrders).map((order: any) => ({
            ...order,
            orderDate: new Date(order.orderDate),
            createdAt: new Date(order.createdAt),
            lastEditedAt: order.lastEditedAt ? new Date(order.lastEditedAt) : undefined,
            items: (order.items || []).map((item: any) => ({
              ...item,
              isVatIncluded: item.isVatIncluded || false
            }))
          })) : [];
          
          setCategories(transformedCategories);
          setItemTemplates(transformedTemplates);
          setOrders(transformedOrders);
        }
      } catch (err) {
        setError('Failed to load order data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Category management
  const addCategory = async (name: string, vatPercentage: number = 15): Promise<OrderCategory> => {
    try {
      const formattedName = formatName(name);
      
      // Check for duplicates
      const existingCategory = categories.find(cat => 
        cat.name.toLowerCase() === formattedName.toLowerCase()
      );
      
      if (existingCategory) {
        throw new Error(`Category "${formattedName}" already exists`);
      }
      
      const newCategory: OrderCategory = {
        id: crypto.randomUUID(),
        name: formattedName,
        vatPercentage,
        createdAt: new Date()
      };
      
      if (supabase) {
        // Add to Supabase
        const { error } = await supabase
          .from('order_categories')
          .insert({
            id: newCategory.id,
            name: newCategory.name,
            vat_percentage: newCategory.vatPercentage,
            created_at: newCategory.createdAt.toISOString()
          });
        
        if (error) throw error;
        
        // Update local state
        setCategories(prev => [newCategory, ...prev]);
      } else {
        // Fallback to localStorage
        const updatedCategories = [newCategory, ...categories];
        setCategories(updatedCategories);
        localStorage.setItem('orderCategories', JSON.stringify(updatedCategories.map(category => ({
          ...category,
          createdAt: category.createdAt.toISOString()
        }))));
      }
      
      return newCategory;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add category');
      throw err;
    }
  };


  const updateCategory = async (id: string, name: string, vatPercentage: number): Promise<void> => {
    try {
      const formattedName = formatName(name);
      
      if (supabase) {
        // Update in Supabase
        const { error } = await supabase
          .from('order_categories')
          .update({
            name: formattedName,
            vat_percentage: vatPercentage
          })
          .eq('id', id);
        
        if (error) throw error;
        
        // Update local state
        setCategories(prev => prev.map(cat => 
          cat.id === id ? { ...cat, name: formattedName, vatPercentage } : cat
        ));
      } else {
        // Fallback to localStorage
        const updatedCategories = categories.map(cat => 
          cat.id === id ? { ...cat, name: formattedName, vatPercentage } : cat
        );
        setCategories(updatedCategories);
        localStorage.setItem('orderCategories', JSON.stringify(updatedCategories.map(category => ({
          ...category,
          createdAt: category.createdAt.toISOString()
        }))));
      }
    } catch (err) {
      setError('Failed to update category');
      throw err;
    }
  };


  const deleteCategory = async (id: string): Promise<void> => {
    try {
      if (supabase) {
        // Delete from Supabase (cascade will handle related data)
        const { error } = await supabase
          .from('order_categories')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        // Update local state
        setCategories(prev => prev.filter(cat => cat.id !== id));
        setItemTemplates(prev => prev.filter(temp => temp.categoryId !== id));
        setOrders(prev => prev.filter(order => order.categoryId !== id));
      } else {
        // Fallback to localStorage
        const updatedCategories = categories.filter(cat => cat.id !== id);
        const updatedTemplates = itemTemplates.filter(temp => temp.categoryId !== id);
        const updatedOrders = orders.filter(order => order.categoryId !== id);
        
        setCategories(updatedCategories);
        setItemTemplates(updatedTemplates);
        setOrders(updatedOrders);
        
        localStorage.setItem('orderCategories', JSON.stringify(updatedCategories.map(category => ({
          ...category,
          createdAt: category.createdAt.toISOString()
        }))));
        
        localStorage.setItem('orderItemTemplates', JSON.stringify(updatedTemplates.map(template => ({
          ...template,
          createdAt: template.createdAt.toISOString()
        }))));
        
        localStorage.setItem('orders', JSON.stringify(updatedOrders.map(order => ({
          ...order,
          orderDate: order.orderDate.toISOString(),
          createdAt: order.createdAt.toISOString(),
          lastEditedAt: order.lastEditedAt?.toISOString()
        }))));
      }
    } catch (err) {
      setError('Failed to delete category');
      throw err;
    }
  };

  // Item Template management
  const getItemTemplatesByCategory = (categoryId: string): OrderItemTemplate[] => {
    return itemTemplates
      .filter(temp => temp.categoryId === categoryId)
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const addItemTemplate = async (categoryId: string, name: string, unitPrice: number, isVatNil: boolean = false, isVatIncluded: boolean = false, vatPercentage?: number): Promise<OrderItemTemplate> => {
    try {
      const formattedName = formatName(name);
      
      // Get category's VAT percentage
      const category = categories.find(c => c.id === categoryId);
      const finalVatPercentage = vatPercentage || category?.vatPercentage || 15;
      
      // Check for duplicates within category
      const existingTemplate = itemTemplates.find(temp => 
        temp.categoryId === categoryId && 
        temp.name.toLowerCase() === formattedName.toLowerCase()
      );
      
      if (existingTemplate) {
        throw new Error(`Item "${formattedName}" already exists in this category`);
      }
      
      const newItemTemplate: OrderItemTemplate = {
        id: crypto.randomUUID(),
        categoryId,
        name: formattedName,
        unitPrice,
        isVatNil,
        isVatIncluded,
        vatPercentage: finalVatPercentage,
        createdAt: new Date()
      };
      
      if (supabase) {
        // Add to Supabase
        const { error } = await supabase
          .from('order_item_templates')
          .insert({
            id: newItemTemplate.id,
            category_id: newItemTemplate.categoryId,
            name: newItemTemplate.name,
            unit_price: newItemTemplate.unitPrice,
            is_vat_nil: newItemTemplate.isVatNil,
            is_vat_included: newItemTemplate.isVatIncluded,
            vat_percentage: newItemTemplate.vatPercentage,
            created_at: newItemTemplate.createdAt.toISOString()
          });
        
        if (error) throw error;
        
        // Update local state
        setItemTemplates(prev => [newItemTemplate, ...prev]);
      } else {
        // Fallback to localStorage
        const updatedTemplates = [newItemTemplate, ...itemTemplates];
        setItemTemplates(updatedTemplates);
        localStorage.setItem('orderItemTemplates', JSON.stringify(updatedTemplates.map(template => ({
          ...template,
          createdAt: template.createdAt.toISOString()
        }))));
      }
      
      return newItemTemplate;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item template');
      throw err;
    }
  };

  const updateItemTemplate = async (id: string, name: string, unitPrice: number, isVatNil: boolean, isVatIncluded: boolean, vatPercentage?: number): Promise<void> => {
    try {
      const formattedName = formatName(name);
      
      if (supabase) {
        // Update in Supabase
        const { error } = await supabase
          .from('order_item_templates')
          .update({
            name: formattedName,
            unit_price: unitPrice,
            is_vat_nil: isVatNil === true,
            is_vat_included: isVatIncluded === true,
            vat_percentage: vatPercentage ?? 15
          })
          .eq('id', id);
        
        if (error) throw error;
        
        // Update local state
        setItemTemplates(prev => prev.map(temp => 
          temp.id === id ? { 
            ...temp, 
            name: formattedName, 
            unitPrice, 
            isVatNil: isVatNil === true, 
            isVatIncluded: isVatIncluded === true, 
            vatPercentage: vatPercentage ?? 15 
          } : temp
        ));
      } else {
        // Fallback to localStorage
        const updatedTemplates = itemTemplates.map(temp => 
          temp.id === id ? { 
            ...temp, 
            name: formattedName, 
            unitPrice, 
            isVatNil: isVatNil === true, 
            isVatIncluded: isVatIncluded === true, 
            vatPercentage: vatPercentage ?? 15 
          } : temp
        );
        setItemTemplates(updatedTemplates);
        localStorage.setItem('orderItemTemplates', JSON.stringify(updatedTemplates.map(template => ({
          ...template,
          isVatIncluded: template.isVatIncluded,
          createdAt: template.createdAt.toISOString()
        }))));
      }
    } catch (err) {
      setError('Failed to update item template');
      throw err;
    }
  };

  const deleteItemTemplate = async (id: string): Promise<void> => {
    try {
      if (supabase) {
        // Delete from Supabase (cascade will handle order items)
        const { error } = await supabase
          .from('order_item_templates')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        // Update local state
        setItemTemplates(prev => prev.filter(temp => temp.id !== id));
        
        // Also remove any order items using this template
        const updatedOrders = orders.map(order => ({
          ...order,
          items: order.items.filter(item => item.templateId !== id),
          totalCost: order.items
            .filter(item => item.templateId !== id)
            .filter(item => item.isAvailable)
            .reduce((sum, item) => sum + item.totalPrice, 0)
        }));
        
        setOrders(updatedOrders);
      } else {
        // Fallback to localStorage
        setItemTemplates(prev => prev.filter(temp => temp.id !== id));
        
        // Also remove any order items using this template
        const updatedOrders = orders.map(order => ({
          ...order,
          items: order.items.filter(item => item.templateId !== id),
          totalCost: order.items
            .filter(item => item.templateId !== id)
            .filter(item => item.isAvailable)
            .reduce((sum, item) => sum + item.totalPrice, 0)
        }));
        
        setOrders(updatedOrders);
        
        // Save to localStorage
        const updatedTemplates = itemTemplates.filter(temp => temp.id !== id);
        localStorage.setItem('orderItemTemplates', JSON.stringify(updatedTemplates.map(template => ({
          ...template,
          createdAt: template.createdAt.toISOString()
        }))));
        
        localStorage.setItem('orders', JSON.stringify(updatedOrders.map(order => ({
          ...order,
          orderDate: order.orderDate.toISOString(),
          createdAt: order.createdAt.toISOString(),
          lastEditedAt: order.lastEditedAt?.toISOString()
        }))));
      }
    } catch (err) {
      setError('Failed to delete item template');
      throw err;
    }
  };

  // Order management
  const getOrdersByCategory = (categoryId: string): Order[] => {
    return orders.filter(order => order.categoryId === categoryId)
      .sort((a, b) => b.orderDate.getTime() - a.orderDate.getTime());
  };

  const addOrder = async (categoryId: string, orderDate: Date, items: OrderItem[]): Promise<Order> => {
    try {
      // Validate that the category exists before creating the order
      const categoryExists = categories.find(cat => cat.id === categoryId);
      if (!categoryExists) {
        throw new Error(`Category with ID "${categoryId}" does not exist. Please refresh the page and try again.`);
      }
      
      // Check for duplicate orders (same category and same date)
      const orderDateString = orderDate.toDateString(); // Compare dates without time
      const existingOrder = orders.find(order => 
        order.categoryId === categoryId && 
        order.orderDate.toDateString() === orderDateString
      );
      
      if (existingOrder) {
        const categoryName = categoryExists.name;
        const formattedDate = orderDate.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
        throw new Error(`An order for "${categoryName}" already exists for ${formattedDate}. Please edit the existing order or choose a different date.`);
      }
      
      const totalCost = items
        .filter(item => item.isAvailable)
        .reduce((sum, item) => sum + item.totalPrice, 0);
      
      const newOrder: Order = {
        id: crypto.randomUUID(),
        categoryId,
        orderDate,
        items,
        totalCost,
        createdAt: new Date()
      };
      
      if (supabase) {
        // Add order to Supabase
        const { error: orderError } = await supabase
          .from('orders')
          .insert({
            id: newOrder.id,
            category_id: newOrder.categoryId,
            order_date: newOrder.orderDate.toISOString(),
            total_cost: newOrder.totalCost,
            created_at: newOrder.createdAt.toISOString()
          });
        
        if (orderError) throw orderError;
        
        // Add order items to Supabase
        if (items.length > 0) {
          const orderItemsToInsert = items.map(item => ({
            id: crypto.randomUUID(), // Generate new UUID for Supabase
            order_id: newOrder.id,
            template_id: item.templateId,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            is_vat_nil: item.isVatNil,
            is_vat_included: item.isVatIncluded || false,
            vat_amount: item.vatAmount,
            total_price: item.totalPrice,
            is_available: item.isAvailable
          }));
          
          const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItemsToInsert);
          
          if (itemsError) throw itemsError;
        }
        
        // Update local state
        setOrders(prev => [newOrder, ...prev]);
      } else {
        // Fallback to localStorage
        const updatedOrders = [newOrder, ...orders];
        setOrders(updatedOrders);
        localStorage.setItem('orders', JSON.stringify(updatedOrders.map(order => ({
          ...order,
          orderDate: order.orderDate.toISOString(),
          createdAt: order.createdAt.toISOString(),
          lastEditedAt: order.lastEditedAt?.toISOString()
        }))));
      }
      
      return newOrder;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add order');
      throw err;
    }
  };

  const updateOrder = async (id: string, orderDate: Date, items: OrderItem[]): Promise<void> => {
    try {
      const totalCost = items
        .filter(item => item.isAvailable)
        .reduce((sum, item) => sum + item.totalPrice, 0);
      
      const lastEditedAt = new Date();
      
      if (supabase) {
        // Update order in Supabase
        const { error: orderError } = await supabase
          .from('orders')
          .update({
            order_date: orderDate.toISOString(),
            total_cost: totalCost,
            last_edited_at: lastEditedAt.toISOString()
          })
          .eq('id', id);
        
        if (orderError) throw orderError;
        
        // Delete existing order items
        const { error: deleteError } = await supabase
          .from('order_items')
          .delete()
          .eq('order_id', id);
        
        if (deleteError) throw deleteError;
        
        // Insert updated order items
        if (items.length > 0) {
          const orderItemsToInsert = items.map(item => ({
            id: crypto.randomUUID(), // Generate new UUID for Supabase
            order_id: id,
            template_id: item.templateId,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            is_vat_nil: item.isVatNil,
            is_vat_included: item.isVatIncluded || false,
            vat_amount: item.vatAmount,
            total_price: item.totalPrice,
            is_available: item.isAvailable
          }));
          
          const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItemsToInsert);
          
          if (itemsError) throw itemsError;
        }
        
        // Update local state
        setOrders(prev => prev.map(order => 
          order.id === id ? { 
            ...order, 
            orderDate, 
            items, 
            totalCost,
            lastEditedAt
          } : order
        ));
      } else {
        // Fallback to localStorage
        const updatedOrders = orders.map(order => 
          order.id === id ? { 
            ...order, 
            orderDate, 
            items, 
            totalCost,
            lastEditedAt
          } : order
        );
        setOrders(updatedOrders);
        localStorage.setItem('orders', JSON.stringify(updatedOrders.map(order => ({
          ...order,
          orderDate: order.orderDate.toISOString(),
          createdAt: order.createdAt.toISOString(),
          lastEditedAt: order.lastEditedAt?.toISOString()
        }))));
      }
    } catch (err) {
      setError('Failed to update order');
      throw err;
    }
  };

  const deleteOrder = async (id: string): Promise<void> => {
    try {
      if (supabase) {
        // Delete from Supabase (cascade will handle order items)
        const { error } = await supabase
          .from('orders')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        // Update local state
        setOrders(prev => prev.filter(order => order.id !== id));
      } else {
        // Fallback to localStorage
        const updatedOrders = orders.filter(order => order.id !== id);
        setOrders(updatedOrders);
        localStorage.setItem('orders', JSON.stringify(updatedOrders.map(order => ({
          ...order,
          orderDate: order.orderDate.toISOString(),
          createdAt: order.createdAt.toISOString(),
          lastEditedAt: order.lastEditedAt?.toISOString()
        }))));
      }
    } catch (err) {
      setError('Failed to delete order');
      throw err;
    }
  };

  // Search categories
  const searchCategories = (query: string): OrderCategory[] => {
    if (!query.trim()) return categories;
    
    const lowerQuery = query.toLowerCase();
    return categories.filter(cat => 
      cat.name.toLowerCase().includes(lowerQuery)
    );
  };

  const value = {
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
  };

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
};