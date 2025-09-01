import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Clock, Save, TestTube, CheckCircle, AlertTriangle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { automaticBackupManager } from '../utils/automaticBackupManager';

interface AutoBackupSettingsProps {
  onClose?: () => void;
}

interface ModalState {
  isOpen: boolean;
  type: 'success' | 'error';
  title: string;
  message: string;
}

/**
 * AUTO BACKUP SETTINGS COMPONENT
 * ===============================
 * 
 * Allows users to configure automatic backup schedule
 */
const AutoBackupSettings: React.FC<AutoBackupSettingsProps> = ({ onClose }) => {
  const [hour, setHour] = useState(18);
  const [minute, setMinute] = useState(0);
  const [enabled, setEnabled] = useState(true);
  const [isMinimized, setIsMinimized] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  useEffect(() => {
    // Load current settings
    const status = automaticBackupManager.getBackupStatus();
    setEnabled(status.isEnabled);
    
    // Load schedule from localStorage
    try {
      const saved = localStorage.getItem('autoBackupSettings');
      if (saved) {
        const settings = JSON.parse(saved);
        setHour(settings.hour || 18);
        setMinute(settings.minute || 0);
        setEnabled(settings.enabled !== false);
      }
    } catch (error) {
      console.warn('Failed to load backup settings:', error);
    }
  }, []);

  const handleSave = () => {
    automaticBackupManager.updateSchedule(hour, minute, enabled);
    
    setModal({
      isOpen: true,
      type: 'success',
      title: 'Settings Saved',
      message: `Automatic backup ${enabled ? 'enabled' : 'disabled'}${enabled ? ` for ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} daily` : ''}`
    });
  };

  const handleTestBackup = async () => {
    setIsTesting(true);
    try {
      await automaticBackupManager.forceBackupNow();
      setModal({
        isOpen: true,
        type: 'success',
        title: 'Test Backup Successful',
        message: 'Test backup completed successfully! Your data has been backed up to the server.'
      });
    } catch (error) {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Test Backup Failed',
        message: `Test backup failed: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check your internet connection and try again.`
      });
    } finally {
      setIsTesting(false);
    }
  };

  const closeModal = () => {
    setModal(prev => ({ ...prev, isOpen: false }));
    if (onClose && modal.type === 'success' && modal.title === 'Settings Saved') {
      onClose();
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-full">
              <Clock size={20} className="text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Automatic Backup</h3>
          </div>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title={isMinimized ? 'Expand settings' : 'Minimize settings'}
          >
            {isMinimized ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </button>
        </div>

        <div 
          className={`space-y-4 overflow-hidden transition-all duration-300 ease-in-out ${
            isMinimized ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'
          }`}
        >
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Enable automatic daily backup
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-blue-500' : 'bg-gray-300'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'} mt-0.5 ml-0.5`} />
              </div>
            </label>
          </div>

          {/* Time Selection */}
          {enabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Backup time (24-hour format)
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={hour}
                  onChange={(e) => setHour(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, '0')}
                    </option>
                  ))}
                </select>
                <span className="text-gray-500">:</span>
                <select
                  value={minute}
                  onChange={(e) => setMinute(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Array.from({ length: 60 }, (_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Daily backup at {hour.toString().padStart(2, '0')}:{minute.toString().padStart(2, '0')}
              </p>
            </div>
          )}

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700">
              <strong>How it works:</strong>
            </p>
            <ul className="text-xs text-blue-600 mt-1 space-y-1 ml-4">
              <li>• Automatically backs up all data to server daily</li>
              <li>• If offline, backup is queued until connection restored</li>
              <li>• Runs silently in background</li>
              <li>• Only backs up if there's actual data to save</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Save size={16} />
              Save Settings
            </button>
            
            <button
              onClick={handleTestBackup}
              disabled={isTesting}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <TestTube size={16} />
              {isTesting ? 'Testing...' : 'Test Now'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal Portal */}
      {modal.isOpen && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999] select-none">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-hidden select-none">
            
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 select-none">
              <div className="flex items-center gap-3 select-none">
                <div className={`p-2 rounded-full select-none ${
                  modal.type === 'success' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {modal.type === 'success' ? (
                    <CheckCircle size={20} className="text-green-600" />
                  ) : (
                    <AlertTriangle size={20} className="text-red-600" />
                  )}
                </div>
                <h2 className="text-xl font-semibold text-gray-900 select-none">{modal.title}</h2>
              </div>
              <button 
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 transition-colors select-none"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 select-none">
              <p className="text-gray-700 whitespace-pre-line select-none">{modal.message}</p>
              
              <div className="flex justify-end mt-6 select-none">
                <button
                  onClick={closeModal}
                  className={`px-6 py-2 rounded-lg transition-colors select-none ${
                    modal.type === 'success' 
                      ? 'bg-green-500 hover:bg-green-600 text-white' 
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default AutoBackupSettings;