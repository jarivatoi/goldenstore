import React, { useState, useEffect } from 'react';
import { Clock, Save, TestTube } from 'lucide-react';
import { automaticBackupManager } from '../utils/automaticBackupManager';

interface AutoBackupSettingsProps {
  onClose?: () => void;
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
  const [isTesting, setIsTesting] = useState(false);

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
    
    if (onClose) {
      onClose();
    }
    
    alert(`Automatic backup ${enabled ? 'enabled' : 'disabled'}${enabled ? ` for ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} daily` : ''}`);
  };

  const handleTestBackup = async () => {
    setIsTesting(true);
    try {
      await automaticBackupManager.forceBackupNow();
      alert('Test backup completed successfully!');
    } catch (error) {
      alert(`Test backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-blue-100 p-2 rounded-full">
          <Clock size={20} className="text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800">Automatic Backup</h3>
      </div>

      <div className="space-y-4">
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
  );
};

export default AutoBackupSettings;