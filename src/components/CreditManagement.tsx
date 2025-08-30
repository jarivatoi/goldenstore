import React, { useState, useEffect } from 'react';
import { Calculator, Plus, X, CheckCircle } from 'lucide-react';
import { useCredit } from '../context/CreditContext';
import ClientCard from './ClientCard';
import ClientDetailModal from './ClientDetailModal';
import ClientSearchModal from './ClientSearchModal';
import UnifiedDataManager from './UnifiedDataManager';
import ScrollingTabs from './credit/ScrollingTabs';
import CreditCalculator from './credit/CreditCalculator';
import CreditHeader from './credit/CreditHeader';
import ClientGrid from './credit/ClientGrid';
import CreditModals from './credit/CreditModals';
import MiniCalculator from './credit/MiniCalculator';
import { Client } from '../types';
import { processCalculatorInput, evaluateExpression } from '../utils/creditCalculatorUtils';
import { exportCompleteDatabase, importCompleteDatabase } from '../utils/creditDataUtils';

/**
 * CREDIT MANAGEMENT MAIN COMPONENT
 * ================================
 */
const CreditManagement: React.FC = () => {
  const { 
    clients, 
    searchClients, 
    addTransaction, 
    getClientTotalDebt, 
    deleteClient, 
    getClientTransactions 
  } = useCredit();
  
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllClients, setShowAllClients] = useState(false);
  const [calculatorValue, setCalculatorValue] = useState('0');
  const [calculatorMemory, setCalculatorMemory] = useState(0);
  const [calculatorGrandTotal, setCalculatorGrandTotal] = useState(0);
  const [lastOperation, setLastOperation] = useState<string | null>(null);
  const [lastOperand, setLastOperand] = useState<number | null>(null);
  const [isNewNumber, setIsNewNumber] = useState(true);
  const [transactionHistory, setTransactionHistory] = useState<number[]>([]);
  const [calculationSteps, setCalculationSteps] = useState<Array<{expression: string, result: number, timestamp: number}>>([]);
  const [autoReplayActive, setAutoReplayActive] = useState(false);
  const [articleCount, setArticleCount] = useState(0);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [isCalculatorActive, setIsCalculatorActive] = useState(false);
  const [linkedClient, setLinkedClient] = useState<Client | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showUnifiedDataManager, setShowUnifiedDataManager] = useState(false);
  const [clientFilter, setClientFilter] = useState<'all' | 'returnables' | 'overdue' | 'overlimit'>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [sortOption, setSortOption] = useState<'name' | 'date' | 'debt'>('date');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Separate search query for main grid (bottom search bar)
  const [mainGridSearchQuery, setMainGridSearchQuery] = useState('');

  // Delete all clients modal state
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [deleteAllPasscode, setDeleteAllPasscode] = useState('');
  
  // Transaction success state
  const [showCenteredWobble, setShowCenteredWobble] = useState(false);
  const [centeredWobbleClient, setCenteredWobbleClient] = useState<Client | null>(null);
  const [recentTransactionClient, setRecentTransactionClient] = useState<Client | null>(null);
  
  // Mini calculator state
  const [miniCalculators, setMiniCalculators] = useState<Array<{
    id: string;
    label: string;
    position: { x: number; y: number };
  }>>([]);

  // Duplicate card state
  const [duplicateCard, setDuplicateCard] = useState<Client & { transactionAmount?: number; transactionDescription?: string } | null>(null);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    // Auto-switch to show all clients when user starts typing
    if (query.trim() && !showAllClients) {
      setShowAllClients(true);
    }
  };

  // Listen for credit data changes to force re-render
  useEffect(() => {
    const handleCreditDataChanged = () => {
      // Force state updates to trigger re-calculation
      setClientFilter(prev => {
        // Trigger filter recalculation by setting to same value
        return prev;
      });
      
      // Force re-calculation of filtered clients for tabs
      // This ensures tabs are updated when client conditions change
      const newTabClients = getFilteredClientsForTabs();
      
      // If the current linked client no longer meets the filter condition, unlink it
      if (linkedClient && !newTabClients.find(c => c.id === linkedClient.id)) {
        setLinkedClient(null);
        setCalculationSteps([]);
      }
    };

    const handleAutoReplayStep = (event: CustomEvent) => {
      const { displayValue, stepIndex, totalSteps, currentStep, articleCount } = event.detail;
      setCalculatorValue(displayValue);
      setArticleCount(articleCount); // Update the article count during replay
      // Update auto replay state to show current step
      setAutoReplayActive(true);
    };

    const handleAutoReplayComplete = () => {
      setAutoReplayActive(false);
    };

    window.addEventListener('creditDataChanged', handleCreditDataChanged);
    window.addEventListener('autoReplayStep', handleAutoReplayStep as EventListener);
    window.addEventListener('autoReplayComplete', handleAutoReplayComplete as EventListener);
    
    return () => {
      window.removeEventListener('creditDataChanged', handleCreditDataChanged);
      window.removeEventListener('autoReplayStep', handleAutoReplayStep as EventListener);
      window.removeEventListener('autoReplayComplete', handleAutoReplayComplete as EventListener);
    };
  }, [linkedClient]);

  // Get filtered clients for tabs based on selected filter
  const getFilteredClientsForTabs = () => {
    // Always search all clients, not just filtered ones
    const searchResults = clients.filter(client => {
      if (!searchQuery.trim()) return true;
      
      // Normalize function to remove accents and special characters
      const normalize = (str: string): string => {
        return str
          .toLowerCase()
          .normalize('NFD') // Decompose accented characters
          .replace(/[\u0300-\u036f]/g, '') // Remove accent marks
          .replace(/[^\w\s]/g, ''); // Remove other special characters except word chars and spaces
      };
      
      // Check if query is numeric (for ID search)
      const isNumericQuery = /^\d+$/.test(searchQuery.trim());
      
      if (isNumericQuery) {
        // For numeric queries, format as G-prefix ID and do exact match
        const paddedNumber = searchQuery.trim().padStart(3, '0');
        const formattedId = `G${paddedNumber}`;
        
        return client.id === formattedId;
      } else {
        // For text queries, search by name or exact ID match
        const normalizedQuery = normalize(searchQuery);
        return normalize(client.name).includes(normalizedQuery) ||
               client.id.toLowerCase() === searchQuery.toLowerCase();
      }
    });
    let baseClients = searchClients(''); // Don't apply search to scrolling tabs
    
    switch (clientFilter) {
      case 'returnables':
        const returnableClients = baseClients.filter(client => {
          const clientTransactions = getClientTransactions(client.id);
          
          // Get returnable items for this client
          const returnableItems: {[key: string]: number} = {};
          
          clientTransactions.forEach(transaction => {
            // Only process debt transactions (not payments) AND exclude return transactions
            if (transaction.type === 'payment' || transaction.description.toLowerCase().includes('returned')) {
              return;
            }
            
            const description = transaction.description.toLowerCase();
            
            // Only process items that contain "chopine" or "bouteille"
            if (!description.includes('chopine') && !description.includes('bouteille')) {
              return;
            }
            
            // Look for Chopine items
            const chopinePattern = /(\d+)\s+chopines?(?:\s+([^,]*))?/gi;
            let chopineMatch;
            
            while ((chopineMatch = chopinePattern.exec(description)) !== null) {
              const quantity = parseInt(chopineMatch[1]);
              const brand = chopineMatch[2]?.trim() || '';
              const key = brand ? `Chopine ${brand}` : 'Chopine';
              
              if (!returnableItems[key]) {
                returnableItems[key] = 0;
              }
              returnableItems[key] += quantity;
            }
            
            // Look for Bouteille items
            const bouteillePattern = /(\d+)\s+(?:(\d+(?:\.\d+)?[Ll])\s+)?bouteilles?(?:\s+([^,\(\)]*))?/gi;
            let bouteilleMatch;
            
            while ((bouteilleMatch = bouteillePattern.exec(description)) !== null) {
              const quantity = parseInt(bouteilleMatch[1]);
              const size = bouteilleMatch[2]?.trim() || '';
              const brand = bouteilleMatch[3]?.trim() || '';
              
              // Capitalize brand name properly
              const capitalizedBrand = brand ? brand.split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
              ).join(' ') : '';
              
              let key;
              if (size && brand) {
                key = `${size} ${capitalizedBrand}`;
              } else if (brand) {
                key = `Bouteille ${capitalizedBrand}`;
              } else if (size) {
                key = `${size} Bouteille`;
              } else {
                key = 'Bouteille';
              }
              
              if (!returnableItems[key]) {
                returnableItems[key] = 0;
              }
              returnableItems[key] += quantity;
            }
            
            // Handle items without explicit numbers (assume quantity 1)
            if (description.includes('bouteille') && !bouteillePattern.test(description)) {
              const sizeMatch = description.match(/(\d+(?:\.\d+)?[Ll])/i);
              const brandMatch = description.match(/bouteilles?\s+([^,]*)/i);
              const brand = brandMatch?.[1]?.trim() || '';
              
              // Capitalize brand name properly
              const capitalizedBrand = brand ? brand.split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
              ).join(' ') : '';
              
              let key;
              if (sizeMatch && brand) {
                key = `${sizeMatch[1].replace(/l$/i, 'L')} ${capitalizedBrand}`;
              } else if (brand) {
                key = `Bouteille ${capitalizedBrand}`;
              } else if (sizeMatch) {
                key = `${sizeMatch[1].replace(/l$/i, 'L')} Bouteille`;
              } else {
                key = 'Bouteille';
              }
              
              if (!returnableItems[key]) {
                returnableItems[key] = 0;
              }
              returnableItems[key] += 1;
            }
            
            if (description.includes('chopine') && !chopinePattern.test(description)) {
              const brandMatch = description.match(/chopines?\s+([^,]*)/i);
              const brand = brandMatch?.[1]?.trim() || '';
              
              // Capitalize brand name properly
              const capitalizedBrand = brand ? brand.split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
              ).join(' ') : '';
              
              const key = capitalizedBrand ? `Chopine ${capitalizedBrand}` : 'Chopine';
              
              if (!returnableItems[key]) {
                returnableItems[key] = 0;
              }
              returnableItems[key] += 1;
            }
          });
          
          // Calculate returned quantities
          const returnedQuantities: {[key: string]: number} = {};
          clientTransactions
            .filter(transaction => transaction.type === 'debt' && transaction.description.toLowerCase().includes('returned'))
            .forEach(transaction => {
              const description = transaction.description.toLowerCase();
              Object.keys(returnableItems).forEach(itemType => {
                if (description.includes(itemType.toLowerCase())) {
                  const match = description.match(/returned:\s*(\d+)\s+/);
                  if (match) {
                    if (!returnedQuantities[itemType]) {
                      returnedQuantities[itemType] = 0;
                    }
                    returnedQuantities[itemType] += parseInt(match[1]);
                  }
                }
              });
            });
          
          // Calculate net returnable quantities - must have actual unreturned items
          const hasActualReturnableItems = Object.entries(returnableItems).some(([itemType, total]) => {
            const returned = returnedQuantities[itemType] || 0;
            const remaining = Math.max(0, total - returned);
            return remaining > 0;
          });
          
          return hasActualReturnableItems;
        });
        return returnableClients;
      
      case 'overdue':
        return baseClients.filter(client => {
          const totalDebt = getClientTotalDebt(client.id);
          const daysSinceLastTransaction = Math.floor(
            (Date.now() - client.lastTransactionAt.getTime()) / (1000 * 60 * 60 * 24)
          );
          return totalDebt > 0 && daysSinceLastTransaction > 14; // More than 14 days
        });
      
      case 'overlimit':
        return baseClients.filter(client => {
          const totalDebt = getClientTotalDebt(client.id);
          return totalDebt > 1000; // Over Rs 1000
        });
      
      case 'all':
      default:
        return baseClients.filter(client => {
          const totalDebt = getClientTotalDebt(client.id);
          
          // Check if client has returnable items
          const clientTransactions = getClientTransactions(client.id);
          
          // Calculate actual unreturned returnable items
          const returnableItems: {[key: string]: number} = {};
          
          clientTransactions.forEach(transaction => {
            // Only process debt transactions (not payments) AND exclude return transactions
            if (transaction.type === 'payment' || transaction.description.toLowerCase().includes('returned')) {
              return;
            }
            
            const description = transaction.description.toLowerCase();
            
            // Only process items that contain "chopine" or "bouteille"
            if (!description.includes('chopine') && !description.includes('bouteille')) {
              return;
            }
            
            // Look for Chopine items
            const chopinePattern = /(\d+)\s+chopines?(?:\s+([^,]*))?/gi;
            let chopineMatch;
            
            while ((chopineMatch = chopinePattern.exec(description)) !== null) {
              const quantity = parseInt(chopineMatch[1]);
              const brand = chopineMatch[2]?.trim() || '';
              const key = brand ? `Chopine ${brand}` : 'Chopine';
              
              if (!returnableItems[key]) {
                returnableItems[key] = 0;
              }
              returnableItems[key] += quantity;
            }
            
            // Look for Bouteille items
            const bouteillePattern = /(\d+)\s+(?:(\d+(?:\.\d+)?[Ll])\s+)?bouteilles?(?:\s+([^,\(\)]*))?/gi;
            let bouteilleMatch;
            
            while ((bouteilleMatch = bouteillePattern.exec(description)) !== null) {
              const quantity = parseInt(bouteilleMatch[1]);
              const size = bouteilleMatch[2]?.trim() || '';
              const brand = bouteilleMatch[3]?.trim() || '';
              
              // Capitalize brand name properly
              const capitalizedBrand = brand ? brand.split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
              ).join(' ') : '';
              
              let key;
              if (size && brand) {
                key = `${size} ${capitalizedBrand}`;
              } else if (brand) {
                key = `Bouteille ${capitalizedBrand}`;
              } else if (size) {
                key = `${size} Bouteille`;
              } else {
                key = 'Bouteille';
              }
              
              if (!returnableItems[key]) {
                returnableItems[key] = 0;
              }
              returnableItems[key] += quantity;
            }
            
            // Handle items without explicit numbers (assume quantity 1)
            if (description.includes('bouteille') && !bouteillePattern.test(description)) {
              const sizeMatch = description.match(/(\d+(?:\.\d+)?[Ll])/i);
              const brandMatch = description.match(/bouteilles?\s+([^,]*)/i);
              const brand = brandMatch?.[1]?.trim() || '';
              
              // Capitalize brand name properly
              const capitalizedBrand = brand ? brand.split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
              ).join(' ') : '';
              
              let key;
              if (sizeMatch && brand) {
                key = `${sizeMatch[1].replace(/l$/i, 'L')} ${capitalizedBrand}`;
              } else if (brand) {
                key = `Bouteille ${capitalizedBrand}`;
              } else if (sizeMatch) {
                key = `${sizeMatch[1].replace(/l$/i, 'L')} Bouteille`;
              } else {
                key = 'Bouteille';
              }
              
              if (!returnableItems[key]) {
                returnableItems[key] = 0;
              }
              returnableItems[key] += 1;
            }
            
            if (description.includes('chopine') && !chopinePattern.test(description)) {
              const brandMatch = description.match(/chopines?\s+([^,]*)/i);
              const brand = brandMatch?.[1]?.trim() || '';
              
              // Capitalize brand name properly
              const capitalizedBrand = brand ? brand.split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
              ).join(' ') : '';
              
              const key = capitalizedBrand ? `Chopine ${capitalizedBrand}` : 'Chopine';
              
              if (!returnableItems[key]) {
                returnableItems[key] = 0;
              }
              returnableItems[key] += 1;
            }
          });
          
          // Calculate returned quantities
          const returnedQuantities: {[key: string]: number} = {};
          clientTransactions
            .filter(transaction => transaction.type === 'debt' && transaction.description.toLowerCase().includes('returned'))
            .forEach(transaction => {
              const description = transaction.description.toLowerCase();
              Object.keys(returnableItems).forEach(itemType => {
                if (description.includes(itemType.toLowerCase())) {
                  const match = description.match(/returned:\s*(\d+)\s+/);
                  if (match) {
                    if (!returnedQuantities[itemType]) {
                      returnedQuantities[itemType] = 0;
                    }
                    returnedQuantities[itemType] += parseInt(match[1]);
                  }
                }
              });
            });
          
          // Check if there are any actual unreturned items
          const hasActualReturnableItems = Object.entries(returnableItems).some(([itemType, total]) => {
            const returned = returnedQuantities[itemType] || 0;
            const remaining = Math.max(0, total - returned);
            return remaining > 0;
          });
          
          return totalDebt > 0 || hasActualReturnableItems;
        });
    }
  };

  const tabClients = getFilteredClientsForTabs();

  // Filter clients based on search
  const filteredClients = showAllClients 
    ? searchClients(mainGridSearchQuery) // Show all clients when toggled
    : searchClients(mainGridSearchQuery).filter(client => {
        const totalDebt = getClientTotalDebt(client.id);
        
        // Check if client has returnable items
        const clientTransactions = getClientTransactions(client.id);
        
        // Calculate actual unreturned returnable items
        const returnableItems: {[key: string]: number} = {};
        
        clientTransactions.forEach(transaction => {
          // Only process debt transactions (not payments) AND exclude return transactions
          if (transaction.type === 'payment' || transaction.description.toLowerCase().includes('returned')) {
            return;
          }
          
          const description = transaction.description.toLowerCase();
          
          // Only process items that contain "chopine" or "bouteille"
          if (!description.includes('chopine') && !description.includes('bouteille')) {
            return;
          }
          
          // Look for Chopine items
          const chopinePattern = /(\d+)\s+chopines?(?:\s+([^,]*))?/gi;
          let chopineMatch;
          
          while ((chopineMatch = chopinePattern.exec(description)) !== null) {
            const quantity = parseInt(chopineMatch[1]);
            const brand = chopineMatch[2]?.trim() || '';
            const key = brand ? `Chopine ${brand}` : 'Chopine';
            
            if (!returnableItems[key]) {
              returnableItems[key] = 0;
            }
            returnableItems[key] += quantity;
          }
          
          // Look for Bouteille items
          const bouteillePattern = /(\d+)\s+(?:(\d+(?:\.\d+)?L)\s+)?bouteilles?(?:\s+([^,]*))?/gi;
          let bouteilleMatch;
          
          while ((bouteilleMatch = bouteillePattern.exec(description)) !== null) {
            const quantity = parseInt(bouteilleMatch[1]);
            const size = bouteilleMatch[2]?.trim().toUpperCase() || '';
            const brand = bouteilleMatch[3]?.trim() || '';
            
            // Capitalize brand name properly
            const capitalizedBrand = brand ? brand.split(' ').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(' ') : '';
            
            let key;
            if (size && capitalizedBrand) {
              key = `${size} ${capitalizedBrand}`;
            } else if (capitalizedBrand) {
              key = `Bouteille ${capitalizedBrand}`;
            } else if (size) {
              key = `${size} Bouteille`;
            } else {
              key = 'Bouteille';
            }
            
            if (!returnableItems[key]) {
              returnableItems[key] = 0;
            }
            returnableItems[key] += quantity;
          }
          
          // Handle items without explicit numbers (assume quantity 1)
          if (description.includes('bouteille') && !bouteillePattern.test(description)) {
            const sizeMatch = description.match(/(\d+(?:\.\d+)?L)/i);
            const brandMatch = description.match(/bouteilles?\s+([^,]*)/i);
            const brand = brandMatch?.[1]?.trim() || '';
            
            // Capitalize brand name properly
            const capitalizedBrand = brand ? brand.split(' ').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(' ') : '';
            
            let key;
            if (sizeMatch && brand) {
              key = `${sizeMatch[1].replace(/l$/i, 'L')} ${capitalizedBrand}`;
            } else if (brand) {
              key = `Bouteille ${capitalizedBrand}`;
            } else if (sizeMatch) {
              key = `${sizeMatch[1].replace(/l$/i, 'L')} Bouteille`;
            } else {
              key = 'Bouteille';
            }
            
            if (!returnableItems[key]) {
              returnableItems[key] = 0;
            }
            returnableItems[key] += 1;
          }
          
          if (description.includes('chopine') && !chopinePattern.test(description)) {
            const brandMatch = description.match(/chopines?\s+([^,]*)/i);
            const brand = brandMatch?.[1]?.trim() || '';
            const key = brand ? `Chopine ${brand}` : 'Chopine';
            
            if (!returnableItems[key]) {
              returnableItems[key] = 0;
            }
            returnableItems[key] += 1;
          }
        });
        
        // Calculate returned quantities
        const returnedQuantities: {[key: string]: number} = {};
        clientTransactions
          .filter(transaction => transaction.type === 'debt' && transaction.description.toLowerCase().includes('returned'))
          .forEach(transaction => {
            const description = transaction.description.toLowerCase();
            Object.keys(returnableItems).forEach(itemType => {
              if (description.includes(itemType.toLowerCase())) {
                const match = description.match(/returned:\s*(\d+)\s+/);
                if (match) {
                  if (!returnedQuantities[itemType]) {
                    returnedQuantities[itemType] = 0;
                  }
                  returnedQuantities[itemType] += parseInt(match[1]);
                }
              }
            });
          });
        
        // Check if there are any actual unreturned items
        const hasActualReturnableItems = Object.entries(returnableItems).some(([itemType, total]) => {
          const returned = returnedQuantities[itemType] || 0;
          const remaining = Math.max(0, total - returned);
          return remaining > 0;
        });
        
        return totalDebt > 0 || hasActualReturnableItems;
      }); // Show only clients with debt
  
  // Sort clients: maintain the order from context (which handles moveClientToFront)
  const sortedClients = [...filteredClients].sort((a, b) => {
    // Don't sort by date - maintain the order from context to preserve moveClientToFront positioning
    return 0;
  });

  // Calculate total debt across all clients
  const totalDebtAllClients = clients.reduce((total, client) => {
    return total + getClientTotalDebt(client.id);
  }, 0);


  /**
   * CALCULATOR FUNCTIONS
   * ===================
   */
  const handleCalculatorInput = (value: string) => {
    const result = processCalculatorInput(
      calculatorValue, 
      value, 
      calculatorMemory,
      calculatorGrandTotal,
      lastOperation,
      lastOperand,
      isNewNumber,
      transactionHistory,
      calculationSteps,
      articleCount
    );
    console.log('🧮 Calculator input result:', {
      input: value,
      oldValue: calculatorValue,
      newValue: result.value,
      isCheckNavigation: value.includes('CHECK')
    });
    setCalculatorValue(result.value);
    setCalculatorMemory(result.memory);
    setCalculatorGrandTotal(result.grandTotal);
    setLastOperation(result.lastOperation);
    setLastOperand(result.lastOperand);
    setIsNewNumber(result.isNewNumber);
    setTransactionHistory(result.transactionHistory);
    setCalculationSteps(result.calculationSteps);
    setAutoReplayActive(result.autoReplayActive);
    setArticleCount(result.articleCount);
    setIsCalculatorActive(result.isActive);
  };

  const handleQuickAdd = (client: Client) => {
    setLinkedClient(client);
    // Reset calculator when linking to client
    setCalculatorValue('0');
    setCalculatorMemory(0);
    setCalculatorGrandTotal(0);
    setLastOperation(null);
    setLastOperand(null);
    setIsNewNumber(true);
    setTransactionHistory([]);
    setCalculationSteps([]);
    setAutoReplayActive(false);
    setArticleCount(0);
    setIsCalculatorActive(false);
  };

  const handleCalculatorCancel = () => {
    setLinkedClient(null);
    setCalculatorValue('0');
    setCalculatorMemory(0);
    setCalculatorGrandTotal(0);
    setLastOperation(null);
    setLastOperand(null);
    setIsNewNumber(true);
    setTransactionHistory([]);
    setCalculationSteps([]);
    setAutoReplayActive(false);
    setArticleCount(0);
    setIsCalculatorActive(false);
  };

  const handleResetCalculator = () => {
    setCalculatorValue('0');
    setCalculatorMemory(0);
    setCalculatorGrandTotal(0);
    setLastOperation(null);
    setLastOperand(null);
    setIsNewNumber(true);
    setTransactionHistory([]);
    setCalculationSteps([]);
    setAutoReplayActive(false);
    setArticleCount(0);
    setIsCalculatorActive(false);
    setLinkedClient(null);
    setShowClientSearch(false);
  };

  const handleResetCalculatorAndDescription = () => {
    setCalculatorValue('0');
    setCalculatorMemory(0);
    setCalculatorGrandTotal(0);
    setLastOperation(null);
    setLastOperand(null);
    setIsNewNumber(true);
    setTransactionHistory([]);
    setCalculationSteps([]);
    setAutoReplayActive(false);
    setArticleCount(0);
    setIsCalculatorActive(false);
    setShowClientSearch(false);
  };
  
  // Mini calculator functions
  const createMiniCalculator = () => {
    const baseX = 100;
    const baseY = 150;
    const offset = miniCalculators.length * 40;
    
    const newCalculator = {
      id: `mini-calc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      label: `Quick Calc ${miniCalculators.length + 1}`,
      position: { 
        x: baseX + offset, 
        y: baseY + offset 
      }
    };

    setMiniCalculators(prev => [...prev, newCalculator]);
  };

  const closeMiniCalculator = (id: string) => {
    setMiniCalculators(prev => prev.filter(calc => calc.id !== id));
  };

  const handleMiniCalculatorTransaction = async (amount: number, description: string, label: string) => {
    // For now, just show an alert - in future this could open client search
    console.log(`Transaction from ${label}: Amount: Rs ${amount.toFixed(2)}, Description: ${description}`);
  };

  const onCloseWobble = () => {
    setRecentTransactionClient(null);
  };

  const handleAddToClient = async (client: Client, description: string) => {
    try {
      
      if (isNaN(amount) || !isFinite(amount) || amount < 0) {
      const cleanValue = calculatorValue.startsWith('=') ? calculatorValue.substring(1) : calculatorValue;
      const amount = evaluateExpression(cleanValue);
      
      if (isNaN(amount) || !isFinite(amount) || amount < 0) {
        throw new Error('Please enter a valid amount');
      }
      
      // Show centered wobble effect
      setCenteredWobbleClient(client);
      setShowCenteredWobble(true);
      setRecentTransactionClient(client);
      
      if (!description || !description.trim()) {
        throw new Error('Please enter a description');
      }
      
      if (!client || !client.id) {
        throw new Error('Invalid client selected');
      }
    
      await addTransaction(client, description, amount);
      
      // Force a re-render of the scrolling tabs to update text and reset timeline
      setTimeout(() => {
        setShowCenteredWobble(false);
      }, 3000);
      
      // Reset calculator state
      setCalculatorValue('0');
      setCalculatorMemory(0);
      setCalculatorGrandTotal(0);
      setLastOperation(null);
      setLastOperand(null);
      setIsNewNumber(true);
      setTransactionHistory([]);
      setAutoReplayActive(false);
      setArticleCount(0);
      setIsCalculatorActive(false);
      setShowClientSearch(false);
      setLinkedClient(null);
      
      // Show wobble effect for the client that received the transaction
      setRecentTransactionClient(client);
      
      setDuplicateCard({ ...client, transactionAmount: amount, transactionDescription: description } as any);
      setTimeout(() => {
        setRecentTransactionClient(null);
      }, 3000); // Increased to 3 seconds for better visibility
      setTimeout(() => {
        setCenteredWobbleClient(null);
      }, 8000);
    } catch (error) {
      throw error; // Re-throw to be caught by the modal
    }
  };

  const handleDeleteClient = (client: Client) => {
    setClientToDelete(client);
    setShowDeleteConfirm(true);
    setDeleteConfirmText('');
  };

  const handleDeleteAllClients = () => {
    setShowDeleteAllConfirm(true);
    setDeleteAllPasscode('');
  };

  const confirmDeleteAllClients = async () => {
    if (deleteAllPasscode !== 'DELETE') {
      return;
    }

    try {
      // Clear all credit data in localStorage directly (batch operation)
      localStorage.removeItem('creditClients');
      localStorage.removeItem('creditTransactions');
      localStorage.removeItem('creditPayments');
      
      // Force context to reload empty data
      window.location.reload();
      
      setShowDeleteAllConfirm(false);
      setDeleteAllPasscode('');
      setShowSettings(false);
      
      // Reset calculator state
      handleResetCalculator();
    } catch (error) {
      console.error('Failed to delete all clients:', error);
    }
  };

  const confirmDeleteClient = async () => {
    if (!clientToDelete || deleteConfirmText !== 'DELETE') {
      return;
    }

    try {
      await deleteClient(clientToDelete.id);
      setShowDeleteConfirm(false);
      setClientToDelete(null);
      setDeleteConfirmText('');
      setShowSettings(false);
    } catch (error) {
      // Error handling will be done in the modal
    }
  };

  // Helper function to safely evaluate calculator value
  const getCalculatorAmount = (): number => {
    // Remove = sign if present (from AUTO results)
    const cleanValue = calculatorValue.startsWith('=') ? calculatorValue.substring(1) : calculatorValue;
    return evaluateExpression(cleanValue);
  };

  // Database operations

  return (
    <div className="flex flex-col lg:flex-row h-full bg-gray-50 select-none overflow-hidden">
      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row flex-1 gap-4 lg:gap-6 p-4 lg:p-6 overflow-hidden">
        
        {/* Left Side - Client Cards Section - Centered */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 order-2 lg:order-1">
          
          {/* Header with Settings */}
          <CreditHeader
            totalDebtAllClients={totalDebtAllClients}
            showAllClients={showAllClients}
            onToggleAllClients={() => setShowAllClients(!showAllClients)}
            clientFilter={clientFilter}
            onFilterChange={setClientFilter}
            showFilterDropdown={showFilterDropdown}
            onToggleFilterDropdown={() => setShowFilterDropdown(!showFilterDropdown)}
            onShowSettings={() => setShowSettings(true)}
            onShowUnifiedDataManager={() => {
              setShowUnifiedDataManager(true);
            }}
            onAddToClientFromMini={handleAddToClient}
            sortOption={sortOption}
            onSortChange={setSortOption}
            showSortDropdown={showSortDropdown}
            onToggleSortDropdown={() => setShowSortDropdown(!showSortDropdown)}
          />

          {/* Auto-scrolling Client Tabs */}
          <ScrollingTabs
            clients={tabClients}
            linkedClient={linkedClient}
            onQuickAdd={handleQuickAdd}
            searchQuery="" // Don't pass search query to scrolling tabs
            clientFilter={clientFilter}
            getClientTotalDebt={getClientTotalDebt}
            onResetCalculator={handleResetCalculator}
            sortOption={sortOption}
          />
          
          {/* Client Grid */}
          <ClientGrid
            clients={sortedClients}
            searchQuery={mainGridSearchQuery}
            onSearchChange={setMainGridSearchQuery}
            showAllClients={showAllClients}
            onToggleAllClients={() => setShowAllClients(!showAllClients)}
            onClientLongPress={setSelectedClient}
            onQuickAdd={handleQuickAdd}
            onResetCalculator={handleResetCalculator}
            linkedClient={linkedClient}
            recentTransactionClient={recentTransactionClient}
            onCloseWobble={onCloseWobble}
          />
        </div>

        {/* Right Side - Calculator Section */}
        <div className="w-full lg:w-80 bg-white rounded-lg shadow-lg p-4 lg:p-6 order-1 lg:order-2 flex flex-col">
          {/* Calculator Header - Clickable */}
          <div className="flex items-center gap-2 mb-4">
            <button
              className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🧮 Calculator header clicked!');
                createMiniCalculator();
              }}
              title="Click to create floating mini calculator"
            >
              <div className="bg-blue-100 p-2 rounded-full">
                <Calculator size={24} className="text-blue-600" />
              </div>
              <h3 className="text-lg lg:text-xl font-semibold text-gray-800">Calculator +</h3>
            </button>
            <div className="flex-1"></div>
            {linkedClient && (
              <>
                <p className="text-xs lg:text-sm text-green-600 font-medium">
                  Adding to: {linkedClient.name}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCalculatorCancel();
                  }}
                  className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                >
                  Cancel
                </button>
              </>
            )}
          </div>

          {/* Calculator Display */}
          <div className="mb-4">
            <div className="bg-black rounded-lg p-4 mb-2">
              {/* Main Display with inline counter */}
              <div className="text-2xl sm:text-3xl font-mono text-green-400 min-h-[3rem] flex items-center justify-between overflow-hidden bg-black rounded px-3 py-2">
                {/* Article Count Circle - Left side */}
                {articleCount > 0 && (
                  <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {articleCount}
                  </div>
                )}
                {/* Calculator Value - Right side */}
                <div className="truncate max-w-full text-right flex-1" title={calculatorValue}>
                  {calculatorValue}
                </div>
              </div>
              
              {/* Secondary Display */}
              <div className="text-xs text-gray-400 font-mono mt-1 text-center">
                {autoReplayActive ? (() => {
                  const currentStepIndex = parseInt(localStorage.getItem('currentCheckIndex') || '0');
                  const hasResult = calculationSteps.length > 0 && calculationSteps.some(step => step.isComplete);
                  const totalPositions = hasResult ? calculationSteps.length + 1 : calculationSteps.length;
                  
                  if (hasResult && currentStepIndex === calculationSteps.length) {
                    // Showing the result
                    return `RESULT`;
                  } else if (currentStepIndex < calculationSteps.length) {
                    // Showing a calculation step
                    const actualStepNumber = currentStepIndex + 1;
                    const totalSteps = calculationSteps.length;
                    return `STEP ${actualStepNumber}/${totalSteps}`;
                  } else {
                    // Fallback
                    return `RESULT`;
                  }
                })() : 'READY'}
              </div>
            </div>
          </div>

          {/* Calculator Buttons */}
          <div className="grid grid-cols-6 gap-1 sm:gap-2 mb-6 p-2 sm:p-4 bg-gray-200 rounded-lg border-2 border-gray-400 shadow-inner">
            {/* Row 0 - Top row: CHECK←, CHECK→ */}
            <div className="col-span-6 grid grid-cols-2 gap-1 sm:gap-2 mb-1 sm:mb-2">
              {/* Empty space where link button was */}
              <div></div>
              <div></div>
            </div>

            {/* Row 1: MU, MRC, M-, M+, →, AUTO */}
            <button
              onClick={() => handleCalculatorInput('MU')}
              className="bg-blue-400 hover:bg-blue-500 text-white p-2 sm:p-3 rounded-lg font-bold text-xs sm:text-sm shadow-md border border-blue-500 flex items-center justify-center"
            >
              MU
            </button>
            <button
              onClick={() => handleCalculatorInput('MRC')}
              className="bg-blue-400 hover:bg-blue-500 text-white p-2 sm:p-3 rounded-lg font-bold text-xs sm:text-sm shadow-md border border-blue-500 flex items-center justify-center"
            >
              MRC
            </button>
            <button
              onClick={() => handleCalculatorInput('M-')}
              className="bg-blue-400 hover:bg-blue-500 text-white p-2 sm:p-3 rounded-lg font-bold text-xs sm:text-sm shadow-md border border-blue-500 flex items-center justify-center"
            >
              M-
            </button>
            <button
              onClick={() => handleCalculatorInput('M+')}
              className="bg-blue-400 hover:bg-blue-500 text-white p-2 sm:p-3 rounded-lg font-bold text-xs sm:text-sm shadow-md border border-blue-500 flex items-center justify-center"
            >
              M+
            </button>
            <button
              onClick={() => handleCalculatorInput('AUTO')}
              className="bg-gray-400 hover:bg-gray-500 text-white p-2 sm:p-3 rounded-lg font-bold text-xs sm:text-sm shadow-md border border-gray-500 flex items-center justify-center"
            >
              AUTO
            </button>
            <button
              onClick={() => handleCalculatorInput('→')}
              className="bg-gray-400 hover:bg-gray-500 text-white p-2 sm:p-3 rounded-lg font-bold text-xs sm:text-sm shadow-md border border-gray-500 flex items-center justify-center"
            >
              →
            </button>

            {/* Row 2: %, 7, 8, 9, (, ) */}
            <button
              onClick={() => handleCalculatorInput('%')}
              className="bg-blue-400 hover:bg-blue-500 text-white p-2 sm:p-3 rounded-lg font-bold text-sm sm:text-lg shadow-md border border-blue-500 flex items-center justify-center"
            >
              %
            </button>
            <button
              onClick={() => handleCalculatorInput('7')}
              className="bg-gray-800 hover:bg-gray-900 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-gray-600 flex items-center justify-center"
            >
              7
            </button>
            <button
              onClick={() => handleCalculatorInput('8')}
              className="bg-gray-800 hover:bg-gray-900 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-gray-600 flex items-center justify-center"
            >
              8
            </button>
            <button
              onClick={() => handleCalculatorInput('9')}
              className="bg-gray-800 hover:bg-gray-900 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-gray-600 flex items-center justify-center"
            >
              9
            </button>
            <button
              onClick={() => handleCalculatorInput('CHECK←')}
              disabled={calculationSteps.length === 0}
              className="bg-purple-400 hover:bg-purple-500 disabled:bg-gray-300 disabled:text-gray-500 text-white p-2 sm:p-3 rounded-lg font-bold text-xs sm:text-sm shadow-md border border-purple-500 flex items-center justify-center"
            >
              ← CHK
            </button>
            <button
              onClick={() => handleCalculatorInput('CHECK→')}
              disabled={calculationSteps.length === 0}
              className="bg-purple-400 hover:bg-purple-500 disabled:bg-gray-300 disabled:text-gray-500 text-white p-2 sm:p-3 rounded-lg font-bold text-xs sm:text-sm shadow-md border border-purple-500 flex items-center justify-center"
            >
              CHK →
            </button>

            {/* Row 3: √, 4, 5, 6, ×, ÷ */}
            <button
              onClick={() => handleCalculatorInput('√')}
              className="bg-blue-400 hover:bg-blue-500 text-white p-2 sm:p-3 rounded-lg font-bold text-sm sm:text-lg shadow-md border border-blue-500 flex items-center justify-center"
            >
              √
            </button>
            <button
              onClick={() => handleCalculatorInput('4')}
              className="bg-gray-800 hover:bg-gray-900 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-gray-600 flex items-center justify-center"
            >
              4
            </button>
            <button
              onClick={() => handleCalculatorInput('5')}
              className="bg-gray-800 hover:bg-gray-900 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-gray-600 flex items-center justify-center"
            >
              5
            </button>
            <button
              onClick={() => handleCalculatorInput('6')}
              className="bg-gray-800 hover:bg-gray-900 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-gray-600 flex items-center justify-center"
            >
              6
            </button>
            <button
              onClick={() => handleCalculatorInput('*')}
              className="bg-blue-400 hover:bg-blue-500 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-blue-500 flex items-center justify-center"
            >
              ×
            </button>
            <button
              onClick={() => handleCalculatorInput('÷')}
              className="bg-blue-400 hover:bg-blue-500 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-blue-500 flex items-center justify-center"
            >
              ÷
            </button>

            {/* Row 4: AC (spans 2 rows), 1, 2, 3, +, - */}
            <button
              onClick={() => handleCalculatorInput('AC')}
              className="bg-red-500 hover:bg-red-600 text-white p-2 sm:p-3 rounded-lg font-bold text-xs sm:text-sm shadow-md border border-red-600 flex items-center justify-center"
              style={{ gridRow: 'span 2' }}
            >
              AC
            </button>
            <button
              onClick={() => handleCalculatorInput('1')}
              className="bg-gray-800 hover:bg-gray-900 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-gray-600 flex items-center justify-center"
            >
              1
            </button>
            <button
              onClick={() => handleCalculatorInput('2')}
              className="bg-gray-800 hover:bg-gray-900 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-gray-600 flex items-center justify-center"
            >
              2
            </button>
            <button
              onClick={() => handleCalculatorInput('3')}
              className="bg-gray-800 hover:bg-gray-900 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-gray-600 flex items-center justify-center"
            >
              3
            </button>
            <button
              onClick={() => handleCalculatorInput('+')}
              className="bg-blue-400 hover:bg-blue-500 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-blue-500 row-span-2 flex items-center justify-center"
              style={{ gridRow: 'span 2' }}
            >
              +
            </button>
            <button
              onClick={() => handleCalculatorInput('-')}
              className="bg-blue-400 hover:bg-blue-500 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-blue-500 flex items-center justify-center"
            >
              −
            </button>

            {/* Row 5: (AC spans from row 4), 0, 00, •, (+ spans from row 4), = */}
            <button
              onClick={() => handleCalculatorInput('0')}
              className="bg-gray-800 hover:bg-gray-900 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-gray-600 flex items-center justify-center"
            >
              0
            </button>
            <button
              onClick={() => handleCalculatorInput('00')}
              className="bg-gray-800 hover:bg-gray-900 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-gray-600 flex items-center justify-center"
            >
              00
            </button>
            <button
              onClick={() => handleCalculatorInput('.')}
              className="bg-gray-800 hover:bg-gray-900 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-gray-600 flex items-center justify-center"
            >
              •
            </button>
            <button
              onClick={() => handleCalculatorInput('=')}
              className="bg-green-500 hover:bg-green-600 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-green-600 flex items-center justify-center"
            >
              =
            </button>
          </div>

          {/* Add Button */}
          <button
            onClick={() => setShowClientSearch(true)}
            disabled={calculatorValue === 'Error' || calculatorValue === '0'}
            className={`w-full ${linkedClient ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600'} disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-4 rounded-lg font-semibold text-lg flex items-center justify-center gap-2`}
          >
            <Plus size={20} />
            {linkedClient ? `Add to ${linkedClient.name}` : 'Add to Client'}
          </button>
        </div>

        {/* Render Mini Calculators */}
        {miniCalculators.map((calc) => (
          <MiniCalculator
            key={calc.id}
            id={calc.id}
            initialLabel={calc.label}
            initialPosition={calc.position}
            onClose={() => closeMiniCalculator(calc.id)}
            onAddToClient={handleMiniCalculatorTransaction}
          />
        ))}
      </div>

      {/* Modals */}
      {selectedClient && (
        <ClientDetailModal
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
        />
      )}

      {showClientSearch && (
        <ClientSearchModal
          calculatorValue={calculatorValue}
          onClose={handleResetCalculatorAndDescription}
          onAddToClient={handleAddToClient}
          linkedClient={linkedClient}
          onResetCalculator={handleResetCalculator}
        />
      )}

      {/* Unified Data Manager Modal */}
      {showUnifiedDataManager && (
        <UnifiedDataManager
          isOpen={showUnifiedDataManager}
          onClose={() => setShowUnifiedDataManager(false)}
        />
      )}

      {/* Centered Wobble Effect Overlay */}
      {recentTransactionClient && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[9999] pointer-events-none">
          <div className="pointer-events-auto">
            <div className={`w-64 bg-white rounded-lg shadow-2xl p-4 border-2 border-green-400 animate-wobble relative`}>
              {/* Close Button */}
              <button
                onClick={() => setRecentTransactionClient(null)}
                className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-colors z-10"
              >
                <X size={16} strokeWidth={3} />
              </button>
              
              {/* Success Icon */}
              <div className="flex items-center justify-center mb-3">
                <div className="bg-green-100 p-3 rounded-full">
                  <CheckCircle size={32} className="text-green-600" />
                </div>
              </div>
              
              {/* Client Info */}
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-800 mb-1">{recentTransactionClient.name}</h3>
                <p className="text-sm text-gray-600 mb-2">ID: {recentTransactionClient.id}</p>
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <p className="text-sm text-green-700 font-medium">Transaction Added Successfully!</p>
                  <p className="text-xs text-green-600 mt-1">
                    New Balance: Rs {getClientTotalDebt(recentTransactionClient.id).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Settings and Delete Modals */}
      {/* Centered Wobble Overlay */}
      {showCenteredWobble && centeredWobbleClient && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[9999] p-4 select-none">
          <div className="relative">
            {/* Close Button */}
            <button
              onClick={() => {
                setShowCenteredWobble(false);
                setCenteredWobbleClient(null);
              }}
              className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg z-10 transition-colors"
            >
              <X size={16} />
            </button>
            
            {/* Wobbling Client Card */}
            <div className="animate-wobble">
              <ClientCard
                client={centeredWobbleClient}
                onLongPress={() => {}}
                onQuickAdd={() => {}}
                onResetCalculator={() => {}}
                isLinked={false}
                showWobble={false}
                onCloseWobble={() => {}}
              />
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Card Overlay */}
      {duplicateCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 select-none">
          <div className="relative">
            {/* Close Button */}
            <button
              onClick={() => setDuplicateCard(null)}
              className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg z-10 transition-colors"
            >
              <X size={16} />
            </button>
            
            {/* Pulsating Success Card */}
            <div className="animate-pulsate bg-white rounded-lg shadow-2xl p-6 border-4 border-green-500 max-w-sm mx-4">
              {/* Success Icon */}
              <div className="flex items-center justify-center mb-4">
                <div className="bg-green-100 p-3 rounded-full">
                  <CheckCircle size={40} className="text-green-600" />
                </div>
              </div>
              
              {/* Client Info */}
              <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-gray-800 mb-1">{duplicateCard.name}</h3>
                <p className="text-sm text-gray-600">ID: {duplicateCard.id}</p>
              </div>
              
              {/* Articles taken - larger font */}
              {duplicateCard.transactionDescription && (
                <div className="mb-3">
                  <p className="text-lg font-semibold text-gray-800 leading-relaxed">
                    {duplicateCard.transactionDescription}
                  </p>
                </div>
              )}
              
              {/* Amount and Arrows Section */}
              {(() => {
                const hasAmount = duplicateCard.transactionAmount !== undefined && duplicateCard.transactionAmount > 0;
                const totalDebt = getClientTotalDebt(duplicateCard.id);
                const hasDebt = totalDebt > 0;
                
                // Get returnable items for this client
                const getReturnableItems = () => {
                  const clientTransactions = getClientTransactions(duplicateCard.id);
                  const returnableItems: {[key: string]: number} = {};
                  
                  clientTransactions.forEach(transaction => {
                    if (transaction.type === 'payment' || transaction.description.toLowerCase().includes('returned')) {
                      return;
                    }
                    
                    const description = transaction.description.toLowerCase();
                    if (!description.includes('chopine') && !description.includes('bouteille')) {
                      return;
                    }
                    
                    // Parse chopines
                    const chopinePattern = /(\d+)\s+chopines?(?:\s+([^,]*))?/gi;
                    let chopineMatch;
                    while ((chopineMatch = chopinePattern.exec(description)) !== null) {
                      const quantity = parseInt(chopineMatch[1]);
                      const brand = chopineMatch[2]?.trim() || '';
                      const key = brand ? `Chopine ${brand}` : 'Chopine';
                      returnableItems[key] = (returnableItems[key] || 0) + quantity;
                    }
                    
                    // Parse bouteilles
                    const bouteillePattern = /(\d+)\s+(?:(\d+(?:\.\d+)?L)\s+)?bouteilles?(?:\s+([^,]*))?/gi;
                    let bouteilleMatch;
                    while ((bouteilleMatch = bouteillePattern.exec(description)) !== null) {
                      const quantity = parseInt(bouteilleMatch[1]);
                      const size = bouteilleMatch[2]?.trim() || '';
                      const brand = bouteilleMatch[3]?.trim() || '';
                      
                      let key;
                      if (size && brand) {
                        key = `${size} ${brand}`;
                      } else if (brand) {
                        key = `Bouteille ${brand}`;
                      } else if (size) {
                        key = `${size} Bouteille`;
                      } else {
                        key = 'Bouteille';
                      }
                      returnableItems[key] = (returnableItems[key] || 0) + quantity;
                    }
                    
                    // Handle items without explicit numbers
                    if (description.includes('bouteille') && !bouteillePattern.test(description)) {
                      const sizeMatch = description.match(/(\d+(?:\.\d+)?L)/i);
                      const brandMatch = description.match(/bouteilles?\s+([^,]*)/i);
                      const brand = brandMatch?.[1]?.trim() || '';
                      
                      let key;
                      if (sizeMatch && brand) {
                        key = `${sizeMatch[1]} ${brand}`;
                      } else if (brand) {
                        key = `Bouteille ${brand}`;
                      } else if (sizeMatch) {
                        key = `${sizeMatch[1]} Bouteille`;
                      } else {
                        key = 'Bouteille';
                      }
                      returnableItems[key] = (returnableItems[key] || 0) + 1;
                    }
                    
                    if (description.includes('chopine') && !chopinePattern.test(description)) {
                      const brandMatch = description.match(/chopines?\s+([^,]*)/i);
                      const brand = brandMatch?.[1]?.trim() || '';
                      const key = brand ? `Chopine ${brand}` : 'Chopine';
                      returnableItems[key] = (returnableItems[key] || 0) + 1;
                    }
                  });
                  
                  // Calculate returned quantities
                  const returnedQuantities: {[key: string]: number} = {};
                  clientTransactions
                    .filter(transaction => transaction.type === 'debt' && transaction.description.toLowerCase().includes('returned'))
                    .forEach(transaction => {
                      const description = transaction.description.toLowerCase();
                      Object.keys(returnableItems).forEach(itemType => {
                        if (description.includes(itemType.toLowerCase())) {
                          const match = description.match(/returned:\s*(\d+)\s+/);
                          if (match) {
                            returnedQuantities[itemType] = (returnedQuantities[itemType] || 0) + parseInt(match[1]);
                          }
                        }
                      });
                    });
                  
                  // Calculate net returnable quantities
                  const netReturnableItems: string[] = [];
                  Object.entries(returnableItems).forEach(([itemType, total]) => {
                    const returned = returnedQuantities[itemType] || 0;
                    const remaining = Math.max(0, total - returned);
                    if (remaining > 0) {
                      netReturnableItems.push(`${remaining} ${itemType}${remaining > 1 ? 's' : ''}`);
                    }
                  });
                  
                  return netReturnableItems;
                };
                
                const returnableItems = getReturnableItems();
                const hasReturnables = returnableItems.length > 0;
                
                return (
                  <div className="relative mb-3">
                    {/* Amount Section - only show if amount > 0 */}
                    {hasAmount && (
                      <div className="mb-3">
                        <p className="text-2xl font-bold text-green-600 mb-1">
                          Rs {duplicateCard.transactionAmount!.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        
                        {/* Arrow pointing to debt total - only show if debt > 0 */}
                        {hasDebt && (
                          <div className="flex items-center justify-center gap-2 mt-2">
                            <div className="animate-bounce-horizontal text-green-600">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                            <div className="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm font-medium">
                              Debt: Rs {totalDebt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Returnables Section - show if client has returnables */}
                    {hasReturnables && (
                      <div className="mb-3">
                        {/* Arrow pointing to returnables - only show if we also have amount */}
                        {hasAmount && (
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <div className="animate-bounce-horizontal text-orange-600">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                            <div className="bg-orange-500 text-white px-3 py-1 rounded-lg text-sm font-medium">
                              Returnables: {returnableItems.join(', ')}
                            </div>
                          </div>
                        )}
                        
                        {/* Show returnables without arrow if no amount */}
                        {!hasAmount && (
                          <div className="bg-orange-100 border border-orange-300 rounded-lg p-3 mb-2">
                            <p className="text-orange-800 font-medium text-sm mb-1">Total Returnables:</p>
                            <p className="text-orange-700 text-sm">{returnableItems.join(', ')}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
              
              <p className="text-sm text-green-700 font-medium">Transaction Added!</p>
            </div>
          </div>
        </div>
      )}

      <CreditModals
        showSettings={showSettings}
        onCloseSettings={() => setShowSettings(false)}
        onDeleteClient={handleDeleteClient}
        showDeleteConfirm={showDeleteConfirm}
        clientToDelete={clientToDelete}
        deleteConfirmText={deleteConfirmText}
        onDeleteConfirmTextChange={setDeleteConfirmText}
        onConfirmDelete={confirmDeleteClient}
        onCancelDelete={() => {
          setShowDeleteConfirm(false);
          setClientToDelete(null);
          setDeleteConfirmText('');
        }}
        showDeleteAllConfirm={showDeleteAllConfirm}
        deleteAllPasscode={deleteAllPasscode}
        onDeleteAllPasscodeChange={setDeleteAllPasscode}
        onConfirmDeleteAll={confirmDeleteAllClients}
        onCancelDeleteAll={() => {
          setShowDeleteAllConfirm(false);
          setDeleteAllPasscode('');
        }}
        onDeleteAllClients={handleDeleteAllClients}
      />
    </div>
  );
};

export default CreditManagement;