import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { supabase } from '../lib/supabase';
import { Client, CreditTransaction, PaymentRecord } from '../types';
import { creditDBManager } from '../utils/creditIndexedDB';

interface CreditContextType {
  clients: Client[];
  transactions: CreditTransaction[];
  payments: PaymentRecord[];
  loading: boolean;
  error: string | null;
  
  // Client operations
  addClient: (name: string) => Promise<Client>;
  deleteClient: (clientId: string) => Promise<void>;
  searchClients: (query: string) => Client[];
  getClientTotalDebt: (clientId: string) => number;
  getClientBottlesOwed: (clientId: string) => { beer: number; guinness: number; malta: number; coca: number; chopines: number };
  getClientTransactions: (clientId: string) => CreditTransaction[];
  getClientPayments: (clientId: string) => PaymentRecord[];
  
  // Client update operations
  updateClient: (client: Client, preservePosition?: boolean) => Promise<void>;
  moveClientToFront: (clientId: string) => void;
  
  // Transaction operations
  addTransaction: (client: Client, description: string, amount: number) => Promise<void>;
  addBatchTransactions: (client: Client, transactionData: Array<{description: string, amount: number}>) => Promise<void>;
  
  // Payment operations
  addPartialPayment: (clientId: string, amount: number) => Promise<void>;
  settleClient: (clientId: string) => Promise<void>;
  settleClientWithFullClear: (clientId: string) => Promise<void>;
  
  // Bottle operations
  returnBottles: (clientId: string, bottles: { beer?: number; guinness?: number; malta?: number; coca?: number; chopines?: number }) => Promise<void>;
  
  // Data management
  refreshData: () => Promise<void>;
}

const CreditContext = createContext<CreditContextType | undefined>(undefined);

export const useCredit = () => {
  const context = useContext(CreditContext);
  if (context === undefined) {
    throw new Error('useCredit must be used within a CreditProvider');
  }
  return context;
};

interface CreditProviderProps {
  children: ReactNode;
}

