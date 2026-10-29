import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock, TestTube, CheckCircle, AlertTriangle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { automaticBackupManager } from '../utils/automaticBackupManager';
import { getDeviceIdentity, isServerBackupEnabled, setServerBackupEnabled } from '../utils/deviceIdentity';

interface ModalState {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm?: () => void;
}

/**
 * AUTO BACKUP SETTINGS COMPONENT
 * ===============================
 *
 * Shows how the automatic backup works and lets this device opt in/out of
 * uploading the server snapshot. There is no schedule to configure: a backup
 * runs on app start, at most once per day.
 */
const AutoBackupSettings: React.FC = () => {
  const [isMinimized, setIsMinimized] = useState<boolean>(() => isServerBackupEnabled());
  const [isTesting, setIsTesting] = useState(false);
  const [device] = useState(() => getDeviceIdentity());
  const [deviceBackupsEnabled, setDeviceBackupsEnabled] = useState<boolean>(() => isServerBackupEnabled());
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  const handleDeviceBackupToggle = () => {
    const next = !deviceBackupsEnabled;
    setServerBackupEnabled(next);
    setDeviceBackupsEnabled(next);

    setModal({
      isOpen: true,
      type: 'success',
      title: next ? 'Server Backups Enabled' : 'Server Backups Disabled',
      message: next
        ? `${device.label} will upload the server backup from now on.`
        : `${device.label} will no longer upload server backups, including manual server backups. Keep them enabled on the device that should own the backup, such as the shop tablet.`
    });
  };

  const handleTestBackup = async () => {
    setIsTesting(true);
    try {
      const result = await automaticBackupManager.forceBackupNow();

      if (result.status === 'success') {
        setModal({
          isOpen: true,
          type: 'success',
          title: 'Test Backup Successful',
          message: `Backup "${result.message}" was saved to the server.\n\nThis is the same snapshot the automatic backup creates.`
        });
        return;
      }

      setModal({
        isOpen: true,
        type: 'error',
        title: result.status === 'blocked'
          ? 'Backups Disabled on This Device'
          : result.status === 'skipped'
            ? 'Nothing to Back Up'
            : 'Test Backup Failed',
        message: result.status === 'failed'
          ? `${result.message}\n\nPlease check your internet connection and try again.`
          : result.message
      });
    } catch (error) {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Test Backup Failed',
        message: `Test backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  const closeModal = () => {
    setModal(prev => ({ ...prev, isOpen: false, onConfirm: undefined, confirmLabel: undefined }));
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
            isMinimized ? 'max-h-0 opacity-0' : 'max-h-[48rem] opacity-100'
          }`}
        >
          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700">
              <strong>How it works:</strong>
            </p>
            <ul className="text-xs text-blue-600 mt-1 space-y-1 ml-4">
              <li>• Backs up all modules (price list, credit, over, orders, returns)</li>
              <li>• Runs on app start, at most once per day</li>
              <li>• Saves a JSON file in this device's downloads on every upload</li>
              <li>• If offline, backup is queued until connection restored</li>
              <li>• Only the latest snapshot is kept on the server, so today's backup replaces yesterday's</li>
            </ul>
          </div>

          {/* Device specific backup switch */}
          <div
            className={`rounded-lg border p-3 transition-colors ${
              deviceBackupsEnabled
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-700">Backup device</p>
                <p className="text-xs text-gray-600 mt-1">
                  {deviceBackupsEnabled
                    ? 'This device uploads the server backup.'
                    : 'Server backups are disabled on this device.'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  This device: {device.label} · {device.id.slice(0, 8)}
                </p>
              </div>
              <button
                onClick={handleDeviceBackupToggle}
                className={`shrink-0 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  deviceBackupsEnabled
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {deviceBackupsEnabled ? 'Disable on this device' : 'Enable on this device'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Enable this only on the device that should own the server backup (for example the shop tablet). New devices start disabled.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleTestBackup}
              disabled={isTesting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  modal.type === 'success'
                    ? 'bg-green-100'
                    : modal.type === 'warning'
                      ? 'bg-yellow-100'
                      : 'bg-red-100'
                }`}>
                  {modal.type === 'success' ? (
                    <CheckCircle size={20} className="text-green-600" />
                  ) : modal.type === 'warning' ? (
                    <AlertTriangle size={20} className="text-yellow-600" />
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
              
              <div className="flex justify-end gap-2 mt-6 select-none">
                {modal.onConfirm && (
                  <button
                    onClick={closeModal}
                    className="px-6 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors select-none"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={() => {
                    if (modal.onConfirm) {
                      const confirm = modal.onConfirm;
                      confirm();
                    } else {
                      closeModal();
                    }
                  }}
                  className={`px-6 py-2 rounded-lg transition-colors select-none ${modal.type === 'success'
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : modal.type === 'warning'
                      ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}
                >
                  {modal.confirmLabel || 'OK'}
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
