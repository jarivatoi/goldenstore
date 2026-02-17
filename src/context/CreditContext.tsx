import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Client, CreditTransaction, PaymentRecord } from '../types';

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

  // Load data from Supabase
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load from localStorage
      
      const storedClients = localStorage.getItem('creditClients');
      const storedTransactions = localStorage.getItem('creditTransactions');
      const storedPayments = localStorage.getItem('creditPayments');
      
      const transformedClients: Client[] = storedClients ? JSON.parse(storedClients).map((client: any) => ({
        ...client,
        createdAt: new Date(client.createdAt),
        lastTransactionAt: new Date(client.lastTransactionAt)
      })) : [];
      
      const transformedTransactions: CreditTransaction[] = storedTransactions ? JSON.parse(storedTransactions).map((transaction: any) => ({
        ...transaction,
        date: new Date(transaction.date)
      })) : [];
      
      const transformedPayments: PaymentRecord[] = storedPayments ? JSON.parse(storedPayments).map((payment: any) => ({
        ...payment,
        date: new Date(payment.date)
      })) : [];
      
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
      
      // Generate ID in format G001, G002, G003... reusing deleted IDs
      const existingIds = clients.map(c => c.id).filter(id => id.match(/^G\d{3}$/));
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
      
      const id = `G${nextNumber.toString().padStart(3, '0')}`;
      
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

      // Update state first to trigger re-render
      setClients(prevClients => {
        const updatedClients = [...prevClients, newClient];
        
        // Save to localStorage after state update
        localStorage.setItem('creditClients', JSON.stringify(updatedClients.map(client => ({
          ...client,
          createdAt: client.createdAt.toISOString(),
          lastTransactionAt: client.lastTransactionAt.toISOString()
        }))));
        
        return updatedClients;
      });
      
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

      // Save to localStorage
      localStorage.setItem('creditClients', JSON.stringify(finalClients.map(c => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        lastTransactionAt: c.lastTransactionAt.toISOString()
      }))));
    } catch (err) {
      throw err;
    }
  };

  // Move client to end of list (rightmost position near calculator)
  const moveClientToFront = (clientId: string) => {
    const clientToMove = clients.find(c => c.id === clientId);
    if (!clientToMove) return;
    
    const otherClients = clients.filter(c => c.id !== clientId);
    const reorderedClients = [...otherClients, clientToMove];
    
    setClients(reorderedClients);
    
    // Save to localStorage
    localStorage.setItem('creditClients', JSON.stringify(reorderedClients.map(c => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      lastTransactionAt: c.lastTransactionAt.toISOString()
    }))));
  };
    
  const deleteClient = async (clientId: string) => {
    try {
      const updatedClients = clients.filter(client => client.id !== clientId);
      const updatedTransactions = transactions.filter(transaction => transaction.clientId !== clientId);
      const updatedPayments = payments.filter(payment => payment.clientId !== clientId);
      
      setClients(updatedClients);
      setTransactions(updatedTransactions);
      setPayments(updatedPayments);
      
      // Save to localStorage
      localStorage.setItem('creditClients', JSON.stringify(updatedClients.map(client => ({
        ...client,
        createdAt: client.createdAt.toISOString(),
        lastTransactionAt: client.lastTransactionAt.toISOString()
      }))));
      
      localStorage.setItem('creditTransactions', JSON.stringify(updatedTransactions.map(transaction => ({
        ...transaction,
        date: transaction.date.toISOString()
      }))));
      
      localStorage.setItem('creditPayments', JSON.stringify(updatedPayments.map(payment => ({
        ...payment,
        date: payment.date.toISOString()
      }))));
    } catch (err) {
      console.error('Error deleting client:', err);
      throw err;
    }
  };

  // Search clients
  const searchClients = (query: string): Client[] => {
    if (!query.trim()) return clients;
    
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
      // For numeric queries, format as G-prefix ID and do exact match
      const paddedNumber = query.trim().padStart(3, '0');
      const formattedId = `G${paddedNumber}`;
      
      return clients.filter(client => 
        client.id === formattedId
      );
    } else {
      // For text queries, search by name or exact ID match
      const normalizedQuery = normalize(query);
      return clients.filter(client => 
        normalize(client.name).includes(normalizedQuery) ||
        client.id.toLowerCase() === query.toLowerCase()
      );
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
      setTransactions(prevTransactions => {
        const updatedTransactions = [...prevTransactions, newTransaction];
        
        // Save to localStorage
        localStorage.setItem('creditTransactions', JSON.stringify(updatedTransactions.map(transaction => ({
          ...transaction,
          date: transaction.date.toISOString()
        }))));
        
        return updatedTransactions;
      });
      
      // Update client's total debt and last transaction time
      // Update clients state
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
        
        // Save to localStorage
        localStorage.setItem('creditClients', JSON.stringify(reorderedClients.map(c => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
          lastTransactionAt: c.lastTransactionAt.toISOString()
        }))));
        
        return reorderedClients;
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
      
      // Save to localStorage
      localStorage.setItem('creditPayments', JSON.stringify(updatedPayments.map(payment => ({
        ...payment,
        date: payment.date.toISOString()
      }))));
      
      localStorage.setItem('creditClients', JSON.stringify(reorderedClients.map(client => ({
        ...client,
        createdAt: client.createdAt.toISOString(),
        lastTransactionAt: client.lastTransactionAt.toISOString()
      }))));
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
      
      // Save to localStorage
      localStorage.setItem('creditPayments', JSON.stringify(updatedPayments.map(payment => ({
        ...payment,
        date: payment.date.toISOString()
      }))));
      
      localStorage.setItem('creditTransactions', JSON.stringify(updatedTransactions.map(transaction => ({
        ...transaction,
        date: transaction.date.toISOString()
      }))));
      
      localStorage.setItem('creditClients', JSON.stringify(updatedClients.map(client => ({
        ...client,
        createdAt: client.createdAt.toISOString(),
        lastTransactionAt: client.lastTransactionAt.toISOString()
      }))));
      
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
      
      // Save to localStorage
      localStorage.setItem('creditPayments', JSON.stringify(updatedPayments.map(payment => ({
        ...payment,
        date: payment.date.toISOString()
      }))));
      
      localStorage.setItem('creditTransactions', JSON.stringify(updatedTransactions.map(transaction => ({
        ...transaction,
        date: transaction.date.toISOString()
      }))));
      
      localStorage.setItem('creditClients', JSON.stringify(updatedClients.map(client => ({
        ...client,
        createdAt: client.createdAt.toISOString(),
        lastTransactionAt: client.lastTransactionAt.toISOString()
      }))));
      
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
      
      // Save to localStorage
      localStorage.setItem('creditClients', JSON.stringify(reorderedClients.map(client => ({
        ...client,
        createdAt: client.createdAt.toISOString(),
        lastTransactionAt: client.lastTransactionAt.toISOString()
      }))));
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
