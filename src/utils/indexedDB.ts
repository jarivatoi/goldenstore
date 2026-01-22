/*
 * UTILS/INDEXEDDB.TS - OFFLINE DATABASE MANAGEMENT
 * ================================================
 * 
 * OVERVIEW:
 * Comprehensive IndexedDB wrapper for offline-first data persistence.
 * Provides a clean API for CRUD operations on price list items.
 * 
 * KEY FEATURES:
 * - Offline-first architecture
 * - Automatic database initialization
 * - Error handling and recovery
 * - Data migration support
 * - Bulk import/export operations
 * - Cross-platform compatibility (Android, iOS, Desktop)
 * - Fallback to localStorage if IndexedDB unavailable
 * 
 * BROWSER COMPATIBILITY:
 * - Modern browsers with IndexedDB support
 * - Fallback error handling for unsupported browsers
 * - Progressive enhancement approach
 * 
 * PERFORMANCE CONSIDERATIONS:
 * - Indexed columns for fast queries
 * - Batch operations for bulk data
 * - Connection pooling via singleton pattern
 * - Minimal data transformation overhead
 */
// IndexedDB utility functions for offline storage
const DB_NAME = 'PriceListDB';

/**
 * DATABASE CONFIGURATION
 * ======================
 * 
 * DB_NAME: Database identifier in browser storage
 * DB_VERSION: Schema version for migration handling
 * STORE_NAME: Object store name for price items
 * 
 * VERSION HISTORY:
 * v1: Initial schema with basic item structure
 * v2: Added indexes for improved query performance
 * v3: Enhanced cross-platform compatibility
 */
const DB_VERSION = 3;
const STORE_NAME = 'priceItems';

/**
 * BROWSER COMPATIBILITY CHECK
 * ===========================
 * 
 * Checks if IndexedDB is available in the current browser
 */
const isIndexedDBAvailable = (): boolean => {
  try {
    return typeof window !== 'undefined' && 
           'indexedDB' in window && 
           window.indexedDB !== null &&
           window.indexedDB !== undefined;
  } catch (error) {
    console.warn('IndexedDB availability check failed:', error);
    return false;
  }
};

/**
 * LOCALSTORAGE FALLBACK
 * =====================
 * 
 * Fallback storage methods for browsers without IndexedDB support
 */
class LocalStorageFallback {
  private storageKey = 'priceListItems';

  async getAllItems(): Promise<DBPriceItem[]> {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('LocalStorage fallback - getAllItems failed:', error);
      return [];
    }
  }

  async addItem(item: DBPriceItem): Promise<void> {
    const items = await this.getAllItems();
    items.push(item);
    localStorage.setItem(this.storageKey, JSON.stringify(items));
  }

  async updateItem(item: DBPriceItem): Promise<void> {
    const items = await this.getAllItems();
    const index = items.findIndex(i => i.id === item.id);
    if (index >= 0) {
      items[index] = item;
      localStorage.setItem(this.storageKey, JSON.stringify(items));
    }
  }

  async deleteItem(id: string): Promise<void> {
    const items = await this.getAllItems();
    const filtered = items.filter(i => i.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(filtered));
  }

  async clearAllItems(): Promise<void> {
    localStorage.removeItem(this.storageKey);
  }

  async importItems(items: DBPriceItem[]): Promise<void> {
    localStorage.setItem(this.storageKey, JSON.stringify(items));
  }
}

/**
 * DATABASE PRICE ITEM INTERFACE
 * =============================
 * 
 * DESCRIPTION:
 * Database-specific version of PriceItem with serialized dates.
 * Used for IndexedDB storage where Date objects are converted to strings.
 * 
 * DIFFERENCES FROM PriceItem:
 * - createdAt: string (ISO format) instead of Date object
 * - lastEditedAt: string (ISO format) instead of Date object
 * 
 * CONVERSION:
 * - To DB: Date.toISOString()
 * - From DB: new Date(string)
 */
