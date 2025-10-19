import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Edit2, Minus, Plus, CheckCircle, AlertTriangle, Receipt, Calendar, CreditCard } from 'lucide-react';
import { useCredit } from '../context/CreditContext';
import { Client } from '../types';
import { useNotification } from '../context/NotificationContext';

interface ClientDetailModalProps {
  client: Client;
  onClose: () => void;
}

const ClientDetailModal: React.FC<ClientDetailModalProps> = ({ client, onClose }) => {
  const { getClientTransactions, getClientPayments, updateClient, addTransaction } = useCredit();
  const { showAlert } = useNotification();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(client.name);
  const [isSaving, setIsSaving] = useState(false);
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'returnable' | 'taken' | 'returned'>('all');
  const [modal, setModal] = useState<{
    type: 'confirm' | 'success' | 'error' | null;
    title: string;
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({ type: null, title: '', message: '' });

  const transactions = getClientTransactions(client.id);
  const payments = getClientPayments(client.id);
  const totalDebt = client.totalDebt;

  // Get returnable items for client
  const getReturnableItems = () => {
    const returnableItems: {[key: string]: number} = {};
    
    transactions.forEach(transaction => {
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
        // Create more precise key for generic vs branded chopines
        const key = brand ? `Chopine ${brand}` : 'Chopine';
        
        if (!returnableItems[key]) {
          returnableItems[key] = 0;
        }
        returnableItems[key] += quantity;
      }
      
      // Look for Bouteille items with improved parsing
      // Pattern: number + space + optional size + bouteille + optional brand
      const bouteillePattern = /(\d+)\s+(?:(\d+(?:\.\d+)?[Ll])\s+)?bouteilles?(?:\s+([^,\(\)]*))?/gi;
      let bouteilleMatch;
      
      while ((bouteilleMatch = bouteillePattern.exec(description)) !== null) {
        const quantity = parseInt(bouteilleMatch[1]);
        const size = bouteilleMatch[2]?.trim().replace(/l$/gi, 'L') || '';
        const brand = bouteilleMatch[3]?.trim() || '';
        
        // Capitalize brand name properly
        const capitalizedBrand = brand ? brand.split(' ').map((word: string) => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ') : '';
        
        // Format the key based on what we found - consistent with Chopine approach
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
    });
    
    // Calculate returned quantities with improved matching
    const returnedQuantities: {[key: string]: number} = {};
    transactions
      .filter(transaction => transaction.type === 'debt' && transaction.description.toLowerCase().includes('returned'))
      .forEach(transaction => {
        const description = transaction.description.toLowerCase();
        Object.keys(returnableItems).forEach(itemType => {
          // Use more precise matching to avoid substring conflicts
          if (itemType.includes('Chopine')) {
            if (itemType === 'Chopine') {
              // For generic Chopine, match "Returned: X Chopine" but not "Chopine Brand"
              const genericChopinePattern = /returned:\s*(\d+)\s+chopines?(?!\s+\w)/i;
              const match = description.match(genericChopinePattern);
              if (match) {
                if (!returnedQuantities[itemType]) {
                  returnedQuantities[itemType] = 0;
                }
                returnedQuantities[itemType] += parseInt(match[1]);
              }
            } else {
              // For branded Chopine like "Chopine Vin", match the exact brand
              const pattern = `returned:\\s*(\\d+)\\s+${itemType.replace('Chopine', 'Chopines?')}`;
              const brandedChopinePattern = new RegExp(pattern, 'i');
              const match = description.match(brandedChopinePattern);
              if (match) {
                if (!returnedQuantities[itemType]) {
                  returnedQuantities[itemType] = 0;
                }
                returnedQuantities[itemType] += parseInt(match[1]);
              }
            }
          } else if (itemType.includes('Bouteille')) {
            // For Bouteille items, use more precise matching to avoid substring conflicts
            if (itemType === 'Bouteille') {
              // For generic Bouteille, match "Returned: X Bouteille" but not "Bouteille Brand"
              const genericBouteillePattern = /returned:\s*(\d+)\s+bouteilles?(?!\\s+\w)/i;
              const match = description.match(genericBouteillePattern);
              if (match) {
                if (!returnedQuantities[itemType]) {
                  returnedQuantities[itemType] = 0;
                }
                returnedQuantities[itemType] += parseInt(match[1]);
              }
            } else {
              // For branded Bouteille like "Bouteille Vin", match the exact brand
              const pattern = `returned:\\s*(\\d+)\\s+${itemType.replace('Bouteille', 'Bouteilles?')}`;
              const brandedBouteillePattern = new RegExp(pattern, 'i');
              const match = description.match(brandedBouteillePattern);
              if (match) {
                if (!returnedQuantities[itemType]) {
                  returnedQuantities[itemType] = 0;
                }
                returnedQuantities[itemType] += parseInt(match[1]);
              }
            }
          } else {
            // For other items, use word boundary matching
            const escapedItemType = itemType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pattern = new RegExp(`returned:\\s*(\\d+)\\s+${escapedItemType}`, 'i');
            const match = description.match(pattern);
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
    const netReturnableItems: {[key: string]: number} = {};
    Object.entries(returnableItems).forEach(([itemType, total]) => {
      const returned = returnedQuantities[itemType] || 0;
      const remaining = Math.max(0, total - returned);
      if (remaining > 0) {
        netReturnableItems[itemType] = remaining;
      }
    });
    
    return netReturnableItems;
  };

  const handleSaveName = async () => {
    if (!editedName.trim() || editedName.trim() === client.name) {
      setIsEditingName(false);
      setEditedName(client.name);
      return;
    }

    setIsSaving(true);
    try {
      const updatedClient = {
        ...client,
        name: editedName.trim()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ')
      };
      
      await updateClient(updatedClient);
      setIsEditingName(false);
    } catch (error) {
      showAlert({ type: 'error', message: 'Failed to update client name' });
      setEditedName(client.name);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setEditedName(client.name);
  };

  // Filter transactions based on selected filter
  const getFilteredTransactions = () => {
    const allTransactions = transactions
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .filter(transaction => {
        // For returnable filter, allow zero amount transactions if they have returnable items
        if (transactionFilter === 'returnable') {
          const description = transaction.description.toLowerCase();
          const hasReturnableItems = description.includes('chopine') || description.includes('bouteille');
          const isReturnTransaction = description.includes('returned');
          return transaction.amount >= 0 && hasReturnableItems && !isReturnTransaction;
        }
        
        // For other filters, exclude zero amount transactions
        return transaction.amount >= 0;
      });

    switch (transactionFilter) {
      case 'returnable':
        // Simplified returnable filter - show transactions that contain chopine or bouteille
        const returnableTransactions = allTransactions.filter(transaction => {
          // Skip return transactions
          if (transaction.description.toLowerCase().includes('returned')) {
            return false;
          }
          
          const description = transaction.description.toLowerCase();
          
          // Must contain returnable items
          const hasReturnableItems = description.includes('chopine') || description.includes('bouteille');
          
          return hasReturnableItems;
        });
        
        return returnableTransactions;
      
      case 'taken':
        return allTransactions.filter(transaction => 
          transaction.amount > 0 && !transaction.description.toLowerCase().includes('returned')
        );
      
      case 'returned':
        return allTransactions.filter(transaction => 
          transaction.description.toLowerCase().includes('returned')
        );
      
      case 'all':
      default:
        return allTransactions;
    }
  };

  const filteredTransactions = getFilteredTransactions();

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999] select-none">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden select-none">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 select-none">
          <div>
            {!isEditingName ? (
              <div className="flex items-center gap-2 select-none">
                <h2 className="text-2xl font-semibold text-gray-900 select-none">{client.name}</h2>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="p-1 text-gray-500 hover:text-gray-700 transition-colors select-none"
                  title="Edit client name"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 select-none">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => {
                    // Smart capitalization that handles parentheses
                    const formatted = e.target.value.replace(/(^|\s)\w/g, (word) => {
                      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                    });
                    setEditedName(formatted);
                  }}
                  className="text-2xl font-semibold text-gray-900 bg-transparent border-b-2 border-blue-500 focus:outline-none select-text"
                  disabled={isSaving}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                />
                <div className="flex gap-1 select-none">
                  <button
                    onClick={handleSaveName}
                    disabled={isSaving}
                    className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 select-none"
                  >
                    {isSaving ? '...' : '✓'}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 select-none"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
            <p className="text-gray-600 select-none">Client ID: {client.id}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Close Button */}
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors select-none"
            >
              <X size={24} />
            </button>
          </div>
        </div>

      {/* Modal for confirmations */}
      {modal.type && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999] overflow-hidden select-none">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto select-none">
            
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 select-none">
              <div className="flex items-center gap-3 select-none">
                <div className={`p-2 rounded-full select-none ${
                  modal.type === 'success' ? 'bg-green-100' :
                  modal.type === 'error' ? 'bg-red-100' :
                  'bg-yellow-100'
                }`}>
                  {modal.type === 'success' ? (
                    <CheckCircle size={20} className="text-green-600" />
                  ) : modal.type === 'error' ? (
                    <X size={20} className="text-red-600" />
                  ) : (
                    <AlertTriangle size={20} className="text-yellow-600" />
                  )}
                </div>
                <h2 className="text-xl font-semibold text-gray-900 select-none">{modal.title}</h2>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 select-none">
              <p className="text-gray-700 whitespace-pre-line select-none">{modal.message}</p>
              
              <div className="flex gap-3 mt-6 select-none">
                {modal.type === 'confirm' && modal.onCancel && (
                  <button
                    onClick={modal.onCancel}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors select-none"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={modal.onConfirm}
                  className={`${modal.type === 'confirm' ? 'flex-1' : 'w-full'} px-4 py-2 rounded-lg transition-colors select-none ${
                    modal.type === 'success' ? 'bg-green-500 hover:bg-green-600 text-white' :
                    modal.type === 'error' ? 'bg-red-500 hover:bg-red-600 text-white' :
                    'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  {modal.type === 'confirm' ? 'Continue' : 'OK'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
        {/* Content */}
        <div className="p-6 flex-1 select-none" style={{ 
          maxHeight: 'calc(90vh - 120px)',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}>
          
          {/* Summary */}
          <div className="bg-red-50 rounded-lg p-4 mb-6 select-none">
            <h3 className="text-lg font-semibold text-red-800 mb-2 select-none">Outstanding Balance</h3>
            <p className="text-3xl font-bold text-red-600 select-none">Rs {totalDebt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>

          {/* Returnable Items Section */}
          {(() => {
            const returnableItems = getReturnableItems();
            const hasReturnableItems = Object.keys(returnableItems).length > 0;
            
            return hasReturnableItems ? (
              <div className="bg-orange-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-orange-800">Returnable Items</h3>
                  <button
                    onClick={async () => {
                      // Show confirmation modal instead of window.confirm
                      setModal({
                        type: 'confirm',
                        title: 'Clear All Returnable Items',
                        message: `Clear all returnable items for ${client.name}? This will mark all Chopine and Bouteille items as returned.`,
                        onConfirm: async () => {
                          try {
                            setModal({ type: null, title: '', message: '' });
                            // Process returns for all items
                            for (const [itemType, quantity] of Object.entries(returnableItems)) {
                              const returnDescription = `Returned: ${quantity} ${itemType}${quantity > 1 ? 's' : ''}`;
                              await addTransaction(client, returnDescription, 0);
                            }
                            
                            // Show duplicate card with transaction description to trigger arrows
                            window.dispatchEvent(new CustomEvent('showDuplicateCard', {
                              detail: { 
                                ...client,
                                isAccountClear: false,
                                message: 'All returnable items cleared successfully!',
                                transactionDescription: 'Returned all returnable items'
                              }
                            }));
                            // Close modal after clearing
                            onClose();
                          } catch (error) {
                            setModal({
                              type: 'error',
                              title: 'Error',
                              message: 'Failed to clear returnable items',
                              onConfirm: () => setModal({ type: null, title: '', message: '' })
                            });
                          }
                        },
                        onCancel: () => setModal({ type: null, title: '', message: '' })
                      });
                    }}
                    className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
                  >
                    Clear All
                  </button>
                </div>
                <div className="space-y-3">
                  {Object.entries(returnableItems)
                    .sort(([a], [b]) => {
                      // Sort Chopine first, then by name
                      if (a.includes('Chopine') && !b.includes('Chopine')) return -1;
                      if (!a.includes('Chopine') && b.includes('Chopine')) return 1;
                      return a.localeCompare(b);
                    })
                    .map(([itemType, quantity]) => (
                      <ReturnableItemRow
                        key={itemType}
                        itemType={itemType}
                        quantity={quantity}
                        client={client}
                        showAlert={showAlert}
                        onUpdate={() => {
                          // Force re-render by updating a dummy state
                          setEditedName(prev => prev);
                        }}
                      />
                    ))
                  }
                </div>
              </div>
            ) : null;
          })()}

          {/* Transactions Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
              <Receipt size={20} className="text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">Items Taken</h3>
              </div>
              
              {/* Filter Dropdown */}
              <div className="relative">
                <select
                  value={transactionFilter}
                  onChange={(e) => setTransactionFilter(e.target.value as 'all' | 'returnable' | 'taken' | 'returned')}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All ({transactions && Array.isArray(transactions) ? transactions.filter(t => t.amount >= 0).length : 0})</option>
                  <option value="returnable">Returnable ({transactions && Array.isArray(transactions) ? transactions.filter(t => {
                    if (t.description.toLowerCase().includes('returned')) return false;
                    const desc = t.description.toLowerCase();
                    return desc.includes('chopine') || desc.includes('bouteille');
                  }).length : 0})</option>
                  <option value="taken">Taken ({transactions && Array.isArray(transactions) ? transactions.filter(t => t.amount > 0 && !t.description.toLowerCase().includes('returned')).length : 0})</option>
                  <option value="returned">Returned ({transactions && Array.isArray(transactions) ? transactions.filter(t => t.description.toLowerCase().includes('returned')).length : 0})</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <Filter size={16} className="text-gray-400" />
                </div>
              </div>
            </div>
            
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-500">No transactions found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTransactions
                  .map((transaction) => (
                  <div key={transaction.id} className="bg-gray-50 rounded-lg p-4">
                    <div className={`${transaction.amount > 0 ? 'flex justify-between items-start' : ''} mb-2`}>
                      <h4 className="font-medium text-gray-800">{transaction.description}</h4>
                      {transaction.amount > 0 && (
                        <span className={`text-lg font-semibold ${
                          transaction.description.toLowerCase().includes('returned')
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                          {transaction.description.toLowerCase().includes('returned')
                            ? 'Returned'
                            : `Rs ${transaction.amount.toFixed(2)}`
                          }
                        </span>
                      )}
                      {transaction.amount === 0 && transaction.description.toLowerCase().includes('returned') && (
                        <span className="text-lg font-semibold text-green-600">
                          Returned
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar size={14} />
                      <span>
                        {transaction.date.toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        }).replace(/\s/g, '-')} {transaction.date.toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payments Section */}
          {payments.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <CreditCard size={20} className="text-green-600" />
                <h3 className="text-lg font-semibold text-gray-8800">Payment History</h3>
              </div>
              
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div key={payment.id} className="bg-green-50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-800">
                        {payment.type === 'partial' ? 'Partial Payment' : 'Full Settlement'}
                      </h4>
                      {(payment.type === 'partial' || payment.amount > 0) && (
                        <span className="text-lg font-semibold text-green-600">
                          -Rs {payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar size={14} />
                      <span>
                        {payment.date.toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        }).replace(/\s/g, '-')} at {payment.date.toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

/**
 * RETURNABLE ITEM ROW COMPONENT
 * =============================
 */
interface ReturnableItemRowProps {
  itemType: string;
  quantity: number;
  client: Client;
  showAlert: (options: { type: 'error'; message: string }) => void;
  onUpdate: () => void;
}

const ReturnableItemRow: React.FC<ReturnableItemRowProps> = ({ itemType, quantity, client, showAlert, onUpdate }) => {
  const { addTransaction } = useCredit();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [pendingQuantity, setPendingQuantity] = React.useState(0);
  
  // Declare displayItemType here so it's accessible throughout the component
  const [displayItemType, setDisplayItemType] = React.useState(itemType);

  const handleQuantityChange = (change: number) => {
    setPendingQuantity(prev => Math.max(0, Math.min(quantity, prev + change)));
  };

  const handleProcessReturn = async () => {
    if (pendingQuantity === 0) return;
    
    try {
      setIsProcessing(true);
      // Create unique return transaction with timestamp to prevent ID conflicts
      // Don't pluralize brand names - only add 's' to the base item type
      let returnDescription = `Returned: ${pendingQuantity} `;
      
      if (itemType.includes('Chopine')) {
        // For Chopine items: "Returned: 2 Chopines Beer" (pluralize Chopine, not brand)
        const brand = itemType.replace('Chopine', '').trim();
        returnDescription += `Chopine${pendingQuantity > 1 ? 's' : ''}${brand ? ` ${brand}` : ''}`;
      } else if (itemType.includes('L ')) {
        // For sized bottles: "Returned: 2 1.5L Green" (don't pluralize brand)
        returnDescription += itemType;
      } else if (itemType.includes('Bouteille')) {
        // For regular bottles: "Returned: 2 Bouteilles Green" (pluralize Bouteille, not brand)
        // Use the same logic as Chopine
        const brand = itemType.replace('Bouteille', '').trim();
        returnDescription += `Bouteille${pendingQuantity > 1 ? 's' : ''}${brand ? ` ${brand}` : ''}`;
      } else {
        // For other items: add 's' only if quantity > 1
        returnDescription += `${itemType}${pendingQuantity > 1 ? 's' : ''}`;
      }
      
      const uniqueReturnDescription = `${returnDescription} - ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
      await addTransaction(client, uniqueReturnDescription, 0);
      setPendingQuantity(0);
      
      // Update displayItemType for the button text
      let newDisplayItemType = itemType;
      if (itemType.includes('Chopine')) {
        const brand = itemType.replace('Chopine', '').trim();
        newDisplayItemType = `Chopine${pendingQuantity > 1 ? 's' : ''}${brand ? ` ${brand}` : ''}`;
      } else if (itemType.includes('Bouteille')) {
        const brand = itemType.replace('Bouteille', '').trim();
        newDisplayItemType = `Bouteille${pendingQuantity > 1 ? 's' : ''}${brand ? ` ${brand}` : ''}`;
      } else if (pendingQuantity > 1) {
        newDisplayItemType = `${itemType}s`;
      }
      
      setDisplayItemType(newDisplayItemType);
      
      window.dispatchEvent(new CustomEvent('showDuplicateCard', {
        detail: { 
          ...client,
          isAccountClear: false,
          message: `${pendingQuantity} ${newDisplayItemType} returned successfully!`,
          transactionDescription: `${uniqueReturnDescription}`
        }
      }));
      
      // Force a re-render of the parent component to update scrolling tabs
      window.dispatchEvent(new CustomEvent('creditDataChanged', {
        detail: {
          clientId: client.id,
          source: 'return'
        }
      }));
      
      // Don't close modal automatically - let user see the update and close manually
      // This allows the big card to update properly
    } catch (error) {
      showAlert({ type: 'error', message: 'Failed to process return' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-3 border border-orange-200">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="font-medium text-orange-800">{itemType}</h4>
          <p className="text-sm text-orange-600">Available: {quantity}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleQuantityChange(-1)}
            disabled={pendingQuantity === 0}
            className="w-8 h-8 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 rounded-full flex items-center justify-center transition-colors"
          >
            <Minus size={16} />
          </button>
          <span className="w-8 text-center font-medium">{pendingQuantity}</span>
          <button
            onClick={() => handleQuantityChange(1)}
            disabled={pendingQuantity >= quantity}
            className="w-8 h-8 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-full flex items-center justify-center transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
      
      {pendingQuantity > 0 && (
        <button
          onClick={handleProcessReturn}
          disabled={isProcessing}
          className="w-full px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md transition-colors disabled:opacity-50 text-sm"
        >
          {isProcessing ? 'Processing...' : `Return ${pendingQuantity} ${displayItemType}`}
        </button>
      )}
    </div>
  );
};

export default ClientDetailModal;