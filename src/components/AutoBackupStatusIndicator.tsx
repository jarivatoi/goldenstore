import React, { useState, useEffect } from 'react';
import { Clock, UploadCloud as CloudUpload, AlertCircle, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import { automaticBackupManager, BackupStatus } from '../utils/automaticBackupManager';

interface AutoBackupStatusIndicatorProps {
  className?: string;
}

/**
 * AUTO BACKUP STATUS INDICATOR
 * ============================
 * 
 * Shows status of automatic backup system
 */
const AutoBackupStatusIndicator: React.FC<AutoBackupStatusIndicatorProps> = ({ className = '' }) => {
  const [status, setStatus] = useState<BackupStatus>({
    lastBackup: null,
    nextScheduled: null,
    isEnabled: true,
    pendingBackups: 0,
    lastError: null
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Update status every minute
    const updateStatus = () => {
      const currentStatus = automaticBackupManager.getBackupStatus();
      setStatus(currentStatus);
      setIsOnline(navigator.onLine);
    };

    // Initial update
    updateStatus();

    // Update every minute
    const interval = setInterval(updateStatus, 60000);

    // Listen for network changes
    const handleOnline = () => {
      setIsOnline(true);
      updateStatus();
    };

    const handleOffline = () => {
      setIsOnline(false);
      updateStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getStatusIcon = () => {
    if (!status.isEnabled) {
      return <Clock size={16} className="text-gray-400" />;
    }

    if (status.lastError) {
      return <AlertCircle size={16} className="text-red-500" />;
    }

    if (status.pendingBackups > 0) {
      return <CloudUpload size={16} className="text-yellow-500 animate-pulse" />;
    }

    if (status.lastBackup) {
      const hoursSinceBackup = (Date.now() - status.lastBackup.getTime()) / (1000 * 60 * 60);
      if (hoursSinceBackup < 24) {
        return <CheckCircle size={16} className="text-green-500" />;
      }
    }

    return <Clock size={16} className="text-blue-500" />;
  };

  const getStatusText = () => {
    if (!status.isEnabled) {
      return 'Auto backup disabled';
    }

    if (status.lastError) {
      return `Backup error: ${status.lastError}`;
    }

    if (status.pendingBackups > 0) {
      return `${status.pendingBackups} backup(s) pending`;
    }

    if (status.lastBackup) {
      const now = new Date();
      const diffHours = Math.floor((now.getTime() - status.lastBackup.getTime()) / (1000 * 60 * 60));
      
      if (diffHours < 1) {
        return 'Backed up recently';
      } else if (diffHours < 24) {
        return `Backed up ${diffHours}h ago`;
      } else {
        const diffDays = Math.floor(diffHours / 24);
        return `Backed up ${diffDays}d ago`;
      }
    }

    if (status.nextScheduled) {
      const now = new Date();
      const diffMs = status.nextScheduled.getTime() - now.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (diffHours > 0) {
        return `Next backup in ${diffHours}h ${diffMinutes}m`;
      } else if (diffMinutes > 0) {
        return `Next backup in ${diffMinutes}m`;
      } else {
        return 'Backup due now';
      }
    }

    return 'Auto backup ready';
  };

  return (
    <div 
      className={`flex items-center gap-2 ${className}`}
      title={getStatusText()}
    >
      {/* Network status */}
      <div className="flex items-center">
        {isOnline ? (
          <Wifi size={14} className="text-green-500" />
        ) : (
          <WifiOff size={14} className="text-red-500" />
        )}
      </div>
      
      {/* Backup status */}
      <div className="flex items-center">
        {getStatusIcon()}
      </div>
      
      {/* Pending indicator */}
      {status.pendingBackups > 0 && (
        <div className="bg-yellow-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
          {status.pendingBackups}
        </div>
      )}
    </div>
  );
};

export default AutoBackupStatusIndicator;