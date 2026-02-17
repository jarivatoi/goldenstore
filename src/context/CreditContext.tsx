import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Client, Transaction, Payment } from '../types';

interface CreditContextType {
  clients: Client[];
  transactions: Transaction[];
  payments: Payment[];
  loading: boolean;
  error: string | null;
  
  // Client operations
  addClient: (name: string) => Promise<Client>;
  deleteClient: (clientId: string) => Promise<void>;
  searchClients: (query: string) => Client[];
  getClientTotalDebt: (clientId: string) => number;
  getClientBottlesOwed: (clientId: string) => { beer: number; guinness: number; malta: number; coca: number; chopines: number };
  getClientTransactions: (clientId: string) => Transaction[];
  getClientPayments: (clientId: string) => Payment[];
  
  // Client update operations
  updateClient: (client: Client) => Promise<void>;
  moveClientToFront: (clientId: string) => void;
  
  // Transaction operations
  addTransaction: (client: Client, description: string, amount: number) => Promise<void>;
  
  // Payment operations
  addPartialPayment: (clientId: string, amount: number) => Promise<void>;
  settleClient: (clientId: string) => Promise<void>;
  
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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data from Supabase
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load from localStorage
      console.log('Using localStorage for credit data');
      
      const storedClients = localStorage.getItem('creditClients');
      const storedTransactions = localStorage.getItem('creditTransactions');
      const storedPayments = localStorage.getItem('creditPayments');
      
      const transformedClients: Client[] = storedClients ? JSON.parse(storedClients).map((client: any) => ({
        ...client,
        createdAt: new Date(client.createdAt),
        lastTransactionAt: new Date(client.lastTransactionAt)
      })) : [];
      
      const transformedTransactions: Transaction[] = storedTransactions ? JSON.parse(storedTransactions).map((transaction: any) => ({
        ...transaction,
        date: new Date(transaction.date)
      })) : [];
      
      const transformedPayments: Payment[] = storedPayments ? JSON.parse(storedPayments).map((payment: any) => ({
        ...payment,
        date: new Date(payment.date)
      })) : [];
      
      setClients(transformedClients);
      setTransactions(transformedTransactions);
      setPayments(transformedPayments);
      
      console.log(`Loaded ${transformedClients.length} clients, ${transformedTransactions.length} transactions, ${transformedPayments.length} payments from localStorage`);
    } catch (err) {
      console.error('Error loading credit data:', err);
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
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      
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
        
        console.log('Client saved to localStorage, total clients:', updatedClients.length);
        return updatedClients;
      });
      
      return newClient;
    } catch (err) {
      // Only log unexpected errors to console, not duplicate client errors
      if (!(err instanceof Error && err.name === 'DuplicateClientError')) {
        console.error('Error adding client:', err);
      }
      throw err;
    }
  };

  // Update existing client
  const updateClient = async (client: Client) => {
    try {
      const updatedClients = clients.map(c => c.id === client.id ? client : c);
      
      // Move the updated client to the front of the list (rightmost position)
      const updatedClient = updatedClients.find(c => c.id === client.id);
      const otherClients = updatedClients.filter(c => c.id !== client.id);
      const reorderedClients = updatedClient ? [...otherClients, updatedClient] : updatedClients;
      
      setClients(reorderedClients);
      
      // Save to localStorage
      localStorage.setItem('creditClients', JSON.stringify(reorderedClients.map(c => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        lastTransactionAt: c.lastTransactionAt.toISOString()
      }))));
    } catch (err) {
      console.error('Error updating client:', err);
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
    
    console.log('🔄 Moved client to rightmost position:', clientToMove.name);
  };
  // Delete client
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
    
    const lowercaseQuery = query.toLowerCase();
    return clients.filter(client => 
      client.name.toLowerCase().includes(lowercaseQuery) ||
      client.id.toLowerCase().includes(lowercaseQuery)
    );
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
  const getClientTransactions = (clientId: string): Transaction[] => {
    return transactions.filter(transaction => transaction.clientId === clientId);
  };

  // Get client payments
  const getClientPayments = (clientId: string): Payment[] => {
    return payments.filter(payment => payment.clientId === clientId);
  };

  // Add transaction
  const addTransaction = async (client: Client, description: string, amount: number) => {
    try {
      console.log('🏦 CreditContext: Adding transaction:', { clientId: client.id, description, amount });
      
      // Add transaction to database
      const newTransaction: Transaction = {
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
        
        // Save to localStorage
        localStorage.setItem('creditClients', JSON.stringify(updatedClients.map(c => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
          lastTransactionAt: c.lastTransactionAt.toISOString()
        }))));
        
        return updatedClients;
      });
      
      console.log('🏦 CreditContext: Transaction added to localStorage successfully');
      
    } catch (err) {
      console.error('Error adding transaction:', err);
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
      const newPayment: Payment = {
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
      setClients(updatedClients);
      
      // Save to localStorage
      localStorage.setItem('creditPayments', JSON.stringify(updatedPayments.map(payment => ({
        ...payment,
        date: payment.date.toISOString()
      }))));
      
      localStorage.setItem('creditClients', JSON.stringify(updatedClients.map(client => ({
        ...client,
        createdAt: client.createdAt.toISOString(),
        lastTransactionAt: client.lastTransactionAt.toISOString()
      }))));
    } catch (err) {
      console.error('Error adding partial payment:', err);
      throw err;
    }
  };

  // Settle client (full payment)
  const settleClient = async (clientId: string) => {
    try {
      const currentDebt = getClientTotalDebt(clientId);
      
      // Always remove all previous full settlements for this client, regardless of debt amount
      const filteredPayments = payments.filter(payment => 
        !(payment.clientId === clientId && payment.type === 'full')
      );
      
      // Add new settlement record (even if debt is 0)
      const newPayment: Payment = {
        id: crypto.randomUUID(),
        clientId,
        amount: currentDebt,
        date: new Date(),
        type: 'full'
      };
      
      const updatedPayments = [...filteredPayments, newPayment];
      setPayments(updatedPayments);
      
      // Clear all transactions for this client when settling
      const updatedTransactions = transactions.filter(transaction => transaction.clientId !== clientId);
      setTransactions(updatedTransactions);
      
      const updatedClients = clients.map(client => 
        client.id === clientId 
          ? { 
              ...client, 
              totalDebt: 0, 
              lastTransactionAt: new Date(),
              bottlesOwed: { beer: 0, guinness: 0, malta: 0, coca: 0, chopines: 0 }
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
      
    } catch (err) {
      console.error('Error settling client:', err);
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
      setClients(updatedClients);
      
      // Save to localStorage
      localStorage.setItem('creditClients', JSON.stringify(updatedClients.map(client => ({
        ...client,
        createdAt: client.createdAt.toISOString(),
        lastTransactionAt: client.lastTransactionAt.toISOString()
      }))));
    } catch (err) {
      console.error('Error returning bottles:', err);
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
    returnBottles,
    refreshData
  };

  return (
    <CreditContext.Provider value={value}>
      {children}
    </CreditContext.Provider>
  );
};