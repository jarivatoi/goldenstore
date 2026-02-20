import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Plus, User, ArrowLeft, ArrowUp } from 'lucide-react';
import { useCredit } from '../context/CreditContext';
import { Client } from '../types';
import { useNotification } from '../context/NotificationContext';

interface ClientSearchModalProps {
  calculatorValue: string;
  onClose: () => void;
  onAddToClient: (client: Client, description: string) => void;
  linkedClient?: Client | null; // Add optional linked client prop
  onResetCalculator?: () => void;
  description?: string; // Add description prop
  onDescriptionChange?: (description: string) => void; // Add callback for description changes
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
  onResetCalculator,
  description = '', // Default to empty string
  onDescriptionChange
}) => {
  const { addClient, searchClients } = useCredit();
  const { showAlert } = useNotification();
  const [searchQuery, setSearchQuery] = useState('');
  const [localDescription, setLocalDescription] = useState(description); // Use local state initialized with prop
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClientName, setNewClientName] = useState(linkedClient?.name || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [descriptionHistory, setDescriptionHistory] = useState<string[]>([]);
  const [pendingNumber, setPendingNumber] = useState('');
  const [error, setError] = useState('');
  const wasOpenedRef = useRef(false); // Track if modal was opened before

  // Sync local description with prop when it changes
  useEffect(() => {
    if (description !== undefined && description !== localDescription) {
      setLocalDescription(description);
    }
  }, [description, localDescription]);

  // Update parent component when local description changes
  const updateDescription = (newDescription: string) => {
    setLocalDescription(newDescription);
    if (onDescriptionChange) {
      onDescriptionChange(newDescription);
    }
  };

  // Prevent background scrolling when modal is open
  React.useEffect(() => {
    // Store original body overflow
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const scrollY = window.scrollY;
    
    // Prevent background scrolling
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    
    // Mark modal as opened
    wasOpenedRef.current = true;
    
    return () => {
      // Restore original styles
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = '';
      
      // Restore scroll position
      window.scrollTo(0, scrollY);
    };
  }, []);

  const handleXClose = () => {
    // Reset all state when X button is pressed
    updateDescription('');
    setDescriptionHistory([]);
    setPendingNumber('');
    setError('');
    setSearchQuery('');
    setShowAddClient(false);
    setNewClientName(linkedClient?.name || '');
    // Reset the opened flag
    wasOpenedRef.current = false;
    // Only reset calculator when X button is pressed, not when going back
    if (onResetCalculator) {
      onResetCalculator();
    }
    // Ensure modal closes
    onClose();
  };

  const handleBackClose = () => {
    // Preserve calculator state when back button is pressed
    // Only reset modal-specific state EXCEPT for description which should be preserved
    setPendingNumber('');
    setError('');
    setSearchQuery('');
    setShowAddClient(false);
    setNewClientName(linkedClient?.name || '');
    // DON'T reset calculator or wasOpenedRef - just close modal
    onClose();
  };

  // Reset state when modal is opened for the first time in a session
  React.useEffect(() => {
    // Only reset if this is the first time the modal is opened in this session
    if (!wasOpenedRef.current) {
      setLocalDescription(description);
      setDescriptionHistory([]);
      setPendingNumber('');
      setError('');
      setSearchQuery('');
      setShowAddClient(false);
      setNewClientName(linkedClient?.name || '');
      wasOpenedRef.current = true;
    }
  }, []); // Empty dependency array means this runs once when component mounts
  
  const filteredClients = searchClients(searchQuery).sort((a, b) => 
    a.name.localeCompare(b.name)
  );
  
  const handleAddToExistingClient = (client: Client) => {
    if (!localDescription.trim()) {
      showAlert({
        type: 'warning',
        message: 'Please enter a description for this transaction'
      });
      return;
    }
    
    setError('');
    try {
      onAddToClient(client, localDescription.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add transaction');
    }
  };

  // If there's a linked client, automatically add to that client
  React.useEffect(() => {
    if (linkedClient && localDescription.trim()) {
      // Auto-add when description is entered for linked client
      // This could be triggered by a timer or immediate action
    }
  }, [linkedClient, localDescription]);
  const handleAddNewClient = async () => {
    if (!newClientName.trim()) {
      showAlert({ type: 'warning', message: 'Please enter a client name' });
      return;
    }
    
    if (!localDescription.trim()) {
      showAlert({ type: 'warning', message: 'Please enter a description for this transaction' });
      return;
    }

    setError('');
    const amount = parseFloat(calculatorValue);
    if (isNaN(amount) || !isFinite(amount) || amount < 0) {
      setError('Invalid amount');
      return;
    }
    try {
      const newClient = await addClient(newClientName);
      onAddToClient(newClient, localDescription.trim());
    } catch (error) {
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
    setDescriptionHistory(prev => [...prev, localDescription]);

    // Automatically insert pending number if it exists
    // For Chopine and Bouteille (including sized bottles) without a pending number, default to "1"
    let newItem: string;
    if (pendingNumber) {
      newItem = `${pendingNumber} ${action}`;
    } else if (action === 'Chopine' || action === 'Bouteille' || action.startsWith('Bouteille ')) {
      newItem = `1 ${action}`;
    } else {
      newItem = action;
    }

    if (localDescription.trim() === '') {
      updateDescription(newItem + ' ');
    } else {
      updateDescription(prev => prev + ', ' + newItem + ' ');
    }

    // Clear pending number after use
    setPendingNumber('');
  };

  const handleUndo = () => {
    if (descriptionHistory.length > 0) {
      const previousDescription = descriptionHistory[descriptionHistory.length - 1];
      updateDescription(previousDescription);
      setDescriptionHistory(prev => prev.slice(0, -1));
    }
  };

  const handleNumericInput = (value: string) => {
    if (value === 'clear') {
      updateDescription('');
      setPendingNumber('');
      setDescriptionHistory([]);
    } else if (value === 'number-backspace') {
      // Remove last digit from pending number
      setPendingNumber(prev => prev.slice(0, -1));
    } else if (value === 'backspace') {
      // Remove the last complete item (e.g., "5 Cig, 10 Can" becomes "5 Cig")
      updateDescription(prev => {
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
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999] select-none search-client-modal"
      style={{
        touchAction: 'none', // Prevent any touch actions on overlay
        overscrollBehavior: 'contain' // Prevent overscroll
      }}
      onClick={(e) => {
        // Close modal when clicking overlay (but not the modal content)
        if (e.target === e.currentTarget) {
          handleBackClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-xl shadow-lg w-full max-w-lg flex flex-col select-none"
        style={{
          maxHeight: '90vh',
          touchAction: 'auto', // Allow normal touch actions within modal
          overscrollBehavior: 'contain' // Prevent overscroll from affecting background
        }}
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside modal from closing it
      >
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-yellow-200 select-none flex-shrink-0">
          <div className="select-none">
            <h2 className="text-xl font-semibold text-gray-900 select-none">
              {linkedClient ? `Add to ${linkedClient.name}` : 'Add to Client'}
            </h2>
            <p className="text-gray-600 select-none">Amount: Rs {calculatorValue}</p>
          </div>
          <div className="flex items-center gap-3 select-none">
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleBackClose();
              }}
              className="flex-shrink-0 w-20 h-20 flex items-center justify-center text-white bg-green-600 hover:bg-green-700 rounded-full transition-colors shadow-xl border-4 border-yellow-400 z-50 select-none"
              style={{ minWidth: '64px', minHeight: '64px' }}
              title="Back to Calculator"
            >
              <ArrowLeft size={36} strokeWidth={4} />
            </button>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleXClose();
              }}
              className="flex-shrink-0 w-20 h-20 flex items-center justify-center text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-colors shadow-xl border-4 border-yellow-400 z-50 select-none"
              style={{ minWidth: '64px', minHeight: '64px' }}
              title="Close and Reset"
            >
              <X size={36} strokeWidth={4} />
            </button>
          </div>
        </div>

        {/* Content - Scrollable Area */}
        <div className="overflow-y-auto flex-1 select-none p-6">
          
          {/* Description Input */}
          <div className="mb-4 select-none">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 select-none">
                Item Description {pendingNumber && <span className="text-blue-600 font-bold">({pendingNumber})</span>}
              </label>
              <div className="flex gap-2 select-none">
                {descriptionHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={handleUndo}
                    className="px-3 py-1 text-xs bg-yellow-500 hover:bg-yellow-600 text-white rounded-md transition-colors select-none"
                  >
                    Undo
                  </button>
                )}
              </div>
            </div>
            <input
              type="text"
              value={localDescription}
              onChange={(e) => {
                // Auto-capitalize as user types while preserving spacing
                const value = e.target.value;
                // Auto-capitalize first letter of each word and add space after comma
                // Also capitalize after "/" for items like "Petit/Gros"
                let formatted = value.replace(/(^|\s|\/)\w/g, (char) => char.toUpperCase());
                // Add space after comma if not already present
                updateDescription(formatted);
              }}
              placeholder="Enter item or service description..."
              className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg select-none">
              <p className="text-red-600 text-sm select-none">{error}</p>
            </div>
          )}

          {/* Numeric Keyboard */}
          <div className="mb-4 select-none">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 select-none">
              {/* First row: 1 2 3 4 5 (empty space) */}
              <div className="grid grid-cols-6 gap-2 mb-2 select-none">
                {['1', '2', '3', '4', '5'].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleNumericInput(num)}
                    className="px-3 py-2 bg-white hover:bg-gray-100 border border-gray-300 rounded font-medium transition-colors text-sm select-none"
                  >
                    {num}
                  </button>
                ))}
                {/* Up arrow button to insert pending number with space */}
                <button
                  type="button"
                  onClick={() => {
                    if (pendingNumber) {
                      // Insert pending number with space
                      const insertText = `${pendingNumber} `;
                      updateDescription(prev => prev + insertText);
                      setPendingNumber(''); // Clear pending number after insertion
                    }
                  }}
                  disabled={!pendingNumber}
                  className="px-3 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white border border-green-500 rounded font-medium transition-colors text-sm select-none flex items-center justify-center check-arrow-button"
                  title={pendingNumber ? `Insert ${pendingNumber} ` : 'Enter a number first'}
                >
                  <ArrowUp size={16} />
                </button>
              </div>
              
              {/* Second row: 6 7 8 9 0 ⌫ */}
              <div className="grid grid-cols-6 gap-2 select-none">
                {['6', '7', '8', '9', '0'].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleNumericInput(num)}
                    className="px-3 py-2 bg-white hover:bg-gray-100 border border-gray-300 rounded font-medium transition-colors text-sm select-none"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleNumericInput('number-backspace')}
                  className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white border border-orange-500 rounded font-medium transition-colors text-sm select-none"
                >
                  ⌫
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 select-none">
              <button
                type="button"
                onClick={() => handleNumericInput('clear')}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors text-sm select-none"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleNumericInput('backspace')}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors text-sm select-none"
              >
                ⌫ Item
              </button>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="mb-4 select-none">
            <label className="block text-sm font-medium text-gray-700 mb-2 select-none">
              Quick Actions
            </label>
            <div className="grid grid-cols-3 gap-2 mb-3 select-none">
              {['Foodstuffs', 'Cig', 'Rum', 'Can', 'Soft Drinks', 'Cakes', 'Chopine', 'Bouteille', 'Bouteille 1L', 'Bouteille 1.5L', 'Bouteille 2L', 'Juice Payment'].map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => handleQuickAction(action)}
                  className="px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg transition-colors select-none"
                >
                  {action}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => handleQuickAction('Others')}
              className="w-full px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors select-none"
            >
              Others
            </button>
          </div>

          {!showAddClient ? (
            <>
              {/* Search Bar */}
              {!linkedClient && (
              <div className="flex items-stretch gap-2 mb-4">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={20} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search clients by name or ID..."
                    className="block w-full py-4 pl-10 pr-4 text-xl border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-3 focus:ring-blue-500 focus:border-blue-500 shadow-sm search-client-input"
                  />
                </div>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="w-14 flex-shrink-0 bg-red-500 hover:bg-red-600 text-white rounded-xl flex items-center justify-center shadow-lg border-2 border-red-600"
                  >
                    <X size={24} />
                  </button>
                )}
              </div>
              )}

              {/* Add New Client Button */}
              {!linkedClient && (
              <button
                onClick={() => {
                  // Remove focus from search input to dismiss keyboard
                  const searchInput = document.querySelector('.search-client-input');
                  if (searchInput) {
                    (searchInput as HTMLInputElement).blur();
                  }
                  // Scroll to top to ensure calculator is visible
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  setShowAddClient(true);
                }}
                className="w-full flex items-center gap-3 p-3 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors mb-4 select-none"
              >
                <div className="bg-green-500 p-2 rounded-full select-none">
                  <Plus size={16} className="text-white" />
                </div>
                <span className="font-medium text-gray-800 select-none">Add New Client</span>
              </button>
              )}

              {/* Linked Client Display */}
              {linkedClient && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg select-none">
                  <div className="flex items-center gap-3 select-none">
                    <div className="bg-blue-500 p-2 rounded-full select-none">
                      <User size={16} className="text-white" />
                    </div>
                    <div className="select-none">
                      <h4 className="font-medium text-gray-800 select-none">{linkedClient.name}</h4>
                      <p className="text-sm text-gray-600 select-none">ID: {linkedClient.id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddToExistingClient(linkedClient)}
                    disabled={!localDescription.trim()}
                    className="w-full mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed select-none"
                  >
                    Add to {linkedClient.name}
                  </button>
                </div>
              )}
              {/* Client List */}
              {!linkedClient && (
              <div className="max-h-64 overflow-y-auto select-none">
                {filteredClients.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 select-none">
                    {searchQuery ? 'No clients found' : 'No clients available'}
                  </div>
                ) : (
                  <div className="space-y-2 select-none">
                    {filteredClients.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => {
                          // Remove focus from search input to dismiss keyboard
                          const searchInput = document.querySelector('.search-client-input');
                          if (searchInput) {
                            (searchInput as HTMLInputElement).blur();
                          }
                          // Scroll to top to ensure calculator is visible
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                          handleAddToExistingClient(client);
                        }}
                        disabled={!localDescription.trim()}
                        className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed select-none"
                      >
                        <div className="bg-blue-100 p-2 rounded-full select-none">
                          <User size={16} className="text-blue-600" />
                        </div>
                        <div className="flex-1 select-none">
                          <h4 className="font-medium text-gray-800 select-none">{client.name}</h4>
                          <p className="text-sm text-gray-500 select-none">ID: {client.id}</p>
                        </div>
                        <div className="text-right select-none">
                          <p className="text-sm text-red-600 font-medium select-none">
                            Rs {client.totalDebt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
            <div className="select-none">
              {/* Add New Client Form */}
              <div className="mb-4 select-none">
                <label className="block text-sm font-medium text-gray-700 mb-2 select-none">
                  Client Name
                </label>
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => {
                    // Auto-capitalize first letter of each word as text is typed (title case)
                    const value = e.target.value;
                    const formatted = value.replace(/(^|\s)\w/g, (match) => match.toUpperCase());
                    setNewClientName(formatted);
                  }}
                  placeholder="Enter client name..."
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 select-text"
                />
              </div>

              <div className="flex gap-3 select-none">
                <button
                  onClick={() => setShowAddClient(false)}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors select-none"
                >
                  Back
                </button>
                <button
                  onClick={handleAddNewClient}
                  disabled={isProcessing || !newClientName.trim() || !localDescription.trim()}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 select-none"
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

export default ClientSearchModal;