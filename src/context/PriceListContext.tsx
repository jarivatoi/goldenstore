/*
 * CONTEXT/PRICELISTCONTEXT.TSX - GLOBAL STATE MANAGEMENT
 * ======================================================
 * 
 * OVERVIEW:
 * React Context provider for managing global application state.
 * Handles all price list data, CRUD operations, search, sorting, and persistence.
 * 
 * KEY RESPONSIBILITIES:
 * - Centralized state management for price items
 * - IndexedDB synchronization for offline functionality
 * - Search and filtering logic
 * - Sorting algorithms for different criteria
 * - Error handling and loading states
 * - Data import/export operations
 * 
 * ARCHITECTURE PATTERN:
 * - Context API for global state
 * - Custom hooks for component access
 * - Separation of concerns between UI and data logic
 * - Optimistic updates with error rollback
 * 
 * PERFORMANCE CONSIDERATIONS:
 * - Memoized search results
 * - Efficient sorting algorithms
 * - Minimal re-renders through careful state updates
 * - Debounced search operations (could be added)
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { PriceItem, SortOption } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

/**
 * CONTEXT TYPE DEFINITION
 * =======================
 * 
 * DESCRIPTION:
 * TypeScript interface defining all methods and properties available
 * through the PriceListContext. Ensures type safety for consumers.
 * 
 * STATE PROPERTIES:
 * @param items - Array of all price items in memory
 * @param searchQuery - Current search filter string
 * @param sortOption - Current sorting criteria
 * @param isLoading - Boolean indicating data loading state
 * @param error - Error message string or null
 * 
 * CRUD METHODS:
 * @param addItem - Create new price item
 * @param updateItem - Modify existing price item
 * @param deleteItem - Remove price item
 * @param importItems - Bulk replace all items
 * 
 * UTILITY METHODS:
 * @param searchItems - Filter items by search query
 * @param setSearchQuery - Update search filter
 * @param setSortOption - Update sorting criteria
 */
