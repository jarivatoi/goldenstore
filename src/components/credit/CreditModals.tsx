import React from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import { Client } from '../../types';
import { useCredit } from '../../context/CreditContext';
import ConfirmationModal from '../ConfirmationModal';

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
  isDeleting?: boolean;
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
  isDeleting = false
}) => {
  const { clients, getClientTotalDebt } = useCredit();

  return (
    <>
      {/* Settings Modal */}
      {showSettings && (
        createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-hidden" style={{ height: '100vh' }}>
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
              
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999] overflow-hidden select-none" style={{ height: '100vh' }}>
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden select-none">
              
              {/* Header */}
              <div className="flex justify-between items-center p-6 border-b border-gray-200 select-none">
                <div className="flex items-center gap-3 select-none">
                  <div className="bg-red-100 p-2 rounded-full select-none">
                    <Trash2 size={20} className="text-red-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 select-none">Delete Client</h2>
                </div>
                <button 
                  onClick={onCancelDelete}
                  disabled={isDeleting}
                  className="text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50 select-none"
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
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 select-none">
                    <div className="flex items-start gap-3 select-none">
                      <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="select-none">
                        <h4 className="font-medium text-red-800 mb-1 select-none">Warning</h4>
                        <ul className="text-sm text-red-700 space-y-1 select-none">
                          <li className="select-none">• This action cannot be undone</li>
                          <li className="select-none">• All transactions will be permanently deleted</li>
                          <li className="select-none">• Payment history will be lost</li>
                          <li className="select-none">• Client ID will become available for reuse</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3 select-none">
                    Type <strong>DELETE</strong> to confirm:
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => onDeleteConfirmTextChange(e.target.value)}
                    placeholder="Type DELETE to confirm"
                    disabled={isDeleting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="flex gap-3 select-none">
                  <button
                    onClick={onCancelDelete}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed select-none"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onConfirmDelete}
                    disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors select-none"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Client'}
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