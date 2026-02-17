import React, { createContext, useContext, useState, useEffect } from 'react';
import { OverItem } from '../types';
import { supabase } from '../lib/supabase';

/**
 * OVER CONTEXT TYPE DEFINITION
 * ============================
 */
interface OverContextType {
  // Item management
  items: OverItem[];
  addItem: (name: string) => Promise<void>;
  editItem: (id: string, name: string) => Promise<void>;
  toggleItem: (id: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  
  // Search functionality
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchItems: (query: string) => OverItem[];
  
  // State
  isLoading: boolean;
  error: string | null;
}

const OverContext = createContext<OverContextType | undefined>(undefined);

/**
 * CUSTOM HOOK FOR OVER CONTEXT ACCESS
 * ===================================
 */
export const useOver = () => {
  const context = useContext(OverContext);
  if (!context) {
    throw new Error('useOver must be used within an OverProvider');
  }
  return context;
};

/**
 * FORMAT ITEM NAME UTILITY
 * ========================
 */
const formatItemName = (name: string): string => {
  return name
    .trim()
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * OVER PROVIDER COMPONENT
 * =======================
 */
export const OverProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  
  // State management
  const [items, setItems] = useState<OverItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load items and set up real-time subscription
  useEffect(() => {
    const loadItems = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        if (supabase) {
          try {
            const { data, error } = await supabase
              .from('over_items')
              .select('*')
              .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            const overItems: OverItem[] = (data || []).map((item: any) => ({
              id: item.id,
              name: item.name,
              createdAt: new Date(item.created_at),
              isCompleted: item.is_completed || false,
              completedAt: item.completed_at ? new Date(item.completed_at) : undefined
            }));
            
            setItems(overItems);
            
            // Update localStorage with Supabase data
            localStorage.setItem('overItems', JSON.stringify(overItems.map(item => ({
              ...item,
              createdAt: item.createdAt.toISOString(),
              completedAt: item.completedAt?.toISOString()
            }))));
            
            
          } catch (supabaseError) {
            // Fallback to localStorage
            const stored = localStorage.getItem('overItems');
            if (stored) {
              const parsedItems = JSON.parse(stored).map((item: any) => ({
                ...item,
                createdAt: new Date(item.createdAt),
                completedAt: item.completedAt ? new Date(item.completedAt) : undefined
              }));
              setItems(parsedItems);
            }
          }
        } else {
          // Load from localStorage when Supabase is not available
          const stored = localStorage.getItem('overItems');
          if (stored) {
            const parsedItems = JSON.parse(stored).map((item: any) => ({
              ...item,
              createdAt: new Date(item.createdAt),
              completedAt: item.completedAt ? new Date(item.completedAt) : undefined
            }));
            setItems(parsedItems);
          }
        }
      } catch (err) {
        setError('Failed to load items');
      } finally {
        setIsLoading(false);
      }
    };

    loadItems();
  }, []);

  // Set up real-time subscription in a separate effect
  useEffect(() => {
    let channel: any = null;

    const setupRealtime = async () => {
      if (!supabase) {
        return;
      }

      try {
        
        channel = supabase
          .channel('over_items_changes')
          .on('postgres_changes', 
            { 
              event: '*', 
              schema: 'public', 
              table: 'over_items' 
            },
            (payload: any) => {
              
              if (payload.eventType === 'INSERT') {
                const newItem: OverItem = {
                  id: payload.new.id,
                  name: payload.new.name,
                  createdAt: new Date(payload.new.created_at),
                  isCompleted: payload.new.is_completed || false,
                  completedAt: payload.new.completed_at ? new Date(payload.new.completed_at) : undefined
                };
                
                
                setItems(prev => {
                  // Check if item already exists to prevent duplicates
                  if (prev.find(item => item.id === newItem.id)) {
                    return prev;
                  }
                  const updated = [newItem, ...prev];
                  
                  // Update localStorage
                  localStorage.setItem('overItems', JSON.stringify(updated.map(item => ({
                    ...item,
                    createdAt: item.createdAt.toISOString(),
                    completedAt: item.completedAt?.toISOString()
                  }))));
                  
                  return updated;
                });
              } else if (payload.eventType === 'UPDATE') {
                const updatedItem: OverItem = {
                  id: payload.new.id,
                  name: payload.new.name,
                  createdAt: new Date(payload.new.created_at),
                  isCompleted: payload.new.is_completed || false,
                  completedAt: payload.new.completed_at ? new Date(payload.new.completed_at) : undefined
                };
                
                
                setItems(prev => {
                  const updated = prev.map(item => 
                    item.id === updatedItem.id ? updatedItem : item
                  );
                  
                  // Update localStorage
                  localStorage.setItem('overItems', JSON.stringify(updated.map(item => ({
                    ...item,
                    createdAt: item.createdAt.toISOString(),
                    completedAt: item.completedAt?.toISOString()
                  }))));
                  
                  return updated;
                });
              } else if (payload.eventType === 'DELETE') {
                
                setItems(prev => {
                  const updated = prev.filter(item => item.id !== payload.old.id);
                  
                  // Update localStorage
                  localStorage.setItem('overItems', JSON.stringify(updated.map(item => ({
                    ...item,
                    createdAt: item.createdAt.toISOString(),
                    completedAt: item.completedAt?.toISOString()
                  }))));
                  
                  return updated;
                });
              }
            }
          )
          .subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
            } else if (status === 'CHANNEL_ERROR') {
            } else if (status === 'TIMED_OUT') {
            } else if (status === 'CLOSED') {
            }
          });
      } catch (error) {
      }
    };

    // Set up real-time subscription
    setupRealtime();
    
    // Cleanup function
    return () => {
      if (channel) {
        supabase?.removeChannel(channel);
      }
    };
  }, []);
  // Add new item
  const addItem = async (name: string): Promise<void> => {
    try {
      const formattedName = formatItemName(name);
      
      // Basic validation
      if (!formattedName || formattedName.length === 0) {
        throw new Error('Item name is required');
      }
      
      // Check for duplicates
      const existingItem = items.find(item => 
        item.name === formattedName && !item.isCompleted
      );
      
      if (existingItem) {
        throw new Error(`"${formattedName}" is already in the list`);
      }
      
      const newItem: OverItem = {
        id: crypto.randomUUID(),
        name: formattedName,
        createdAt: new Date(),
        isCompleted: false
      };
      
      // ALWAYS update localStorage first - this should never fail
      const updatedItems = [newItem, ...items];
      setItems(updatedItems);
      
      // Save to localStorage immediately - this is the primary storage
      try {
        localStorage.setItem('overItems', JSON.stringify(updatedItems.map(item => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
          completedAt: item.completedAt?.toISOString()
        }))));
      } catch (storageError) {
        throw new Error('Failed to save item locally');
      }
      
      // Try Supabase sync ONLY if online - don't block if offline
      if (supabase && navigator.onLine) {
        try {
          const { error } = await supabase
            .from('over_items')
            .insert({
              id: newItem.id,
              name: newItem.name,
              created_at: newItem.createdAt.toISOString(),
              is_completed: newItem.isCompleted
            });
          
          if (error) {
            console.warn('Cloud sync failed (saved locally):', error.message);
          }
        } catch (supabaseError) {
          console.warn('Network error (saved locally):', supabaseError instanceof Error ? supabaseError.message : 'Connection failed');
        }
      }
      
    } catch (err) {
      // Provide specific error messages
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unknown error occurred. Please try again.');
      }
      
      // If we get here, it's an actual failure that should be thrown
      throw err;
    }
  };

  // Edit existing item
  const editItem = async (id: string, name: string): Promise<void> => {
    try {
      const formattedName = formatItemName(name);
      
      // Basic validation
      if (!formattedName || formattedName.length === 0) {
        throw new Error('Item name is required');
      }
      
      // Check if item exists
      const existingItem = items.find(item => item.id === id);
      if (!existingItem) {
        throw new Error('Item not found');
      }
      
      // Check for duplicates (excluding current item)
      const duplicateItem = items.find(item => 
        item.id !== id && 
        item.name === formattedName && 
        !item.isCompleted
      );
      
      if (duplicateItem) {
        throw new Error(`"${formattedName}" already exists in the list`);
      }
      
      // Update localStorage first
      const updatedItems = items.map(item => 
        item.id === id ? { ...item, name: formattedName } : item
      );
      setItems(updatedItems);
      
      // Save to localStorage immediately
      try {
        localStorage.setItem('overItems', JSON.stringify(updatedItems.map(item => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
          completedAt: item.completedAt?.toISOString()
        }))));
      } catch (storageError) {
        throw new Error('Failed to save changes locally');
      }
      
      // Try Supabase sync if online
      if (supabase && navigator.onLine) {
        try {
          const { error } = await supabase
            .from('over_items')
            .update({ name: formattedName })
            .eq('id', id);
          
          if (error) {
            console.warn('Cloud sync failed (saved locally):', error.message);
          }
        } catch (supabaseError) {
          console.warn('Network error (saved locally):', supabaseError instanceof Error ? supabaseError.message : 'Connection failed');
        }
      }
      
    } catch (err) {
      // Provide specific error messages
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unknown error occurred. Please try again.');
      }
      
      // If we get here, it's an actual failure that should be thrown
      throw err;
    }
  };

  // Toggle item completion status
  const toggleItem = async (id: string): Promise<void> => {
    try {
      const item = items.find(i => i.id === id);
      if (!item) return;
      
      const newCompletedState = !item.isCompleted;
      const completedAt = newCompletedState ? new Date() : undefined;

      // Update localStorage first
      const updatedItems = items.map(i => 
        i.id === id ? { ...i, isCompleted: newCompletedState, completedAt } : i
      );
      setItems(updatedItems);
      localStorage.setItem('overItems', JSON.stringify(updatedItems.map(item => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        completedAt: item.completedAt?.toISOString()
      }))));

      if (supabase) {
        // Try Supabase sync
        try {
          const { error } = await supabase
            .from('over_items')
            .update({
              is_completed: newCompletedState,
              completed_at: completedAt?.toISOString()
            })
            .eq('id', id);
          
          if (error) {
            console.warn('⚠️ Supabase update failed, but localStorage succeeded:', error);
          }
        } catch (supabaseError) {
          console.warn('⚠️ Supabase update failed, but localStorage succeeded:', supabaseError);
        }
      }
    } catch (err) {
      setError('Failed to update item');
      throw err;
    }
  };

  // Delete item
  const deleteItem = async (id: string): Promise<void> => {
    try {
      // Update localStorage first
      const updatedItems = items.filter(item => item.id !== id);
      setItems(updatedItems);
      localStorage.setItem('overItems', JSON.stringify(updatedItems.map(item => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        completedAt: item.completedAt?.toISOString()
      }))));

      if (supabase) {
        // Try Supabase sync
        try {
          const { error } = await supabase
            .from('over_items')
            .delete()
            .eq('id', id);
          
          if (error) {
            console.warn('⚠️ Supabase delete failed, but localStorage succeeded:', error);
          }
        } catch (supabaseError) {
          console.warn('⚠️ Supabase delete failed, but localStorage succeeded:', supabaseError);
        }
      }
    } catch (err) {
      setError('Failed to delete item');
      throw err;
    }
  };

  // Search items
  const searchItems = (query: string): OverItem[] => {
    if (!query.trim()) {
      // Show incomplete items first, then completed items
      return [...items].sort((a, b) => {
        if (a.isCompleted !== b.isCompleted) {
          return a.isCompleted ? 1 : -1;
        }
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    }
    
    const lowerQuery = query.toLowerCase();
    const filtered = items.filter(item => 
      item.name.toLowerCase().includes(lowerQuery)
    );
    
    return filtered.sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  };

  const value = {
    items,
    addItem,
    editItem,
    toggleItem,
    deleteItem,
    searchQuery,
    setSearchQuery,
    searchItems,
    isLoading,
    error
  };

  return (
    <OverContext.Provider value={value}>
      {children}
    </OverContext.Provider>
  );
};