/**
 * APP DATA INDEXEDDB MANAGER
 * ===========================
 *
 * Manages ALL app data storage in IndexedDB to avoid localStorage quota limits.
 * Provides unlimited storage capacity for all modules.
 *
 * This replaces localStorage for:
 * - Price List items
 * - Over Management items
 * - Order categories, templates, and orders
 */

const DB_NAME = 'GoldenStoreDB';
const DB_VERSION = 1;
const PRICE_LIST_STORE = 'priceList';
const OVER_ITEMS_STORE = 'overItems';
const ORDER_CATEGORIES_STORE = 'orderCategories';
const ORDER_TEMPLATES_STORE = 'orderTemplates';
const ORDERS_STORE = 'orders';

class AppIndexedDBManager {
  private db: IDBDatabase | null = null;

  async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open GoldenStoreDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('GoldenStoreDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

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
      };
    });
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
}

export const appDBManager = new AppIndexedDBManager();