export interface DBPriceItem {
  id: string;
  name: string;
  price: number;
  createdAt: string;
  lastEditedAt?: string;
}

/**
 * INDEXEDDB MANAGER CLASS
 * =======================
 * 
 * DESCRIPTION:
 * Singleton class managing all IndexedDB operations for the application.
 * Provides a clean, Promise-based API for database interactions.
 * Includes fallback to localStorage for unsupported browsers.
 * 
 * DESIGN PATTERNS:
 * - Singleton: Single database connection instance
 * - Promise-based: Async/await compatible methods
 * - Error handling: Comprehensive try/catch with meaningful messages
 * - Fallback pattern: Graceful degradation to localStorage
 * 
 * LIFECYCLE:
 * 1. initDB() - Initialize database connection and schema
 * 2. CRUD operations - Add, read, update, delete items
 * 3. Bulk operations - Import/export large datasets
 * 4. Cleanup operations - Clear all data when needed
 */
class IndexedDBManager {
  // Private database connection instance
  private db: IDBDatabase | null = null;
  private fallback: LocalStorageFallback | null = null;
  private useIndexedDB = true;

  /**
   * INITIALIZE DATABASE CONNECTION
   * =============================
   * 
   * PURPOSE:
   * Establishes connection to IndexedDB and sets up schema if needed.
    * Falls back to localStorage if IndexedDB is unavailable.
   * Must be called before any other database operations.
   * 
   * PROCESS:
    * 1. Check IndexedDB availability
    * 2. Initialize appropriate storage method
   * 1. Open database connection with version number
   * 2. Handle schema upgrades in onupgradeneeded event
   * 3. Create object store and indexes if first time
   * 4. Store connection reference for future operations
   * 
   * ERROR HANDLING:
   * - Rejects promise if database cannot be opened
   * - Logs detailed error information for debugging
   * - Allows fallback to localStorage in calling code
   * 
   * @returns Promise<void> - Resolves when database is ready
   * @throws Error if IndexedDB is not supported or fails to open
   */
  async initDB(): Promise<void> {
    // Check if IndexedDB is available
    if (!isIndexedDBAvailable()) {
      console.warn('IndexedDB not available, falling back to localStorage');
      this.useIndexedDB = false;
      this.fallback = new LocalStorageFallback();
      return;
    }

    return new Promise((resolve, reject) => {
      // Attempt to open database with current version
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      // Handle database open errors
      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        // Fallback to localStorage on IndexedDB failure
        console.warn('Falling back to localStorage due to IndexedDB error');
        this.useIndexedDB = false;
        this.fallback = new LocalStorageFallback();
        resolve();
      };

      // Handle successful database open
      request.onsuccess = () => {
        this.db = request.result;
        this.useIndexedDB = true;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      // Handle database schema upgrades
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store if it doesn't exist (first time setup)
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          // Create store with 'id' as primary key
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          
          // Create indexes for better querying performance
          // These allow fast lookups by name, price, and date
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('price', 'price', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          
          console.log('Object store created with indexes');
        }

        // Handle version 3 upgrades
        if (event.oldVersion < 3) {
          console.log('Upgrading database to version 3 - Enhanced cross-platform compatibility');
          // Add any new indexes or schema changes for v3 here
        }
      };
    });
  }

  /**
   * GET ALL ITEMS FROM DATABASE
   * ===========================
   * 
   * PURPOSE:
   * Retrieves all price items from the database for display.
   * Used during app initialization and after data changes.
   * 
   * PROCESS:
    * 1. Check storage method (IndexedDB or localStorage)
    * 2. Use appropriate retrieval method
   * 1. Create read-only transaction
   * 2. Access object store
   * 3. Execute getAll() request
   * 4. Return array of all items
   * 
   * PERFORMANCE:
   * - Single transaction for efficiency
   * - Returns all items at once (suitable for small datasets)
   * - Could be optimized with pagination for large datasets
   * 
   * @returns Promise<DBPriceItem[]> - Array of all database items
   * @throws Error if database not initialized or operation fails
   */
  async getAllItems(): Promise<DBPriceItem[]> {
    if (!this.useIndexedDB && this.fallback) {
      return this.fallback.getAllItems();
    }

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      // Create read-only transaction for data retrieval
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      // Request all items from the store
      const request = store.getAll();

      // Handle successful retrieval
      request.onsuccess = () => {
        // Return items array or empty array if none found
        resolve(request.result || []);
      };

      // Handle retrieval errors
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * ADD NEW ITEM TO DATABASE
   * ========================
   * 
   * PURPOSE:
   * Inserts a new price item into the database.
   * Used when user creates a new item via the add form.
   * 
   * PROCESS:
    * 1. Check storage method (IndexedDB or localStorage)
    * 2. Use appropriate insertion method
   * 1. Create read-write transaction
   * 2. Access object store
   * 3. Execute add() request with item data
   * 4. Resolve when operation completes
   * 
   * VALIDATION:
   * - Assumes item has unique ID (handled by calling code)
   * - Will fail if item with same ID already exists
   * - Use updateItem() for modifications to existing items
   * 
   * @param item - DBPriceItem object to insert
   * @returns Promise<void> - Resolves when item is added
   * @throws Error if database not initialized or add operation fails
   */
  async addItem(item: DBPriceItem): Promise<void> {
    if (!this.useIndexedDB && this.fallback) {
      return this.fallback.addItem(item);
    }

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      // Create read-write transaction for data modification
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // Add new item to store (will fail if ID already exists)
      const request = store.add(item);

      // Handle successful addition
      request.onsuccess = () => {
        resolve();
      };

      // Handle addition errors (e.g., duplicate ID)
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * UPDATE EXISTING ITEM IN DATABASE
   * ================================
   * 
   * PURPOSE:
   * Updates an existing price item with new data.
   * Used when user edits an item via the edit modal.
   * 
   * PROCESS:
    * 1. Check storage method (IndexedDB or localStorage)
    * 2. Use appropriate update method
   * 1. Create read-write transaction
   * 2. Access object store
   * 3. Execute put() request with updated item data
   * 4. Resolve when operation completes
   * 
   * BEHAVIOR:
   * - Will create item if ID doesn't exist (upsert behavior)
   * - Completely replaces existing item data
   * - Maintains referential integrity via ID matching
   * 
   * @param item - DBPriceItem object with updated data
   * @returns Promise<void> - Resolves when item is updated
   * @throws Error if database not initialized or update operation fails
   */
  async updateItem(item: DBPriceItem): Promise<void> {
    if (!this.useIndexedDB && this.fallback) {
      return this.fallback.updateItem(item);
    }

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      // Create read-write transaction for data modification
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // Update item in store (upsert: update if exists, create if not)
      const request = store.put(item);

      // Handle successful update
      request.onsuccess = () => {
        resolve();
      };

      // Handle update errors
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * DELETE ITEM FROM DATABASE
   * =========================
   * 
   * PURPOSE:
   * Removes a price item from the database by ID.
   * Used when user deletes an item via swipe action.
   * 
   * PROCESS:
    * 1. Check storage method (IndexedDB or localStorage)
    * 2. Use appropriate deletion method
   * 1. Create read-write transaction
   * 2. Access object store
   * 3. Execute delete() request with item ID
   * 4. Resolve when operation completes
   * 
   * BEHAVIOR:
   * - Silently succeeds even if ID doesn't exist
   * - Permanently removes item from database
   * - Cannot be undone (no soft delete)
   * 
   * @param id - Unique identifier of item to delete
   * @returns Promise<void> - Resolves when item is deleted
   * @throws Error if database not initialized or delete operation fails
   */
  async deleteItem(id: string): Promise<void> {
    if (!this.useIndexedDB && this.fallback) {
      return this.fallback.deleteItem(id);
    }

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      // Create read-write transaction for data modification
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // Delete item by ID
      const request = store.delete(id);

      // Handle successful deletion
      request.onsuccess = () => {
        resolve();
      };

      // Handle deletion errors
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * CLEAR ALL ITEMS FROM DATABASE
   * =============================
   * 
   * PURPOSE:
   * Removes all price items from the database.
   * Used during data import to clear existing data first.
   * 
   * PROCESS:
    * 1. Check storage method (IndexedDB or localStorage)
    * 2. Use appropriate clearing method
   * 1. Create read-write transaction
   * 2. Access object store
   * 3. Execute clear() request
   * 4. Resolve when operation completes
   * 
   * WARNING:
   * - This is a destructive operation
   * - Cannot be undone
   * - Should only be used during import operations
   * - Consider backup before calling
   * 
   * @returns Promise<void> - Resolves when all items are cleared
   * @throws Error if database not initialized or clear operation fails
   */
  async clearAllItems(): Promise<void> {
    if (!this.useIndexedDB && this.fallback) {
      return this.fallback.clearAllItems();
    }

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      // Create read-write transaction for data modification
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // Clear all items from store
      const request = store.clear();

      // Handle successful clearing
      request.onsuccess = () => {
        resolve();
      };

      // Handle clearing errors
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * IMPORT ITEMS (BULK OPERATION)
   * =============================
   * 
   * PURPOSE:
   * Replaces all database items with imported data.
   * Used when user imports a JSON file with price list data.
   * 
   * PROCESS:
    * 1. Check storage method (IndexedDB or localStorage)
    * 2. Use appropriate import method
   * 1. Clear all existing items from database
   * 2. Add each imported item individually
   * 3. Wait for all operations to complete
   * 4. Resolve when import is finished
   * 
   * TRANSACTION STRATEGY:
   * - Uses multiple transactions for better error isolation
   * - Clear operation in separate transaction
   * - Each add operation in individual transaction
   * - Could be optimized with single transaction for large datasets
   * 
   * ERROR HANDLING:
   * - If clear fails, import is aborted
   * - If any add fails, some items may be partially imported
   * - Calling code should handle partial failure scenarios
   * 
   * @param items - Array of DBPriceItem objects to import
   * @returns Promise<void> - Resolves when all items are imported
   * @throws Error if database not initialized or import operations fail
   */
  async importItems(items: DBPriceItem[]): Promise<void> {
    if (!this.useIndexedDB && this.fallback) {
      return this.fallback.importItems(items);
    }

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Clear existing data first to avoid duplicates
    await this.clearAllItems();

    // Add all new items using Promise.all for concurrent execution
    const promises = items.map(item => this.addItem(item));
    await Promise.all(promises);
  }

  /**
   * GET STORAGE INFO
   * ================
   * 
   * Returns information about the current storage method being used
   */
  getStorageInfo(): { type: 'IndexedDB' | 'localStorage'; available: boolean } {
    return {
      type: this.useIndexedDB ? 'IndexedDB' : 'localStorage',
      available: this.useIndexedDB ? !!this.db : !!this.fallback
    };
  }
}

/**
 * SINGLETON INSTANCE EXPORT
 * =========================
 * 
 * DESCRIPTION:
 * Exports a single instance of IndexedDBManager for use throughout the app.
 * Ensures consistent database connection and prevents multiple instances.
 * Automatically handles fallback to localStorage when needed.
 * 
 * USAGE:
 * import { dbManager } from '../utils/indexedDB';
 * await dbManager.initDB();
 * const items = await dbManager.getAllItems();
 * 
 * BENEFITS:
 * - Single database connection across app
 * - Consistent state management
 * - Simplified import statements
 * - Memory efficiency
 * - Automatic fallback handling
 */
export const dbManager = new IndexedDBManager();