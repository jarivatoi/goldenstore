import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Plus, User } from 'lucide-react';
import { useCredit } from '../context/CreditContext';
import { Client } from '../types';

interface ClientSearchModalProps {
  calculatorValue: string;
  onClose: () => void;
  onAddToClient: (client: Client, description: string) => void;
  linkedClient?: Client; // Add optional linked client prop
  onResetCalculator?: () => void;
}

/**
 * CLIENT SEARCH MODAL COMPONENT
 * =============================
 * 
 * Shows searchable client list when adding transactions from calculator
 */
const ClientSearchModal: React.FC<ClientSearchModalProps> = ({ 
  calculatorValue, 
  onClose,
  onAddToClient,
  linkedClient,
  onResetCalculator
}) => {
  const { clients, addClient, searchClients } = useCredit();
  const [searchQuery, setSearchQuery] = useState('');
  const [description, setDescription] = useState('');
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClientName, setNewClientName] = useState(linkedClient?.name || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [descriptionHistory, setDescriptionHistory] = useState<string[]>([]);
  const [pendingNumber, setPendingNumber] = useState('');
  const [error, setError] = useState('');

  // Handle close with reset
  const handleClose = () => {
    // Unlink client when modal closes
    if (onResetCalculator) {
      onResetCalculator();
    }
    onClose();
  };

  const handleXClose = () => {
    // Reset all state when X button is pressed
    setDescription('');
    setDescriptionHistory([]);
    setPendingNumber('');
    setError('');
    setSearchQuery('');
    setShowAddClient(false);
    setNewClientName(linkedClient?.name || '');
    // Unlink client when closing modal
    if (onResetCalculator) {
      onResetCalculator();
    }
    onClose();
  };

  // Reset all state when modal is opened
  React.useEffect(() => {
    console.log('🔄 ClientSearchModal: Resetting state for calculatorValue:', calculatorValue);
    setDescription('');
    setDescriptionHistory([]);
    setPendingNumber('');
    setError('');
    setSearchQuery('');
    setShowAddClient(false);
    setNewClientName(linkedClient?.name || '');
  }, [calculatorValue]); // Reset whenever calculatorValue changes (new modal session)
  
  const filteredClients = searchClients(searchQuery).sort((a, b) => 
    a.name.localeCompare(b.name)
  );
  
  const handleAddToExistingClient = (client: Client) => {
    if (!description.trim()) {
      alert('Please enter a description for this transaction');
      return;
    }
    
    setError('');
    try {
      onAddToClient(client, description.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add transaction');
    }
  };

  // If there's a linked client, automatically add to that client
  React.useEffect(() => {
    if (linkedClient && description.trim()) {
      // Auto-add when description is entered for linked client
      // This could be triggered by a timer or immediate action
    }
  }, [linkedClient, description]);
  const handleAddNewClient = async () => {
    if (!newClientName.trim()) {
      alert('Please enter a client name');
      return;
    }
    
    if (!description.trim()) {
      alert('Please enter a description for this transaction');
      return;
    }

    setError('');
    setIsProcessing(true);
    try {
      const newClient = await addClient(newClientName);
      console.log('New client added:', newClient);
      onAddToClient(newClient, description.trim());
    } catch (error) {
      console.error('Error adding new client:', error);
      setError(error instanceof Error ? error.message : 'Failed to add client');
      if (error instanceof Error && error.name === 'DuplicateClientError') {
        // Don't close modal on duplicate client error, let user try again
        setNewClientName(''); // Clear the duplicate name
        return;
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickAction = (action: string) => {
    // Save current description to history for undo
    setDescriptionHistory(prev => [...prev, description]);
    
    const newItem = pendingNumber ? `${pendingNumber} ${action} ` : `${action} `;
    
    if (description.trim() === '') {
      setDescription(newItem);
    } else {
      setDescription(prev => prev + ', ' + newItem);
    }
    
    // Clear pending number after use
    setPendingNumber('');
  };

  const handleUndo = () => {
    if (descriptionHistory.length > 0) {
      const previousDescription = descriptionHistory[descriptionHistory.length - 1];
      setDescription(previousDescription);
      setDescriptionHistory(prev => prev.slice(0, -1));
    }
  };

  const handleNumericInput = (value: string) => {
    if (value === 'clear') {
      setDescription('');
      setPendingNumber('');
      setDescriptionHistory([]);
    } else if (value === 'number-backspace') {
      // Remove last digit from pending number
      setPendingNumber(prev => prev.slice(0, -1));
    } else if (value === 'backspace') {
      // Remove the last complete item (e.g., "5 Cig, 10 Can" becomes "5 Cig")
      setDescription(prev => {
        const parts = prev.split(', ');
        if (parts.length > 1) {
          return parts.slice(0, -1).join(', ');
        } else {
          return '';
        }
      });
    } else {
      // Build up the pending number
      setPendingNumber(prev => prev + value);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-hidden" style={{ height: '100vh' }}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg max-h-[80vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {linkedClient ? `Add to ${linkedClient.name}` : 'Add to Client'}
            </h2>
            <p className="text-gray-600">Amount: Rs {calculatorValue}</p>
          </div>
          <button 
            onClick={handleXClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 120px)' }}>
          
          {/* Description Input */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Item Description {pendingNumber && <span className="text-blue-600 font-bold">({pendingNumber})</span>}
              </label>
              <div className="flex gap-2">
                {descriptionHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={handleUndo}
                    className="px-3 py-1 text-xs bg-yellow-500 hover:bg-yellow-600 text-white rounded-md transition-colors"
                  >
                    Undo
                  </button>
                )}
              </div>
            </div>
            <input
              type="text"
              value={description}
              onChange={(e) => {
                // Auto-capitalize as user types while preserving spacing
                const value = e.target.value;
               // Auto-capitalize first letter of each word and add space after comma
               let formatted = value.replace(/\b\w/g, (char) => char.toUpperCase());
               // Add space after comma if not already present
               formatted = formatted.replace(/,(?!\s)/g, ', ');
                setDescription(formatted);
              }}
              placeholder="Enter item or service description..."
              className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Numeric Keyboard */}
          <div className="mb-4">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              {/* First row: 1 2 3 4 5 (empty space) */}
              <div className="grid grid-cols-6 gap-2 mb-2">
                {['1', '2', '3', '4', '5'].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleNumericInput(num)}
                    className="px-3 py-2 bg-white hover:bg-gray-100 border border-gray-300 rounded font-medium transition-colors text-sm"
                  >
                    {num}
                  </button>
                ))}
                {/* Empty space */}
                <div></div>
              </div>
              
              {/* Second row: 6 7 8 9 0 ⌫ */}
              <div className="grid grid-cols-6 gap-2">
                {['6', '7', '8', '9', '0'].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleNumericInput(num)}
                    className="px-3 py-2 bg-white hover:bg-gray-100 border border-gray-300 rounded font-medium transition-colors text-sm"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleNumericInput('number-backspace')}
                  className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white border border-orange-500 rounded font-medium transition-colors text-sm"
                >
                  ⌫
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                type="button"
                onClick={() => handleNumericInput('clear')}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors text-sm"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleNumericInput('backspace')}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors text-sm"
              >
                ⌫ Item
              </button>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Actions
            </label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {['Food Stuffs', 'Cig', 'Rum', 'Can', 'Soft Drinks', 'Cakes', 'Chopine', 'Bouteille', '1L Bouteille', '1.5L Bouteille', '0.5L', '1.5L', '2L'].map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => handleQuickAction(action)}
                  className="px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg transition-colors"
                >
                  {action}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => handleQuickAction('Others')}
              className="w-full px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors"
            >
              Others
            </button>
          </div>

          {!showAddClient ? (
            <>
              {/* Search Bar */}
              {!linkedClient && (
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={20} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search clients by name or ID..."
                  className="block w-full pl-10 pr-4 py-4 text-xl border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-3 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                />
              </div>
              )}

              {/* Add New Client Button */}
              {!linkedClient && (
              <button
                onClick={() => setShowAddClient(true)}
                className="w-full flex items-center gap-3 p-3 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors mb-4"
              >
                <div className="bg-green-500 p-2 rounded-full">
                  <Plus size={16} className="text-white" />
                </div>
                <span className="font-medium text-gray-800">Add New Client</span>
              </button>
              )}

              {/* Linked Client Display */}
              {linkedClient && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-500 p-2 rounded-full">
                      <User size={16} className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">{linkedClient.name}</h4>
                      <p className="text-sm text-gray-600">ID: {linkedClient.id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddToExistingClient(linkedClient)}
                    disabled={!description.trim()}
                    className="w-full mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add to {linkedClient.name}
                  </button>
                </div>
              )}
              {/* Client List */}
              {!linkedClient && (
              <div className="max-h-64 overflow-y-auto">
                {filteredClients.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {searchQuery ? 'No clients found' : 'No clients available'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredClients.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => handleAddToExistingClient(client)}
                        disabled={!description.trim()}
                        className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="bg-blue-100 p-2 rounded-full">
                          <User size={16} className="text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800">{client.name}</h4>
                          <p className="text-sm text-gray-500">ID: {client.id}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-red-600 font-medium">
                            Rs {client.totalDebt.toFixed(2)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              )}
            </>
          ) : (
            <div>
              {/* Add New Client Form */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Name
                </label>
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => {
                    const formatted = e.target.value
                      .split(' ')
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                      .join(' ');
                    setNewClientName(formatted);
                  }}
                  placeholder="Enter client name..."
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddClient(false)}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleAddNewClient}
                  disabled={isProcessing || !newClientName.trim() || !description.trim()}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Adding...' : 'Add Client'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};






export default ClientSearchModal