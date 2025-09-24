import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Calculator, Plus, Minus, X, Settings, Trash2, AlertTriangle, Users, UserCheck, Database, Download, Upload } from 'lucide-react';
import { useCredit } from '../context/CreditContext';
import ClientCard from './ClientCard';
import ClientDetailModal from './ClientDetailModal';
import ClientSearchModal from './ClientSearchModal';
import { Client } from '../types';
import UnifiedDataManager from './UnifiedDataManager';

/**
 * CREDIT MANAGEMENT MAIN COMPONENT
 * ================================
 */
const CreditManagement: React.FC = () => {
  const { clients, searchClients, addTransaction, getClientTotalDebt, deleteClient, getClientTransactions } = useCredit();
  
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
  const [showDatabaseMenu, setShowDatabaseMenu] = useState(false);
  const [showUnifiedDataManager, setShowUnifiedDataManager] = useState(false);

  // Database export functionality for ALL modules
  const handleExportDatabase = async () => {
    try {
      const now = new Date();
      const day = now.getDate().toString().padStart(2, '0');
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const year = now.getFullYear();
      const dateString = `${day}-${month}-${year}`;
      
      // Get data from all modules via localStorage
      const priceListData = localStorage.getItem('priceListItems');
      const creditClientsData = localStorage.getItem('creditClients');
      const creditTransactionsData = localStorage.getItem('creditTransactions');
      const creditPaymentsData = localStorage.getItem('creditPayments');
      const overItemsData = localStorage.getItem('overItems');
      const orderCategoriesData = localStorage.getItem('orderCategories');
      const orderTemplatesData = localStorage.getItem('orderItemTemplates');
      const ordersData = localStorage.getItem('orders');
      
      const exportData = {
        version: '2.0',
        appName: 'Golden Store',
        exportDate: new Date().toISOString(),
        
        // Price List data
        priceList: {
          items: priceListData ? JSON.parse(priceListData) : []
        },
        
        // Credit Management data
        creditManagement: {
          clients: creditClientsData ? JSON.parse(creditClientsData) : [],
          transactions: creditTransactionsData ? JSON.parse(creditTransactionsData) : [],
          payments: creditPaymentsData ? JSON.parse(creditPaymentsData) : []
        },
        
        // Over Management data
        overManagement: {
          items: overItemsData ? JSON.parse(overItemsData) : []
        },
        
        // Order Management data
        orderManagement: {
          categories: orderCategoriesData ? JSON.parse(orderCategoriesData) : [],
          itemTemplates: orderTemplatesData ? JSON.parse(orderTemplatesData) : [],
          orders: ordersData ? JSON.parse(ordersData) : []
        }
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `GoldenStore_Complete_${dateString}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      setShowDatabaseMenu(false);
      alert('Complete database exported successfully!');
    } catch (error) {
      alert('Error exporting complete database. Please try again.');
    }
  };

  // Database import functionality for ALL modules
  const handleImportDatabase = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          
          // Validate file format
          if (!data.version || (!data.priceList && !data.creditManagement && !data.overManagement && !data.orderManagement)) {
            throw new Error('Invalid Golden Store database file format');
          }

          // Count total items for confirmation
          const totalItems = 
            (data.priceList?.items?.length || 0) +
            (data.creditManagement?.clients?.length || 0) +
            (data.creditManagement?.transactions?.length || 0) +
            (data.creditManagement?.payments?.length || 0) +
            (data.overManagement?.items?.length || 0) +
            (data.orderManagement?.categories?.length || 0) +
            (data.orderManagement?.itemTemplates?.length || 0) +
            (data.orderManagement?.orders?.length || 0);

          const confirmImport = window.confirm(
            `This will import a complete Golden Store database with ${totalItems} total records across all modules:\n\n` +
            `• Price List: ${data.priceList?.items?.length || 0} items\n` +
            `• Credit: ${data.creditManagement?.clients?.length || 0} clients, ${data.creditManagement?.transactions?.length || 0} transactions\n` +
            `• Over Items: ${data.overManagement?.items?.length || 0} items\n` +
            `• Orders: ${data.orderManagement?.categories?.length || 0} categories, ${data.orderManagement?.orders?.length || 0} orders\n\n` +
            `This will REPLACE ALL your current data. This action cannot be undone.\n\n` +
            `Are you sure you want to continue?`
          );

          if (confirmImport) {
            // Import all data to localStorage
            if (data.priceList?.items) {
              localStorage.setItem('priceListItems', JSON.stringify(data.priceList.items));
            }
            
            if (data.creditManagement?.clients) {
              localStorage.setItem('creditClients', JSON.stringify(data.creditManagement.clients));
            }
            if (data.creditManagement?.transactions) {
              localStorage.setItem('creditTransactions', JSON.stringify(data.creditManagement.transactions));
            }
            if (data.creditManagement?.payments) {
              localStorage.setItem('creditPayments', JSON.stringify(data.creditManagement.payments));
            }
            
            if (data.overManagement?.items) {
              localStorage.setItem('overItems', JSON.stringify(data.overManagement.items));
            }
            
            if (data.orderManagement?.categories) {
              localStorage.setItem('orderCategories', JSON.stringify(data.orderManagement.categories));
            }
            if (data.orderManagement?.itemTemplates) {
              localStorage.setItem('orderItemTemplates', JSON.stringify(data.orderManagement.itemTemplates));
            }
            if (data.orderManagement?.orders) {
              localStorage.setItem('orders', JSON.stringify(data.orderManagement.orders));
            }
            
            setShowDatabaseMenu(false);
            alert(`Successfully imported complete Golden Store database!\n\nPlease refresh the page to see all imported data.`);
            
            // Refresh the page to reload all data
            window.location.reload();
          }
        } catch (error) {
          alert('Error importing database file. Please check the file format and try again.');
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
    setShowDatabaseMenu(false);
  };

  // Filter clients based on search
  const filteredClients = showAllClients 
    ? searchClients(searchQuery) // Show all clients when toggled
    : searchClients(searchQuery).filter(client => {
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
    if (value === 'C') {
      setCalculatorValue('0');
      setIsCalculatorActive(false);
    } else if (value === '=') {
      try {
        // Replace display symbols with JavaScript operators for evaluation
        const expression = calculatorValue.replace(/×/g, '*').replace(/÷/g, '/');
        
        // Remove trailing operators before evaluation
        const cleanExpression = expression.replace(/[+\-*/÷×]+$/, '');
        
        // If expression is empty after cleaning, keep current value
        if (!cleanExpression || cleanExpression === '') {
          return;
        }
        
        const result = eval(cleanExpression);
        
        // Check for invalid results
        if (!isFinite(result)) {
          setCalculatorValue('Error');
          return;
        }
        
        setCalculatorValue(result.toString());
      } catch {
        setCalculatorValue('Error');
      }
    } else if (value === 'CE') {
      // Clear Entry - removes the last operand only
      const operators = ['+', '-', '*', '/'];
      let lastOperatorIndex = -1;
      
      // Find the last operator from the end
      for (let i = calculatorValue.length - 1; i >= 0; i--) {
        if (operators.includes(calculatorValue[i])) {
          lastOperatorIndex = i;
          break;
        }
      }
      
      if (lastOperatorIndex >= 0) {
        // Keep everything up to but NOT including the last operator
        setCalculatorValue(calculatorValue.substring(0, lastOperatorIndex));
      } else {
        // No operator found, clear everything to 0
        setCalculatorValue('0');
        setIsCalculatorActive(false);
      }
    } else if (value === '⌫') {
      if (calculatorValue.length > 1) {
        setCalculatorValue(calculatorValue.slice(0, -1));
      } else {
        setCalculatorValue('0');
      }
    } else if (value === 'M+') {
      try {
        // Replace display symbols with JavaScript operators for evaluation
        const expression = calculatorValue.replace(/×/g, '*').replace(/÷/g, '/');
        
        // Remove trailing operators before evaluation
        const cleanExpression = expression.replace(/[+\-*/÷×]+$/, '');
        
        if (!cleanExpression || cleanExpression === '') {
          return;
        }
        
        const currentValue = eval(cleanExpression);
        
        if (!isFinite(currentValue)) {
          return;
        }
        
        setCalculatorMemory(prev => prev + currentValue);
      } catch {
        // Do nothing if calculation error
      }
    } else if (value === 'MR') {
      setCalculatorValue(calculatorMemory.toString());
      setIsCalculatorActive(true);
    } else if (value === 'MC') {
      setCalculatorMemory(0);
    } else if (value === '*') {
      // Display multiplication as ×
      if (calculatorValue === '0' || calculatorValue === 'Error' || calculatorValue === 'Infinity') {
        setCalculatorValue('0×');
      } else if (calculatorValue.match(/[+\-×÷]$/)) {
        // Replace last operator with ×
        setCalculatorValue(calculatorValue.slice(0, -1) + '×');
      } else {
        setCalculatorValue(calculatorValue + '×');
      }
      setIsCalculatorActive(true);
    } else if (value === '/') {
      // Display division as ÷
      if (calculatorValue === '0' || calculatorValue === 'Error' || calculatorValue === 'Infinity') {
        setCalculatorValue('0÷');
      } else if (calculatorValue.match(/[+\-×÷]$/)) {
        // Replace last operator with ÷
        setCalculatorValue(calculatorValue.slice(0, -1) + '÷');
      } else {
        setCalculatorValue(calculatorValue + '÷');
      }
      setIsCalculatorActive(true);
    } else if (value === '+') {
      if (calculatorValue === '0' || calculatorValue === 'Error' || calculatorValue === 'Infinity') {
        setCalculatorValue('0+');
      } else if (calculatorValue.match(/[+\-×÷]$/)) {
        // Replace last operator with +
        setCalculatorValue(calculatorValue.slice(0, -1) + '+');
      } else {
        setCalculatorValue(calculatorValue + '+');
      }
      setIsCalculatorActive(true);
    } else if (value === '-') {
      if (calculatorValue === '0' || calculatorValue === 'Error' || calculatorValue === 'Infinity') {
        setCalculatorValue('0-');
      } else if (calculatorValue.match(/[+\-×÷]$/)) {
        // Replace last operator with -
        setCalculatorValue(calculatorValue.slice(0, -1) + '-');
      } else {
        setCalculatorValue(calculatorValue + '-');
      }
      setIsCalculatorActive(true);
    } else {
      // Handle numbers and decimal point
      if ((calculatorValue === '0' || calculatorValue === 'Error' || calculatorValue === 'Infinity') && !isNaN(Number(value))) {
        // Clear error/infinity state when typing new number
        setCalculatorValue(value);
      } else {
        setCalculatorValue(calculatorValue + value);
      }
      setIsCalculatorActive(true);
    }
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
    console.log('🔄 CreditManagement: Resetting calculator');
    setCalculatorValue('0');
    setIsCalculatorActive(false);
    setLinkedClient(null);
    setShowClientSearch(false);
  };

  const handleResetCalculatorAndDescription = () => {
    console.log('🔄 CreditManagement: Resetting calculator and closing modal');
    setCalculatorValue('0');
    setIsCalculatorActive(false);
    setShowClientSearch(false);
  };

  const handleAddToClient = async (client: Client, description: string) => {
    try {
      console.log('Adding transaction:', { clientId: client.id, clientName: client.name, description, amount: calculatorValue });
      
      // Replace display symbols with JavaScript operators for evaluation
      let expression = calculatorValue.replace(/×/g, '*').replace(/÷/g, '/');
      
      // Remove trailing operators before evaluation
      expression = expression.replace(/[+\-*/÷×]+$/, '');
      
      // If expression is empty after cleaning, use 0
      if (!expression || expression === '') {
        expression = '0';
      }
      
      let amount;
      try {
        // Safely evaluate the mathematical expression
        amount = Function('"use strict"; return (' + expression + ')')();
        console.log('Calculated amount:', amount, 'from expression:', expression);
      } catch (evalError) {
        console.error('Expression evaluation failed:', evalError);
        throw new Error('Please enter a valid amount');
      }
      
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
      
      console.log('Transaction added successfully');
      
      // Reset calculator state
      setCalculatorValue('0');
      setIsCalculatorActive(false);
      setShowClientSearch(false);
      setLinkedClient(null);
    } catch (error) {
      console.error('Transaction error:', error);
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
    try {
      // Replace display symbols with JavaScript operators for evaluation
      let expression = calculatorValue.replace(/×/g, '*').replace(/÷/g, '/');
      
      // Remove trailing operators before evaluation
      expression = expression.replace(/[+\-*/÷×]+$/, '');
      
      // If expression is empty after cleaning, use 0
      if (!expression || expression === '') {
        return 0;
      }
      
      const amount = Function('"use strict"; return (' + expression + ')')();
      
      if (isNaN(amount) || !isFinite(amount)) {
        return 0;
      }
      
      return amount;
    } catch {
      return 0;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full bg-gray-50 select-none">
      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row flex-1 gap-4 lg:gap-6 p-4 lg:p-6 overflow-hidden">
        
        {/* Left Side - Client Cards Section - Centered */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 order-2 lg:order-1">
          
          {/* Header with Settings */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg lg:text-xl font-semibold text-gray-800">
              Active Clients{totalDebtAllClients > 0 ? ` (Rs ${totalDebtAllClients.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` : ''}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAllClients(!showAllClients)}
                className={`p-2 rounded-lg transition-colors ${
                  !showAllClients 
                    ? 'text-blue-600 bg-blue-100 hover:bg-blue-200' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
                title={!showAllClients ? 'Show Active Clients Only' : 'Show All Clients'}
              >
                {!showAllClients ? <UserCheck size={20} /> : <Users size={20} />}
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowDatabaseMenu(!showDatabaseMenu)}
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Database Import/Export"
                >
                  <Database size={20} />
                </button>
                
                {/* Database Menu Dropdown */}
                {showDatabaseMenu && (
                  <div 
                    className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="py-1">
                      <button
                        onClick={handleExportDatabase}
                        className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
                      >
                        <Download size={16} className="mr-3 text-green-600" />
                        Export Complete Database
                      </button>
                      <button
                        onClick={handleImportDatabase}
                        className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
                      >
                        <Upload size={16} className="mr-3 text-blue-600" />
                        Import Complete Database
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {/* Invisible overlay to close dropdown when clicking outside */}
              {showDatabaseMenu && (
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setShowDatabaseMenu(false)}
                />
              )}
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="Client Settings"
              >
                <Settings size={20} />
              </button>
            </div>
          </div>
          
          {/* Client Cards - Horizontal Scroll */}
          <div className="flex-1 mb-4 overflow-hidden w-full min-h-0">
            <div className="overflow-x-auto pb-4 h-full w-full min-h-[200px]">
              <div className="flex gap-3 min-w-max h-full items-center justify-center">
                {sortedClients.length === 0 ? (
                  <div className="flex items-center justify-center w-full h-32 text-gray-500">
                    <div className="text-center">
                      <p className="text-base sm:text-lg">
                        {showAllClients 
                          ? (searchQuery ? `No clients found matching "${searchQuery}"` : 'No clients found')
                          : 'No clients with outstanding debts'
                        }
                      </p>
                      <p className="text-xs sm:text-sm">Use the calculator to add transactions</p>
                    </div>
                  </div>
                ) : (
                  sortedClients.map((client) => (
                    <ClientCard
                      key={client.id}
                      client={client}
                      onLongPress={() => setSelectedClient(client)}
                      onQuickAdd={handleQuickAdd}
                      onResetCalculator={handleResetCalculator}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative w-full max-w-md mx-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={20} className="text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by client name or ID..."
              className="block w-full pl-10 pr-4 py-3 lg:py-4 text-lg lg:text-xl border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-3 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            />
          </div>

        </div>

        {/* Right Side - Calculator Section */}
        <div className="w-full lg:w-80 bg-white rounded-lg shadow-lg p-4 lg:p-6 order-1 lg:order-2 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Calculator size={24} className="text-blue-600" />
            <div className="flex-1">
              <h3 className="text-lg lg:text-xl font-semibold text-gray-800">Calculator</h3>
              {linkedClient && (
                <p className="text-xs lg:text-sm text-green-600 font-medium">
                  Adding to: {linkedClient.name}
                </p>
              )}
            </div>
            {linkedClient && (
              <button
                onClick={handleCalculatorCancel}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                title="Cancel link to client"
              >
                <X size={20} />
              </button>
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
            onClick={() => {
              // Always show client search modal (whether linked client or not)
              setShowClientSearch(true);
            }}
            disabled={calculatorValue === 'Error'}
            className={`w-full ${linkedClient ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600'} disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-4 rounded-lg font-semibold text-lg flex items-center justify-center gap-2`}
          >
            <Plus size={20} />
            {linkedClient ? `Add to ${linkedClient.name}` : 'Add to Client'}
          </button>
        </div>
      </div>

      {/* Modals */}
      {selectedClient && (
        <ClientDetailModal
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-hidden" style={{ height: '100vh' }}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Client Settings</h2>
              <button 
                onClick={() => setShowSettings(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 120px)' }}>
              <h3 className="text-lg font-medium text-gray-800 mb-4">Manage All Clients</h3>
              <p className="text-sm text-gray-600 mb-4">
                Here you can permanently delete clients (e.g., if they have passed away). 
                Their ID will become available for new clients.
              </p>

              {/* All Clients List */}
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                {clients.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No clients found</div>
                ) : (
                  clients
                    .sort((a, b) => a.id.localeCompare(b.id))
                    .map((client) => (
                      <div key={client.id} className="flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800">{client.name}</h4>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>ID: {client.id}</span>
                            <span className={getClientTotalDebt(client.id) > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                              Rs {getClientTotalDebt(client.id).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteClient(client)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title={`Delete ${client.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
        )
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && clientToDelete && (
        createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-hidden" style={{ height: '100vh' }}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-full">
                  <AlertTriangle size={20} className="text-red-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Delete Client</h2>
              </div>
              <button 
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setClientToDelete(null);
                  setDeleteConfirmText('');
                }}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 120px)' }}>
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-800 mb-2">
                  {clientToDelete.name} ({clientToDelete.id})
                </h3>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-red-800 font-medium mb-2">⚠️ This action cannot be undone!</p>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• Client will be permanently deleted</li>
                    <li>• All transaction history will be lost</li>
                    <li>• All payment records will be lost</li>
                    <li>• ID "{clientToDelete.id}" will be available for new clients</li>
                  </ul>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type "DELETE" to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setClientToDelete(null);
                    setDeleteConfirmText('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteClient}
                  disabled={deleteConfirmText !== 'DELETE'}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
        )
      )}

      {showClientSearch && (
        <ClientSearchModal
          key={`search-modal-${Date.now()}`}
          calculatorValue={calculatorValue}
          onClose={() => {
            setShowClientSearch(false);
            // Unlink client when closing modal
            setLinkedClient(null);
          }}
          onAddToClient={handleAddToClient}
          linkedClient={linkedClient}
          onResetCalculator={() => {
            setCalculatorValue('0');
            setIsCalculatorActive(false);
            setLinkedClient(null);
            setShowClientSearch(false);
          }}
        />
      )}

      {/* Unified Data Manager */}
      <UnifiedDataManager 
        isOpen={showUnifiedDataManager} 
        onClose={() => setShowUnifiedDataManager(false)} 
      />
    </div>
  );
};

/**
 * DRINK TYPES SETTINGS COMPONENT
 * ==============================
 */
const DrinkTypesSettings: React.FC = () => {
  const [drinkTypes, setDrinkTypes] = useState<string[]>(() => {
    const stored = localStorage.getItem('drinkTypes');
    return stored ? JSON.parse(stored) : ['Beer', 'Guinness', 'Malta', 'Coca'];
  });
  const [newDrinkType, setNewDrinkType] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const saveDrinkTypes = (types: string[]) => {
    localStorage.setItem('drinkTypes', JSON.stringify(types));
    setDrinkTypes(types);
  };

  const handleAddDrinkType = () => {
    if (!newDrinkType.trim()) {
      alert('Please enter a drink name');
      return;
    }

    const formatted = newDrinkType.trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    if (drinkTypes.includes(formatted)) {
      alert('This drink type already exists');
      return;
    }

    const updatedTypes = [...drinkTypes, formatted];
    saveDrinkTypes(updatedTypes);
    setNewDrinkType('');
    setIsAdding(false);
  };

  const handleDeleteDrinkType = (drinkType: string) => {
    const confirmed = window.confirm(`Are you sure you want to remove "${drinkType}"?`);
    if (confirmed) {
      const updatedTypes = drinkTypes.filter(type => type !== drinkType);
      saveDrinkTypes(updatedTypes);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-800 mb-4">Drink Types</h3>
      <p className="text-sm text-gray-600 mb-4">
        Customize the drink types that appear when adding bottles. These will be available in the quick selection.
      </p>

      {/* Add New Drink Type */}
      {!isAdding ? (
        <button
          onClick={() => setIsAdding(true)}
          className="mb-4 flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus size={16} />
          Add Drink Type
        </button>
      ) : (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={newDrinkType}
              onChange={(e) => setNewDrinkType(e.target.value)}
              placeholder="Enter drink name (e.g., Whiskey, Vodka)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddDrinkType();
                if (e.key === 'Escape') setIsAdding(false);
              }}
            />
            <button
              onClick={handleAddDrinkType}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewDrinkType('');
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Current Drink Types */}
      <div className="space-y-2">
        {drinkTypes.map((drinkType) => (
          <div key={drinkType} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
            <span className="font-medium text-gray-800">{drinkType}</span>
            <button
              onClick={() => handleDeleteDrinkType(drinkType)}
              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
              title={`Remove ${drinkType}`}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {drinkTypes.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No drink types configured. Add some to get started.
        </div>
      )}
    </div>
  );
};

export default CreditManagement;