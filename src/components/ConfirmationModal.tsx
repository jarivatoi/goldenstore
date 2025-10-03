import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText,
  onConfirm,
  onCancel,
  type = 'danger'
}) => {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          confirmBtn: 'bg-red-500 hover:bg-red-600 focus:ring-red-500'
        };
      case 'warning':
        return {
          iconBg: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          confirmBtn: 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500'
        };
      case 'info':
        return {
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          confirmBtn: 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500'
        };
      default:
        return {
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          confirmBtn: 'bg-red-500 hover:bg-red-600 focus:ring-red-500'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-sm overflow-hidden animate-fade-in select-none">
        <div className="p-6 select-none">
          {/* Icon and close button */}
          <div className="flex items-start justify-between mb-4 select-none">
            <div className={`${styles.iconBg} p-3 rounded-full`}>
              <AlertTriangle className={`${styles.iconColor}`} size={24} />
            </div>
          </div>

          {/* Content */}
          <div className="mb-6 select-none">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 select-none">
              {title}
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed select-none">
              {message}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 select-none">
            {cancelText && (
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200 font-medium select-none"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={onConfirm}
              className={`${cancelText ? 'flex-1' : 'w-full'} px-4 py-2 text-white rounded-lg transition-colors duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${styles.confirmBtn} select-none`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;