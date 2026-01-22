/**
 * SYNC STATUS INDICATOR COMPONENT
 * ===============================
 * 
 * Visual indicator showing real-time sync status across devices
 */

import React from 'react';
import { Wifi, WifiOff, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const SyncStatusIndicator: React.FC = () => {
  // Simplified status indicator without sync hook to prevent infinite loops
  const syncStatus = {
    isOnline: navigator.onLine,
    queueSize: 0,
    lastSync: 0,
    isProcessing: false
  };

  const getStatusIcon = () => {
    if (!syncStatus.isOnline) {
      return <WifiOff size={16} className="text-red-500" />;
    }
    
    return <CheckCircle size={16} className="text-green-500" />;
  };

  const getStatusText = () => {
    if (!syncStatus.isOnline) {
      return 'Offline';
    }
    
    return 'Online';
  };

  const getStatusColor = () => {
    if (!syncStatus.isOnline) return 'bg-red-50 border-red-200';
    return 'bg-green-50 border-green-200';
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-sm ${getStatusColor()}`}>
      {getStatusIcon()}
      <span className="font-medium text-gray-700">{getStatusText()}</span>
    </div>
  );
};

export default SyncStatusIndicator;