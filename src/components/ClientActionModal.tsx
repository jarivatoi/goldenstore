import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CreditCard, CheckCircle, DollarSign, RotateCcw, Minus, Plus } from 'lucide-react';
import { Client } from '../types';
import { useCredit } from '../context/CreditContext';

interface ClientActionModalProps {
  client: Client;
  onClose: () => void;
  onResetCalculator?: () => void;
}

/**
 * CLIENT ACTION MODAL COMPONENT
 * =============================
 * 
 * Shows partial payment and settle options when swiping up on client card
 */
const ClientActionModal: React.FC<ClientActionModalProps> = ({ client, onClose, onResetCalculator }) => {
  const { addPartialPayment, settleClient, getClientTotalDebt, returnBottles, getClientBottlesOwed, getClientTransactions, addTransaction } = useCredit();
  const [showPartialPayment, setShowPartialPayment] = useState(false);
  const [showReturnTab, setShowReturnTab] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [returnItems, setReturnItems] = useState<{[key: string]: number}>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const totalDebt = getClientTotalDebt(client.id);
  const bottlesOwed = getClientBottlesOwed(client.id);
  const clientTransactions = getClientTransactions(client.id);

  const handlePartialPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0 || amount > totalDebt) {
      alert('Please enter a valid payment amount');
      return;
    }

    try {
      setIsProcessing(true);
      await addPartialPayment(client.id, amount);
      // Reset calculator after successful payment
      if (onResetCalculator) {
        onResetCalculator();
      }
      onClose();
    } catch (error) {
      console.error('Error processing partial payment:', error);
      alert('Failed to process payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSettle = async () => {
    try {
      setIsProcessing(true);
      await settleClient(client.id);
      onClose();
      if (onResetCalculator) {
        onResetCalculator();
      }
    } catch (error) {
      console.error('Error settling client:', error);
      alert('Failed to settle client');
    } finally {
      setIsProcessing(false);
    }
  };

  // Parse transactions to find returnable items (Chopine and Bouteille)
  const getReturnableItems = () => {
    const returnableItems: {[key: string]: {total: number, transactions: Array<{id: string, description: string, amount: number, quantity: number}>}} = {};
    
    console.log('🔍 Processing transactions for returnable items...');
    
    clientTransactions.forEach(transaction => {
      // Only process debt transactions (not payments) AND exclude return transactions
      if (transaction.type === 'payment' || transaction.description.toLowerCase().includes('returned')) {
        console.log(`⏭️ Skipping transaction: "${transaction.description}" (type: ${transaction.type})`);
        return;
      }
      
      const description = transaction.description.toLowerCase();
      console.log(`📝 Processing: "${transaction.description}" (amount: ${transaction.amount})`);
      
      // Only process items that contain "chopine" or "bouteille"
      if (!description.includes('chopine') && !description.includes('bouteille')) {
        console.log(`⏭️ Skipping: "${transaction.description}" (no chopine/bouteille)`);
        return;
      }
      
      // Look for Chopine items with improved parsing
      // Pattern: number + space + chopine (with optional brand after)
      const chopinePattern = /(\d+)\s+chopines?(?:\s+([^,]*))?/gi;
      let chopineMatch;
      
      while ((chopineMatch = chopinePattern.exec(description)) !== null) {
        const quantity = parseInt(chopineMatch[1]);
        const brand = chopineMatch[2]?.trim() || '';
        const key = brand ? `Chopine ${brand}` : 'Chopine';
        
        console.log(`✅ Adding ${quantity} ${key} from: "${transaction.description}"`);
        
        if (!returnableItems[key]) {
          returnableItems[key] = { total: 0, transactions: [] };
        }
        returnableItems[key].total += quantity;
        returnableItems[key].transactions.push({
          id: transaction.id,
          description: transaction.description,
          amount: transaction.amount,
          quantity: quantity
        });
      }
      
      // Look for Bouteille items with improved parsing
      // Pattern: number + space + optional size + bouteille + optional brand
      const bouteillePattern = /(\d+)\s+(?:(\d+(?:\.\d+)?L)\s+)?bouteilles?(?:\s+([^,]*))?/gi;
      let bouteilleMatch;
      
      while ((bouteilleMatch = bouteillePattern.exec(description)) !== null) {
        const quantity = parseInt(bouteilleMatch[1]);
        const size = bouteilleMatch[2]?.trim() || '';
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
        
        console.log(`✅ Adding ${quantity} ${key} from: "${transaction.description}"`);
        
        if (!returnableItems[key]) {
          returnableItems[key] = { total: 0, transactions: [] };
        }
        returnableItems[key].total += quantity;
        returnableItems[key].transactions.push({
          id: transaction.id,
          description: transaction.description,
          amount: transaction.amount,
          quantity: quantity
        });
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
        
        console.log(`✅ Adding 1 ${key} (no number) from: "${transaction.description}"`);
        
        if (!returnableItems[key]) {
          returnableItems[key] = { total: 0, transactions: [] };
        }
        returnableItems[key].total += 1;
        returnableItems[key].transactions.push({
          id: transaction.id,
          description: transaction.description,
          amount: transaction.amount,
          quantity: 1
        });
      }
      
      if (description.includes('chopine') && !chopinePattern.test(description)) {
        const brandMatch = description.match(/chopines?\s+([^,]*)/i);
        const brand = brandMatch?.[1]?.trim() || '';
        const key = brand ? `Chopine ${brand}` : 'Chopine';
        
        console.log(`✅ Adding 1 ${key} (no number) from: "${transaction.description}"`);
        
        if (!returnableItems[key]) {
          returnableItems[key] = { total: 0, transactions: [] };
        }
        returnableItems[key].total += 1;
        returnableItems[key].transactions.push({
          id: transaction.id,
          description: transaction.description,
          amount: transaction.amount,
          quantity: 1
        });
      }
    });
    
    console.log('🎯 Final returnable items:', returnableItems);
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
      for (const [itemType, quantity] of Object.entries(returnItems)) {
        if (quantity > 0) {
          await processItemReturn(itemType, quantity);
        }
      }
      // Reset calculator after successful returns processing
      if (onResetCalculator) {
        onResetCalculator();
      }
      onClose();
    } catch (error) {
      console.error('Error processing returns:', error);
      alert('Failed to process returns');
    } finally {
      setIsProcessing(false);
    }
  };

  const processItemReturn = async (itemType: string, returnQuantity: number) => {
    console.log(`🔄 Processing return of ${returnQuantity} ${itemType}`);
    
    // Create a return transaction (negative transaction)
    const returnDescription = `Returned: ${returnQuantity} ${itemType}${returnQuantity > 1 ? 's' : ''}`;
    
    try {
      // Add a return transaction with negative amount or zero amount
      await addTransaction(client, returnDescription, 0);
      
      console.log(`✅ Successfully processed return of ${returnQuantity} ${itemType}`);
    } catch (error) {
      console.error(`❌ Failed to process return:`, error);
      throw error;
    }
  };

  // Helper function to calculate how much has already been returned
  const getReturnedQuantity = (itemType: string): number => {
    return clientTransactions
      .filter(transaction => transaction.type === 'debt' && transaction.description.toLowerCase().includes('returned'))
      .reduce((total, transaction) => {
        const description = transaction.description.toLowerCase();
        if (description.includes(itemType.toLowerCase())) {
          // Extract quantity from return transaction
          const match = description.match(/returned:\s*(\d+)\s+/);
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
  const availableItems: {[key: string]: {total: number, transactions: Array<{id: string, description: string, amount: number, quantity: number}>}} = {};
  
  Object.entries(returnableItems).forEach(([itemType, data]) => {
    // Calculate net quantity (original - returned)
    const returnedQuantity = getReturnedQuantity(itemType);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-hidden p-4" style={{ height: '100vh' }}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{client.name}</h2>
            <div className="text-gray-600">
              <p>Outstanding: Rs {totalDebt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              {Object.values(bottlesOwed).some(count => count > 0) && (
                <p className="text-sm">
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
        <div className="p-6">
          {!showPartialPayment && !showReturnTab ? (
            // Action Selection
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Choose Action</h3>
              
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
                  <div className="text-left">
                    <h4 className="font-medium text-gray-800">Return</h4>
                    <p className="text-sm text-gray-600">Return items or make adjustments</p>
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
                <div className="text-left">
                  <h4 className="font-medium text-gray-800">Partial Payment</h4>
                  <p className="text-sm text-gray-600">Record a partial payment amount</p>
                </div>
              </button>
             )}

              {/* Settle Button */}
              <button
                onClick={handleSettle}
                disabled={isProcessing}
                className="w-full flex items-center gap-4 p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors disabled:opacity-50"
              >
                <div className="bg-green-500 p-2 rounded-full">
                  <CheckCircle size={20} className="text-white" />
                </div>
                <div className="text-left">
                  <h4 className="font-medium text-gray-800">Settle Account</h4>
                  <p className="text-sm text-gray-600">Mark as fully paid and remove</p>
                </div>
              </button>
            </div>
          ) : showPartialPayment ? (
            // Partial Payment Form
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-4">Partial Payment</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount (Rs)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    max={totalDebt}
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Maximum: Rs {totalDebt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
            <div>
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setShowReturnTab(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
                <h3 className="text-lg font-medium text-gray-800">Return Chopine & Bouteille</h3>
                <div className="flex-1"></div>
                <button
                  onClick={async () => {
                    const confirmed = window.confirm(
                      `Return ALL available Chopine & Bouteille items for ${client.name}? This will mark all returnable containers as returned.`
                    );
                    if (confirmed) {
                      try {
                        setIsProcessing(true);
                        // Set all available items to be returned
                        const allReturns: {[key: string]: number} = {};
                        Object.entries(availableItems).forEach(([itemType, data]) => {
                          allReturns[itemType] = data.total;
                        });
                        
                        // Process all returns
                        for (const [itemType, quantity] of Object.entries(allReturns)) {
                          if (quantity > 0) {
                            await processItemReturn(itemType, quantity);
                          }
                        }
                        onClose();
                        // Reset calculator after settling all returnables
                        if (onResetCalculator) {
                          onResetCalculator();
                        }
                      } catch (error) {
                        console.error('Error settling all returnables:', error);
                        alert('Failed to settle all returnables');
                      } finally {
                        setIsProcessing(false);
                      }
                    }
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
                <div className="text-center py-8 text-gray-500">
                  <p>No Chopine or Bouteille items found in transaction history</p>
                </div>
              ) : (
                <div className="space-y-4 mb-6">
                  {sortedItemTypes.map((itemType) => {
                    const data = availableItems[itemType];
                    return (
                    <div key={itemType} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-gray-800">{itemType}</h4>
                          <p className="text-sm text-gray-600">Available to return: {data.total}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Individual Settle Button */}
                          <button
                            type="button"
                            onClick={async () => {
                              const confirmed = window.confirm(
                                `Return all ${data.total} ${itemType}${data.total > 1 ? 's' : ''} for ${client.name}?`
                              );
                              if (confirmed) {
                                try {
                                  setIsProcessing(true);
                                  await processItemReturn(itemType, data.total);
                                  onClose();
                                  // Reset calculator after settling individual item
                                  if (onResetCalculator) {
                                    onResetCalculator();
                                  }
                                } catch (error) {
                                  console.error('Error settling item type:', error);
                                  alert(`Failed to settle ${itemType}`);
                                } finally {
                                  setIsProcessing(false);
                                }
                              }
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
                        {data.transactions.slice(-2).map((transaction, index) => {
                          const transactionDate = new Date(transaction.date || Date.now());
                          return (
                            <p key={index} className="truncate">
                              • {transaction.description} ({transaction.quantity} {itemType}) - {transactionDate.toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })} {transactionDate.toLocaleTimeString('en-GB', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                              })}
                            </p>
                          );
                        })}
                        
                        {/* Show returned items for this type */}
                        {(() => {
                          const returnedTransactions = clientTransactions
                            .filter(transaction => 
                              transaction.type === 'debt' && 
                              transaction.description.toLowerCase().includes('returned') &&
                              transaction.description.toLowerCase().includes(itemType.toLowerCase())
                            )
                            .slice(-2); // Show last 2 returned transactions
                          
                          return returnedTransactions.map((transaction, index) => (
                            <p key={`returned-${index}`} className="truncate text-green-600">
                              • {transaction.description} - {transaction.date.toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })} {transaction.date.toLocaleTimeString('en-GB', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                              })}
                            </p>
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
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ClientActionModal;