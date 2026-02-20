import React from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import { Client } from '../../types';
import { useCredit } from '../../context/CreditContext';

interface CreditModalsProps {
  // Settings Modal
  showSettings: boolean;
  onCloseSettings: () => void;
  onDeleteClient: (client: Client) => void;
  
  // Delete Confirmation Modal
  showDeleteConfirm: boolean;
  clientToDelete: Client | null;
  deleteConfirmText: string;
  onDeleteConfirmTextChange: (text: string) => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  
  // Delete All Clients Modal
  showDeleteAllConfirm: boolean;
  deleteAllPasscode: string;
  onDeleteAllPasscodeChange: (text: string) => void;
  onConfirmDeleteAll: () => void;
  onCancelDeleteAll: () => void;
  
  // Delete All Clients Handler
  onDeleteAllClients: () => void;
}

/**
 * CREDIT MODALS COMPONENT
 * =======================
 * 
 * Contains all modal dialogs for credit management
 */
const CreditModals: React.FC<CreditModalsProps> = ({
  showSettings,
  onCloseSettings,
  onDeleteClient,
  showDeleteConfirm,
  clientToDelete,
  deleteConfirmText,
  onDeleteConfirmTextChange,
  onConfirmDelete,
  onCancelDelete,
  showDeleteAllConfirm,
  deleteAllPasscode,
  onDeleteAllPasscodeChange,
  onConfirmDeleteAll,
  onCancelDeleteAll,
  onDeleteAllClients,
}) => {
  const { clients, getClientTotalDebt } = useCredit();
  const [clientSortOption, setClientSortOption] = React.useState<'id' | 'name'>('id');

  // Sort clients based on selected option
  const sortedClients = React.useMemo(() => {
    return [...clients].sort((a, b) => {
      if (clientSortOption === 'id') {
        // Extract numeric part for proper numeric sorting (G1, G2, G10, G100...)
        const aNum = parseInt(a.id.replace(/\D/g, ''), 10);
        const bNum = parseInt(b.id.replace(/\D/g, ''), 10);
        return aNum - bNum;
      } else {
        return a.name.localeCompare(b.name);
      }
    });
  }, [clients, clientSortOption]);

  return (
    <>
      {/* Settings Modal */}
      {showSettings && (
        createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-hidden">
              
              {/* Header */}
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Client Settings</h2>
                <button 
                  onClick={onCloseSettings}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto flex-1">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Manage All Clients</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Here you can permanently delete clients (e.g., if they have passed away). 
                  Their ID will become available for new clients.
                </p>

                {/* Delete All Clients Button */}
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-red-800">Danger Zone</h4>
                      <p className="text-sm text-red-600">Permanently delete all client data</p>
                    </div>
                    <button
                      onClick={onDeleteAllClients}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Trash2 size={16} />
                      Delete All Clients
                    </button>
                  </div>
                  <p className="text-xs text-red-600">
                    This will permanently delete all {clients.length} clients and their transaction history.
                  </p>
                </div>

                {/* Sort Filter */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sort by:
                  </label>
                  <select
                    value={clientSortOption}
                    onChange={(e) => setClientSortOption(e.target.value as 'id' | 'name')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="id">Client ID (G1, G2...)</option>
                    <option value="name">Client Name (A-Z)</option>
                  </select>
                </div>
                {/* All Clients List */}
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                  {clients.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">No clients found</div>
                  ) : (
                    sortedClients.map((client) => (
                        <div key={client.id} className="flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-800">{client.name}</h4>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>ID: {client.id}</span>
                              <span className={getClientTotalDebt(client.id) > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                                Rs {getClientTotalDebt(client.id).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => onDeleteClient(client)}
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 select-none">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-hidden select-none">
              
              {/* Header */}
              <div className="flex justify-between items-center p-6 border-b border-gray-200 select-none">
                <div className="flex items-center gap-3 select-none">
                  <div className="bg-red-100 p-2 rounded-full select-none">
                    <AlertTriangle size={20} className="text-red-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 select-none">Delete Client</h2>
                </div>
                <button 
                  onClick={onCancelDelete}
                  className="text-gray-500 hover:text-gray-700 transition-colors select-none"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 select-none">
                <div className="mb-6 select-none">
                  <p className="text-gray-700 mb-4 select-none">
                    You are about to permanently delete:
                  </p>
                  <div className="bg-gray-50 p-4 rounded-lg border select-none">
                    <h4 className="font-semibold text-gray-800 select-none">{clientToDelete.name}</h4>
                    <p className="text-sm text-gray-600 select-none">ID: {clientToDelete.id}</p>
                    <p className="text-sm text-gray-600 select-none">
                      Current Debt: Rs {getClientTotalDebt(clientToDelete.id).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="mb-6 select-none">
                  <p className="text-sm text-red-600 mb-3 select-none">
                    ⚠️ This action cannot be undone. All transactions and payment history will be permanently deleted.
                  </p>
                  <p className="text-sm text-gray-600 mb-3 select-none">
                    Enter confirmation code:
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => onDeleteConfirmTextChange(e.target.value)}
                    placeholder=""
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 select-text"
                  />
                </div>

                <div className="flex gap-3 select-none">
                  <button
                    onClick={onCancelDelete}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors select-none"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onConfirmDelete}
                    disabled={deleteConfirmText !== 'DELETE'}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors select-none"
                  >
                    Delete Client
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      )}

      {/* Delete All Clients Confirmation Modal */}
      {showDeleteAllConfirm && (
        createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-hidden">
              
              {/* Header */}
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="bg-red-100 p-2 rounded-full">
                    <AlertTriangle size={20} className="text-red-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Delete All Clients</h2>
                </div>
                <button 
                  onClick={onCancelDeleteAll}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="mb-6">
                  <p className="text-gray-700 mb-4">
                    You are about to permanently delete ALL {clients.length} clients and their data:
                  </p>
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200 mb-4">
                    <ul className="text-sm text-red-700 space-y-1">
                      <li>• All {clients.length} client records</li>
                      <li>• All transaction histories</li>
                      <li>• All payment records</li>
                      <li>• All returnable item tracking</li>
                    </ul>
                  </div>
                </div>

                <div className="mb-6">
                  <p className="text-sm text-red-600 mb-3">
                    ⚠️ This action cannot be undone. All client data will be permanently lost.
                  </p>
                  <p className="text-sm text-gray-600 mb-3">
                    Enter security code:
                  </p>
                  <input
                    type="text"
                    value={deleteAllPasscode}
                    onChange={(e) => onDeleteAllPasscodeChange(e.target.value)}
                    placeholder=""
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={onCancelDeleteAll}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onConfirmDeleteAll}
                    disabled={deleteAllPasscode !== 'DELETE'}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Delete All Clients
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      )}
    </>
  );
};

export default CreditModals;