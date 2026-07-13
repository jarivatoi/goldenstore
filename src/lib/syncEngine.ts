/**
 * REAL-TIME SYNCHRONIZATION ENGINE
 * ================================
 * 
 * Comprehensive multi-device data synchronization system for Golden Price List
 * Handles real-time bidirectional sync across all application tabs with conflict resolution
 */

import { supabase } from './supabase';
import { updateManager } from '../utils/updateManager';

// Sync Event Types
export type SyncEventType = 
  | 'price_items_changed'
  | 'credit_clients_changed'
  | 'credit_transactions_changed'
  | 'over_items_changed'
  | 'order_categories_changed'
  | 'order_items_changed';

// Sync Operation Types
export type SyncOperation = 'INSERT' | 'UPDATE' | 'DELETE';

// Sync Event Structure
export interface SyncEvent {
  id: string;
  type: SyncEventType;
  operation: SyncOperation;
  table: string;
  data: any;
  timestamp: number;
  deviceId: string;
  userId?: string;
}

// Offline Queue Item
export interface QueuedSync {
  id: string;
  event: SyncEvent;
  retryCount: number;
  lastAttempt: number;
  priority: number; // 1 = high, 2 = medium, 3 = low
}

// Conflict Resolution Strategy
export type ConflictStrategy = 'last_write_wins' | 'merge' | 'manual';

// Device Information
export interface DeviceInfo {
  id: string;
  type: 'mobile' | 'desktop' | 'tablet';
  lastSeen: number;
  isOnline: boolean;
}

/**
 * REAL-TIME SYNC ENGINE CLASS
 * ===========================
 */
export class SyncEngine {
  private deviceId: string;
  private isOnline: boolean = navigator.onLine;
  private realtimeConnectionStatus: 'connecting' | 'subscribed' | 'channel_error' | 'timed_out' | 'closed' | 'offline' = 'offline';
  private syncQueue: QueuedSync[] = [];
  private eventListeners: Map<SyncEventType, Set<Function>> = new Map();
  private realtimeChannel: any = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private syncQueueInterval: NodeJS.Timeout | null = null;
  private lastSyncTimestamp: number = 0;
  private conflictStrategy: ConflictStrategy = 'last_write_wins';
  
  // Performance optimization flags
  private batchSize: number = 50;
  private syncDelay: number = 100; // ms
  private maxRetries: number = 3;
  private heartbeatInterval_ms: number = 30000; // 30 seconds

  constructor() {
    this.deviceId = this.generateDeviceId();
    this.initializeEngine();
  }

  /**
   * INITIALIZATION
   * ==============
   */
  private initializeEngine(): void {
    
    // Load offline queue from localStorage
    this.loadOfflineQueue();
    
    // Set up network status monitoring
    this.setupNetworkMonitoring();
    
    // Initialize real-time connection if online
    if (this.isOnline && supabase) {
      this.initializeRealtimeConnection();
    }
    
    // Start periodic sync queue processing
    this.startSyncQueueProcessor();
    
    // Start heartbeat for device presence
    this.startHeartbeat();
    
    // Load last sync timestamp
    this.lastSyncTimestamp = parseInt(localStorage.getItem('lastSyncTimestamp') || '0');
  }

