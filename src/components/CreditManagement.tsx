import React, { useState, useEffect } from 'react';
import { Calculator, Plus, X } from 'lucide-react';
import { useCredit } from '../context/CreditContext';
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
  
  // Mini calculator state
  const [miniCalculators, setMiniCalculators] = useState<Array<{
    id: string;
    label: string;
    position: { x: number; y: number };
  }>>([]);

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
  }, []);

  // Get filtered clients for tabs based on selected filter
  const getFilteredClientsForTabs = () => {
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
            const bouteillePattern = /(\d+)\s+(?:(\d+(?:\.\d+)?[Ll])\s+)?bouteilles?(?:\s+([^,]*))?/gi;
            let bouteilleMatch;
            
            while ((bouteilleMatch = bouteillePattern.exec(description)) !== null) {
              const quantity = parseInt(bouteilleMatch[1]);
              const size = bouteilleMatch[2]?.trim().replace(/l$/i, 'L') || '';
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
              
              let key;
              if (sizeMatch && brand) {
                key = `${sizeMatch[0].replace(/l$/i, 'L')} ${brand}`;
              } else if (brand) {
                key = `Bouteille ${brand}`;
              } else if (sizeMatch) {
                key = `${sizeMatch[0].replace(/l$/i, 'L')} Bouteille`;
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

  const handleAddToClient = async (client: Client, description: string) => {
    try {
      
      const amount = evaluateExpression(calculatorValue);
      
      if (isNaN(amount) || !isFinite(amount) || amount < 0) {
        throw new Error('Please enter a valid amount');
      }
      
      if (!description || !description.trim()) {
        throw new Error('Please enter a description');
      }
      
      if (!client || !client.id) {
        throw new Error('Invalid client selected');
      }
    
      await addTransaction(client, description, amount);
      
      // Force a re-render of the scrolling tabs to update text and reset timeline
      window.dispatchEvent(new CustomEvent('creditDataChanged'));
      
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
    return evaluateExpression(calculatorValue);
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
                  title="Unlink client from calculator"
                >
                  Unlink
                </button>
              </>
            )}
          </div>

          {/* Calculator Display */}
          <div className="mb-6">
            <div className="bg-gray-800 rounded-lg p-4 text-right relative border-2 border-gray-400 shadow-inner">
              {/* LCD Header */}
              <div className="text-center mb-2">
                <div className="text-xs text-gray-400 font-mono">GOLDEN STORE JS-705</div>
                <div className="text-xs text-gray-400 font-mono">112 STEPS CHECK</div>
              </div>
              
              {/* Status Indicators */}
              <div className="flex justify-between items-center mb-2 text-xs">
                <div className="flex gap-2">
                  {/* Article Count Circle */}
                  {articleCount > 0 && (
                    <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                      {articleCount}
                    </div>
                  )}
                  {calculatorMemory !== 0 && (
                    <span className="text-green-400 font-bold">M</span>
                  )}
                  {calculatorGrandTotal !== 0 && (
                    <span className="text-green-400 font-bold">GT</span>
                  )}
                  {autoReplayActive && (
                    <span className="text-yellow-400 font-bold">AUTO</span>
                  )}
                  {calculationSteps.length > 0 && (
                    <span className="text-blue-400 font-bold">HIST</span>
                  )}
                </div>
                <div className="text-gray-400 font-mono">
                  {lastOperation && <span>OP: {lastOperation === '*' ? '×' : lastOperation === '/' ? '÷' : lastOperation}</span>}
                </div>
              </div>
              
              {/* Main Display */}
              {calculatorMemory !== 0 && (
                <div className="absolute top-2 left-3 text-xs text-green-400 font-bold">
                  M
                </div>
              )}
              <div className="text-2xl sm:text-3xl font-mono text-green-400 min-h-[3rem] flex items-center justify-end overflow-hidden bg-black rounded px-3 py-2">
                <div className="truncate max-w-full" title={calculatorValue}>
                  {calculatorValue}
                </div>
              </div>
              
              {/* Secondary Display */}
              <div className="text-xs text-gray-400 font-mono mt-1 text-center">
                {autoReplayActive ? (() => {
                  const currentStepIndex = parseInt(localStorage.getItem('currentCheckIndex') || '0');
                  const actualStepNumber = currentStepIndex + 1; // Convert 0-based index to 1-based display
                  const totalSteps = calculationSteps.length;
                  const currentStep = calculationSteps[currentStepIndex];
                  return `AUTO REPLAY - Step ${actualStepNumber}/${totalSteps}`;
                })() : 'Electronic Calculator'}
              </div>
            </div>
          </div>

          {/* Calculator Buttons */}
          <div className="grid grid-cols-6 gap-2 mb-6 p-4 bg-gray-200 rounded-lg border-2 border-gray-400 shadow-inner">
            {/* Row 0 - Top row: CHECK←, CHECK→ */}
            <div className="col-span-6 grid grid-cols-2 gap-2 mb-2">
              <button
                onClick={() => handleCalculatorInput('CHECK←')}
                disabled={calculationSteps.length === 0}
                className="bg-purple-400 hover:bg-purple-500 disabled:bg-gray-300 disabled:text-gray-500 text-white p-2 rounded-lg font-bold text-xl shadow-md border border-purple-500"
              >
                ← CHECK
              </button>
              <button
                onClick={() => handleCalculatorInput('CHECK→')}
                disabled={calculationSteps.length === 0}
                className="bg-purple-400 hover:bg-purple-500 disabled:bg-gray-300 disabled:text-gray-500 text-white p-2 rounded-lg font-bold text-xl shadow-md border border-purple-500"
              >
                CHECK →
              </button>
            </div>

            {/* Row 1 - Top row: MU, MRC, M-, M+, ON/C, AUTO */}
            <button
              onClick={() => handleCalculatorInput('MU')}
              className="bg-blue-400 hover:bg-blue-500 text-white p-3 rounded-lg font-bold text-sm shadow-md border border-blue-500"
            >
              MU
            </button>
            <button
              onClick={() => handleCalculatorInput('MRC')}
              className="bg-blue-400 hover:bg-blue-500 text-white p-3 rounded-lg font-bold text-sm shadow-md border border-blue-500"
            >
              MRC
            </button>
            <button
              onClick={() => handleCalculatorInput('M-')}
              className="bg-blue-400 hover:bg-blue-500 text-white p-3 rounded-lg font-bold text-sm shadow-md border border-blue-500"
            >
              M-
            </button>
            <button
              onClick={() => handleCalculatorInput('M+')}
              className="bg-blue-400 hover:bg-blue-500 text-white p-3 rounded-lg font-bold text-sm shadow-md border border-blue-500"
            >
              M+
            </button>
            <button
              onClick={() => handleCalculatorInput('ON/C')}
              className="bg-gray-400 hover:bg-gray-500 text-white p-3 rounded-lg font-bold text-sm shadow-md border border-gray-500"
            >
              ON/C
            </button>
            <button
              onClick={() => handleCalculatorInput('AUTO')}
              className="bg-gray-400 hover:bg-gray-500 text-white p-3 rounded-lg font-bold text-xs shadow-md border border-gray-500"
            >
              AUTO REPLAY
            </button>

            {/* Row 2 - Second row: %, 7, 8, 9, GT, √ */}
            <button
              onClick={() => handleCalculatorInput('%')}
              className="bg-blue-400 hover:bg-blue-500 text-white p-3 rounded-lg font-bold text-lg shadow-md border border-blue-500"
            >
              %
            </button>
            <button
              onClick={() => handleCalculatorInput('7')}
              className="bg-gray-800 hover:bg-gray-900 text-white p-3 rounded-lg font-bold text-xl shadow-md border border-gray-600"
            >
              7
            </button>
            <button
              onClick={() => handleCalculatorInput('8')}
              className="bg-gray-800 hover:bg-gray-900 text-white p-3 rounded-lg font-bold text-xl shadow-md border border-gray-600"
            >
              8
            </button>
            <button
              onClick={() => handleCalculatorInput('9')}
              className="bg-gray-800 hover:bg-gray-900 text-white p-3 rounded-lg font-bold text-xl shadow-md border border-gray-600"
            >
              9
            </button>
            <button
              onClick={() => handleCalculatorInput('GT')}
              className="bg-blue-400 hover:bg-blue-500 text-white p-3 rounded-lg font-bold text-sm shadow-md border border-blue-500"
            >
              GT
            </button>
            <button
              onClick={() => handleCalculatorInput('√')}
              className="bg-blue-400 hover:bg-blue-500 text-white p-3 rounded-lg font-bold text-lg shadow-md border border-blue-500"
            >
              √
            </button>

            {/* Row 3 - Third row: →, 4, 5, 6, ×, ÷ */}
            <button
              onClick={() => handleCalculatorInput('→')}
              className="bg-blue-400 hover:bg-blue-500 text-white p-3 rounded-lg font-bold text-lg shadow-md border border-blue-500"
            >
              →
            </button>
            <button
              onClick={() => handleCalculatorInput('4')}
              className="bg-gray-800 hover:bg-gray-900 text-white p-3 rounded-lg font-bold text-xl shadow-md border border-gray-600"
            >
              4
            </button>
            <button
              onClick={() => handleCalculatorInput('5')}
              className="bg-gray-800 hover:bg-gray-900 text-white p-3 rounded-lg font-bold text-xl shadow-md border border-gray-600"
            >
              5
            </button>
            <button
              onClick={() => handleCalculatorInput('6')}
              className="bg-gray-800 hover:bg-gray-900 text-white p-3 rounded-lg font-bold text-xl shadow-md border border-gray-600"
            >
              6
            </button>
            <button
              onClick={() => handleCalculatorInput('*')}
              className="bg-blue-400 hover:bg-blue-500 text-white p-3 rounded-lg font-bold text-xl shadow-md border border-blue-500"
            >
              ×
            </button>
            <button
              onClick={() => handleCalculatorInput('÷')}
              className="bg-blue-400 hover:bg-blue-500 text-white p-3 rounded-lg font-bold text-xl shadow-md border border-blue-500"
            >
              ÷
            </button>

            {/* Row 4 - Fourth row: AC, 1, 2, 3, +, - */}
            <button
              onClick={() => handleCalculatorInput('AC')}
              className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-lg font-bold text-sm shadow-md border border-red-600"
            >
              AC
            </button>
            <button
              onClick={() => handleCalculatorInput('1')}
              className="bg-gray-800 hover:bg-gray-900 text-white p-3 rounded-lg font-bold text-xl shadow-md border border-gray-600"
            >
              1
            </button>
            <button
              onClick={() => handleCalculatorInput('2')}
              className="bg-gray-800 hover:bg-gray-900 text-white p-3 rounded-lg font-bold text-xl shadow-md border border-gray-600"
            >
              2
            </button>
            <button
              onClick={() => handleCalculatorInput('3')}
              className="bg-gray-800 hover:bg-gray-900 text-white p-3 rounded-lg font-bold text-xl shadow-md border border-gray-600"
            >
              3
            </button>
            <button
              onClick={() => handleCalculatorInput('+')}
              className="bg-blue-400 hover:bg-blue-500 text-white p-3 rounded-lg font-bold text-xl shadow-md border border-blue-500 row-span-2"
            >
              +
            </button>
            <button
              onClick={() => handleCalculatorInput('-')}
              className="bg-blue-400 hover:bg-blue-500 text-white p-3 rounded-lg font-bold text-xl shadow-md border border-blue-500"
            >
              −
            </button>

            {/* Row 5 - Bottom row: 0, 00, 000, •, =, = */}
            <button
              onClick={() => handleCalculatorInput('0')}
              className="bg-gray-800 hover:bg-gray-900 text-white p-3 rounded-lg font-bold text-xl shadow-md border border-gray-600"
            >
              0
            </button>
            <button
              onClick={() => handleCalculatorInput('00')}
              className="bg-gray-800 hover:bg-gray-900 text-white p-3 rounded-lg font-bold text-xl shadow-md border border-gray-600"
            >
              00
            </button>
            <button
              onClick={() => handleCalculatorInput('000')}
              className="bg-gray-800 hover:bg-gray-900 text-white p-3 rounded-lg font-bold text-lg shadow-md border border-gray-600"
            >
              000
            </button>
            <button
              onClick={() => handleCalculatorInput('.')}
              className="bg-gray-800 hover:bg-gray-900 text-white p-3 rounded-lg font-bold text-xl shadow-md border border-gray-600"
            >
              •
            </button>
            <button
              onClick={() => handleCalculatorInput('=')}
              className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-lg font-bold text-xl shadow-md border border-green-600"
            >
              =
            </button>
          </div>

          {/* Add Button */}
          <button
            onClick={() => setShowClientSearch(true)}
            disabled={calculatorValue === 'Error'}
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

      {/* Settings and Delete Modals */}
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