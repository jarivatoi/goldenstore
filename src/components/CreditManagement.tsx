import React, { useState, useEffect, useRef } from 'react';
import { Calculator, Plus, CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { useCredit } from '../context/CreditContext';
import ClientDetailModal from './ClientDetailModal';
import ClientSearchModal from './ClientSearchModal';
import UnifiedDataManager from './UnifiedDataManager';
import ScrollingTabs from './credit/ScrollingTabs';
import CreditHeader from './credit/CreditHeader';
import ClientGrid from './credit/ClientGrid';
import CreditModals from './credit/CreditModals';
import MiniCalculator from './credit/MiniCalculator';
import { Client, CalculationStep, DuplicateCard } from '../types';
import { CalculatorEngine } from '../calculator/CalculatorEngine';
import { evaluateExpression } from '../utils/creditCalculatorUtils';
import { useIndependentCalculator } from '../hooks/useIndependentCalculator';
import { calculateReturnableItems } from '../utils/returnableItemsUtils';

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
  const [sortOption, setSortOption] = useState<'name' | 'date' | 'date-oldest' | 'debt'>('date');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [clientSearchDescription, setClientSearchDescription] = useState(''); // Add state to preserve description

  // Ref for tracking scrolling tabs timeline state
  const scrollingTabsTimelineRef = useRef<any>(null);

  // Separate search query for main grid (bottom search bar)
  const [mainGridSearchQuery, setMainGridSearchQuery] = useState('');

  // Delete all clients modal state
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [deleteAllPasscode, setDeleteAllPasscode] = useState('');
  
  // Transaction success state
  const [showCenteredWobble, setShowCenteredWobble] = useState(false);
  const [centeredWobbleClient, setCenteredWobbleClient] = useState<Client | null>(null);
  const [recentTransactionClient, setRecentTransactionClient] = useState<Client | null>(null);
  const [recentlySettledClient, setRecentlySettledClient] = useState<Client | null>(null);
  
  // Mini calculator state
  const [miniCalculators, setMiniCalculators] = useState<Array<{
    id: string;
    label: string;
    position: { x: number; y: number };
  }>>([]);

  // Duplicate card state
  const [duplicateCard, setDuplicateCard] = useState<DuplicateCard | null>(null);
  
  // Auto replay step info state
  const [autoReplayStepInfo, setAutoReplayStepInfo] = useState<{currentStep: number, totalSteps: number} | null>(null);
  const [autoReplayDisplay, setAutoReplayDisplay] = useState<string>('');
  const [autoReplayCompleted, setAutoReplayCompleted] = useState<boolean>(false);

  // Use the independent calculator hook for calculator state management
  const {
    calculatorValue,
    calculatorMemory,
    lastOperation,
    lastOperand,
    isNewNumber,
    calculationSteps,
    articleCount,
    isMarkupMode,
    autoReplayActive,
    transactionHistory,
    calculatorGrandTotal,
    lastPressedButton,
    handleCalculatorInput: handleIndependentCalculatorInput,
    handleResetCalculator: handleIndependentResetCalculator
  } = useIndependentCalculator();

  // Create calculator engine instance
  const [calculatorEngine] = useState(() => new CalculatorEngine());

  // Listen for credit data changes and duplicate card events
  useEffect(() => {
    const handleCreditDataChanged = (event: CustomEvent) => {
      // Check if this is a calculator interaction - if so, ignore it
      const isCalculatorInteraction = event && event.detail && event.detail.source === 'calculator';
      if (isCalculatorInteraction) {
        return;
      }

      // Update recent transaction client if provided and valid
      if (event.detail && event.detail.clientId) {
        setRecentTransactionClient(event.detail.clientId);

        // Clear the recent transaction client after 5 seconds
        setTimeout(() => {
          setRecentTransactionClient(null);
        }, 5000);
      }
    };

    const handleShowDuplicateCard = (event: CustomEvent) => {
      // Add safety checks for event.detail
      if (!event.detail) {
        return;
      }

      // Pause scrolling tabs timeline when showing duplicate card
      const scrollingTabsElement = document.querySelector('.scrolling-tabs-component');
      if (scrollingTabsElement) {
        const timeline = (scrollingTabsElement as any).__timelineRef;
        if (timeline && timeline.current && timeline.current.pause) {
          // Only pause if not already paused
          if (!scrollingTabsTimelineRef.current) {
            timeline.current.pause();
            scrollingTabsTimelineRef.current = timeline.current;
          }
        }
      }

      // Set the duplicate card to show the settled client if it has client data
      if (event.detail.client) {
        const client = event.detail.client;
        const isAccountClear = event.detail.isAccountClear;
        const message = event.detail.message || 'Transaction added successfully!';

        // Set the duplicate card to show the settled client
        setDuplicateCard({
          ...client,
          transactionAmount: 0, // Settlement amount
          message: message,
          isAccountClear: isAccountClear
        } as DuplicateCard);

        // Also set recent transaction client for wobble effect
        setRecentTransactionClient(client);
      } else {
        setDuplicateCard(event.detail);
      }

      // Auto-hide after 5 seconds and resume scrolling tabs timeline
      setTimeout(() => {
        setDuplicateCard(null);
        setRecentTransactionClient(null);

        // Resume scrolling tabs timeline when hiding duplicate card
        if (scrollingTabsTimelineRef.current && scrollingTabsTimelineRef.current.resume) {
          try {
            scrollingTabsTimelineRef.current.resume();
          } catch (e) {
            // Silent fail
          }
          scrollingTabsTimelineRef.current = null;
        }

        // Dispatch creditDataChanged event with duplicateCard source to prevent timeline restart
        window.dispatchEvent(new CustomEvent('creditDataChanged', {
          detail: { source: 'duplicateCard' }
        }));
      }, 5000);
    };

    const handleAutoReplayStep = (event: CustomEvent) => {
      // Update auto replay display
      setAutoReplayDisplay(event.detail.displayValue);

      // Update step info if provided
      if (event.detail.currentStep !== undefined && event.detail.totalSteps !== undefined) {
        setAutoReplayStepInfo({
          currentStep: event.detail.currentStep,
          totalSteps: event.detail.totalSteps
        });
      }

      // Update completed status if provided
      if (event.detail.completed !== undefined) {
        setAutoReplayCompleted(event.detail.completed);
      }
    };

    window.addEventListener('creditDataChanged', handleCreditDataChanged as EventListener);
    window.addEventListener('showDuplicateCard', handleShowDuplicateCard as EventListener);
    window.addEventListener('autoReplayStep', handleAutoReplayStep as EventListener);

    return () => {
      window.removeEventListener('creditDataChanged', handleCreditDataChanged as EventListener);
      window.removeEventListener('showDuplicateCard', handleShowDuplicateCard as EventListener);
      window.removeEventListener('autoReplayStep', handleAutoReplayStep as EventListener);
    };
  }, []);

  // Get filtered clients for tabs based on selected filter
  const getFilteredClientsForTabs = React.useCallback(() => {
    // Always search all clients, not just filtered ones
    let baseClients = searchClients(''); // Don't apply search to scrolling tabs
    
    switch (clientFilter) {
      case 'returnables':
        return baseClients.filter(client => {
          const clientTransactions = getClientTransactions(client.id);
          
          // Early exit if no transactions
          if (clientTransactions.length === 0) return false;
          
          // Check for returnable items more efficiently
          for (const transaction of clientTransactions) {
            // Only process debt transactions (not payments) AND exclude return transactions
            if (transaction.type === 'payment' || transaction.description.toLowerCase().includes('returned')) {
              continue;
            }
            
            const description = transaction.description.toLowerCase();
            
            // Early exit if no returnable items
            if (!description.includes('chopine') && !description.includes('bouteille')) {
              continue;
            }
            
            // If we find at least one returnable item, check if it has unreturned quantities
            return hasUnreturnedItems(clientTransactions, client.name);
          }
          
          return false;
        });
      
      
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
          
          // Early exit if client has debt
          if (totalDebt > 0) return true;
          
          // Check if client has returnable items
          const clientTransactions = getClientTransactions(client.id);
          
          // Early exit if no transactions
          if (clientTransactions.length === 0) return false;
          
          // Check for returnable items more efficiently
          for (const transaction of clientTransactions) {
            // Only process debt transactions (not payments) AND exclude return transactions
            if (transaction.type === 'payment' || transaction.description.toLowerCase().includes('returned')) {
              continue;
            }
            
            const description = transaction.description.toLowerCase();
            
            // Early exit if no returnable items
            if (!description.includes('chopine') && !description.includes('bouteille')) {
              continue;
            }
            
            // If we find at least one returnable item, check if it has unreturned quantities
            if (hasUnreturnedItems(clientTransactions, client.name)) {
              return true;
            }
          }
          
          // Exclude clients with zero debt and no returnable items
          return false;
        });
    }
  }, [clientFilter, getClientTransactions, getClientTotalDebt, searchClients]);

  // Helper function to check for unreturned items
  const hasUnreturnedItems = React.useCallback((clientTransactions: any[], clientName?: string) => {
    // Use the shared utility function to calculate returnable items
    const returnableItemsStrings = calculateReturnableItems(clientTransactions, clientName);
      
    // If there are any returnable items left after accounting for returns, return true
    return returnableItemsStrings.length > 0;
  }, []);

  const tabClients = React.useMemo(() => getFilteredClientsForTabs(), [getFilteredClientsForTabs]);

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
            
            // Capitalize brand name properly (keep words starting with digits unchanged)
            const capitalizedBrand = brand ? brand.split(' ').map(word =>
              /^\d/.test(word) ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
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
            
            // Capitalize brand name properly (keep words starting with digits unchanged)
            const capitalizedBrand = brand ? brand.split(' ').map((word: string) =>
              /^\d/.test(word) ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
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
            // Look for size in chopine items too, similar to bouteille
            const sizeMatch = description.match(/(\d+(?:\.\d+)?L)/i);
            const brandMatch = description.match(/chopines?\s+([^,]*)/i);
            const brand = brandMatch?.[1]?.trim() || '';
            
            // Capitalize brand name properly (keep words starting with digits unchanged)
            const capitalizedBrand = brand ? brand.split(' ').map((word: string) =>
              /^\d/.test(word) ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(' ') : '';
            
            let key;
            if (sizeMatch && brand) {
              key = `${sizeMatch[1].replace(/l$/i, 'L')} ${capitalizedBrand}`;
            } else if (brand) {
              key = `Chopine ${capitalizedBrand}`;
            } else if (sizeMatch) {
              key = `${sizeMatch[1].replace(/l$/i, 'L')} Chopine`;
            } else {
              key = 'Chopine';
            }
            
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
  const sortedClients = [...filteredClients].sort(() => {
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
    // Special case for check navigation updates
    if (value === 'CHECK_UPDATE') {
      // Don't process this as a normal calculator input, just update the display
      return;
    }
    
    // If AC is pressed during auto replay, reset everything immediately
    if (value === 'AC') {
      // Interrupt auto replay if it's active
      if (autoReplayActive || autoReplayDisplay) {
        window.dispatchEvent(new CustomEvent('interruptAutoReplay'));
      }
      
      // Reset auto replay state
      setAutoReplayDisplay('');
      setAutoReplayStepInfo(null);
      setAutoReplayCompleted(false);
      
      // Reset calculator using independent reset
      handleIndependentResetCalculator();
      setIsCalculatorActive(false);
      setLinkedClient(null);
      return;
    }
    
    // If any other input is pressed after auto replay completed, reset auto replay state
    if (autoReplayCompleted && value !== 'AC') {
      setAutoReplayDisplay('');
      setAutoReplayStepInfo(null);
      setAutoReplayCompleted(false);
    }
    
    // Use the independent calculator hook's input handler
    handleIndependentCalculatorInput(value);
    
    // Update calculator active state
    setIsCalculatorActive(true);
    
    // Don't dispatch creditDataChanged for calculator interactions
    // Only dispatch for actual data changes (transactions, settlements)
  };

  const handleQuickAdd = (client: Client) => {
    setLinkedClient(client);
    // Reset calculator when linking to client using independent reset
    handleIndependentResetCalculator();
    setIsCalculatorActive(false);
    // Close the client search modal to remove the keypad
    setShowClientSearch(false);
    // Remove focus from any input fields to dismiss keyboard
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    // Scroll to top to ensure calculator is visible
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCalculatorCancel = () => {
    setLinkedClient(null);
    // Reset calculator using independent reset
    handleIndependentResetCalculator();
    setIsCalculatorActive(false);
  };

  const handleResetCalculator = () => {
    // Reset calculator using independent reset
    handleIndependentResetCalculator();
    setIsCalculatorActive(false);
    setLinkedClient(null);
    setShowClientSearch(false);
  };

  const handleCloseClientSearchModal = () => {
    // Only close modal, preserve calculator state
    setShowClientSearch(false);
  };
  
  const handleResetCalculatorFromModal = () => {
    handleResetCalculator();
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

  // Add function to update description state
  const handleClientSearchDescriptionChange = (description: string) => {
    setClientSearchDescription(description);
  };

  // Add function to reset description when needed
  const resetClientSearchDescription = () => {
    setClientSearchDescription('');
  };

  // Modify the handleAddToClient function to reset the description after successful transaction
  const handleAddToClient = async (client: Client, description: string) => {
    try {
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

      // Note: creditDataChanged event is automatically dispatched by CreditContext.addTransaction()
      // with source 'addTransaction', so we don't need to dispatch it again here

      // Force a re-render of the scrolling tabs to update text and reset timeline
      setTimeout(() => {
        setShowCenteredWobble(false);
      }, 3000);
      
     // Auto-close duplicate card after 3 seconds
     setTimeout(() => {
       setDuplicateCard(null);
     }, 3000);
     
      // DON'T reset calculator state - preserve for potential additional transactions
      // Only close the modal
      setShowClientSearch(false);
      setLinkedClient(null);
      
      // Show wobble effect for the client that received the transaction
      setRecentTransactionClient(client);
      
      // Check if the description contains returnable items to ensure arrows are shown
      const hasReturnables = description.toLowerCase().includes('chopine') || description.toLowerCase().includes('bouteille');
      
      setDuplicateCard({ 
        ...client, 
        transactionAmount: amount, 
        transactionDescription: description
      } as DuplicateCard);
      setTimeout(() => {
        setRecentTransactionClient(null);
      }, 3000); // Increased to 3 seconds for better visibility
      setTimeout(() => {
        setCenteredWobbleClient(null);
      }, 8000);
      
      // Reset the description state after successful transaction
      resetClientSearchDescription();
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
      
      // Don't reset calculator - preserve state for potential additional transactions
      // User can manually reset if needed
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
  const formatCalculatorValue = (value: string) => {
    // Split the value into numbers and operators
    // Handle both display symbols (×, ÷) and input symbols (*, /)
    const parts = value.split(/([+\-×÷*/])/);
    
    return parts.map((part, index) => {
      // Check if the part is an operator (handle both display and input symbols)
      if (part === '+' || part === '-' || part === '×' || part === '÷' || part === '*' || part === '/') {
        return (
          <span 
            key={index} 
            className="calculator-operator"
          >
            {/* Display the proper symbol regardless of what was input */}
            {part === '*' ? '×' : part === '/' ? '÷' : part}
          </span>
        );
      }
      // Return regular text for numbers and other characters
      return part;
    });
  };

  // Database operations

  return (
    <div className="credit-management-container flex flex-col lg:flex-row h-full bg-gray-50 select-none overflow-hidden">
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
          <div className="scrolling-tabs-container w-full">
            <ScrollingTabs
              clients={tabClients}
              linkedClient={linkedClient}
              onQuickAdd={handleQuickAdd}
              clientFilter={clientFilter}
              getClientTotalDebt={getClientTotalDebt}
              onResetCalculator={handleResetCalculator}
              sortOption={sortOption}
            />
          </div>
          
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
        <div className="calculator-container w-full lg:w-[32rem] calculator-container-landscape bg-white rounded-lg shadow-lg p-4 lg:p-6 order-1 lg:order-2 flex flex-col h-full">
          {/* Calculator Header - Clickable */}
          <div className="grid grid-cols-3 items-center gap-2 mb-4">
            <div className="justify-self-start">
              <button
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  createMiniCalculator();
                }}
                title="Click to create floating mini calculator"
              >
                <div className="bg-blue-100 p-2 rounded-full">
                  <Calculator size={24} className="text-blue-600" />
                </div>
                <h3 className="text-lg lg:text-xl font-semibold text-gray-800">
                  Calculator +
                </h3>
              </button>
            </div>
            <div className="justify-self-center">
              <img
                src="./golden-logo.gif"
                alt="Golden Logo"
                className="w-72 h-36 object-contain"
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  filter: 'none',
                  boxShadow: 'none',
                  imageRendering: 'crisp-edges'
                }}
              />
            </div>
            <div className="justify-self-end">
              {linkedClient ? (
                <div className="flex items-center gap-2">
                  <p className="text-xs lg:text-sm text-green-600 font-medium whitespace-nowrap">
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
                </div>
              ) : null}
            </div>
          </div>

          {/* Calculator Display */}
          <div className="mb-4">
            <div className="bg-black rounded-lg p-4 mb-2 calculator-display">
              {/* Main Display with inline counter */}
              <div className="text-2xl sm:text-3xl font-mono text-green-400 min-h-[3rem] flex items-center overflow-hidden bg-black rounded px-3 py-2 relative calculator-display">
                {/* Memory Indicator - Top Left */}
                {calculatorMemory !== 0 && (
                  <div className="absolute top-0 left-0 text-xs text-blue-400 font-semibold">
                    {isMarkupMode ? 'MU' : 'M'}
                  </div>
                )}
                {/* Article Count Circle - Left side */}
                {(autoReplayActive && autoReplayStepInfo) || (autoReplayDisplay && autoReplayDisplay.startsWith('=')) || autoReplayStepInfo ? (
                  <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0 mr-2">
                    {/* Display "R" for result, otherwise show step counter */}
                    {autoReplayDisplay && autoReplayDisplay.startsWith('=') ? 'R' : `${autoReplayStepInfo!.currentStep}/${autoReplayStepInfo!.totalSteps}`}
                  </div>
                ) : articleCount > 0 ? (
                  <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0 mr-2">
                    {articleCount}
                  </div>
                ) : null}
                {/* Calculator Value - Right side */}
                <div className="truncate text-right flex-1 flex items-center justify-end" title={autoReplayActive && autoReplayDisplay ? autoReplayDisplay : calculatorValue}>
                  {formatCalculatorValue((autoReplayActive || (autoReplayDisplay && autoReplayDisplay.startsWith('='))) && autoReplayDisplay ? autoReplayDisplay : calculatorValue)}
                </div>
              </div>
              
              {/* Secondary Display */}
              <div className="text-xs text-gray-400 font-mono mt-1 text-center calculator-secondary-display">
                {autoReplayActive || (autoReplayDisplay && autoReplayDisplay.startsWith('=')) || autoReplayStepInfo ? (() => {
                  // If we have auto replay step info, use it
                  if (autoReplayStepInfo) {
                    // Check if we're showing the final result (display starts with "=")
                    if (autoReplayDisplay && autoReplayDisplay.startsWith('=')) {
                      return `RESULT`;
                    }
                    return `STEP ${autoReplayStepInfo.currentStep}/${autoReplayStepInfo.totalSteps}`;
                  }
                  
                  // If we don't have step info but have a display starting with "=", show RESULT
                  if (autoReplayDisplay && autoReplayDisplay.startsWith('=')) {
                    return `RESULT`;
                  }
                  
                  // Fallback to localStorage method
                  const currentStepIndex = parseInt(localStorage.getItem('currentCheckIndex') || '0');
                  const hasResult = calculationSteps.length > 0 && calculationSteps.some(step => step.isComplete);
                  
                  // Check if we're showing the final result (display starts with "=")
                  if (calculatorValue.startsWith('=')) {
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
          <div className="grid grid-cols-6 gap-1 sm:gap-2 mb-6 p-2 sm:p-4 bg-gray-200 rounded-lg border-2 border-gray-400 shadow-inner calculator-buttons-grid flex-grow">
            {/* Row 0 - Top row: CHECK←, CHECK→ */}
            <div className="col-span-6 grid grid-cols-2 gap-1 sm:gap-2 mb-1 sm:mb-2">
              {/* Empty space where link button was */}
              <div></div>
              <div></div>
            </div>

            {/* Row 1: MU, MRC, M-, M+, →, AUTO */}
            <button
              onClick={() => handleCalculatorInput('MU')}
              className="bg-blue-400 hover:bg-blue-500 text-white p-2 sm:p-3 rounded-lg font-bold text-xs sm:text-sm shadow-md border border-blue-500 flex items-center justify-center calculator-button"
            >
              MU
            </button>
            <button
              onClick={() => handleCalculatorInput('MRC')}
              className="bg-blue-400 hover:bg-blue-500 text-white p-2 sm:p-3 rounded-lg font-bold text-xs sm:text-sm shadow-md border border-blue-500 flex items-center justify-center calculator-button"
            >
              MRC
            </button>
            <button
              onClick={() => handleCalculatorInput('M-')}
              className="bg-blue-400 hover:bg-blue-500 text-white p-2 sm:p-3 rounded-lg font-bold text-xs sm:text-sm shadow-md border border-blue-500 flex items-center justify-center calculator-button"
            >
              M-
            </button>
            <button
              onClick={() => handleCalculatorInput('M+')}
              className="bg-blue-400 hover:bg-blue-500 text-white p-2 sm:p-3 rounded-lg font-bold text-xs sm:text-sm shadow-md border border-blue-500 flex items-center justify-center calculator-button"
            >
              M+
            </button>
            <button
              onClick={() => handleCalculatorInput('AUTO')}
              className="bg-gray-400 hover:bg-gray-500 text-white p-2 sm:p-3 rounded-lg font-bold text-xs sm:text-sm shadow-md border border-gray-500 flex items-center justify-center calculator-button"
            >
              AUTO
            </button>
            <button
              onClick={() => handleCalculatorInput('→')}
             className="bg-red-500 hover:bg-red-600 text-white p-2 sm:p-3 rounded-lg font-bold text-xs sm:text-sm shadow-md border border-red-600 flex items-center justify-center calculator-button"
            >
              ⌫
            </button>

            {/* Row 2: %, 7, 8, 9, (, ) */}
            <button
              onClick={() => handleCalculatorInput('%')}
              className="bg-blue-400 hover:bg-blue-500 text-white p-2 sm:p-3 rounded-lg font-bold text-xs sm:text-sm shadow-md border border-blue-500 flex items-center justify-center calculator-button"
            >
              %
            </button>
            <button
              onClick={() => handleCalculatorInput('7')}
              className="bg-gray-800 hover:bg-gray-900 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-gray-600 flex items-center justify-center calculator-button calculator-button-lg"
            >
              7
            </button>
            <button
              onClick={() => handleCalculatorInput('8')}
              className="bg-gray-800 hover:bg-gray-900 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-gray-600 flex items-center justify-center calculator-button calculator-button-lg"
            >
              8
            </button>
            <button
              onClick={() => handleCalculatorInput('9')}
              className="bg-gray-800 hover:bg-gray-900 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-gray-600 flex items-center justify-center calculator-button calculator-button-lg"
            >
              9
            </button>
            <button
              onClick={() => handleCalculatorInput('CHECK←')}
              disabled={calculationSteps.length === 0}
              className="bg-purple-400 hover:bg-purple-500 disabled:bg-gray-300 disabled:text-gray-500 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-purple-500 flex items-center justify-center check-arrow-button calculator-button calculator-button-lg"
            >
              <div className="flex items-center">
                <ArrowLeft size={16} />
                <span className="ml-1 text-sm">CHK</span>
              </div>
            </button>
            <button
              onClick={() => handleCalculatorInput('CHECK→')}
              disabled={calculationSteps.length === 0}
              className="bg-purple-400 hover:bg-purple-500 disabled:bg-gray-300 disabled:text-gray-500 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-purple-500 flex items-center justify-center check-arrow-button calculator-button calculator-button-lg"
            >
              <div className="flex items-center">
                <span className="mr-1 text-sm">CHK</span>
                <ArrowRight size={16} />
              </div>
            </button>

            {/* Row 3: √, 4, 5, 6, ×, ÷ */}
            <button
              onClick={() => handleCalculatorInput('√')}
              className="bg-blue-400 hover:bg-blue-500 text-white p-2 sm:p-3 rounded-lg font-bold text-sm sm:text-lg shadow-md border border-blue-500 flex items-center justify-center calculator-button calculator-button-lg"
            >
              √
            </button>
            <button
              onClick={() => handleCalculatorInput('4')}
              className="bg-gray-800 hover:bg-gray-900 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-gray-600 flex items-center justify-center calculator-button calculator-button-lg"
            >
              4
            </button>
            <button
              onClick={() => handleCalculatorInput('5')}
              className="bg-gray-800 hover:bg-gray-900 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-gray-600 flex items-center justify-center calculator-button calculator-button-lg"
            >
              5
            </button>
            <button
              onClick={() => handleCalculatorInput('6')}
              className="bg-gray-800 hover:bg-gray-900 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-gray-600 flex items-center justify-center calculator-button calculator-button-lg"
            >
              6
            </button>
            <button
              onClick={() => handleCalculatorInput('*')}
              className={`p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border flex items-center justify-center calculator-button calculator-button-xl ${
                lastPressedButton === '*' 
                  ? 'bg-blue-700 text-white border-blue-800' 
                  : 'bg-blue-400 hover:bg-blue-500 text-white border-blue-500'
              }`}
            >
              ×
            </button>
            <button
              onClick={() => handleCalculatorInput('÷')}
              className={`p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border flex items-center justify-center calculator-button calculator-button-xl ${
                lastPressedButton === '/' 
                  ? 'bg-blue-700 text-white border-blue-800' 
                  : 'bg-blue-400 hover:bg-blue-500 text-white border-blue-500'
              }`}
            >
              ÷
            </button>

            {/* Row 4: CE, 1, 2, 3, -, +/- */}
            <button
              onClick={() => handleCalculatorInput('CE')}
              className={`p-2 sm:p-3 rounded-lg font-bold text-xs sm:text-sm shadow-md border flex items-center justify-center calculator-button ${
                lastPressedButton === 'CE' 
                  ? 'bg-yellow-700 text-white border-yellow-800' 
                  : 'bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-600'
              }`}
            >
              CE
            </button>
            <button
              onClick={() => handleCalculatorInput('1')}
              className="bg-gray-800 hover:bg-gray-900 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-gray-600 flex items-center justify-center calculator-button calculator-button-lg"
            >
              1
            </button>
            <button
              onClick={() => handleCalculatorInput('2')}
              className="bg-gray-800 hover:bg-gray-900 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-gray-600 flex items-center justify-center calculator-button calculator-button-lg"
            >
              2
            </button>
            <button
              onClick={() => handleCalculatorInput('3')}
              className="bg-gray-800 hover:bg-gray-900 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-gray-600 flex items-center justify-center calculator-button calculator-button-lg"
            >
              3
            </button>
            <button
              onClick={() => handleCalculatorInput('-')}
              className={`p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border flex items-center justify-center calculator-button calculator-button-xl ${
                lastPressedButton === '-' 
                  ? 'bg-blue-700 text-white border-blue-800' 
                  : 'bg-blue-400 hover:bg-blue-500 text-white border-blue-500'
              }`}
            >
              −
            </button>
            <button
              onClick={() => handleCalculatorInput('+/-')}
              className="bg-blue-400 hover:bg-blue-500 text-white p-2 sm:p-3 rounded-lg font-bold text-sm sm:text-lg shadow-md border border-blue-500 flex items-center justify-center calculator-button calculator-button-lg"
            >
              +/−
            </button>

            {/* Row 5: AC, 0, 00, •, +, = */}
            <button
              onClick={() => handleCalculatorInput('AC')}
              className={`p-2 sm:p-3 rounded-lg font-bold text-xs sm:text-sm shadow-md border flex items-center justify-center calculator-button ${
                lastPressedButton === 'AC' 
                  ? 'bg-red-700 text-white border-red-800' 
                  : 'bg-red-500 hover:bg-red-600 text-white border-red-600'
              }`}
            >
              AC
            </button>
            <button
              onClick={() => handleCalculatorInput('0')}
              className="bg-gray-800 hover:bg-gray-900 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-gray-600 flex items-center justify-center calculator-button calculator-button-lg"
            >
              0
            </button>
            <button
              onClick={() => handleCalculatorInput('00')}
              className="bg-gray-800 hover:bg-gray-900 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-gray-600 flex items-center justify-center calculator-button calculator-button-lg"
            >
              00
            </button>
            <button
              onClick={() => handleCalculatorInput('.')}
              className="bg-gray-800 hover:bg-gray-900 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-gray-600 flex items-center justify-center calculator-button calculator-button-lg"
            >
              •
            </button>
            <button
              onClick={() => handleCalculatorInput('+')}
              className={`p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border flex items-center justify-center calculator-button calculator-button-xl ${
                lastPressedButton === '+' 
                  ? 'bg-blue-700 text-white border-blue-800' 
                  : 'bg-blue-400 hover:bg-blue-500 text-white border-blue-500'
              }`}
              style={{ gridRow: 'span 1' }}
            >
              +
            </button>
            <button
              onClick={() => handleCalculatorInput('=')}
              className={`p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border flex items-center justify-center calculator-button calculator-button-xl ${
                lastPressedButton === '=' 
                  ? 'bg-green-700 text-white border-green-800' 
                  : 'bg-green-500 hover:bg-green-600 text-white border-green-600'
              }`}
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
          onClose={handleCloseClientSearchModal}
          onResetCalculator={handleResetCalculatorFromModal}
          onAddToClient={handleAddToClient}
          linkedClient={linkedClient}
          description={clientSearchDescription}
          onDescriptionChange={handleClientSearchDescriptionChange}
        />
      )}

      {/* Unified Data Manager Modal */}
      {showUnifiedDataManager && (
        <UnifiedDataManager
          isOpen={showUnifiedDataManager}
          onClose={() => setShowUnifiedDataManager(false)}
        />
      )}

      {/* Duplicate Card Overlay */}
      {duplicateCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 select-none">
          <div className="relative pointer-events-none">
            {/* Pulsating Success Card */}
            <div className="animate-pulsate bg-white rounded-lg shadow-2xl p-6 border-4 border-green-500 max-w-sm mx-4">
              {/* Success Icon */}
              <div className="flex items-center justify-center mb-4">
                <div className="bg-green-100 p-3 rounded-full">
                  <CheckCircle size={40} className="text-green-600" />
                </div>
              </div>
              
              {/* Client Info */}
              <div className="text-center mb-4 select-none">
                <h3 className="text-xl font-bold text-gray-800 mb-1">{duplicateCard.name}</h3>
                <p className="text-sm text-gray-600">ID: {duplicateCard.id}</p>
              </div>
              
              {/* Articles taken - larger font */}
              {duplicateCard.transactionDescription && (
                <div className="mb-3 text-center select-none">
                  <p className="text-lg font-semibold text-gray-800 leading-relaxed select-none">
                    {duplicateCard.transactionDescription}
                  </p>
                </div>
              )}
              
              {/* Amount and Arrows Section */}
              {(() => {
                const hasAmount = duplicateCard.transactionAmount !== undefined && duplicateCard.transactionAmount > 0;
                const totalDebt = getClientTotalDebt(duplicateCard.id);
                const hasDebt = totalDebt > 0;
                
                // Get returnable items for this client using the shared utility function
                const clientTransactions = getClientTransactions(duplicateCard.id);
                const returnableItems = calculateReturnableItems(clientTransactions, duplicateCard.name);
                const hasReturnables = returnableItems.length > 0;
                
               // Check if the transaction description contains returnable items AND there are still items to return
               const transactionHasReturnables = duplicateCard.transactionDescription && (
                 (duplicateCard.transactionDescription.toLowerCase().includes('chopine') ||
                 duplicateCard.transactionDescription.toLowerCase().includes('bouteille')) && 
                 hasReturnables
               );
               
                return (
                  <div className="relative mb-3">
                    {/* Amount Section - show if amount > 0 OR if client has debt */}
                    {(hasAmount || hasDebt) && (
                      <div className="mb-3">
                        {hasAmount && (
                          <p className="text-2xl font-bold text-green-600 mb-1 text-center">
                            Rs {duplicateCard.transactionAmount!.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        )}
                        
                        {/* Arrow pointing to debt total - only show if debt > 0 */}
                        {hasDebt && (
                          <div className="flex items-center justify-center gap-2 mt-2">
                            <div className="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm font-medium">
                              Total Amount: Rs {totalDebt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="animate-bounce-horizontal text-green-600">
                              <ArrowLeft size={24} />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Returnables Section - show if client has returnables or current transaction has returnables */}
                    {(hasReturnables || transactionHasReturnables) && (
                      <div className="mb-3">
                       {/* Arrow pointing to returnables - show if we have amount OR debt OR just added returnables */}
                       {(hasAmount || hasDebt || transactionHasReturnables) && (
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <div className="bg-orange-500 text-white px-3 py-1 rounded-lg text-sm font-medium max-w-xs">
                              {duplicateCard.message?.toLowerCase().includes('returned') ? 'Still to return:' : 'Returnables:'} {returnableItems.join(', ')}
                            </div>
                            <div className="animate-bounce-horizontal text-orange-600">
                              <ArrowLeft size={24} />
                            </div>
                          </div>
                        )}
                        
                       {/* Show returnables without arrow if no amount AND no debt AND not adding returnables */}
                       {!hasAmount && !hasDebt && !transactionHasReturnables && (
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
