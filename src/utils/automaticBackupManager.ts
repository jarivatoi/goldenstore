/**
 * AUTOMATIC BACKUP MANAGER
 * ========================
 * 
 * Handles automatic daily backups to Supabase at 18:00
 * With offline queue and retry mechanisms
 */

import { SupabaseBackupManager } from './supabaseBackupManager';

export interface BackupSchedule {
  hour: number; // 0-23
  minute: number; // 0-59
  enabled: boolean;
}

export interface BackupStatus {
  lastBackup: Date | null;
  lastManualBackup: Date | null;
  nextScheduled: Date | null;
  isEnabled: boolean;
  pendingBackups: number;
  lastError: string | null;
}

export class AutomaticBackupManager {
  private static instance: AutomaticBackupManager | null = null;
  private schedule: BackupSchedule = { hour: 18, minute: 0, enabled: true };
  private checkInterval: number | null = null;  // Changed from NodeJS.Timeout to number
  private isRunning = false;

  private constructor() {
    this.loadSettings();
    this.startScheduler();
    this.setupNetworkListeners();
  }

  static getInstance(): AutomaticBackupManager {
    if (!AutomaticBackupManager.instance) {
      AutomaticBackupManager.instance = new AutomaticBackupManager();
    }
    return AutomaticBackupManager.instance;
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('autoBackupSettings');
      if (saved) {
        const settings = JSON.parse(saved);
        this.schedule = { ...this.schedule, ...settings };
      }
    } catch (error) {
      console.warn('Failed to load backup settings:', error);
    }
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    try {
      localStorage.setItem('autoBackupSettings', JSON.stringify(this.schedule));
    } catch (error) {
      console.warn('Failed to save backup settings:', error);
    }
  }

  /**
   * Start the backup scheduler
   */
  private startScheduler(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Check every minute for scheduled backup
    this.checkInterval = setInterval(() => {
      this.checkForScheduledBackup();
    }, 60000); // Check every minute

    // Also check immediately
    setTimeout(() => this.checkForScheduledBackup(), 5000);
  }

  /**
   * Check if it's time for a scheduled backup
   */
  private async checkForScheduledBackup(): Promise<void> {
    if (!this.schedule.enabled || this.isRunning) {
      return;
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Check if it's the scheduled time (within 1 minute window)
    if (currentHour === this.schedule.hour && currentMinute === this.schedule.minute) {
      // Check if we already backed up today
      const lastBackup = this.getLastBackupDate();
      const today = new Date().toDateString();
      
      if (!lastBackup || lastBackup.toDateString() !== today) {
        console.log('🕕 Scheduled backup time reached, starting automatic backup...');
        await this.performAutomaticBackup();
      }
    }
  }

  /**
   * Perform automatic backup
   */
  private async performAutomaticBackup(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      // Check if online
      if (!navigator.onLine) {
        console.log('📱 Offline - queuing backup for when connection is restored');
        this.queueOfflineBackup();
        return;
      }

      // Collect all data from localStorage
      const exportData = this.collectAllData();
      
      if (!exportData || this.isDataEmpty(exportData)) {
        console.log('📭 No data to backup, skipping automatic backup');
        return;
      }

      // Create backup name with timestamp
      const backupName = `Auto Backup ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
      
      // Perform backup to Supabase
      await SupabaseBackupManager.saveToSupabase(exportData, backupName);
      
      // Create local backup with fixed filename that gets overwritten daily
      this.createLocalBackup(exportData);
      
      // Update last backup timestamp
      this.setLastBackupDate(new Date());
      
      // Clear any pending offline backups
      this.clearOfflineBackupQueue();
      
      // Clear any previous errors since backup was successful
      this.clearLastError();
      
      console.log('✅ Automatic backup completed successfully');
      
    } catch (error) {
      console.error('❌ Automatic backup failed:', error);
      
      // Queue for retry if it was a network error
      if (this.isNetworkError(error)) {
        this.queueOfflineBackup();
      }
      
      // Store error for status reporting
      this.setLastError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Create local backup file with timestamped filename
   */
  private createLocalBackup(databaseJson: any): void {
    try {
      const jsonString = JSON.stringify(databaseJson, null, 2);
      const dataBlob = new Blob([jsonString], { type: 'application/json' });
      
      // Create timestamp for filename
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB').replace(/\//g, '-');
      const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }).replace(/:/g, '-');
      const filename = `GoldenStore_${dateStr}_${timeStr}.json`;
      
      // Create download link
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      
      // Temporarily add to DOM, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up blob URL to prevent memory leaks
      URL.revokeObjectURL(url);
      
      console.log(`✅ Local backup created successfully: ${filename}`);
    } catch (error) {
      console.error('❌ Local backup creation failed:', error);
      // Don't throw error as this is supplementary to the main backup
    }
  }

  /**
   * Collect all data from localStorage
   */
  private collectAllData(): any {
    try {
      const priceListData = localStorage.getItem('priceListItems');
      const creditClientsData = localStorage.getItem('creditClients');
      const creditTransactionsData = localStorage.getItem('creditTransactions');
      const creditPaymentsData = localStorage.getItem('creditPayments');
      const overItemsData = localStorage.getItem('overItems');
      const orderCategoriesData = localStorage.getItem('orderCategories');
      const orderTemplatesData = localStorage.getItem('orderItemTemplates');
      const ordersData = localStorage.getItem('orders');
      
      return {
        version: '2.0',
        appName: 'Golden Store',
        exportDate: new Date().toISOString(),
        
        // Price List data
        priceList: {
          items: priceListData ? JSON.parse(priceListData) : []
        },
        
        // Credit Management data
        creditManagement: {
          clients: creditClientsData ? JSON.parse(creditClientsData) : [],
          transactions: creditTransactionsData ? JSON.parse(creditTransactionsData) : [],
          payments: creditPaymentsData ? JSON.parse(creditPaymentsData) : []
        },
        
        // Over Management data
        overManagement: {
          items: overItemsData ? JSON.parse(overItemsData) : []
        },
        
        // Order Management data
        orderManagement: {
          categories: orderCategoriesData ? JSON.parse(orderCategoriesData) : [],
          itemTemplates: orderTemplatesData ? JSON.parse(orderTemplatesData) : [],
          orders: ordersData ? JSON.parse(ordersData) : []
        }
      };
    } catch (error) {
      console.error('Error collecting data for backup:', error);
      return null;
    }
  }

  /**
   * Check if data is empty (no point backing up empty database)
   */
  private isDataEmpty(data: any): boolean {
    const totalItems = 
      (data.priceList?.items?.length || 0) +
      (data.creditManagement?.clients?.length || 0) +
      (data.creditManagement?.transactions?.length || 0) +
      (data.creditManagement?.payments?.length || 0) +
      (data.overManagement?.items?.length || 0) +
      (data.orderManagement?.categories?.length || 0) +
      (data.orderManagement?.itemTemplates?.length || 0) +
      (data.orderManagement?.orders?.length || 0);
    
    return totalItems === 0;
  }

  /**
   * Queue backup for when connection is restored
   */
  private queueOfflineBackup(): void {
    const pendingBackups = this.getPendingBackups();
    const today = new Date().toDateString();
    
    // Only queue one backup per day
    if (!pendingBackups.includes(today)) {
      pendingBackups.push(today);
      localStorage.setItem('pendingBackups', JSON.stringify(pendingBackups));
      console.log('📋 Backup queued for when connection is restored');
    }
  }

  /**
   * Get pending offline backups
   */
  private getPendingBackups(): string[] {
    try {
      const pending = localStorage.getItem('pendingBackups');
      return pending ? JSON.parse(pending) : [];
    } catch {
      return [];
    }
  }

  /**
   * Clear offline backup queue
   */
  private clearOfflineBackupQueue(): void {
    localStorage.removeItem('pendingBackups');
  }

  /**
   * Setup network event listeners
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.log('🌐 Connection restored, checking for pending backups...');
      setTimeout(() => this.processPendingBackups(), 2000); // Wait 2 seconds for connection to stabilize
    });
  }

  /**
   * Process any pending offline backups
   */
  private async processPendingBackups(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    const pendingBackups = this.getPendingBackups();
    if (pendingBackups.length === 0) {
      return;
    }

    console.log(`📤 Processing ${pendingBackups.length} pending backup(s)...`);

    try {
      this.isRunning = true;
      
      // Collect current data
      const exportData = this.collectAllData();
      
      if (!exportData || this.isDataEmpty(exportData)) {
        console.log('📭 No data to backup, clearing pending queue');
        this.clearOfflineBackupQueue();
        return;
      }

      // Create backup name indicating it was delayed
      const backupName = `Delayed Backup ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
      
      // Perform backup to Supabase
      await SupabaseBackupManager.saveToSupabase(exportData, backupName);
      
      // Create local backup with fixed filename
      this.createLocalBackup(exportData);
      
      // Update last backup timestamp
      this.setLastBackupDate(new Date());
      
      // Clear pending backups
      this.clearOfflineBackupQueue();
      
      console.log('✅ Pending backup completed successfully');
      
    } catch (error) {
      console.error('❌ Pending backup failed:', error);
      // Keep in queue for next connection attempt
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Check if error is network-related
   */
  private isNetworkError(error: any): boolean {
    const message = error?.message?.toLowerCase() || '';
    return message.includes('network') || 
           message.includes('fetch') || 
           message.includes('timeout') || 
           message.includes('connection');
  }

  /**
   * Get last backup date
   */
  private getLastBackupDate(): Date | null {
    try {
      const saved = localStorage.getItem('lastAutoBackup');
      return saved ? new Date(saved) : null;
    } catch {
      return null;
    }
  }

  /**
   * Set last backup date
   */
  private setLastBackupDate(date: Date): void {
    try {
      localStorage.setItem('lastAutoBackup', date.toISOString());
    } catch (error) {
      console.warn('Failed to save last backup date:', error);
    }
  }

  /**
   * Get last error
   */
  private getLastError(): string | null {
    try {
      return localStorage.getItem('lastBackupError');
    } catch {
      return null;
    }
  }

  /**
   * Set last error
   */
  private setLastError(error: string): void {
    try {
      localStorage.setItem('lastBackupError', error);
    } catch (err) {
      console.warn('Failed to save backup error:', err);
    }
  }

  /**
   * Clear last error
   */
  private clearLastError(): void {
    try {
      localStorage.removeItem('lastBackupError');
    } catch (err) {
      console.warn('Failed to clear backup error:', err);
    }
  }

  /**
   * Get last manual backup date
   */
  private getLastManualBackupDate(): Date | null {
    try {
      const saved = localStorage.getItem('lastManualBackup');
      return saved ? new Date(saved) : null;
    } catch {
      return null;
    }
  }

  /**
   * Set last manual backup date
   */
  public setLastManualBackupDate(date: Date): void {
    try {
      localStorage.setItem('lastManualBackup', date.toISOString());
    } catch (error) {
      console.warn('Failed to save last manual backup date:', error);
    }
  }

  /**
   * Get backup status for UI
   */
  public getBackupStatus(): BackupStatus {
    const lastBackup = this.getLastBackupDate();
    const lastManualBackup = this.getLastManualBackupDate();
    const pendingBackups = this.getPendingBackups();
    const lastError = this.getLastError();
    
    // Calculate next scheduled backup
    const now = new Date();
    const nextScheduled = new Date();
    nextScheduled.setHours(this.schedule.hour, this.schedule.minute, 0, 0);
    
    // If today's time has passed, schedule for tomorrow
    if (nextScheduled <= now) {
      nextScheduled.setDate(nextScheduled.getDate() + 1);
    }

    return {
      lastBackup,
      lastManualBackup,
      nextScheduled: this.schedule.enabled ? nextScheduled : null,
      isEnabled: this.schedule.enabled,
      pendingBackups: pendingBackups.length,
      lastError
    };
  }

  /**
   * Update backup schedule
   */
  public updateSchedule(hour: number, minute: number, enabled: boolean): void {
    this.schedule = { hour, minute, enabled };
    this.saveSettings();
    
    if (enabled) {
      console.log(`📅 Automatic backup scheduled for ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} daily`);
    } else {
      console.log('📅 Automatic backup disabled');
    }
  }

  /**
   * Force backup now (for testing)
   */
  public async forceBackupNow(): Promise<void> {
    console.log('🔄 Forcing backup now...');
    await this.performAutomaticBackup();
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    AutomaticBackupManager.instance = null;
  }
}

// Initialize singleton instance
export const automaticBackupManager = AutomaticBackupManager.getInstance();