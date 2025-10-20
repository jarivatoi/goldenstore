import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CreditCard, CheckCircle, DollarSign, RotateCcw, Minus, Plus, Calculator, User, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Client } from '../types';
import { useCredit } from '../context/CreditContext';
import SettleConfirmationModal from './SettleConfirmationModal';
import ClientDetailModal from './ClientDetailModal';
import { ScrollingText } from './ScrollingText';
import { useNotification } from '../context/NotificationContext';

interface ClientActionModalProps {
  client: Client;
  onClose: () => void;
  onQuickAdd?: (client: Client) => void;
  onResetCalculator?: () => void;
  onViewDetails?: (client: Client) => void;
}

/**
 * CLIENT ACTION MODAL COMPONENT
 * =============================
 * 
 * Shows partial payment and settle options when swiping up on client card
 */
const ClientActionModal: React.FC<ClientActionModalProps> = ({ client, onClose, onQuickAdd, onResetCalculator, onViewDetails }) => {
  const { addPartialPayment, settleClient, settleClientWithFullClear, getClientTotalDebt, returnBottles, getClientBottlesOwed, getClientTransactions, addTransaction } = useCredit();
  const { showAlert } = useNotification();
  const [showPartialPayment, setShowPartialPayment] = useState(false);
  const [showReturnTab, setShowReturnTab] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [returnItems, setReturnItems] = useState<{[key: string]: number}>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettleConfirm, setShowSettleConfirm] = useState(false);
  const [settleAction, setSettleAction] = useState<{
    type: 'all' | 'individual';
    itemType?: string;
    quantity?: number;
  } | null>(null);
  const [showAccountSettleConfirm, setShowAccountSettleConfirm] = useState(false);
  const [showSimpleSettleConfirm, setShowSimpleSettleConfirm] = useState(false); // New state for simple confirmation

  const totalDebt = getClientTotalDebt(client.id);
  const bottlesOwed = getClientBottlesOwed(client.id);
  const clientTransactions = getClientTransactions(client.id);

  const handlePartialPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0 || amount > totalDebt) {
      showAlert({ type: 'warning', message: 'Please enter a valid payment amount' });
      return;
    }

    try {
      setIsProcessing(true);
      await addPartialPayment(client.id, amount);
      
      // Get returnable items for this client to include in the transaction description
      const allReturnableItems = getReturnableItems();
      const availableItems: {[key: string]: {total: number, transactions: Array<{id: string, description: string, amount: number, quantity: number, date: Date}>}} = {};
      
      // Filter out items that have already been returned
      Object.entries(allReturnableItems).forEach(([itemType, data]) => {
        // Calculate net quantity (original - returned)
        const returnedQuantity = getReturnedQuantity(itemType, returnableItems);
        const availableQuantity = Math.max(0, data.total - returnedQuantity);
        
        if (availableQuantity > 0) {
          availableItems[itemType] = {
            ...data,
            total: availableQuantity
          };
        }
      });
      
      // Format returnable items for display
      const returnableItemsList = Object.entries(availableItems)
        .map(([itemType, data]) => `${data.total} ${itemType}${data.total > 1 ? 's' : ''}`)
        .join(', ');
      
      // Show duplicate card for successful partial payment
      console.log('📱 ClientActionModal: Dispatching showDuplicateCard event for partial payment');
      window.dispatchEvent(new CustomEvent('showDuplicateCard', {
        detail: { 
          ...client,
          isAccountClear: false,
          message: `Payment of Rs ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Recorded Successfully!`,
          transactionAmount: amount,
          transactionDescription: returnableItemsList ? 
            `Returnables: ${returnableItemsList}` : 
            ''
        }
      }));
      
      // Force timeline reset after payment
      console.log('📱 ClientActionModal: Dispatching creditDataChanged event with clientActionAdd source');
      window.dispatchEvent(new CustomEvent('creditDataChanged', { detail: { source: 'clientActionAdd' } }));
      
      // Reset calculator after successful payment
      if (onResetCalculator) {
        onResetCalculator();
      }
      onClose();
    } catch (error) {
      console.error('📱 ClientActionModal: Error processing partial payment:', error);
      showAlert({ type: 'error', message: 'Failed to Process Payment' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSettle = async (clearAllTransactions: boolean = false) => {
    try {
      setIsProcessing(true);
      
      if (clearAllTransactions) {
        // Clear all transactions including returnables
        await settleClientWithFullClear(client.id);
      } else {
        // Check if client has returnables
        const hasReturnables = Object.keys(availableItems).length > 0;
        
        if (hasReturnables) {
          // If client has returnables, use settleClient (preserves returnables in history)
          await settleClient(client.id);
        } else {
          // If client has no returnables, use settleClientWithFullClear (clears all transactions)
          await settleClientWithFullClear(client.id);
        }
      }
      
      // Force timeline reset after settling
      console.log('📱 ClientActionModal: Dispatching creditDataChanged event with clientActionSettle source');
      window.dispatchEvent(new CustomEvent('creditDataChanged', { detail: { source: 'clientActionSettle' } }));
      
      onClose();
      if (onResetCalculator) {
        onResetCalculator();
      }
    } catch (error) {
      console.error('📱 ClientActionModal: Error settling client:', error);
      // Error handling without alert - could add error state here
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSettleWithFullClear = async () => {
    try {
      setIsProcessing(true);
      await settleClientWithFullClear(client.id);
      
      // Force timeline reset after settling
      console.log('📱 ClientActionModal: Dispatching creditDataChanged event with clientActionSettle source (full clear)');
      window.dispatchEvent(new CustomEvent('creditDataChanged', { detail: { source: 'clientActionSettle' } }));
      
      onClose();
      if (onResetCalculator) {
        onResetCalculator();
      }
    } catch (error) {
      console.error('📱 ClientActionModal: Error settling client with full clear:', error);
      // Error handling without alert - could add error state here
    } finally {
      setIsProcessing(false);
    }
  };

  // Parse transactions to find returnable items (Chopine and Bouteille)
  const getReturnableItems = () => {
    const returnableItems: {[key: string]: {total: number, transactions: Array<{id: string, description: string, amount: number, quantity: number, date: Date}>}} = {};
    
    // Track processed transactions to prevent duplicates
    const processedTransactions = new Set<string>();
    
    clientTransactions.forEach(transaction => {
      // Skip if already processed
      if (processedTransactions.has(transaction.id)) {
        return;
      }
      
      // Only process debt transactions (not payments) AND exclude return transactions
      if (transaction.type === 'payment' || transaction.description.toLowerCase().includes('returned')) {
        return;
      }
      
      const description = transaction.description.toLowerCase();
      
      // Only process items that contain "chopine" or "bouteille"
      if (!description.includes('chopine') && !description.includes('bouteille')) {
        return;
      }
      
      // Track which patterns have matched to prevent duplicates
      let hasMatched = false;
      const transactionItemCounts: {[key: string]: number} = {}; // Track cumulative counts for this transaction

      // Look for Chopine items with improved parsing
      // Pattern: number + space + chopine (with optional brand after)
      const chopinePattern = /(\d+)\s+chopines?(?:\s+([^,]*))?/gi;
      let chopineMatch;

      while ((chopineMatch = chopinePattern.exec(description)) !== null) {
        const quantity = parseInt(chopineMatch[1]);
        const brand = chopineMatch[2]?.trim() || '';
        const key = brand ? `Chopine ${brand}` : 'Chopine';

        // Accumulate quantities for the same item type within this transaction
        if (!transactionItemCounts[key]) {
          transactionItemCounts[key] = 0;
        }
        transactionItemCounts[key] += quantity;
        hasMatched = true;
      }

      // Look for Bouteille items with improved parsing
      // Pattern: number + space + optional size + bouteille + optional brand
      const bouteillePattern = /(\d+)\s+(?:(\d+(?:\.\d+)?[Ll])\s+)?bouteilles?(?:\s+([^,\(\)]*))?/gi;
      let bouteilleMatch;

      while ((bouteilleMatch = bouteillePattern.exec(description)) !== null) {
        const quantity = parseInt(bouteilleMatch[1]);
        const size = bouteilleMatch[2]?.trim().toUpperCase() || '';
        const brand = bouteilleMatch[3]?.trim() || '';

        // Format the key based on what we found
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

        // Accumulate quantities for the same item type within this transaction
        if (!transactionItemCounts[key]) {
          transactionItemCounts[key] = 0;
        }
        transactionItemCounts[key] += quantity;
        hasMatched = true;
      }

      // Add all accumulated quantities to returnableItems (both chopine and bouteille)
      Object.entries(transactionItemCounts).forEach(([key, totalQuantity]) => {
        if (!returnableItems[key]) {
          returnableItems[key] = { total: 0, transactions: [] };
        }
        returnableItems[key].total += totalQuantity;
        returnableItems[key].transactions.push({
          ...transaction,
          quantity: totalQuantity
        });
      });
      
      // Handle items without explicit numbers (assume quantity 1) - only if no pattern matched
      if (!hasMatched && description.includes('bouteille')) {
        const sizeMatch = description.match(/(\d+(?:\.\d+)?[Ll])/i);
        const brandMatch = description.match(/bouteilles?\s+([^,]*)/i);
        const brand = brandMatch?.[1]?.trim() || '';

        let key;
        if (sizeMatch && brand) {
          key = `${sizeMatch[1].replace(/l$/i, 'L').toUpperCase()} ${brand}`;
        } else if (brand) {
          key = `Bouteille ${brand}`;
        } else if (sizeMatch) {
          key = `${sizeMatch[1].replace(/l$/i, 'L').toUpperCase()} Bouteille`;
        } else {
          key = 'Bouteille';
        }

        if (!returnableItems[key]) {
          returnableItems[key] = { total: 0, transactions: [] };
        }
        returnableItems[key].total += 1;
        returnableItems[key].transactions.push({
          ...transaction,
          quantity: 1
        });
        hasMatched = true;
      }

      if (!hasMatched && description.includes('chopine')) {
        const brandMatch = description.match(/chopines?\s+([^,]*)/i);
        const brand = brandMatch?.[1]?.trim() || '';
        const key = brand ? `Chopine ${brand}` : 'Chopine';

        if (!returnableItems[key]) {
          returnableItems[key] = { total: 0, transactions: [] };
        }
        returnableItems[key].total += 1;
        returnableItems[key].transactions.push({
          ...transaction,
          quantity: 1
        });
      }
     
     // Mark transaction as processed only after all patterns have been checked
     if (hasMatched) {
       processedTransactions.add(transaction.id);
     }
    });
    
    return returnableItems;
  };

  const handleReturnQuantityChange = (itemType: string, change: number) => {
    setReturnItems(prev => ({
      ...prev,
      [itemType]: Math.max(0, (prev[itemType] || 0) + change)
    }));
  };

  const handleProcessReturns = async () => {
    try {
      setIsProcessing(true);
      
      // Collect items being returned for the success message
      const itemsBeingReturned = Object.entries(returnItems)
        .filter(([_, quantity]) => quantity > 0)
        .map(([itemType, quantity]) => `${quantity} ${itemType}${quantity > 1 ? 's' : ''}`)
        .join(', ');
    
    for (const [itemType, quantity] of Object.entries(returnItems)) {
      if (quantity > 0) {
        await processItemReturn(itemType, quantity);
      }
    }
    
    // Show duplicate card for successful return processing
    console.log('📱 ClientActionModal: Dispatching showDuplicateCard event for returns');
    window.dispatchEvent(new CustomEvent('showDuplicateCard', {
      detail: { 
        ...client,
        isAccountClear: false,
        message: `${itemsBeingReturned} Returned Successfully!`,
        transactionDescription: `Returned: ${itemsBeingReturned}`
      }
    }));
    
    // Force update of duplicate card and other UI components
    console.log('📱 ClientActionModal: Dispatching creditDataChanged event with clientActionReturn source');
    window.dispatchEvent(new CustomEvent('creditDataChanged', { detail: { source: 'clientActionReturn' } }));
    
    setShowSettleConfirm(false);
    setSettleAction(null);
    onClose();
  } catch (error) {
    console.error('📱 ClientActionModal: Error processing returns:', error);
    showAlert({ type: 'error', message: 'Failed to Process Returns' });
  } finally {
    setIsProcessing(false);
  }
};

const processItemReturn = async (itemType: string, returnQuantity: number) => {
  
  // Create a return transaction (negative transaction)
  const returnDescription = `Returned: ${returnQuantity} ${itemType}${returnQuantity > 1 ? 's' : ''} - ${new Date().toLocaleDateString('en-GB')}`;
  
  try {
    // Add a return transaction with zero amount and unique description
    await addTransaction(client, returnDescription, 0);
    
    // NOTE: We don't dispatch showDuplicateCard here because it's handled at a higher level
    // This prevents duplicate animations when processing multiple items
    
  } catch (error) {
    throw error;
  }
};

  // Helper function to calculate how much has already been returned
  const getReturnedQuantity = (itemType: string, returnableItems: {[key: string]: {total: number, transactions: Array<{id: string, description: string, amount: number, quantity: number, date: Date}>}}): number => {
    return clientTransactions
      .filter(transaction => transaction.type === 'debt' && transaction.description.toLowerCase().includes('returned'))
      .reduce((total, transaction) => {
        const description = transaction.description.toLowerCase();
        // Use more precise matching to avoid substring conflicts
        if (itemType.includes('Chopine')) {
          // For Chopine items, be more specific about matching
          if (itemType === 'Chopine') {
            // For generic Chopine, match "Returned: X Chopine" but not "Chopine Brand"
            const genericChopinePattern = /returned:\s*(\d+)\s+chopines?(?!\s+\w)/i;
            const match = description.match(genericChopinePattern);
            if (match) {
              return total + parseInt(match[1]);
            }
          } else {
            // For branded Chopine like "Chopine Vin", match the exact brand
            const brandedChopinePattern = new RegExp(`returned:\\s*(\\d+)\\s+${itemType.replace('Chopine', 'Chopines?')}`, 'i');
            const match = description.match(brandedChopinePattern);
            if (match) {
              return total + parseInt(match[1]);
            }
          }
        } else if (itemType.includes('Bouteille')) {
          if (itemType === 'Bouteille') {
            // For generic Bouteille, match "Returned: X Bouteille" but not "Bouteille Brand"
            // First check if any branded Bouteille would match this description
            let isBrandedMatch = false;
            for (const checkItemType of Object.keys(returnableItems)) {
              if (checkItemType.includes('Bouteille') && checkItemType !== 'Bouteille') {
                const brandName = checkItemType.replace('Bouteille', '').trim();
                if (brandName) {
                  // Create pattern that matches both "Bouteille Brand" and "Bouteilles Brand"
                  const brandedPattern = new RegExp(`returned:\\s*(\\d+)\\s+bouteilles?\\s+${brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s*(?:-|$))`, 'i');
                  if (description.match(brandedPattern)) {
                    isBrandedMatch = true;
                    break;
                  }
                }
              }
            }
            
            // Only match generic if it's not a branded match
            if (!isBrandedMatch) {
              // More precise pattern: match "Bouteille" or "Bouteilles" only when followed by a non-word character
              // or end of string, but not when followed by a space and another word
              const genericBouteillePattern = /returned:\s*(\d+)\s+(bouteille|bouteilles)(?=\s*(?:-|$))/i;
              const match = description.match(genericBouteillePattern);
              if (match) {
                return total + parseInt(match[1]);
              }
            }
          } else {
            // For branded Bouteille like "Bouteille Vin", match the exact brand
            const brandName = itemType.replace('Bouteille', '').trim();
            if (brandName) {
              // Create pattern that matches both "Bouteille Brand" and "Bouteilles Brand"
              const brandedPattern = new RegExp(`returned:\\s*(\\d+)\\s+bouteilles?\\s+${brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s*(?:-|$))`, 'i');
              const match = description.match(brandedPattern);
              if (match) {
                return total + parseInt(match[1]);
              }
            }
          }
        } else {
          // For other items, use the original logic but with word boundaries
          const escapedItemType = itemType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const pattern = new RegExp(`returned:\\s*(\\d+)\\s+${escapedItemType}`, 'i');
          const match = description.match(pattern);
          if (match) {
            return total + parseInt(match[1]);
          }
        }
        return total;
      }, 0);
  };

  // Get returnable items from transaction history
  const returnableItems = getReturnableItems();
  
  // Filter out items that have already been returned
  const availableItems: {[key: string]: {total: number, transactions: Array<{id: string, description: string, amount: number, quantity: number, date: Date}>}} = {};
  
  Object.entries(returnableItems).forEach(([itemType, data]) => {
    // Calculate net quantity (original - returned)
    const returnedQuantity = getReturnedQuantity(itemType, returnableItems);
    const availableQuantity = Math.max(0, data.total - returnedQuantity);
    
    if (availableQuantity > 0) {
      availableItems[itemType] = {
        ...data,
        total: availableQuantity
      };
    }
  });

  // Sort items by type (Chopine first, then bottle sizes)
  const sortedItemTypes = Object.keys(availableItems).sort((a, b) => {
    if (a.includes('Chopine') && !b.includes('Chopine')) return -1;
    if (!a.includes('Chopine') && b.includes('Chopine')) return 1;
    return a.localeCompare(b);
  });

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 select-none">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto select-none">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 select-none">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 select-none">{client.name}</h2>
            <p className="text-gray-600 select-none">ID: {client.id}</p>
            <div className="text-gray-600 select-none">
              <p className="select-none">Outstanding: Rs {totalDebt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              {Object.values(bottlesOwed).some(count => count > 0) && (
                <p className="text-sm select-none">
                  Bottles owed: {Object.entries(bottlesOwed)
                    .filter(([type, count]) => count > 0)
                    .map(([type, count]) => `${count} ${type.charAt(0).toUpperCase() + type.slice(1)}${count > 1 ? 's' : ''}`)
                    .join(', ')}
                </p>
              )}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto select-none">
          {!showPartialPayment && !showReturnTab ? (
            // Action Selection
            <div className="space-y-4 select-none">
              <h3 className="text-lg font-medium text-gray-800 mb-4 select-none">Choose Action</h3>
              
              {/* View Details Button */}
              <button
                onClick={() => {
                  onClose();
                  onViewDetails?.(client);
                }}
                disabled={isProcessing}
                className="w-full flex items-center gap-4 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors disabled:opacity-50"
              >
                <div className="bg-blue-500 p-2 rounded-full">
                  <User size={20} className="text-white" />
                </div>
                <div className="text-left select-none">
                  <h4 className="font-medium text-gray-800 select-none">View Details</h4>
                  <p className="text-sm text-gray-600 select-none">See Transaction History and Client Info</p>
                </div>
              </button>
              
              {/* Link to Calculator Button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onQuickAdd) {
                    onQuickAdd(client);
                    onClose();
                    // Remove focus from any input fields to dismiss keyboard
                    if (document.activeElement instanceof HTMLElement) {
                      document.activeElement.blur();
                    }
                    // Scroll to top to ensure calculator is visible
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                disabled={isProcessing}
                className="w-full flex items-center gap-4 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors disabled:opacity-50"
              >
                <div className="bg-purple-500 p-2 rounded-full">
                  <Calculator size={20} className="text-white" />
                </div>
                <div className="text-left select-none">
                  <h4 className="font-medium text-gray-800 select-none">Link to Calculator</h4>
                  <p className="text-sm text-gray-600 select-none">Connect Client to Calculator for Quick Transactions</p>
                </div>
              </button>
              
              {/* Return Button - Only show if there are returnable items */}
              {Object.keys(availableItems).length > 0 && (
                <button
                  onClick={() => setShowReturnTab(true)}
                  disabled={isProcessing}
                  className="w-full flex items-center gap-4 p-4 bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-200 transition-colors disabled:opacity-50"
                >
                  <div className="bg-orange-500 p-2 rounded-full">
                    <RotateCcw size={20} className="text-white" />
                  </div>
                  <div className="text-left select-none">
                    <h4 className="font-medium text-gray-800 select-none">Return</h4>
                    <p className="text-sm text-gray-600 select-none">Return Items or Make Adjustments</p>
                  </div>
                </button>
              )}
              
              {/* Partial Payment Button */}
             {totalDebt > 0 && (
              <button
                onClick={() => setShowPartialPayment(true)}
                disabled={isProcessing}
                className="w-full flex items-center gap-4 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors disabled:opacity-50"
              >
                <div className="bg-blue-500 p-2 rounded-full">
                  <CreditCard size={20} className="text-white" />
                </div>
                <div className="text-left select-none">
                  <h4 className="font-medium text-gray-800 select-none">Partial Payment</h4>
                  <p className="text-sm text-gray-600 select-none">Record a Partial Payment Amount</p>
                </div>
              </button>
             )}

              {/* Settle Button */}
              {/* Settle Button - Only show if there's debt AND returnables */}
              {totalDebt > 0 && Object.keys(availableItems).length > 0 ? (
                <button
                  onClick={() => setShowAccountSettleConfirm(true)}
                  disabled={isProcessing}
                  className="w-full flex items-center gap-4 p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors disabled:opacity-50"
                >
                  <div className="bg-green-500 p-2 rounded-full">
                    <CheckCircle size={20} className="text-white" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-medium text-gray-800">Settle Account</h4>
                    <p className="text-sm text-gray-600">Mark as Fully Paid and Remove</p>
                  </div>
                </button>
              ) : totalDebt > 0 && Object.keys(availableItems).length === 0 ? (
                /* Show simple confirmation modal for clients with debt but no returnables */
                <button
                  onClick={() => setShowSimpleSettleConfirm(true)}
                  disabled={isProcessing}
                  className="w-full flex items-center gap-4 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors disabled:opacity-50"
                >
                  <div className="bg-blue-500 p-2 rounded-full">
                    <CheckCircle size={20} className="text-white" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-medium text-gray-800">Settle Account</h4>
                    <p className="text-sm text-gray-600">Mark Debt as Fully Paid and Clear All Transactions</p>
                  </div>
                </button>
              ) : null /* Hide settle option if no debt and no returnables */}
            </div>
          ) : showPartialPayment ? (
            // Partial Payment Form
            <div className="select-none">
              <h3 className="text-lg font-medium text-gray-800 mb-4 select-none">Partial Payment</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2 select-none">
                  Payment Amount (Rs)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    step="0.01"
                    placeholder="0.00"
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 select-none">
                  Maximum: Rs {totalDebt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowPartialPayment(false)}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handlePartialPayment}
                  disabled={isProcessing || !paymentAmount}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : 'Record Payment'}
                </button>
              </div>
            </div>
          ) : (
            // Return Tab
            <div className="select-none">
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setShowReturnTab(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft size={20} />
                </button>
                <h3 className="text-lg font-medium text-gray-800 select-none">Return Chopine & Bouteille</h3>
                <div className="flex-1"></div>
                <button
                  onClick={async () => {
                    setSettleAction({ type: 'all' });
                    setShowSettleConfirm(true);
                  }}
                  disabled={isProcessing || Object.keys(availableItems).length === 0}
                  className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                  title="Settle all returnable items"
                >
                  <X size={16} />
                  <span className="text-sm">Settle All</span>
                </button>
              </div>
              
              {Object.keys(availableItems).length === 0 ? (
                <div className="text-center py-8 text-gray-500 select-none">
                  <p className="select-none">No Chopine or Bouteille items found in transaction history</p>
                </div>
              ) : (
                <div className="space-y-4 mb-6">
                  {sortedItemTypes.map((itemType) => {
                    const data = availableItems[itemType];
                    return (
                    <div key={itemType} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="select-none">
                          <h4 className="font-medium text-gray-800 select-none">{itemType}</h4>
                          <p className="text-sm text-gray-600 select-none">Available to return: {data.total}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Individual Settle Button */}
                          <button
                            type="button"
                            onClick={async () => {
                              setSettleAction({ 
                                type: 'individual', 
                                itemType: itemType, 
                                quantity: data.total 
                              });
                              setShowSettleConfirm(true);
                            }}
                            disabled={isProcessing}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                            title={`Settle all ${itemType}`}
                          >
                            <X size={16} />
                          </button>
                          
                          {/* Quantity Controls */}
                          <button
                            type="button"
                            onClick={() => handleReturnQuantityChange(itemType, -1)}
                            className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center"
                            disabled={!returnItems[itemType] || returnItems[itemType] === 0}
                          >
                            <Minus size={16} />
                          </button>
                          <span className="w-12 text-center font-medium text-lg">
                            {returnItems[itemType] || 0}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleReturnQuantityChange(itemType, 1)}
                            className="w-8 h-8 bg-orange-500 hover:bg-orange-600 text-white rounded-full flex items-center justify-center"
                            disabled={returnItems[itemType] >= data.total}
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                      
                      {/* Show recent transactions for this item type */}
                      <div className="text-xs text-gray-500">
                        <p className="font-medium mb-1">Recent transactions:</p>
                        {(() => {
                          // Get unique transactions for this item type (prevent duplicates)
                          const returnedQuantity = getReturnedQuantity(itemType, returnableItems);
                          const totalOriginal = data.total + returnedQuantity;
                          
                          // Get unique transactions for this item type
                          const uniqueTransactions = data.transactions.reduce((unique: any[], transaction) => {
                            // Check if this transaction is already in the unique array
                            const exists = unique.find(t => 
                              t.id === transaction.id || 
                              (t.description === transaction.description && 
                               Math.abs(t.date.getTime() - transaction.date.getTime()) < 1000) // Same description within 1 second
                            );
                            
                            if (!exists) {
                              unique.push(transaction);
                            }
                            return unique;
                          }, []);
                          
                          // Only show transactions if there are still unreturned items
                          const relevantTransactions = availableItems[itemType] && availableItems[itemType].total > 0 
                            ? uniqueTransactions.slice(-2) // Show last 2 unique transactions
                            : [];
                          
                          return relevantTransactions.map((transaction, index) => {
                          return (
                            <div key={index} className="truncate">
                              • <ScrollingText 
                                text={`${transaction.description} (${transaction.quantity} ${itemType}) - ${transaction.date.toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })} ${transaction.date.toLocaleTimeString('en-GB', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                              })}`}
                                className="text-xs text-gray-500"
                                pauseDuration={1}
                                scrollDuration={3}
                                easing="power1.inOut"
                              />
                            </div>
                          );
                          });
                        })()}
                        
                        {/* Show returned items for this type */}
                        {(() => {
                          const returnedTransactions = clientTransactions
                            .filter(transaction => 
                              transaction.type === 'debt' && 
                              transaction.description.toLowerCase().includes('returned') &&
                              transaction.description.toLowerCase().includes(itemType.toLowerCase())
                            )
                            .filter(transaction => {
                              // Only show returned transactions that are newer than the most recent non-return transaction for this item type
                              const mostRecentTakeTransaction = clientTransactions
                                .filter(t => 
                                  t.type === 'debt' && 
                                  !t.description.toLowerCase().includes('returned') &&
                                  t.description.toLowerCase().includes(itemType.toLowerCase().split(' ')[0])
                                )
                                .sort((a, b) => b.date.getTime() - a.date.getTime())[0];
                              
                              // If no take transaction exists, don't show any returns
                              if (!mostRecentTakeTransaction) return false;
                              
                              // Only show returns that happened after the most recent take
                              return transaction.date.getTime() > mostRecentTakeTransaction.date.getTime();
                            })
                            .slice(-2); // Show last 2 relevant returned transactions
                          
                          return returnedTransactions.map((transaction, index) => (
                            <div key={`returned-${index}`} className="truncate text-green-600">
                              • <ScrollingText 
                                text={`${transaction.description} - ${transaction.date.toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: '2-digit'
                                }).replace(/\s/g, '-')} ${transaction.date.toLocaleTimeString('en-GB', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: false
                                })}`}
                                className="text-xs text-green-600"
                                pauseDuration={1}
                                scrollDuration={3}
                                easing="power1.inOut"
                              />
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  );})}
                  
                  <button
                    className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                    onClick={handleProcessReturns}
                    disabled={isProcessing || Object.values(returnItems).every(qty => qty === 0)}
                  >
                    {isProcessing ? 'Processing...' : 'Process Returns'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Settle Confirmation Modal */}
      {showSettleConfirm && settleAction && (
        <SettleConfirmationModal
          isOpen={showSettleConfirm}
          title={settleAction.type === 'all' ? 'Settle All Returns' : 'Settle Item Returns'}
          message={
            settleAction.type === 'all'
              ? `Return All Available Chopine & Bouteille Items for ${client.name}?`
              : `Return All ${settleAction.quantity} ${settleAction.itemType}${(settleAction.quantity || 0) > 1 ? 's' : ''} for ${client.name}?`
          }
          itemDetails={
            settleAction.type === 'all'
              ? `This Will Mark All Returnable Containers as Returned.`
              : `This Will Mark ${settleAction.quantity} ${settleAction.itemType}${(settleAction.quantity || 0) > 1 ? 's' : ''} as returned.`
          }
          clientName={client.name}
          clientId={client.id}
          outstandingDebt={totalDebt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          remainingItems={Object.entries(availableItems)
            .map(([itemType, data]) => `${data.total} ${itemType}`)
            .join(', ')}
          onConfirm={async () => {
            try {
              setIsProcessing(true);
              if (settleAction.type === 'all') {
                // Set all available items to be returned
                const allReturns: {[key: string]: number} = {};
                Object.entries(availableItems).forEach(([itemType, data]) => {
                  allReturns[itemType] = data.total;
                });
                
                // Process all returns
                for (const [itemType, quantity] of Object.entries(allReturns)) {
                  await processItemReturn(itemType, quantity);
                }
                
                // Show duplicate card for successful return settlement
                window.dispatchEvent(new CustomEvent('showDuplicateCard', {
                  detail: { 
                    ...client,
                    isAccountClear: false,
                    message: 'All Returnables Settled Successfully!',
                    transactionDescription: 'Returned All Returnable Items'
                  }
                }));
              } else if (settleAction.itemType && settleAction.quantity) {
                // Process individual item return
                await processItemReturn(settleAction.itemType, settleAction.quantity);
                
                // Show duplicate card for successful individual return settlement
                window.dispatchEvent(new CustomEvent('showDuplicateCard', {
                  detail: { 
                    ...client,
                    isAccountClear: false,
                    message: `${settleAction.quantity} ${settleAction.itemType}${(settleAction.quantity || 0) > 1 ? 's' : ''} returned successfully!`,
                    transactionDescription: `Returned: ${settleAction.quantity} ${settleAction.itemType}${(settleAction.quantity || 0) > 1 ? 's' : ''}`
                  }
                }));
              }
              
              // Force update of duplicate card and other UI components
              window.dispatchEvent(new CustomEvent('creditDataChanged', { detail: { source: 'clientActionReturn' } }));
              
              setShowSettleConfirm(false);
              setSettleAction(null);
              onClose();
            } catch (error) {
              console.error('Error settling items:', error);
              showAlert({ type: 'error', message: `Failed to Settle ${settleAction.type === 'all' ? 'All Items' : settleAction.itemType}` });
            } finally {
              setIsProcessing(false);
            }
          }}
          onCancel={() => {
            setShowSettleConfirm(false);
            setSettleAction(null);
          }}
          isProcessing={isProcessing}
        />
      )}

      {/* Account Settle Confirmation Modal */}
      {showAccountSettleConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 select-none">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto select-none">
            
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 select-none">
              <div className="flex items-center gap-3 select-none">
                <div className="bg-green-100 p-2 rounded-full select-none">
                  <CheckCircle size={20} className="text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 select-none">Settle Account</h2>
              </div>
              <button 
                onClick={() => setShowAccountSettleConfirm(false)}
                disabled={isProcessing}
                className="text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto select-none">
              <div className="flex items-start gap-3 mb-4 select-none">
                <div className="bg-yellow-100 p-2 rounded-full flex-shrink-0 select-none">
                  <AlertTriangle size={20} className="text-yellow-600" />
                </div>
                <div className="flex-1 select-none">
                  <p className="text-gray-700 mb-2 select-none">
                    Are you sure you want to settle the account for <strong>{client.name}</strong>?
                  </p>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 mb-3 select-none">
                    <div className="space-y-1 text-sm select-none">
                      <p className="select-none">
                        <span className="font-medium">Outstanding Debt:</span> Rs {totalDebt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      {Object.values(bottlesOwed).some(count => count > 0) && (
                        <p className="select-none">
                          <span className="font-medium">Bottles Owed:</span> {Object.entries(bottlesOwed)
                            .filter(([_, count]) => count > 0)
                            .map(([type, count]) => `${count} ${type.charAt(0).toUpperCase() + type.slice(1)}${count > 1 ? 's' : ''}`)
                            .join(', ')}
                        </p>
                      )}
                      {Object.keys(availableItems).length > 0 && (
                        <p className="select-none">
                          <span className="font-medium">Returnable Items:</span> {Object.entries(availableItems)
                            .map(([itemType, data]) => `${data.total} ${itemType}`)
                            .join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Settlement Options */}
              <div className="space-y-3 mb-6 select-none">
                {/* Settle Amount Only - Only show if client has debt */}
                {totalDebt > 0 && (
                  <button
                    onClick={async () => {
                      setShowAccountSettleConfirm(false);
                      try {
                        await handleSettle();
                        
                        // Force update of duplicate card and other UI components with delay
                        setTimeout(() => {
                          window.dispatchEvent(new CustomEvent('creditDataChanged', { detail: { source: 'clientActionSettle' } }));
                          
                          // Show duplicate card for settled client
                          window.dispatchEvent(new CustomEvent('showDuplicateCard', {
                            detail: { 
                              ...client, 
                              isAccountClear: true,
                              message: 'Account Cleared Successfully!',
                              transactionDescription: Object.keys(availableItems).length > 0 ? 'Account Settled (Returnables Preserved)' : 'Account Settled Successfully'
                            }
                          }));
                        }, 100);
                      } catch (error) {
                        console.error('Error settling account:', error);
                      }
                    }}
                    disabled={isProcessing}
                    className="w-full flex items-center gap-4 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors disabled:opacity-50 select-none"
                  >
                    <div className="bg-blue-500 p-2 rounded-full select-none">
                      <DollarSign size={20} className="text-white" />
                    </div>
                    <div className="text-left flex-1 select-none">
                      <h4 className="font-medium text-gray-800 select-none">Settle Account Only</h4>
                      <p className="text-sm text-gray-600 select-none">
                        {Object.keys(availableItems).length > 0 
                          ? 'Mark Account as Fully Paid but Keep Returnables' 
                          : 'Mark Account as Fully Paid'}
                      </p>
                      <p className="text-xs text-green-600 select-none">
                        Debt: Rs {totalDebt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </button>
                )}

                {/* Settle Account + Clear Returnables - Only show if there are returnables or debt */}
                {(totalDebt > 0 || Object.keys(availableItems).length > 0) && (
                  <button
                    onClick={async () => {
                      try {
                        setIsProcessing(true);
                        setShowAccountSettleConfirm(false);
                        
                        // Settle the account with full clear (this clears ALL transactions including returnables)
                        await handleSettleWithFullClear();
                        
                        // Force update of duplicate card and other UI components with delay
                        setTimeout(() => {
                          window.dispatchEvent(new CustomEvent('creditDataChanged', { detail: { source: 'clientActionSettle' } }));
                          
                          // Show duplicate card for settled client
                          window.dispatchEvent(new CustomEvent('showDuplicateCard', {
                            detail: { 
                              ...client,
                              isAccountClear: true,
                              message: 'Account Cleared Successfully!',
                              transactionDescription: Object.keys(availableItems).length > 0 
                                ? 'Account Settled And All Returnables Cleared' 
                                : 'Account Settled Successfully'
                            }
                          }));
                        }, 100);
                      } catch (error) {
                        console.error('Error settling account with returns:', error);
                        showAlert({ type: 'error', message: 'Failed to Settle Account' });
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
                    disabled={isProcessing}
                    className="w-full flex items-center gap-4 p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors disabled:opacity-50 select-none"
                  >
                    <div className="bg-green-500 p-2 rounded-full select-none">
                      <CheckCircle size={20} className="text-white" />
                    </div>
                    <div className="text-left flex-1 select-none">
                      <h4 className="font-medium text-gray-800">
                        {Object.keys(availableItems).length > 0 
                          ? 'Settle Account + Clear Returnables' 
                          : 'Settle Account'}
                      </h4>
                      <p className="text-sm text-gray-600 select-none">
                        {totalDebt > 0 
                          ? (Object.keys(availableItems).length > 0 
                              ? 'Mark Account as Fully Paid and Clear All Returnables' 
                              : 'Mark Account as Fully Paid')
                          : 'Clear all data for this client'}
                      </p>
                      {totalDebt > 0 && (
                        <p className="text-xs text-green-600 select-none">
                          Debt: Rs {totalDebt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      )}
                      {Object.keys(availableItems).length > 0 && (
                        <p className="text-xs text-orange-600 select-none">
                          + Clears: {Object.entries(availableItems)
                            .map(([itemType, data]) => `${data.total} ${itemType}`)
                            .join(', ')}
                        </p>
                      )}
                    </div>
                  </button>
                )}
              </div>

              {/* Cancel Button */}
              <div className="flex justify-center select-none">
                <button
                  onClick={() => setShowAccountSettleConfirm(false)}
                  disabled={isProcessing}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 font-medium select-none"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Simple Settle Confirmation Modal for clients with only amount */}
      {showSimpleSettleConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 select-none">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto select-none">
            
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 select-none">
              <div className="flex items-center gap-3 select-none">
                <div className="bg-blue-100 p-2 rounded-full select-none">
                  <CheckCircle size={20} className="text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 select-none">Settle Account</h2>
              </div>
              <button 
                onClick={() => setShowSimpleSettleConfirm(false)}
                disabled={isProcessing}
                className="text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto select-none">
              <div className="flex items-start gap-3 mb-4 select-none">
                <div className="bg-yellow-100 p-2 rounded-full flex-shrink-0 select-none">
                  <AlertTriangle size={20} className="text-yellow-600" />
                </div>
                <div className="flex-1 select-none">
                  <p className="text-gray-700 mb-2 select-none">
                    Are you sure you want to settle the account for <strong>{client.name}</strong>?
                  </p>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 mb-3 select-none">
                    <div className="space-y-1 text-sm select-none">
                      <p className="select-none">
                        <span className="font-medium">Outstanding Debt:</span> Rs {totalDebt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm select-none">
                    This will mark the account as fully paid and clear all transactions.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 select-none">
                <button
                  onClick={() => setShowSimpleSettleConfirm(false)}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 font-medium select-none"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      setIsProcessing(true);
                      setShowSimpleSettleConfirm(false);
                      
                      // Settle the account with full clear
                      await handleSettleWithFullClear();
                      
                      // Force update of duplicate card and other UI components with delay
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('creditDataChanged', { detail: { source: 'clientActionSettle' } }));
                        
                        // Show duplicate card for settled client
                        window.dispatchEvent(new CustomEvent('showDuplicateCard', {
                          detail: { 
                            ...client,
                            isAccountClear: true,
                            message: 'Account Cleared Successfully!',
                            transactionDescription: 'Account Settled Successfully'
                          }
                        }));
                      }, 100);
                    } catch (error) {
                      console.error('Error settling account:', error);
                      showAlert({ type: 'error', message: 'Failed to Settle Account' });
                    } finally {
                      setIsProcessing(false);
                      onClose();
                      if (onResetCalculator) {
                        onResetCalculator();
                      }
                    }
                  }}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 font-medium select-none"
                >
                  {isProcessing ? 'Settling...' : 'Confirm Settle'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ClientActionModal;