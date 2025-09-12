import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface AlertOptions {
  title?: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number; // in milliseconds, 0 for manual close
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'danger';
}

export interface PromptOptions {
  title?: string;
  message: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
}

interface NotificationContextType {
  showAlert: (options: AlertOptions) => void;
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
  showPrompt: (options: PromptOptions) => Promise<string | null>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationState {
  alerts: Array<AlertOptions & { id: string }>;
  confirm: (ConfirmOptions & { id: string; resolve: (value: boolean) => void }) | null;
  prompt: (PromptOptions & { id: string; resolve: (value: string | null) => void }) | null;
}

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<NotificationState>({
    alerts: [],
    confirm: null,
    prompt: null,
  });

  const showAlert = (options: AlertOptions) => {
    const id = Date.now().toString();
    const alert = { ...options, id };
    
    setState(prev => ({
      ...prev,
      alerts: [...prev.alerts, alert]
    }));

    // Auto-remove after duration (default 5 seconds)
    const duration = options.duration !== undefined ? options.duration : 5000;
    if (duration > 0) {
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          alerts: prev.alerts.filter(a => a.id !== id)
        }));
      }, duration);
    }
  };

  const showConfirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      const id = Date.now().toString();
      setState(prev => ({
        ...prev,
        confirm: { ...options, id, resolve }
      }));
    });
  };

  const showPrompt = (options: PromptOptions): Promise<string | null> => {
    return new Promise((resolve) => {
      const id = Date.now().toString();
      setState(prev => ({
        ...prev,
        prompt: { ...options, id, resolve }
      }));
    });
  };

  const closeConfirm = (result: boolean) => {
    if (state.confirm) {
      state.confirm.resolve(result);
      setState(prev => ({ ...prev, confirm: null }));
    }
  };

  const closePrompt = (result: string | null) => {
    if (state.prompt) {
      state.prompt.resolve(result);
      setState(prev => ({ ...prev, prompt: null }));
    }
  };

  const removeAlert = (id: string) => {
    setState(prev => ({
      ...prev,
      alerts: prev.alerts.filter(a => a.id !== id)
    }));
  };

  return (
    <NotificationContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
      {children}
      
      {/* Alert Notifications */}
      <div className="fixed top-4 right-4 z-[10000] space-y-2 pointer-events-none">
        {state.alerts.map((alert) => (
          <AlertModal
            key={alert.id}
            {...alert}
            onClose={() => removeAlert(alert.id)}
          />
        ))}
      </div>

      {/* Confirm Modal */}
      {state.confirm && (
        <ConfirmModal
          {...state.confirm}
          onConfirm={() => closeConfirm(true)}
          onCancel={() => closeConfirm(false)}
        />
      )}

      {/* Prompt Modal */}
      {state.prompt && (
        <PromptModal
          {...state.prompt}
          onConfirm={(value) => closePrompt(value)}
          onCancel={() => closePrompt(null)}
        />
      )}
    </NotificationContext.Provider>
  );
};

// Alert Modal Component
interface AlertModalProps extends AlertOptions {
  id: string;
  onClose: () => void;
}

const AlertModal: React.FC<AlertModalProps> = ({ 
  title, 
  message, 
  type = 'info', 
  onClose 
}) => {
  const getIcon = () => {
    switch (type) {
      case 'success': return '✓';
      case 'warning': return '⚠';
      case 'error': return '✗';
      default: return 'ℹ';
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success': return 'bg-green-500 text-white';
      case 'warning': return 'bg-yellow-500 text-white';
      case 'error': return 'bg-red-500 text-white';
      default: return 'bg-blue-500 text-white';
    }
  };

  return (
    <div 
      className={`${getColors()} rounded-lg shadow-lg p-4 max-w-sm pointer-events-auto cursor-pointer animate-slide-in-right`}
      onClick={onClose}
    >
      <div className="flex items-center">
        <span className="text-lg mr-3">{getIcon()}</span>
        <div className="flex-1">
          {title && <div className="font-semibold">{title}</div>}
          <div className={title ? 'text-sm' : ''}>{message}</div>
        </div>
      </div>
    </div>
  );
};

// Confirm Modal Component
interface ConfirmModalProps extends ConfirmOptions {
  id: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title = 'Confirm',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'info',
  onConfirm,
  onCancel,
}) => {
  const getButtonColors = () => {
    switch (type) {
      case 'danger': return 'bg-red-500 hover:bg-red-600';
      case 'warning': return 'bg-yellow-500 hover:bg-yellow-600';
      default: return 'bg-blue-500 hover:bg-blue-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[10000]">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-fade-in">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 ${getButtonColors()} text-white rounded-lg transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// Prompt Modal Component
interface PromptModalProps extends PromptOptions {
  id: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

const PromptModal: React.FC<PromptModalProps> = ({
  title = 'Input Required',
  message,
  defaultValue = '',
  placeholder = '',
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  const [value, setValue] = useState(defaultValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(value);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[10000]">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-fade-in">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{message}</p>
        
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-6"
            autoFocus
          />
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              {cancelText}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              {confirmText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};