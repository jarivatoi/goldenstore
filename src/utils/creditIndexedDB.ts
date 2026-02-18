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

  async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open CreditDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('CreditDB initialized successfully');
        resolve();
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
