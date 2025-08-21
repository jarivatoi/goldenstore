import React, { useState, useEffect } from 'react';
import { useCredit } from '../context/CreditContext';
import ClientDetailModal from './ClientDetailModal';
import ClientSearchModal from './ClientSearchModal';
import UnifiedDataManager from './UnifiedDataManager';
import ScrollingTabs from './credit/ScrollingTabs';
import CreditCalculator from './credit/CreditCalculator';
import CreditHeader from './credit/CreditHeader';
import ClientGrid from './credit/ClientGrid';
import CreditModals from './credit/CreditModals';
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
          
          // Calculate net returnable quantities
          const hasReturnableItems = Object.entries(returnableItems).some(([itemType, total]) => {
            const returned = returnedQuantities[itemType] || 0;
            const remaining = Math.max(0, total - returned);
            return remaining > 0;
          });
          
          return hasReturnableItems;
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
          const hasReturnableItems = clientTransactions.some(transaction => {
            if (transaction.type === 'payment' || transaction.description.toLowerCase().includes('returned')) {
              return false;
            }
            const description = transaction.description.toLowerCase();
            return description.includes('chopine') || description.includes('bouteille');
          });
          
          return totalDebt > 0 || hasReturnableItems;
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
        const hasReturnableItems = clientTransactions.some(transaction => {
          if (transaction.type === 'payment' || transaction.description.toLowerCase().includes('returned')) {
            return false;
          }
          const description = transaction.description.toLowerCase();
          return description.includes('chopine') || description.includes('bouteille');
        });
        
        return totalDebt > 0 || hasReturnableItems;
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

  const confirmDeleteClient = async () => {
    if (!clientToDelete || deleteConfirmText !== 'DELETE') {
      alert('Please type DELETE to confirm');
      return;
    }

    try {
      await deleteClient(clientToDelete.id);
      setShowDeleteConfirm(false);
      setClientToDelete(null);
      setDeleteConfirmText('');
      setShowSettings(false);
      alert(`Client ${clientToDelete.name} (${clientToDelete.id}) has been permanently deleted`);
    } catch (error) {
      alert('Failed to delete client');
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
        <CreditCalculator
          calculatorValue={calculatorValue}
          calculatorMemory={calculatorMemory}
          linkedClient={linkedClient}
          onCalculatorInput={handleCalculatorInput}
          onCalculatorCancel={handleCalculatorCancel}
          onAddToClient={() => setShowClientSearch(true)}
          isDisabled={calculatorValue === 'Error'}
        />
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
      />
    </div>
  );
};

export default CreditManagement;