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
        setCalculatorValue('0');
        setIsCalculatorActive(false);
      }
    };

    window.addEventListener('creditDataChanged', handleCreditDataChanged);
    
    return () => {
      window.removeEventListener('creditDataChanged', handleCreditDataChanged);
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
    const result = processCalculatorInput(calculatorValue, value, calculatorMemory);
    setCalculatorValue(result.value);
    setCalculatorMemory(result.memory);
    setIsCalculatorActive(result.isActive);
  };

  const handleQuickAdd = (client: Client) => {
    setLinkedClient(client);
    // Don't open modal immediately, just link the client to calculator
  };

  const handleCalculatorCancel = () => {
    setLinkedClient(null);
    setCalculatorValue('0');
    setIsCalculatorActive(false);
  };

  const handleResetCalculator = () => {
    setCalculatorValue('0');
    setIsCalculatorActive(false);
    setLinkedClient(null);
    setShowClientSearch(false);
  };

  const handleResetCalculatorAndDescription = () => {
    setCalculatorValue('0');
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
    alert(`Transaction from ${label}:\nAmount: Rs ${amount.toFixed(2)}\nDescription: ${description}\n\nNote: This would normally open the client search modal to select a client.`);
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
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                  title="Cancel link to client"
                >
                  <X size={20} />
                </button>
              </>
            )}
          </div>

          {/* Calculator Display */}
          <div className="mb-4">
            <div className="bg-gray-100 rounded-lg p-4 text-right relative">
              {calculatorMemory !== 0 && (
                <div className="absolute top-2 left-3 text-xs text-blue-600 font-semibold">
                  M
                </div>
              )}
              <div className="text-xl sm:text-2xl font-mono text-gray-800 min-h-[2rem] flex items-center justify-end overflow-hidden">
                <div className="truncate max-w-full" title={calculatorValue}>
                  {calculatorValue}
                </div>
              </div>
            </div>
          </div>

          {/* Calculator Buttons */}
          <div className="grid grid-cols-5 gap-2 mb-4">
            {/* Row 0 - Memory Functions */}
            <button
              onClick={() => handleCalculatorInput('M+')}
              className="bg-purple-500 hover:bg-purple-600 text-white p-3 rounded-lg font-semibold text-sm"
            >
              M+
            </button>
            <button
              onClick={() => handleCalculatorInput('MR')}
              className="bg-purple-500 hover:bg-purple-600 text-white p-3 rounded-lg font-semibold text-sm"
            >
              MR
            </button>
            <button
              onClick={() => handleCalculatorInput('MC')}
              className="bg-purple-500 hover:bg-purple-600 text-white p-3 rounded-lg font-semibold text-sm"
            >
              MC
            </button>
            <button
              onClick={() => handleCalculatorInput('CE')}
              className="bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-lg font-semibold text-sm"
            >
              CE
            </button>
            <button
              onClick={() => handleCalculatorInput('C')}
              className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-lg font-semibold text-sm"
            >
              C
            </button>

            {/* Row 1 */}
            <button
              onClick={() => handleCalculatorInput('7')}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-4 rounded-lg font-semibold text-lg"
            >
              7
            </button>
            <button
              onClick={() => handleCalculatorInput('8')}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-3 rounded-lg font-semibold"
            >
              8
            </button>
            <button
              onClick={() => handleCalculatorInput('9')}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-3 rounded-lg font-semibold"
            >
              9
            </button>
            <button
              onClick={() => handleCalculatorInput('/')}
              className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-lg font-semibold"
            >
              ÷
            </button>
            <button
              onClick={() => handleCalculatorInput('⌫')}
              className="bg-gray-500 hover:bg-gray-600 text-white p-3 rounded-lg font-semibold"
            >
              ⌫
            </button>

            {/* Row 2 */}
            <button
              onClick={() => handleCalculatorInput('4')}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-3 rounded-lg font-semibold"
            >
              4
            </button>
            <button
              onClick={() => handleCalculatorInput('5')}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-3 rounded-lg font-semibold"
            >
              5
            </button>
            <button
              onClick={() => handleCalculatorInput('6')}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-3 rounded-lg font-semibold"
            >
              6
            </button>
            <button
              onClick={() => handleCalculatorInput('*')}
              className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-lg font-semibold"
            >
              ×
            </button>
            <button
              onClick={() => handleCalculatorInput('-')}
              className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-lg font-semibold row-span-2"
            >
              −
            </button>

            {/* Row 3 */}
            <button
              onClick={() => handleCalculatorInput('1')}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-3 rounded-lg font-semibold"
            >
              1
            </button>
            <button
              onClick={() => handleCalculatorInput('2')}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-3 rounded-lg font-semibold"
            >
              2
            </button>
            <button
              onClick={() => handleCalculatorInput('3')}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-3 rounded-lg font-semibold"
            >
              3
            </button>
            <button
              onClick={() => handleCalculatorInput('+')}
              className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-lg font-semibold row-span-2"
            >
              +
            </button>

            {/* Row 4 */}
            <button
              onClick={() => handleCalculatorInput('0')}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-3 rounded-lg font-semibold col-span-2"
            >
              0
            </button>
            <button
              onClick={() => handleCalculatorInput('.')}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-3 rounded-lg font-semibold"
            >
              .
            </button>
            <button
              onClick={() => handleCalculatorInput('=')}
              className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-lg font-semibold"
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