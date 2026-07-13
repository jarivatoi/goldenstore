/**
 * APP DATA INDEXEDDB MANAGER
 * ===========================
 *
 * Manages ALL app data storage in IndexedDB to avoid localStorage quota limits.
 * Provides unlimited storage capacity for all modules.
 *
 * This stores:
 * - Price List items
 * - Over Management items
 * - Order categories, templates, and orders
 * - Order Returns
 */

const DB_NAME = 'GoldenStoreDB'; // Main app database
const DB_VERSION = 5; // Version 5: Added returns support
const PRICE_LIST_STORE = 'priceList';
const OVER_ITEMS_STORE = 'overItems';
const ORDER_CATEGORIES_STORE = 'orderCategories';
const ORDER_TEMPLATES_STORE = 'orderTemplates';
const ORDERS_STORE = 'orders';
const RETURNS_STORE = 'orderReturns'; // Store for order returns

// CRITICAL: Singleton instance to prevent race conditions
let dbInstance: AppIndexedDBManager | null = null;

class AppIndexedDBManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private retryCount = 0;
  private readonly MAX_RETRIES = 3;

  // Factory method to ensure singleton
  static getInstance(): AppIndexedDBManager {
    if (!dbInstance) {
      dbInstance = new AppIndexedDBManager();
    }
    return dbInstance;
  }

  async initDB(): Promise<void> {
    console.log('[AppDB.initDB] Starting database initialization...');
    
    // If already initialized, return immediately
    if (this.db) {
      console.log('[AppDB.initDB] Database already initialized');
      return;
    }
    
    // If initialization is already in progress, wait for it
    if (this.initPromise) {
      console.log('[AppDB.initDB] Initialization in progress, waiting...');
      return this.initPromise;
    }

    // Create initialization promise and store it
    this.initPromise = this._initializeDB();
    
    try {
      await this.initPromise;
      this.retryCount = 0; // Reset retry count on success
    } catch (error) {
      // Clear the promise on failure so next call will retry
      this.initPromise = null;
      throw error;
    }
  }

  private async _initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('[AppDB.initDB] Opening database:', DB_NAME, 'version:', DB_VERSION);
      
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      // Add timeout to detect hanging
      const timeoutId = setTimeout(() => {
        console.error('[AppDB.initDB] Database open timed out after 15 seconds!');
        this.initPromise = null;
        
        // Retry logic
        if (this.retryCount < this.MAX_RETRIES) {
          this.retryCount++;
          console.log(`[AppDB.initDB] Retrying... attempt ${this.retryCount}/${this.MAX_RETRIES}`);
          setTimeout(() => {
            this._initializeDB().then(resolve).catch(reject);
          }, 500);
        } else {
          console.error('[AppDB.initDB] Max retries reached');
          reject(new Error('[AppDB.initDB] Database open timed out'));
        }
      }, 15000);

      request.onerror = () => {
        clearTimeout(timeoutId);
        console.error('Failed to open AppDB:', request.error);
        this.initPromise = null;
        reject(request.error);
      };

      request.onsuccess = () => {
        console.log('AppDB initialized successfully');
        clearTimeout(timeoutId);
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log('[AppDB] Database upgrade needed, oldVersion:', event.oldVersion, 'newVersion:', DB_VERSION);

        // Create stores for each data type
        if (!db.objectStoreNames.contains(PRICE_LIST_STORE)) {
          db.createObjectStore(PRICE_LIST_STORE, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(OVER_ITEMS_STORE)) {
          db.createObjectStore(OVER_ITEMS_STORE, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(ORDER_CATEGORIES_STORE)) {
          db.createObjectStore(ORDER_CATEGORIES_STORE, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(ORDER_TEMPLATES_STORE)) {
          db.createObjectStore(ORDER_TEMPLATES_STORE, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(ORDERS_STORE)) {
          db.createObjectStore(ORDERS_STORE, { keyPath: 'id' });
        }

        // Create returns store (version 5+)
        if (!db.objectStoreNames.contains(RETURNS_STORE)) {
          const returnsStore = db.createObjectStore(RETURNS_STORE, { keyPath: 'id' });
          returnsStore.createIndex('orderId', 'orderId', { unique: false });
          returnsStore.createIndex('createdAt', 'createdAt', { unique: false });
          console.log('[AppDB] Returns store created with indexes');
        }
      };

      // Handle blocked event (another tab has it open)
      request.onblocked = () => {
        clearTimeout(timeoutId);
        console.error('[AppDB] Database open blocked by another connection!');
        console.warn('[AppDB] Please close all other tabs/windows using this app');
        this.initPromise = null;
        reject(new Error('[AppDB] Database blocked - please close other tabs and refresh'));
      };
    });
  }

  /**
   * Force close all connections to the database
   * This helps clean up hung connections in WebContainer environments
   */
  public forceCloseAllConnections(): void {
    // Close our connection if exists
    if (this.db) {
      console.log('[forceCloseAllConnections] Closing existing connection');
      this.db.close();
      this.db = null;
    }
    
    // Try to delete and recreate the database to force close all connections
    try {
      console.log('[forceCloseAllConnections] Attempting to clean up connections...');
      const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
      
      deleteRequest.onsuccess = () => {
        console.log('[forceCloseAllConnections] Connections cleaned up successfully');
      };
      
      deleteRequest.onerror = () => {
        console.warn('[forceCloseAllConnections] Could not clean up connections:', deleteRequest.error);
      };
    } catch (error) {
      console.warn('[forceCloseAllConnections] Error during cleanup:', error);
    }
  }

  // Generic operations for any store
  private async saveAll(storeName: string, items: any[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      // Clear existing data
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => {
        // Add all new items
        items.forEach(item => store.put(item));
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  private async getAll(storeName: string): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Price List operations
  async savePriceListItems(items: any[]): Promise<void> {
    return this.saveAll(PRICE_LIST_STORE, items);
  }

  async getPriceListItems(): Promise<any[]> {
    return this.getAll(PRICE_LIST_STORE);
  }

  // Over Items operations
  async saveOverItems(items: any[]): Promise<void> {
    return this.saveAll(OVER_ITEMS_STORE, items);
  }

  async getOverItems(): Promise<any[]> {
    return this.getAll(OVER_ITEMS_STORE);
  }

  // Order Categories operations
  async saveOrderCategories(categories: any[]): Promise<void> {
    return this.saveAll(ORDER_CATEGORIES_STORE, categories);
  }

  async getOrderCategories(): Promise<any[]> {
    return this.getAll(ORDER_CATEGORIES_STORE);
  }

  // Order Templates operations
  async saveOrderTemplates(templates: any[]): Promise<void> {
    return this.saveAll(ORDER_TEMPLATES_STORE, templates);
  }

  async getOrderTemplates(): Promise<any[]> {
    return this.getAll(ORDER_TEMPLATES_STORE);
  }

  // Orders operations
  async saveOrders(orders: any[]): Promise<void> {
    return this.saveAll(ORDERS_STORE, orders);
  }

  async getOrders(): Promise<any[]> {
    return this.getAll(ORDERS_STORE);
  }

  // Returns operations
  async getAllReturns(): Promise<any[]> {
    return this.getAll(RETURNS_STORE);
  }

  async addReturn(returnData: any): Promise<void> {
    if (!this.db) {
      console.log('[addReturn] Database not initialized, initializing now...');
      await this.initDB();
    }

    return new Promise((resolve, reject) => {
      try {
        console.log('[addReturn] Starting transaction for RETURNS_STORE');
        const transaction = this.db!.transaction([RETURNS_STORE], 'readwrite');
        const store = transaction.objectStore(RETURNS_STORE);
        
        console.log('[addReturn] Adding return data:', returnData);
        const request = store.add(returnData);

        request.onsuccess = () => {
          console.log('[addReturn] Return added successfully');
          resolve();
        };
        request.onerror = () => {
          console.error('[addReturn] Failed to add return:', request.error);
          reject(request.error);
        };
        
        transaction.oncomplete = () => {
          console.log('[addReturn] Transaction completed successfully');
        };
        transaction.onerror = () => {
          console.error('[addReturn] Transaction error:', transaction.error);
        };
      } catch (error) {
        console.error('[addReturn] Exception occurred:', error);
        reject(error);
      }
    });
  }

  async updateReturn(returnData: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([RETURNS_STORE], 'readwrite');
      const store = transaction.objectStore(RETURNS_STORE);
      const request = store.put(returnData);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteReturn(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([RETURNS_STORE], 'readwrite');
      const store = transaction.objectStore(RETURNS_STORE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearAllReturns(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([RETURNS_STORE], 'readwrite');
      const store = transaction.objectStore(RETURNS_STORE);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async importReturns(returns: any[]): Promise<void> {
    return this.saveAll(RETURNS_STORE, returns);
  }
}

// Export singleton instance using factory method
export const appDBManager = AppIndexedDBManager.getInstance();
