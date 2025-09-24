import React from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Receipt, CreditCard, Plus, Edit2, Minus, Filter } from 'lucide-react';
import { Client } from '../types';
import { useCredit } from '../context/CreditContext';

interface ClientDetailModalProps {
  client: Client;
  onClose: () => void;
  onQuickAdd?: (client: Client) => void;
}

/**
 * CLIENT DETAIL MODAL COMPONENT
 * =============================
 * 
 * Shows detailed breakdown of client's transactions and payments
 */
const ClientDetailModal: React.FC<ClientDetailModalProps> = ({ client, onClose, onQuickAdd }) => {
  const { getClientTransactions, getClientPayments, getClientTotalDebt, updateClient, moveClientToFront, addTransaction } = useCredit();
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [editedName, setEditedName] = React.useState(client.name);
  const [isSaving, setIsSaving] = React.useState(false);
  const [transactionFilter, setTransactionFilter] = React.useState<'all' | 'returnable' | 'taken' | 'returned'>('all');
  
  const transactions = getClientTransactions(client.id);
  const payments = getClientPayments(client.id);
  const totalDebt = getClientTotalDebt(client.id);

  const handleClose = () => {
    onClose();
  };

  // Also move to front when using the X button or any other close method
  const handleAnyClose = () => {
    // Move client to end (rightmost, near calculator) when modal is closed
    moveClientToFront(client.id);
    onClose();
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
      alert('Failed to update client name');
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
      .filter(transaction => transaction.amount >= 0);

    switch (transactionFilter) {
      case 'returnable':
        return allTransactions.filter(transaction => {
          if (transaction.description.toLowerCase().includes('returned')) return false;
          const description = transaction.description.toLowerCase();
          return description.includes('chopine') || description.includes('bouteille');
        });
      
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-hidden" style={{ height: '100vh' }}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            {!isEditingName ? (
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-semibold text-gray-900">{client.name}</h2>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                  title="Edit client name"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="text-2xl font-semibold text-gray-900 bg-transparent border-b-2 border-blue-500 focus:outline-none"
                  disabled={isSaving}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                />
                <div className="flex gap-1">
                  <button
                    onClick={handleSaveName}
                    disabled={isSaving}
                    className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                  >
                    {isSaving ? '...' : '✓'}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
            <p className="text-gray-600">Client ID: {client.id}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Close Button */}
            <button 
              onClick={handleAnyClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 160px)' }}>
          
          {/* Summary */}
          <div className="bg-red-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Outstanding Balance</h3>
            <p className="text-3xl font-bold text-red-600">Rs {totalDebt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>

          {/* Returnable Items Section */}
          {(() => {
            // Get returnable items for this client
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
              transactions
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
            
            const returnableItems = getReturnableItems();
            const hasReturnableItems = Object.keys(returnableItems).length > 0;
            
            return hasReturnableItems ? (
              <div className="bg-orange-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-orange-800">Returnable Items</h3>
                  <button
                    onClick={async () => {
                      const confirmed = window.confirm(
                        `Clear all returnable items for ${client.name}? This will mark all Chopine and Bouteille items as returned.`
                      );
                      if (confirmed) {
                        try {
                          // Process returns for all items
                          for (const [itemType, quantity] of Object.entries(returnableItems)) {
                            const returnDescription = `Returned: ${quantity} ${itemType}${quantity > 1 ? 's' : ''}`;
                            await addTransaction(client, returnDescription, 0);
                          }
                          // Close modal after clearing
                          handleAnyClose();
                        } catch (error) {
                          alert('Failed to clear returnable items');
                        }
                      }
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
                  <option value="all">All ({transactions.filter(t => t.amount >= 0).length})</option>
                  <option value="returnable">Returnable ({transactions.filter(t => {
                    if (t.description.toLowerCase().includes('returned')) return false;
                    const desc = t.description.toLowerCase();
                    return desc.includes('chopine') || desc.includes('bouteille');
                  }).length})</option>
                  <option value="taken">Taken ({transactions.filter(t => t.amount > 0 && !t.description.toLowerCase().includes('returned')).length})</option>
                  <option value="returned">Returned ({transactions.filter(t => t.description.toLowerCase().includes('returned')).length})</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <Filter size={16} className="text-gray-400" />
                </div>
              </div>
            </div>
            
            {filteredTransactions.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No transactions found</p>
            ) : (
              <div className="space-y-3">
                {filteredTransactions.map((transaction) => (
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
                          month: '2-digit',
                          year: 'numeric'
                        })} {transaction.date.toLocaleTimeString('en-GB', {
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
                <h3 className="text-lg font-semibold text-gray-800">Payment History</h3>
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
                          -Rs {payment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar size={14} />
                      <span>
                        {payment.date.toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })} at {payment.date.toLocaleTimeString('en-GB', {
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
            onClick={handleAnyClose}
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
  onUpdate: () => void;
}

const ReturnableItemRow: React.FC<ReturnableItemRowProps> = ({ itemType, quantity, client, onUpdate }) => {
  const { addTransaction } = useCredit();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [pendingQuantity, setPendingQuantity] = React.useState(0);

  const handleQuantityChange = (change: number) => {
    setPendingQuantity(prev => Math.max(0, Math.min(quantity, prev + change)));
  };

  const handleProcessReturn = async () => {
    if (pendingQuantity === 0) return;
    
    try {
      setIsProcessing(true);
      const returnDescription = `Returned: ${pendingQuantity} ${itemType}${pendingQuantity > 1 ? 's' : ''}`;
      await addTransaction(client, returnDescription, 0);
      setPendingQuantity(0);
      onUpdate();
    } catch (error) {
      alert('Failed to process return');
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
          {isProcessing ? 'Processing...' : `Return ${pendingQuantity} ${itemType}${pendingQuantity > 1 ? 's' : ''}`}
        </button>
      )}
    </div>
  );
};

export default ClientDetailModal;