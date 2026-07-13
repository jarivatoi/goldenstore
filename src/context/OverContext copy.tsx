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
            // Load from Supabase
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
            console.log(`Loaded ${overItems.length} over items from Supabase`);
            
            // NO REAL-TIME SUBSCRIPTIONS - Device-to-Supabase sync only
            console.log('✅ Over items loaded from Supabase (device-to-Supabase sync only)');
          } catch (supabaseError) {
            console.error('Failed to load from Supabase:', supabaseError);
            // Fallback to localStorage
            const stored = localStorage.getItem('overItems');
            if (stored) {
              const parsedItems = JSON.parse(stored).map((item: any) => ({
                ...item,
                createdAt: new Date(item.createdAt),
                completedAt: item.completedAt ? new Date(item.completedAt) : undefined
              }));
              setItems(parsedItems);
              console.log(`Loaded ${parsedItems.length} over items from localStorage (fallback)`);
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
            console.log(`Loaded ${parsedItems.length} over items from localStorage`);
          }
        }
      } catch (err) {
        setError('Failed to load items');
        console.error('Error loading over items:', err);
      } finally {
        setIsLoading(false);
      }
    }
  }
  )
  // Add new item
  const addItem = async (name: string): Promise<void> => {
    try {
      const formattedName = formatItemName(name);
      
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
      
      if (supabase) {
        // Add to Supabase
        const { error } = await supabase
          .from('over_items')
          .insert({
            id: newItem.id,
            name: newItem.name,
            created_at: newItem.createdAt.toISOString(),
            is_completed: newItem.isCompleted
          });
        
        if (error) throw error;
        
        // Update local state
        setItems(prev => [newItem, ...prev]);
        console.log('Over item added to Supabase successfully:', newItem);
      } else {
        // Fallback to localStorage
        const updatedItems = [newItem, ...items];
        setItems(updatedItems);
        localStorage.setItem('overItems', JSON.stringify(updatedItems.map(item => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
          completedAt: item.completedAt?.toISOString()
        }))));
        console.log('Over item added to localStorage successfully:', newItem);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
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

      if (supabase) {
        // Update in Supabase
        const { error } = await supabase
          .from('over_items')
          .update({
            is_completed: newCompletedState,
            completed_at: completedAt?.toISOString()
          })
          .eq('id', id);
        
        if (error) throw error;
        
        // Update local state
        setItems(prev => prev.map(i => 
          i.id === id ? { ...i, isCompleted: newCompletedState, completedAt } : i
        ));
        console.log('Over item toggled in Supabase successfully');
      } else {
        // Fallback to localStorage
        const updatedItems = items.map(i => 
          i.id === id ? { ...i, isCompleted: newCompletedState, completedAt } : i
        );
        setItems(updatedItems);
        localStorage.setItem('overItems', JSON.stringify(updatedItems.map(item => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
          completedAt: item.completedAt?.toISOString()
        }))));
        console.log('Over item toggled in localStorage successfully');
      }
    } catch (err) {
      setError('Failed to update item');
      throw err;
    }
  };

  // Delete item
  const deleteItem = async (id: string): Promise<void> => {
    try {
      if (supabase) {
        // Delete from Supabase
        const { error } = await supabase
          .from('over_items')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        // Update local state
        setItems(prev => prev.filter(item => item.id !== id));
        console.log('Over item deleted from Supabase successfully');
      } else {
        // Fallback to localStorage
        const updatedItems = items.filter(item => item.id !== id);
        setItems(updatedItems);
        localStorage.setItem('overItems', JSON.stringify(updatedItems.map(item => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
          completedAt: item.completedAt?.toISOString()
        }))));
        console.log('Over item deleted from localStorage successfully');
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