interface PriceListContextType {
  items: PriceItem[];
  addItem: (name: string, price: number, grossPrice: number) => Promise<void>;
  updateItem: (id: string, name: string, price: number, grossPrice: number) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  importItems: (items: PriceItem[]) => Promise<void>;
  searchItems: (query: string) => PriceItem[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortOption: SortOption;
  setSortOption: (option: SortOption) => void;
  isLoading: boolean;
  error: string | null;
}

/**
 * EXPORT STATEMENT
 * ================
 * 
 * PURPOSE:
 * Exports the PriceListProvider component for use in the application.
 * This provider should wrap the entire app to provide global state access.
 */

/**
 * CONTEXT CREATION
 * ================
 * 
 * Creates React context with undefined default value.
 * Requires PriceListProvider wrapper to provide actual implementation.
 * Prevents accidental usage outside of provider scope.
 */
const PriceListContext = createContext<PriceListContextType | undefined>(undefined);

/**
 * CUSTOM HOOK FOR CONTEXT ACCESS
 * ==============================
 * 
 * PURPOSE:
 * Provides type-safe access to PriceListContext from any component.
 * Includes runtime check to ensure context is available.
 * 
 * USAGE:
 * const { items, addItem, searchItems } = usePriceList();
 * 
 * ERROR HANDLING:
 * Throws descriptive error if used outside PriceListProvider.
 * Helps developers identify context usage issues early.
 * 
 * @returns PriceListContextType - All context methods and state
 * @throws Error if used outside PriceListProvider
 */
export const usePriceList = () => {
  const context = useContext(PriceListContext);
  if (!context) {
    throw new Error('usePriceList must be used within a PriceListProvider');
  }
  return context;
};

/**
 * TEXT FORMATTING UTILITY
 * =======================
 * 
 * PURPOSE:
 * Standardizes item names by capitalizing each word and cleaning whitespace.
 * Ensures consistent formatting across all user inputs.
 * 
 * PROCESS:
 * 1. Trim leading/trailing whitespace
 * 2. Split by spaces and filter empty strings
 * 3. Capitalize first letter of each word
 * 4. Lowercase remaining letters
 * 5. Join with single spaces
 * 
 * EXAMPLES:
 * "apple juice" → "Apple Juice"
 * "  BREAD   loaf  " → "Bread Loaf"
 * "milk" → "Milk"
 * 
 * @param str - Raw input string from user
 * @returns string - Formatted string with proper capitalization
 */
const capitalizeWords = (str: string): string => {
  return str
    .trim()
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * PRICE LIST PROVIDER COMPONENT
 * =============================
 * 
 * PURPOSE:
 * React component that provides global state management for the entire application.
 * Wraps child components with context and handles all data operations.
 * 
 * INITIALIZATION PROCESS:
 * 1. Initialize IndexedDB connection
 * 2. Load existing items from database
 * 3. Set up state management
 * 4. Handle errors with fallback strategies
 * 
 * STATE MANAGEMENT:
 * - items: Array of all price items
 * - searchQuery: Current search filter
 * - sortOption: Current sorting method
 * - isLoading: Loading state for UI feedback
 * - error: Error messages for user display
 * 
 * ERROR RECOVERY:
 * - Fallback to localStorage if IndexedDB fails
 * - Graceful degradation for unsupported browsers
 * - User-friendly error messages
 * 
 * @param children - React components to wrap with context
 */
export const PriceListProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  // STATE DECLARATIONS
  // ==================
  
  // Core data state
  const [items, setItems] = useState<PriceItem[]>([]);
  
  // UI interaction state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  
  // Application state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * SUPABASE DATA LOADING WITH REAL-TIME SYNC
   * ==============================
   * 
   * PURPOSE:
   * Loads data from Supabase and sets up real-time subscriptions.
   * All users share the same data pool (anonymous authentication).
   * 
   * PROCESS:
   * 1. Set loading state to true
   * 2. Clear any previous errors
   * 3. Load all items from Supabase
   * 4. Set up real-time subscription
   * 5. Update component state
   * 6. Handle errors gracefully
   * 
   * ERROR HANDLING:
   * - Primary: Try Supabase connection
   * - Final: Show error message to user
   * 
   * PERFORMANCE:
   * - Only runs once on mount
   * - Loads all data in single operation
   * - Could be optimized with lazy loading for large datasets
   */
  useEffect(() => {
    const loadItems = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Always try localStorage first for PWA reliability
        console.log('Loading items from localStorage first for PWA');
        const storedItems = localStorage.getItem('priceListItems');
        const localItems: PriceItem[] = storedItems ? JSON.parse(storedItems).map((item: any) => ({
          ...item,
          grossPrice: item.grossPrice || 0,
          createdAt: new Date(item.createdAt),
          lastEditedAt: item.lastEditedAt ? new Date(item.lastEditedAt) : undefined
        })) : [];
        
        setItems(localItems);
        console.log(`Loaded ${localItems.length} items from localStorage`);
        
        // Then try to sync with Supabase in the background
        try {
          if (!supabase) {
            console.log('Supabase not available, using localStorage only');
            return;
          }
          
          console.log('Attempting background sync with Supabase...');
          const { data, error } = await supabase
            .from('price_items')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (error) {
            console.warn('Supabase sync failed, continuing with localStorage:', error);
            return;
          }
          
          const priceItems: PriceItem[] = (data || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            grossPrice: item.gross_price ?? 0,
            createdAt: new Date(item.created_at),
            lastEditedAt: item.last_edited_at ? new Date(item.last_edited_at) : undefined
          }));
          
          // Only update if Supabase has different data
          if (JSON.stringify(priceItems) !== JSON.stringify(localItems)) {
            setItems(priceItems);
            // Update localStorage with Supabase data
            localStorage.setItem('priceListItems', JSON.stringify(priceItems.map(item => ({
              ...item,
              createdAt: item.createdAt.toISOString(),
              lastEditedAt: item.lastEditedAt?.toISOString()
            }))));
          }
          console.log(`Loaded ${priceItems.length} items from Supabase`);
          
          // NO REAL-TIME SUBSCRIPTIONS - Device-to-Supabase sync only
          console.log('✅ Price items loaded from Supabase (device-to-Supabase sync only)');
        } catch (supabaseError) {
          console.warn('Supabase failed, falling back to localStorage:', supabaseError);
        }
      } catch (err) {
        console.error('Failed to load items:', err);
        setError('Failed to load items. Using offline mode.');
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadItems();
  }, []);

  
  /**
   * ADD ITEM METHOD
   * ===============
   * 
   * PURPOSE:
   * Creates a new price item and adds it to both memory and database.
   * Provides optimistic updates for better user experience.
   * 
   * PROCESS:
   * 1. Validate and format input data
   * 2. Create new item object with metadata
   * 3. Add to database first (for data integrity)
   * 4. Update memory state on success
   * 5. Handle errors gracefully
   * 
   * VALIDATION:
   * - Name: Trimmed and capitalized
   * - Price: Positive number, rounded to 2 decimals
   * - ID: Unique timestamp-based identifier
   * 
   * ERROR HANDLING:
   * - Database errors are caught and re-thrown
   * - User-friendly error messages
   * - State remains consistent on failure
   * 
   * @param name - Item name (will be formatted)
   * @param price - Item price (will be rounded)
   * @returns Promise<void> - Resolves when item is added
   * @throws Error if database operation fails
   */
  const addItem = async (name: string, price: number, grossPrice: number) => {
    try {
      console.log('🔍 Adding item (Mobile Safari):', { name, price, grossPrice });
      
      const capitalizedName = capitalizeWords(name);
      
      // Mobile Safari validation
      if (!capitalizedName || capitalizedName.trim().length === 0) {
        throw new Error('Item name is required');
      }
      
      if (isNaN(price) || price <= 0) {
        throw new Error('Valid price is required');
      }
      
      if (isNaN(grossPrice) || grossPrice <= 0) {
        throw new Error('Valid gross price is required');
      }
      
      const newItem: PriceItem = {
        id: crypto.randomUUID(),
        name: capitalizedName,
        price,
        grossPrice,
        createdAt: new Date()
      };
      
      if (supabase) {
        // Add to Supabase
        console.log('📤 Sending to Supabase (Mobile):', {
          id: newItem.id,
          name: newItem.name,
          price: newItem.price,
          gross_price: newItem.grossPrice,
          created_at: newItem.createdAt.toISOString()
        });
        
        // Mobile Safari timeout handling
        const insertPromise = supabase
          .from('price_items')
          .insert({
            id: newItem.id,
            name: newItem.name,
            price: newItem.price,
            gross_price: newItem.grossPrice,
            created_at: newItem.createdAt.toISOString()
          });
        
        // Add timeout for mobile networks
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout - please check your connection')), 15000);
        });
        
        const { error } = await Promise.race([insertPromise, timeoutPromise]);
        
        if (error) {
          console.error('❌ Supabase error (Mobile):', error);
          
          // Mobile-specific error handling
          if (error.message?.includes('timeout') || error.message?.includes('network')) {
            throw new Error('Network error. Please check your internet connection and try again.');
          }
          
          if (error.message?.includes('duplicate') || error.code === '23505') {
            throw new Error('An item with this name already exists.');
          }
          
          throw error;
        }
        
        // Update local state
        setItems(prev => [newItem, ...prev]);
        console.log('✅ Item added to Supabase successfully (Mobile):', newItem);
      } else {
        // Fallback to localStorage
        const updatedItems = [newItem, ...items];
        setItems(updatedItems);
        localStorage.setItem('priceListItems', JSON.stringify(updatedItems.map(item => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
          lastEditedAt: item.lastEditedAt?.toISOString()
        }))));
        console.log('Item added to localStorage successfully:', newItem);
      }
    } catch (err) {
      console.error('Failed to add item:', err);
      setError('Failed to add item. Please try again.');
      throw err;
    }
  };

  const updateItem = async (id: string, name: string, price: number, grossPrice: number) => {
    try {
      const capitalizedName = capitalizeWords(name);
      const existingItem = items.find(item => item.id === id);
      if (!existingItem) {
        throw new Error('Item not found');
      }
      
      const updatedItem: PriceItem = {
        ...existingItem,
        name: capitalizedName,
        price,
        grossPrice,
        lastEditedAt: new Date()
      };
      
      if (supabase) {
        // Update in Supabase
        const { error } = await supabase
          .from('price_items')
          .update({
            name: updatedItem.name,
            price: updatedItem.price,
            gross_price: updatedItem.grossPrice,
            last_edited_at: updatedItem.lastEditedAt?.toISOString()
          })
          .eq('id', id);
        
        if (error) throw error;
        
        // Update local state
        setItems(prev => prev.map(item => item.id === id ? updatedItem : item));
        console.log('Item updated in Supabase successfully');
      } else {
        // Fallback to localStorage
        const updatedItems = items.map(item => item.id === id ? updatedItem : item);
        setItems(updatedItems);
        localStorage.setItem('priceListItems', JSON.stringify(updatedItems.map(item => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
          lastEditedAt: item.lastEditedAt?.toISOString()
        }))));
        console.log('Item updated in localStorage successfully');
      }
    } catch (err) {
      console.error('Failed to update item:', err);
      setError('Failed to update item. Please try again.');
      throw err;
    }
  };

  const deleteItem = async (id: string) => {
    try {
      if (supabase) {
        // Delete from Supabase
        const { error } = await supabase
          .from('price_items')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        // Update local state
        setItems(prev => prev.filter(item => item.id !== id));
        console.log('Item deleted from Supabase successfully');
      } else {
        // Fallback to localStorage
        const updatedItems = items.filter(item => item.id !== id);
        setItems(updatedItems);
        localStorage.setItem('priceListItems', JSON.stringify(updatedItems.map(item => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
          lastEditedAt: item.lastEditedAt?.toISOString()
        }))));
        console.log('Item deleted from localStorage successfully');
      }
    } catch (err) {
      console.error('Failed to delete item:', err);
      setError('Failed to delete item. Please try again.');
      throw err;
    }
  };

  const importItems = async (newItems: PriceItem[]) => {
    try {
      setIsLoading(true);
      
      if (supabase) {
        // Clear existing items and insert new ones
        const { error: deleteError } = await supabase
          .from('price_items')
          .delete()
          .neq('id', '');
        
        if (deleteError) throw deleteError;
        
        // Insert new items
        const itemsToInsert = newItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          created_at: item.createdAt.toISOString(),
          last_edited_at: item.lastEditedAt?.toISOString()
        }));
        
        const { error: insertError } = await supabase
          .from('price_items')
          .insert(itemsToInsert);
        
        if (insertError) throw insertError;
        
        setItems(newItems);
        console.log(`Successfully imported ${newItems.length} items to Supabase`);
      } else {
        // Fallback to localStorage
        setItems(newItems);
        localStorage.setItem('priceListItems', JSON.stringify(newItems.map(item => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
          lastEditedAt: item.lastEditedAt?.toISOString()
        }))));
        console.log(`Successfully imported ${newItems.length} items to localStorage`);
      }
    } catch (err) {
      console.error('Failed to import items:', err);
      setError('Failed to import items. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * SEARCH ITEMS METHOD
   * ===================
   * 
   * PURPOSE:
   * Filters and sorts items based on search query and sort option.
   * Provides real-time search functionality.
   * 
   * SEARCH LOGIC:
   * - Case-insensitive substring matching
   * - Searches item names only
   * - Empty query returns all items
   * - Results are sorted according to current sort option
   * 
   * PERFORMANCE:
   * - Efficient string operations
   * - Could be optimized with debouncing for large datasets
   * - Could implement fuzzy search for better UX
   * 
   * SORTING:
   * - Delegates to sortItems helper function
   * - Maintains consistent sort order
   * - Supports multiple sort criteria
   * 
   * @param query - Search string to filter by
   * @returns PriceItem[] - Filtered and sorted array of items
   */
  const searchItems = (query: string) => {
    // Return all items if no search query
    if (!query.trim()) return sortItems(items, sortOption);
    
    // Filter items by case-insensitive name matching
    const lowerCaseQuery = query.toLowerCase();
    const filteredItems = items.filter(item => 
      item.name.toLowerCase().includes(lowerCaseQuery)
    );
    
    // Apply current sort option to filtered results
    return sortItems(filteredItems, sortOption);
  };

  /**
   * SORT ITEMS HELPER FUNCTION
   * ==========================
   * 
   * PURPOSE:
   * Sorts an array of price items according to specified criteria.
   * Provides consistent sorting logic across the application.
   * 
   * SORT OPTIONS:
   * - name-asc/desc: Alphabetical sorting by item name
   * - price-asc/desc: Numerical sorting by price value
   * - date-asc/desc: Chronological sorting by creation date
   * 
   * IMPLEMENTATION:
   * - Creates copy of array to avoid mutation
   * - Uses appropriate comparison functions
   * - Handles edge cases gracefully
   * 
   * PERFORMANCE:
   * - Efficient native sort algorithms
   * - Minimal memory allocation
   * - Stable sorting for consistent results
   * 
   * @param itemsToSort - Array of items to sort
   * @param option - Sort criteria to apply
   * @returns PriceItem[] - New sorted array
   */
  const sortItems = (itemsToSort: PriceItem[], option: SortOption) => {
    // Create copy to avoid mutating original array
    const itemsCopy = [...itemsToSort];
    
    switch (option) {
      // Alphabetical sorting by name
      case 'name-asc':
        return itemsCopy.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc':
        return itemsCopy.sort((a, b) => b.name.localeCompare(a.name));
      
      // Numerical sorting by price
      case 'price-asc':
        return itemsCopy.sort((a, b) => a.price - b.price);
      case 'price-desc':
        return itemsCopy.sort((a, b) => b.price - a.price);
      
      // Chronological sorting by creation date
      case 'date-asc':
        return itemsCopy.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      case 'date-desc':
        return itemsCopy.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      // Default case (should not happen with TypeScript)
      default:
        return itemsCopy;
    }
  };

  /**
   * CONTEXT VALUE OBJECT
   * ====================
   * 
   * PURPOSE:
   * Aggregates all state and methods into single object for context provision.
   * Provides clean interface for consuming components.
   * 
   * ORGANIZATION:
   * - State properties first
   * - CRUD methods second
   * - Utility methods third
   * - UI state last
   * 
   * PERFORMANCE:
   * - Could be memoized to prevent unnecessary re-renders
   * - Current implementation re-creates object on every render
   * - Consider useMemo for optimization if needed
   */
  const value = {
    // Core data state
    items,
    
    // CRUD operations
    addItem,
    updateItem,
    deleteItem,
    importItems,
    
    // Search and filtering
    searchItems,
    searchQuery,
    setSearchQuery,
    
    // Sorting
    sortOption,
    setSortOption,
    
    // Application state
    isLoading,
    error
  };

  /**
   * CONTEXT PROVIDER RENDER
   * =======================
   * 
   * PURPOSE:
   * Renders the context provider with aggregated value object.
   * Makes all state and methods available to child components.
   * 
   * CHILDREN:
   * All child components will have access to context via usePriceList hook.
   * Context value is available throughout the component tree.
   */
  return (
    <PriceListContext.Provider value={value}>
      {children}
    </PriceListContext.Provider>
  );
};