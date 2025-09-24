/**
 * REACT HOOK FOR SYNC ENGINE
 * ==========================
 * 
 * Custom React hook for integrating with the sync engine
 */

import { useEffect, useCallback, useState } from 'react';
import { syncEngine, SyncEventType, SyncEvent, SyncOperation } from '../lib/syncEngine';

export interface UseSyncOptions {
  eventTypes: SyncEventType[];
  onSyncEvent?: (event: SyncEvent) => void;
  autoSync?: boolean;
}

export interface SyncStatus {
  isOnline: boolean;
  queueSize: number;
  lastSync: number;
  isProcessing: boolean;
}

export function useSync(options: UseSyncOptions) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    queueSize: 0,
    lastSync: 0,
    isProcessing: false
  });

  // Broadcast a change to other devices
  const broadcastChange = useCallback((
    eventType: SyncEventType,
    operation: SyncOperation,
    table: string,
    data: any,
    priority: number = 2
  ) => {
    syncEngine.broadcastChange(eventType, operation, table, data, priority);
  }, []);

  // Update sync status
  const updateSyncStatus = useCallback(() => {
    const queueStatus = syncEngine.getQueueStatus();
    setSyncStatus(prev => ({
      ...prev,
      isOnline: navigator.onLine,
      queueSize: queueStatus.total,
      isProcessing: queueStatus.pending > 0
    }));
  }, []);

  // Set up event listeners
  useEffect(() => {
    const handleSyncEvent = (event: SyncEvent) => {
      if (options.onSyncEvent) {
        options.onSyncEvent(event);
      }
      updateSyncStatus();
    };

    // Register listeners for specified event types
    options.eventTypes.forEach(eventType => {
      syncEngine.addEventListener(eventType, handleSyncEvent);
    });

    // Set up network status monitoring
    const handleOnline = () => updateSyncStatus();
    const handleOffline = () => updateSyncStatus();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial status update
    updateSyncStatus();

    // Cleanup
    return () => {
      options.eventTypes.forEach(eventType => {
        syncEngine.removeEventListener(eventType, handleSyncEvent);
      });
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [options.eventTypes, options.onSyncEvent, updateSyncStatus]);

  return {
    syncStatus,
    broadcastChange,
    updateSyncStatus
  };
}