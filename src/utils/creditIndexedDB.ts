/**
 * CREDIT DATA INDEXEDDB MANAGER
 * ==============================
 *
 * Manages credit data storage in IndexedDB with support for large profile pictures.
 * Provides offline-first storage with unlimited capacity compared to localStorage.
 */

const DB_NAME = 'CreditDB';
const DB_VERSION = 1;
const CLIENTS_STORE = 'clients';
const TRANSACTIONS_STORE = 'transactions';
const PAYMENTS_STORE = 'payments';

export interface DBClient {
  id: string;
  name: string;
  totalDebt: number;
  createdAt: string;
  lastTransactionAt: string;
  bottlesOwed: { beer: number; guinness: number; malta: number; coca: number; chopines: number };
  profilePicture?: string;
  position?: number;
}

export interface DBTransaction {
  id: string;
  clientId: string;
  description: string;
  amount: number;
  date: string;
}

export interface DBPayment {
  id: string;
  clientId: string;
  amount: number;
  date: string;
  note?: string;
}

class CreditIndexedDBManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private retryCount = 0;
  private readonly MAX_RETRIES = 3;

  async initDB(): Promise<void> {
    console.log('[CreditDB.initDB] Starting database initialization...');
    
    // If already initialized, return immediately
    if (this.db) {
      console.log('[CreditDB.initDB] Database already initialized');
      return;
    }
    
    // If initialization is already in progress, wait for it
    if (this.initPromise) {
      console.log('[CreditDB.initDB] Initialization in progress, waiting...');
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
      console.log('[CreditDB.initDB] Opening database:', DB_NAME, 'version:', DB_VERSION);
      
      // Force close any existing connection
      if (this.db) {
        this.db.close();
        this.db = null;
      }
      
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      // Add timeout to detect hanging
      const timeoutId = setTimeout(() => {
        console.error('[CreditDB.initDB] Database open timed out after 15 seconds!');
        this.initPromise = null;
        
        // Retry logic
        if (this.retryCount < this.MAX_RETRIES) {
          this.retryCount++;
          console.log(`[CreditDB.initDB] Retrying... attempt ${this.retryCount}/${this.MAX_RETRIES}`);
          setTimeout(() => {
            this._initializeDB().then(resolve).catch(reject);
          }, 500);
        } else {
          console.error('[CreditDB.initDB] Max retries reached');
          reject(new Error('[CreditDB.initDB] Database open timed out'));
        }
      }, 15000);

      request.onerror = () => {
        clearTimeout(timeoutId);
        console.error('Failed to open CreditDB:', request.error);
        this.initPromise = null;
        reject(request.error);
      };

      request.onsuccess = () => {
        console.log('CreditDB initialized successfully');
        clearTimeout(timeoutId);
        this.db = request.result;
        resolve();
      };

      // Handle blocked event (another tab has it open)
      request.onblocked = () => {
        clearTimeout(timeoutId);
        console.error('[CreditDB.initDB] Database open blocked by another connection!');
        console.warn('[CreditDB.initDB] Please close all other tabs/windows using this app');
        this.initPromise = null;
        reject(new Error('[CreditDB.initDB] Database blocked - please close other tabs and refresh'));
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create clients store
        if (!db.objectStoreNames.contains(CLIENTS_STORE)) {
          const clientStore = db.createObjectStore(CLIENTS_STORE, { keyPath: 'id' });
          clientStore.createIndex('name', 'name', { unique: false });
          clientStore.createIndex('lastTransactionAt', 'lastTransactionAt', { unique: false });
        }

        // Create transactions store
        if (!db.objectStoreNames.contains(TRANSACTIONS_STORE)) {
          const transactionStore = db.createObjectStore(TRANSACTIONS_STORE, { keyPath: 'id' });
          transactionStore.createIndex('clientId', 'clientId', { unique: false });
          transactionStore.createIndex('date', 'date', { unique: false });
        }

        // Create payments store
        if (!db.objectStoreNames.contains(PAYMENTS_STORE)) {
          const paymentStore = db.createObjectStore(PAYMENTS_STORE, { keyPath: 'id' });
          paymentStore.createIndex('clientId', 'clientId', { unique: false });
          paymentStore.createIndex('date', 'date', { unique: false });
        }
      };
    });
  }

  // Client operations
  async getAllClients(): Promise<DBClient[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CLIENTS_STORE], 'readonly');
      const store = transaction.objectStore(CLIENTS_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveClient(client: DBClient): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CLIENTS_STORE], 'readwrite');
      const store = transaction.objectStore(CLIENTS_STORE);
      const request = store.put(client);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async saveAllClients(clients: DBClient[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([CLIENTS_STORE], 'readwrite');
    const store = transaction.objectStore(CLIENTS_STORE);

    for (const client of clients) {
      store.put(client);
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async deleteClient(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CLIENTS_STORE], 'readwrite');
      const store = transaction.objectStore(CLIENTS_STORE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Transaction operations
  async getAllTransactions(): Promise<DBTransaction[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TRANSACTIONS_STORE], 'readonly');
      const store = transaction.objectStore(TRANSACTIONS_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveTransaction(transaction: DBTransaction): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([TRANSACTIONS_STORE], 'readwrite');
      const store = tx.objectStore(TRANSACTIONS_STORE);
      const request = store.put(transaction);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async saveAllTransactions(transactions: DBTransaction[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([TRANSACTIONS_STORE], 'readwrite');
    const store = transaction.objectStore(TRANSACTIONS_STORE);

    for (const trans of transactions) {
      store.put(trans);
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async deleteTransaction(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TRANSACTIONS_STORE], 'readwrite');
      const store = transaction.objectStore(TRANSACTIONS_STORE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteTransactionsByClient(clientId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TRANSACTIONS_STORE], 'readwrite');
      const store = transaction.objectStore(TRANSACTIONS_STORE);
      const index = store.index('clientId');
      const request = index.openCursor(IDBKeyRange.only(clientId));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Payment operations
  async getAllPayments(): Promise<DBPayment[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PAYMENTS_STORE], 'readonly');
      const store = transaction.objectStore(PAYMENTS_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async savePayment(payment: DBPayment): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PAYMENTS_STORE], 'readwrite');
      const store = transaction.objectStore(PAYMENTS_STORE);
      const request = store.put(payment);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async saveAllPayments(payments: DBPayment[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([PAYMENTS_STORE], 'readwrite');
    const store = transaction.objectStore(PAYMENTS_STORE);

    for (const payment of payments) {
      store.put(payment);
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async deletePayment(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PAYMENTS_STORE], 'readwrite');
      const store = transaction.objectStore(PAYMENTS_STORE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deletePaymentsByClient(clientId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PAYMENTS_STORE], 'readwrite');
      const store = transaction.objectStore(PAYMENTS_STORE);
      const index = store.index('clientId');
      const request = index.openCursor(IDBKeyRange.only(clientId));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Clear all data
  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [CLIENTS_STORE, TRANSACTIONS_STORE, PAYMENTS_STORE],
        'readwrite'
      );

      transaction.objectStore(CLIENTS_STORE).clear();
      transaction.objectStore(TRANSACTIONS_STORE).clear();
      transaction.objectStore(PAYMENTS_STORE).clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

export const creditDBManager = new CreditIndexedDBManager();
