import React from 'react';
import { AlertTriangle, X, CheckCircle, Info, Trash2, Edit3 } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info' | 'success' | 'delete' | 'edit';
  details?: string[];
  isProcessing?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'danger',
  details = [],
  isProcessing = false
}) => {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          confirmBtn: 'bg-red-500 hover:bg-red-600 focus:ring-red-500',
          icon: AlertTriangle
        };
      case 'delete':
        return {
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          confirmBtn: 'bg-red-500 hover:bg-red-600 focus:ring-red-500',
          icon: Trash2
        };
      case 'edit':
        return {
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          confirmBtn: 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500',
          icon: Edit3
        };
      case 'warning':
        return {
          iconBg: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          confirmBtn: 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500',
          icon: AlertTriangle
        };
      case 'success':
        return {
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
          confirmBtn: 'bg-green-500 hover:bg-green-600 focus:ring-green-500',
          icon: CheckCircle
        };
      case 'info':
        return {
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          confirmBtn: 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500',
          icon: Info
        };
      default:
        return {
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          confirmBtn: 'bg-red-500 hover:bg-red-600 focus:ring-red-500',
          icon: AlertTriangle
        };
    }
  };

  const styles = getTypeStyles();
  const IconComponent = styles.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999] select-none">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-fade-in select-none">
        <div className="p-6 select-none">
          {/* Icon and close button */}
          <div className="flex items-start justify-between mb-4 select-none">
            <div className={`${styles.iconBg} p-3 rounded-full`}>
              <IconComponent className={`${styles.iconColor}`} size={24} />
            </div>
            <button 
              onClick={onCancel}
              disabled={isProcessing}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 select-none"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="mb-6 select-none">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 select-none">
              {title}
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed select-none">
              {message}
            </p>
            
            {/* Additional details */}
            {details.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg select-none">
                <ul className="text-sm text-gray-700 space-y-1 select-none">
                  {details.map((detail, index) => (
                    <li key={index} className="select-none">• {detail}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 select-none">
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed select-none"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isProcessing}
              className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${styles.confirmBtn} select-none`}
            >
              {isProcessing ? 'Processing...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;