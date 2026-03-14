import React from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, RotateCcw } from 'lucide-react';

interface SettleConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  itemDetails?: string;
  clientName?: string;
  clientId?: string;
  remainingItems?: string;
  outstandingDebt?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

/**
 * SETTLE CONFIRMATION MODAL COMPONENT
 * ===================================
 * 
 * Custom React modal for confirming settle operations
 * Replaces browser's window.confirm() with better UX
 */
const SettleConfirmationModal: React.FC<SettleConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  itemDetails,
  clientName,
  clientId,
  remainingItems,
  outstandingDebt,
  onConfirm,
  onCancel,
  isProcessing = false
}) => {
  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 select-none">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto select-none">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 select-none">
          <div className="flex items-center gap-3 select-none">
            <div className="bg-orange-100 p-2 rounded-full select-none">
              <RotateCcw size={20} className="text-orange-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 select-none">{title}</h2>
          </div>
          <button 
            onClick={onCancel}
            disabled={isProcessing}
            className="text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 select-none">
          <div className="flex items-start gap-3 mb-4 select-none">
            <div className="bg-yellow-100 p-2 rounded-full flex-shrink-0 select-none">
              <AlertTriangle size={20} className="text-yellow-600" />
            </div>
            <div className="flex-1 select-none">
              <p className="text-gray-700 mb-2 select-none">{message}</p>
              {itemDetails && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 select-none">
                  <p className="text-sm text-gray-600 font-medium select-none">{itemDetails}</p>
                </div>
              )}
            </div>
          </div>

          {/* Client Information */}
          {(clientName || clientId || remainingItems || outstandingDebt) && (
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 mb-4 select-none">
              <div className="space-y-1 text-sm select-none">
                {clientName && (
                  <p className="select-none">
                    <span className="font-medium">Client:</span> {clientName}
                  </p>
                )}
                {clientId && (
                  <p className="select-none">
                    <span className="font-medium">ID:</span> {clientId}
                  </p>
                )}
                {outstandingDebt && (
                  <p className="select-none">
                    <span className="font-medium">Outstanding Debt:</span> Rs {outstandingDebt}
                  </p>
                )}
                {remainingItems && (
                  <p className="select-none">
                    <span className="font-medium">Returnable Items:</span> {remainingItems}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 select-none">
            <p className="text-sm text-yellow-800 select-none">
              ⚠️ This action will mark all selected items as returned and cannot be undone.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 select-none">
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 font-medium select-none"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 font-medium select-none"
            >
              {isProcessing ? 'Processing...' : 'Confirm Return'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default SettleConfirmationModal;