export const CreditProvider: React.FC<CreditProviderProps> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data from IndexedDB
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Initialize IndexedDB
      await creditDBManager.initDB();

      // Try to migrate from localStorage if IndexedDB is empty
      const dbClients = await creditDBManager.getAllClients();

      if (dbClients.length === 0) {
        // Check if there's data in localStorage to migrate
        const storedClients = localStorage.getItem('creditClients');
        const storedTransactions = localStorage.getItem('creditTransactions');
        const storedPayments = localStorage.getItem('creditPayments');

        if (storedClients || storedTransactions || storedPayments) {
          console.log('Migrating data from localStorage to IndexedDB...');

          // Migrate clients
          if (storedClients) {
            const localClients = JSON.parse(storedClients);
            await creditDBManager.saveAllClients(localClients);
          }

          // Migrate transactions
          if (storedTransactions) {
            const localTransactions = JSON.parse(storedTransactions);
            await creditDBManager.saveAllTransactions(localTransactions);
          }

          // Migrate payments
          if (storedPayments) {
            const localPayments = JSON.parse(storedPayments);
            await creditDBManager.saveAllPayments(localPayments);
          }

          // Clear localStorage after successful migration
          localStorage.removeItem('creditClients');
          localStorage.removeItem('creditTransactions');
          localStorage.removeItem('creditPayments');

          console.log('Migration complete!');
        }
      }

      // Load from IndexedDB
      const [dbClientsData, dbTransactionsData, dbPaymentsData] = await Promise.all([
        creditDBManager.getAllClients(),
        creditDBManager.getAllTransactions(),
        creditDBManager.getAllPayments()
      ]);

      // Migrate client IDs from G001 format to G1 format (remove leading zeros)
      const migrateClientId = (oldId: string): string => {
        const match = oldId.match(/^G(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          return `G${num}`;
        }
        return oldId;
      };

      // Check if migration is needed
      const clientsNeedingMigration = dbClientsData.filter((client: any) =>
        migrateClientId(client.id) !== client.id
      );

      if (clientsNeedingMigration.length > 0) {
        console.log(`Migrating ${clientsNeedingMigration.length} clients from old ID format...`);

        // Delete all old format clients first
        for (const client of clientsNeedingMigration) {
          await creditDBManager.deleteClient(client.id);
          console.log(`Deleted old client ID: ${client.id}`);
        }

        // Delete old format transactions
        const transactionsNeedingMigration = dbTransactionsData.filter((trans: any) =>
          migrateClientId(trans.clientId) !== trans.clientId
        );
        for (const trans of transactionsNeedingMigration) {
          await creditDBManager.deleteTransaction(trans.id);
        }

        // Delete old format payments
        const paymentsNeedingMigration = dbPaymentsData.filter((payment: any) =>
          migrateClientId(payment.clientId) !== payment.clientId
        );
        for (const payment of paymentsNeedingMigration) {
          await creditDBManager.deletePayment(payment.id);
        }

        console.log('Deleted all old format records');
      }

      const transformedClients: Client[] = dbClientsData.map((client: any) => {
        const newId = migrateClientId(client.id);
        const hasIdChanged = newId !== client.id;

        if (hasIdChanged) {
          console.log(`Migrating client ID: ${client.id} -> ${newId}`);
        }

        return {
          ...client,
          id: newId,
          createdAt: new Date(client.createdAt),
          lastTransactionAt: new Date(client.lastTransactionAt)
        };
      });

      const transformedTransactions: CreditTransaction[] = dbTransactionsData.map((transaction: any) => ({
        ...transaction,
        clientId: migrateClientId(transaction.clientId),
        date: new Date(transaction.date)
      }));

      const transformedPayments: PaymentRecord[] = dbPaymentsData.map((payment: any) => ({
        ...payment,
        clientId: migrateClientId(payment.clientId),
        date: new Date(payment.date)
      }));

      // Save migrated data back to IndexedDB if any IDs changed
      if (clientsNeedingMigration.length > 0) {
        console.log('Saving migrated client IDs to IndexedDB...');
        await creditDBManager.saveAllClients(transformedClients);
        await creditDBManager.saveAllTransactions(transformedTransactions);
        await creditDBManager.saveAllPayments(transformedPayments);
        console.log('Client ID migration complete!');
      }

      setClients(transformedClients);
      setTransactions(transformedTransactions);
      setPayments(transformedPayments);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Initialize data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Add new client
  const addClient = async (name: string) => {
    try {
      const formattedName = name
        .trim()
        .replace(/\b\w+/g, (word) => {
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        });
      
      // Check for duplicate names (case-insensitive)
      const existingClient = clients.find(c => 
        c.name.toLowerCase() === formattedName.toLowerCase()
      );
      
      if (existingClient) {
        const error = new Error(`Client "${formattedName}" already exists`);
        error.name = 'DuplicateClientError';
        throw error;
      }
      
      // Generate ID in format G1, G2, G3... (no leading zeros) reusing deleted IDs
      const existingIds = clients.map(c => c.id).filter(id => id.match(/^G\d+$/));
      const existingNumbers = existingIds.map(id => parseInt(id.substring(1))).sort((a, b) => a - b);

      // Find the first missing number in the sequence
      let nextNumber = 1;
      for (const num of existingNumbers) {
        if (num === nextNumber) {
          nextNumber++;
        } else {
          break; // Found a gap, use this number
        }
      }

      const id = `G${nextNumber}`;
      
      // Check if client ID already exists
      const existingClientWithId = clients.find(c => c.id === id);
      if (existingClientWithId) {
        const error = new Error(`Client with ID "${id}" already exists`);
        error.name = 'DuplicateClientError';
        throw error;
      }
      
      const newClient: Client = {
        id,
        name: formattedName,
        totalDebt: 0,
        createdAt: new Date(),
        lastTransactionAt: new Date(),
        bottlesOwed: { beer: 0, guinness: 0, malta: 0, coca: 0, chopines: 0 }
      };

      // Update state synchronously using flushSync to ensure immediate availability
      flushSync(() => {
        setClients(prevClients => [...prevClients, newClient]);
      });

      // Save to IndexedDB
      await creditDBManager.saveClient({
        ...newClient,
        createdAt: newClient.createdAt.toISOString(),
        lastTransactionAt: newClient.lastTransactionAt.toISOString()
      });

      // Dispatch creditDataChanged event to notify all listeners
      window.dispatchEvent(new CustomEvent('creditDataChanged', {
        detail: {
          clientId: newClient.id,
          source: 'addClient'
        }
      }));

      return newClient;
    } catch (err) {
      throw err;
    }
  };

  // Update existing client
  const updateClient = async (client: Client, preservePosition: boolean = false) => {
    try {
      const updatedClients = clients.map(c => c.id === client.id ? client : c);

      let finalClients = updatedClients;

      // Only reorder if preservePosition is false
      if (!preservePosition) {
        // Move the updated client to the front of the list (rightmost position)
        const updatedClient = updatedClients.find(c => c.id === client.id);
        const otherClients = updatedClients.filter(c => c.id !== client.id);
        finalClients = updatedClient ? [...otherClients, updatedClient] : updatedClients;
      }

      setClients(finalClients);

      // Save to IndexedDB
      await creditDBManager.saveAllClients(finalClients.map(c => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        lastTransactionAt: c.lastTransactionAt.toISOString()
      })));

      // Dispatch creditDataChanged event to notify all listeners
      window.dispatchEvent(new CustomEvent('creditDataChanged', {
        detail: {
          clientId: client.id,
          source: 'updateClient'
        }
      }));
    } catch (err) {
      throw err;
    }
  };

  // Move client to end of list (rightmost position near calculator)
  const moveClientToFront = async (clientId: string) => {
    const clientToMove = clients.find(c => c.id === clientId);
    if (!clientToMove) return;

    const otherClients = clients.filter(c => c.id !== clientId);
    const reorderedClients = [...otherClients, clientToMove];

    setClients(reorderedClients);

    // Save to IndexedDB
    await creditDBManager.saveAllClients(reorderedClients.map(c => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      lastTransactionAt: c.lastTransactionAt.toISOString()
    })));

    // Dispatch creditDataChanged event to notify all listeners
    window.dispatchEvent(new CustomEvent('creditDataChanged', {
      detail: {
        clientId: clientId,
        source: 'moveClientToFront'
      }
    }));
  };
    
  const deleteClient = async (clientId: string) => {
    try {
      const updatedClients = clients.filter(client => client.id !== clientId);
      const updatedTransactions = transactions.filter(transaction => transaction.clientId !== clientId);
      const updatedPayments = payments.filter(payment => payment.clientId !== clientId);

      setClients(updatedClients);
      setTransactions(updatedTransactions);
      setPayments(updatedPayments);

      // Delete from IndexedDB
      await creditDBManager.deleteClient(clientId);

      // Delete associated transactions
      const clientTransactions = transactions.filter(t => t.clientId === clientId);
      for (const trans of clientTransactions) {
        await creditDBManager.deleteTransaction(trans.id);
      }

      // Delete associated payments
      const clientPayments = payments.filter(p => p.clientId === clientId);
      for (const payment of clientPayments) {
        await creditDBManager.deletePayment(payment.id);
      }

      // Dispatch creditDataChanged event to notify all listeners
      window.dispatchEvent(new CustomEvent('creditDataChanged', {
        detail: {
          clientId: clientId,
          source: 'deleteClient'
        }
      }));
    } catch (err) {
      console.error('Error deleting client:', err);
      throw err;
    }
  };

  // Search clients
  const searchClients = (query: string): Client[] => {
    if (!query.trim()) {
      // Sort numerically by ID when no search query
      return [...clients].sort((a, b) => {
        const aNum = parseInt(a.id.replace(/\D/g, ''), 10);
        const bNum = parseInt(b.id.replace(/\D/g, ''), 10);
        return aNum - bNum;
      });
    }

    // Check if query contains "/" (search in transaction descriptions)
    if (query.includes('/')) {
      // Search for the query string in transaction descriptions
      return clients.filter(client => {
        // Get all transactions for this client
        const clientTransactions = transactions.filter(t => t.clientId === client.id);

        // Check if any transaction description contains the query
        return clientTransactions.some(transaction => {
          return transaction.description.toLowerCase().includes(query.toLowerCase());
        });
      });
    }

    // Normalize function to remove accents and special characters
    const normalize = (str: string): string => {
      return str
        .toLowerCase()
        .normalize('NFD') // Decompose accented characters
        .replace(/[\u0300-\u036f]/g, '') // Remove accent marks
        .replace(/[^\w\s]/g, ''); // Remove other special characters except word chars and spaces
    };

    // Check if query is numeric (for ID search)
    const isNumericQuery = /^\d+$/.test(query.trim());

    if (isNumericQuery) {
      // For numeric queries, search in ID (exact match)
      const queryNum = parseInt(query.trim(), 10);

      return clients.filter(client => {
        // Extract just the numeric part from the ID (e.g., "G1" -> 1, "G100" -> 100)
        const idNumeric = parseInt(client.id.replace(/\D/g, ''), 10);
        // Match if the numeric part equals the query
        return idNumeric === queryNum;
      });
    } else {
      // For text queries, use exact matching only (no fuzzy matching)
      const normalizedQuery = normalize(query);
      const queryLower = query.toLowerCase();

      return clients.filter(client => {
        const normalizedName = normalize(client.name);
        const normalizedId = client.id.toLowerCase();

        // Exact match
        if (normalizedName === normalizedQuery || normalizedId === queryLower) {
          return true;
        }

        // Starts with query (prefix match)
        if (normalizedName.startsWith(normalizedQuery)) {
          return true;
        }

        // Contains query
        if (normalizedName.includes(normalizedQuery)) {
          return true;
        }

        // Word-based matching (any word starts with query)
        const nameWords = normalizedName.split(' ');
        for (const word of nameWords) {
          if (word.startsWith(normalizedQuery)) {
            return true;
          }
        }

        return false;
      });
    }
  };

  // Get client total debt
  const getClientTotalDebt = (clientId: string): number => {
    const client = clients.find(c => c.id === clientId);
    return client?.totalDebt || 0;
  };

  // Get client bottles owed
  const getClientBottlesOwed = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.bottlesOwed || { beer: 0, guinness: 0, malta: 0, coca: 0, chopines: 0 };
  };

  // Get client transactions
  const getClientTransactions = (clientId: string): CreditTransaction[] => {
    return transactions.filter(transaction => transaction.clientId === clientId);
  };

  // Get client payments
  const getClientPayments = (clientId: string): PaymentRecord[] => {
    return payments.filter(payment => payment.clientId === clientId);
  };

  // Add transaction
  const addTransaction = async (client: Client, description: string, amount: number) => {
    try {
      
      // Add transaction to database
      const newTransaction: CreditTransaction = {
        id: crypto.randomUUID(),
        clientId: client.id,
        description,
        amount,
        date: new Date(),
        type: 'debt'
      };
      
      // Update transactions state
      const updatedTransactions = [...transactions, newTransaction];
      setTransactions(updatedTransactions);

      // Save to IndexedDB
      await creditDBManager.saveTransaction({
        ...newTransaction,
        date: newTransaction.date.toISOString()
      });

      // Update client's total debt and last transaction time using flushSync
      flushSync(() => {
        setClients(prevClients => {
          const updatedClients = prevClients.map(c => {
            if (c.id === client.id) {
              return {
                ...c,
                totalDebt: c.totalDebt + amount,
                lastTransactionAt: new Date()
              };
            }
            return c;
          });

          // Move the updated client to the end of the array (most recent)
          const updatedClient = updatedClients.find(c => c.id === client.id);
          const otherClients = updatedClients.filter(c => c.id !== client.id);
          const reorderedClients = updatedClient ? [...otherClients, updatedClient] : updatedClients;

          // Save to IndexedDB asynchronously
          creditDBManager.saveAllClients(reorderedClients.map(c => ({
            ...c,
            createdAt: c.createdAt.toISOString(),
            lastTransactionAt: c.lastTransactionAt.toISOString()
          }))).catch(err => console.error('Error saving clients:', err));

          return reorderedClients;
        });
      });

      // Dispatch creditDataChanged event to notify all listeners
      window.dispatchEvent(new CustomEvent('creditDataChanged', {
        detail: {
          clientId: client.id,
          source: 'addTransaction'
        }
      }));
 } catch (err) {
      throw err;
    }
  };

  // Add multiple transactions at once (batch operation)
  const addBatchTransactions = async (client: Client, transactionData: Array<{description: string, amount: number}>) => {
    try {
      // Create all new transactions
      const newTransactions: CreditTransaction[] = transactionData.map(data => ({
        id: crypto.randomUUID(),
        clientId: client.id,
        description: data.description,
        amount: data.amount,
        date: new Date(),
        type: 'debt'
      }));

      // Update transactions state once
      const updatedTransactions = [...transactions, ...newTransactions];
      setTransactions(updatedTransactions);

      // Save all transactions to IndexedDB
      await Promise.all(newTransactions.map(transaction =>
        creditDBManager.saveTransaction({
          ...transaction,
          date: transaction.date.toISOString()
        })
      ));

      // Calculate total amount for client debt update
      const totalAmount = transactionData.reduce((sum, data) => sum + data.amount, 0);

      // Update client's total debt and last transaction time
      const updatedClients = clients.map(c => {
        if (c.id === client.id) {
          return {
            ...c,
            totalDebt: c.totalDebt + totalAmount,
            lastTransactionAt: new Date()
          };
        }
        return c;
      });

      // Move the updated client to the end of the array (most recent)
      const updatedClient = updatedClients.find(c => c.id === client.id);
      const otherClients = updatedClients.filter(c => c.id !== client.id);
      const reorderedClients = updatedClient ? [...otherClients, updatedClient] : updatedClients;

      setClients(reorderedClients);

      // Save to IndexedDB
      await creditDBManager.saveAllClients(reorderedClients.map(c => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        lastTransactionAt: c.lastTransactionAt.toISOString()
      })));

      // Dispatch creditDataChanged event to notify all listeners
      window.dispatchEvent(new CustomEvent('creditDataChanged', {
        detail: {
          clientId: client.id,
          source: 'addBatchTransactions'
        }
      }));
    } catch (err) {
      throw err;
    }
  };

  // Parse bottles from description
  const parseBottlesFromDescription = (description: string) => {
    // No automatic bottle parsing - bottles are tracked manually if needed
    return { beer: 0, guinness: 0, malta: 0, coca: 0, chopines: 0 };
  };

  // Add partial payment
  const addPartialPayment = async (clientId: string, amount: number) => {
    try {
      const newPayment: PaymentRecord = {
        id: crypto.randomUUID(),
        clientId,
        amount,
        date: new Date(),
        type: 'partial'
      };
      
      const updatedPayments = [...payments, newPayment];
      setPayments(updatedPayments);
      
      const currentDebt = getClientTotalDebt(clientId);
      const newDebt = Math.max(0, currentDebt - amount);
      
      const updatedClients = clients.map(client => 
        client.id === clientId 
          ? { ...client, totalDebt: newDebt, lastTransactionAt: new Date() }
          : client
      );
      
      // Move the updated client to the end of the array (most recent)
      const updatedClient = updatedClients.find(c => c.id === clientId);
      const otherClients = updatedClients.filter(c => c.id !== clientId);
      const reorderedClients = updatedClient ? [...otherClients, updatedClient] : updatedClients;
      
      setClients(reorderedClients);

      // Save to IndexedDB
      await creditDBManager.savePayment({
        ...newPayment,
        date: newPayment.date.toISOString()
      });

      await creditDBManager.saveAllClients(reorderedClients.map(client => ({
        ...client,
        createdAt: client.createdAt.toISOString(),
        lastTransactionAt: client.lastTransactionAt.toISOString()
      })));

      // Dispatch creditDataChanged event to notify all listeners
      window.dispatchEvent(new CustomEvent('creditDataChanged', {
        detail: {
          clientId: clientId,
          source: 'addPartialPayment'
        }
      }));
    } catch (err) {
      throw err;
    }
  };

  // Settle client (full payment)
  const settleClient = async (clientId: string) => {
    return settleClientAmountOnly(clientId);
  };

  // Settle client amount only (preserves returnables)
  const settleClientAmountOnly = async (clientId: string) => {
    try {
      const currentDebt = getClientTotalDebt(clientId);
      
      // Always remove all previous full settlements for this client, regardless of debt amount
      const filteredPayments = payments.filter(payment => 
        !(payment.clientId === clientId && payment.type === 'full')
      );
      
      // Add new settlement record (even if debt is 0)
      const newPayment: PaymentRecord = {
        id: crypto.randomUUID(),
        clientId,
        amount: currentDebt,
        date: new Date(),
        type: 'full'
      };
      
      const updatedPayments = [...filteredPayments, newPayment];
      setPayments(updatedPayments);
      
      // Only clear debt transactions (amount > 0), keep ALL return-related transactions
      // This preserves returnable item tracking in transaction history
      const updatedTransactions = transactions.filter(transaction => 
        transaction.clientId !== clientId ? true : (
          transaction.amount === 0 || 
          transaction.description.toLowerCase().includes('returned') ||
          transaction.description.toLowerCase().includes('chopine') ||
          transaction.description.toLowerCase().includes('bouteille')
        )
      );
      setTransactions(updatedTransactions);
      
      const updatedClients = clients.map(client => 
        client.id === clientId 
          ? { 
              ...client, 
              totalDebt: 0, 
              lastTransactionAt: new Date(),
              bottlesOwed: client.bottlesOwed // Keep existing bottle counts
            }
          : client
      );
      setClients(updatedClients);

      // Save to IndexedDB
      await creditDBManager.saveAllPayments(updatedPayments.map(payment => ({
        ...payment,
        date: payment.date.toISOString()
      })));

      await creditDBManager.saveAllTransactions(updatedTransactions.map(transaction => ({
        ...transaction,
        date: transaction.date.toISOString()
      })));

      await creditDBManager.saveAllClients(updatedClients.map(client => ({
        ...client,
        createdAt: client.createdAt.toISOString(),
        lastTransactionAt: client.lastTransactionAt.toISOString()
      })));
      
      // Force update of duplicate card and other UI components
      window.dispatchEvent(new CustomEvent('creditDataChanged', {
        detail: {
          clientId: clientId,
          source: 'settle'
        }
      }));
      
    } catch (err) {
      throw err;
    }
  };

  // Settle client with full clear (clears returnables too)
  const settleClientWithFullClear = async (clientId: string) => {
    try {
      const currentDebt = getClientTotalDebt(clientId);

      // Remove ALL previous payments for this client (both full and partial)
      const filteredPayments = payments.filter(payment =>
        payment.clientId !== clientId
      );

      // Add new settlement record (even if debt is 0)
      const newPayment: PaymentRecord = {
        id: crypto.randomUUID(),
        clientId,
        amount: currentDebt,
        date: new Date(),
        type: 'full'
      };

      const updatedPayments = [...filteredPayments, newPayment];
      setPayments(updatedPayments);
      
      // Clear ALL transactions for this client (including returnables)
      const updatedTransactions = transactions.filter(transaction => 
        transaction.clientId !== clientId
      );
      setTransactions(updatedTransactions);
      
      const updatedClients = clients.map(client => 
        client.id === clientId 
          ? { 
              ...client, 
              totalDebt: 0, 
              lastTransactionAt: new Date(),
              bottlesOwed: { beer: 0, guinness: 0, malta: 0, coca: 0, chopines: 0 } // Clear bottle counts too
            }
          : client
      );
      setClients(updatedClients);

      // Save to IndexedDB
      await creditDBManager.saveAllPayments(updatedPayments.map(payment => ({
        ...payment,
        date: payment.date.toISOString()
      })));

      await creditDBManager.saveAllTransactions(updatedTransactions.map(transaction => ({
        ...transaction,
        date: transaction.date.toISOString()
      })));

      await creditDBManager.saveAllClients(updatedClients.map(client => ({
        ...client,
        createdAt: client.createdAt.toISOString(),
        lastTransactionAt: client.lastTransactionAt.toISOString()
      })));
      
      // Force update of duplicate card and other UI components
      window.dispatchEvent(new CustomEvent('creditDataChanged', {
        detail: {
          clientId: clientId,
          source: 'settleFullClear'
        }
      }));
      
    } catch (err) {
      throw err;
    }
  };

  // Return bottles
  const returnBottles = async (clientId: string, returnedBottles: { beer?: number; guinness?: number; malta?: number; coca?: number; chopines?: number }) => {
    try {
      const currentBottles = getClientBottlesOwed(clientId);
      const newBottles = {
        beer: Math.max(0, currentBottles.beer - (returnedBottles.beer || 0)),
        guinness: Math.max(0, currentBottles.guinness - (returnedBottles.guinness || 0)),
        malta: Math.max(0, currentBottles.malta - (returnedBottles.malta || 0)),
        coca: Math.max(0, currentBottles.coca - (returnedBottles.coca || 0)),
        chopines: Math.max(0, currentBottles.chopines - (returnedBottles.chopines || 0))
      };
      
      const updatedClients = clients.map(client => 
        client.id === clientId 
          ? { ...client, bottlesOwed: newBottles, lastTransactionAt: new Date() }
          : client
      );
      
      // Move the updated client to the end of the array (most recent)
      const updatedClient = updatedClients.find(c => c.id === clientId);
      const otherClients = updatedClients.filter(c => c.id !== clientId);
      const reorderedClients = updatedClient ? [...otherClients, updatedClient] : updatedClients;
      
      setClients(reorderedClients);

      // Save to IndexedDB
      await creditDBManager.saveAllClients(reorderedClients.map(client => ({
        ...client,
        createdAt: client.createdAt.toISOString(),
        lastTransactionAt: client.lastTransactionAt.toISOString()
      })));

      // Dispatch creditDataChanged event to notify all listeners
      window.dispatchEvent(new CustomEvent('creditDataChanged', {
        detail: {
          clientId: clientId,
          source: 'returnBottles'
        }
      }));
    } catch (err) {
      throw err;
    }
  };

  // Refresh data
  const refreshData = async () => {
    await loadData();
  };

  const value: CreditContextType = {
    clients,
    transactions,
    payments,
    loading,
    error,
    addClient,
    updateClient,
    deleteClient,
    searchClients,
    getClientTotalDebt,
    getClientBottlesOwed,
    getClientTransactions,
    getClientPayments,
    moveClientToFront,
    addTransaction,
    addBatchTransactions,
    addPartialPayment,
    settleClient,
    settleClientWithFullClear,
    returnBottles,
    refreshData
  };

  return (
    <CreditContext.Provider value={value}>
      {children}
    </CreditContext.Provider>
  );
};