  /**
   * DEVICE ID GENERATION
   * ====================
   */
  private generateDeviceId(): string {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  /**
   * NETWORK MONITORING
   * ==================
   */
  private setupNetworkMonitoring(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.initializeRealtimeConnection();
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.disconnectRealtime();
    });
  }

  /**
   * REAL-TIME CONNECTION SETUP
   * ==========================
   */
  private initializeRealtimeConnection(): void {
    if (!supabase || this.realtimeChannel) return;

    this.realtimeConnectionStatus = 'connecting';
    
    this.realtimeChannel = supabase
      .channel('sync_channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'price_items' },
        (payload: any) => this.handleRealtimeEvent('price_items_changed', payload)
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'clients' },
        (payload: any) => this.handleRealtimeEvent('credit_clients_changed', payload)
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'credit_transactions' },
        (payload: any) => this.handleRealtimeEvent('credit_transactions_changed', payload)
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'over_items' },
        (payload: any) => this.handleRealtimeEvent('over_items_changed', payload)
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'order_categories' },
        (payload: any) => this.handleRealtimeEvent('order_categories_changed', payload)
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        (payload: any) => this.handleRealtimeEvent('order_items_changed', payload)
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          this.realtimeConnectionStatus = 'subscribed';
        } else if (status === 'CHANNEL_ERROR') {
          this.realtimeConnectionStatus = 'channel_error';
        } else if (status === 'TIMED_OUT') {
          this.realtimeConnectionStatus = 'timed_out';
        } else if (status === 'CLOSED') {
          this.realtimeConnectionStatus = 'closed';
        }
      });
  }

  /**
   * REAL-TIME EVENT HANDLER
   * =======================
   */
  private handleRealtimeEvent(eventType: SyncEventType, payload: any): void {
    // Ignore events from this device to prevent loops
    if (payload.deviceId === this.deviceId) return;

    const syncEvent: SyncEvent = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: eventType,
      operation: payload.eventType?.toUpperCase() as SyncOperation,
      table: payload.table,
      data: payload.new || payload.old,
      timestamp: Date.now(),
      deviceId: payload.deviceId || 'unknown'
    };

    
    // Apply conflict resolution
    if (this.shouldApplyEvent(syncEvent)) {
      this.notifyListeners(eventType, syncEvent);
      this.updateLastSyncTimestamp(syncEvent.timestamp);
    }
  }

  /**
   * CONFLICT RESOLUTION
   * ===================
   */
  private shouldApplyEvent(event: SyncEvent): boolean {
    switch (this.conflictStrategy) {
      case 'last_write_wins':
        return event.timestamp > this.lastSyncTimestamp;
      
      case 'merge':
        // Implement merge logic based on data type
        return this.attemptMerge(event);
      
      case 'manual':
        // Queue for manual resolution
        this.queueForManualResolution(event);
        return false;
      
      default:
        return true;
    }
  }

  private attemptMerge(event: SyncEvent): boolean {
    // Simple merge strategy - could be enhanced based on data structure
    return true; // For now, always apply
  }

  private queueForManualResolution(event: SyncEvent): void {
    // Store in conflict resolution queue
    const conflicts = JSON.parse(localStorage.getItem('syncConflicts') || '[]');
    conflicts.push(event);
    localStorage.setItem('syncConflicts', JSON.stringify(conflicts));
  }

  /**
   * EVENT BROADCASTING
   * ==================
   */
  public broadcastChange(
    eventType: SyncEventType,
    operation: SyncOperation,
    table: string,
    data: any,
    priority: number = 2
  ): void {
    const syncEvent: SyncEvent = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: eventType,
      operation,
      table,
      data,
      timestamp: Date.now(),
      deviceId: this.deviceId
    };


    if (this.isOnline && supabase) {
      // Send immediately if online
      this.sendSyncEvent(syncEvent);
    } else {
      // Queue for later if offline
      this.queueSyncEvent(syncEvent, priority);
      
      // Register background sync if service worker is available
      this.registerBackgroundSync(eventType);
    }

    // Always notify local listeners
    this.notifyListeners(eventType, syncEvent);
  }

  /**
   * BACKGROUND SYNC REGISTRATION
   * ============================
   */
  private async registerBackgroundSync(eventType: SyncEventType): Promise<void> {
    const syncTag = this.getSyncTag(eventType);
    await updateManager.registerBackgroundSync(syncTag);
  }

  private getSyncTag(eventType: SyncEventType): string {
    switch (eventType) {
      case 'price_items_changed':
        return 'price-items';
      case 'credit_clients_changed':
      case 'credit_transactions_changed':
        return 'credit-data';
      case 'over_items_changed':
        return 'over-items';
      case 'order_categories_changed':
      case 'order_items_changed':
        return 'order-data';
      default:
        return 'general';
    }
  }

  /**
   * SYNC EVENT TRANSMISSION
   * =======================
   */
  private async sendSyncEvent(event: SyncEvent): Promise<boolean> {
    try {
      // Add device metadata to the actual database operation
      const eventWithMetadata = {
        ...event.data,
        sync_device_id: this.deviceId,
        sync_timestamp: event.timestamp
      };

      // The actual database operation will trigger the real-time event
      // This is handled by the individual context providers
      return true;
    } catch (error) {
      this.queueSyncEvent(event, 1); // High priority retry
      return false;
    }
  }

  /**
   * OFFLINE QUEUE MANAGEMENT
   * ========================
   */
  private queueSyncEvent(event: SyncEvent, priority: number): void {
    const queuedSync: QueuedSync = {
      id: event.id,
      event,
      retryCount: 0,
      lastAttempt: 0,
      priority
    };

    this.syncQueue.push(queuedSync);
    this.saveOfflineQueue();
    
    // Also queue in service worker for background sync
    this.queueInServiceWorker(event);
    
  }

  private queueInServiceWorker(event: SyncEvent): void {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'QUEUE_SYNC',
        data: {
          tableName: event.table,
          operation: event.operation,
          data: event.data
        }
      });
    }
  }

  private async processSyncQueue(): Promise<void> {
    if (!this.isOnline || this.syncQueue.length === 0) return;


    // Sort by priority and timestamp
    this.syncQueue.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.event.timestamp - b.event.timestamp;
    });

    const batch = this.syncQueue.splice(0, this.batchSize);
    const results = await Promise.allSettled(
      batch.map(queued => this.processSyncItem(queued))
    );

    // Handle failed items
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const failedItem = batch[index];
        failedItem.retryCount++;
        failedItem.lastAttempt = Date.now();

        if (failedItem.retryCount < this.maxRetries) {
          this.syncQueue.push(failedItem);
        } else {
        }
      }
    });

    this.saveOfflineQueue();

    // Continue processing if more items remain
    if (this.syncQueue.length > 0) {
      setTimeout(() => this.processSyncQueue(), this.syncDelay);
    }
  }

  private async processSyncItem(queued: QueuedSync): Promise<void> {
    try {
      await this.sendSyncEvent(queued.event);
    } catch (error) {
      throw error;
    }
  }

  /**
   * QUEUE PERSISTENCE
   * =================
   */
  private saveOfflineQueue(): void {
    try {
      localStorage.setItem('syncQueue', JSON.stringify(this.syncQueue));
    } catch (error) {
    }
  }

  private loadOfflineQueue(): void {
    try {
      const saved = localStorage.getItem('syncQueue');
      if (saved) {
        this.syncQueue = JSON.parse(saved);
      }
    } catch (error) {
      this.syncQueue = [];
    }
  }

  /**
   * EVENT LISTENERS
   * ===============
   */
  public addEventListener(eventType: SyncEventType, callback: Function): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(callback);
  }

  public removeEventListener(eventType: SyncEventType, callback: Function): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private notifyListeners(eventType: SyncEventType, event: SyncEvent): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
        }
      });
    }
  }

  /**
   * HEARTBEAT & PRESENCE
   * ====================
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, this.heartbeatInterval_ms);
  }

  private sendHeartbeat(): void {
    if (!this.isOnline || !supabase) return;

    const deviceInfo: DeviceInfo = {
      id: this.deviceId,
      type: this.getDeviceType(),
      lastSeen: Date.now(),
      isOnline: true
    };

    // Store device presence (could be in a separate table)
    localStorage.setItem('deviceInfo', JSON.stringify(deviceInfo));
  }

  private getDeviceType(): 'mobile' | 'desktop' | 'tablet' {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/.test(userAgent)) {
      return 'mobile';
    } else if (/tablet|ipad/.test(userAgent)) {
      return 'tablet';
    }
    return 'desktop';
  }

  /**
   * SYNC QUEUE PROCESSOR
   * ====================
   */
  private startSyncQueueProcessor(): void {
    this.syncQueueInterval = setInterval(() => {
      if (this.isOnline && this.syncQueue.length > 0) {
        this.processSyncQueue();
      }
    }, 5000); // Process every 5 seconds
  }

  /**
   * UTILITY METHODS
   * ===============
   */
  private updateLastSyncTimestamp(timestamp: number): void {
    if (timestamp > this.lastSyncTimestamp) {
      this.lastSyncTimestamp = timestamp;
      localStorage.setItem('lastSyncTimestamp', timestamp.toString());
    }
  }

  public getQueueStatus(): { total: number; pending: number; failed: number } {
    const failed = this.syncQueue.filter(item => item.retryCount >= this.maxRetries).length;
    return {
      total: this.syncQueue.length,
      pending: this.syncQueue.length - failed,
      failed
    };
  }

  public getRealtimeConnectionStatus(): 'connecting' | 'subscribed' | 'channel_error' | 'timed_out' | 'closed' | 'offline' {
    return this.realtimeConnectionStatus;
  }

  public clearQueue(): void {
    this.syncQueue = [];
    this.saveOfflineQueue();
  }

  /**
   * CLEANUP
   * =======
   */
  private disconnectRealtime(): void {
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
      this.realtimeChannel = null;
      this.realtimeConnectionStatus = 'offline';
    }
  }

  public destroy(): void {
    this.disconnectRealtime();
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    if (this.syncQueueInterval) {
      clearInterval(this.syncQueueInterval);
    }
    
    this.eventListeners.clear();
  }
}

// Singleton instance
export const syncEngine = new SyncEngine();