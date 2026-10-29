/**
 * AUTOMATIC BACKUP MANAGER
 * ========================
 *
 * Backs up the whole database to Supabase once per day, triggered on app start
 * (plus a minute-level check so a session left open past midnight still backs up).
 * Data is read from IndexedDB, failures are reported instead of swallowed, and
 * offline attempts are queued until the connection returns.
 */

import { SupabaseBackupManager } from './supabaseBackupManager';
import { creditDBManager } from './creditIndexedDB';
import { appDBManager } from './appIndexedDB';
import { getDeviceIdentity, getDeviceDisplayName, isServerBackupEnabled, getServerBackupDisabledMessage } from './deviceIdentity';

export type BackupRunStatus = 'success' | 'skipped' | 'offline' | 'blocked' | 'failed';

export interface BackupRunResult {
  status: BackupRunStatus;
  message: string;
}

export interface BackupStatus {
  lastBackup: Date | null;
  lastManualBackup: Date | null;
  lastAttempt: Date | null;
  pendingBackups: number;
  lastError: string | null;
}

export class AutomaticBackupManager {
  // Never run two backups closer together than this, even if several triggers fire
  private static readonly MIN_BACKUP_GAP_MS = 6 * 60 * 60 * 1000; // 6 hours

  private static instance: AutomaticBackupManager | null = null;
  // Set while a first-launch server restore writes to IndexedDB, so a scheduled
  // backup can never upload a half-restored database
  private static suspended = false;
  private checkInterval: number | null = null;  // Changed from NodeJS.Timeout to number
  private isRunning = false;
  private hasWarnedAboutDisabledBackup = false;

  private constructor() {
    this.startScheduler();
    this.setupNetworkListeners();
    this.checkPendingBackupsOnStartup();
  }

  static getInstance(): AutomaticBackupManager {
    if (!AutomaticBackupManager.instance) {
      AutomaticBackupManager.instance = new AutomaticBackupManager();
    }
    return AutomaticBackupManager.instance;
  }

  /**
   * Pause uploads while a restore is writing to the local database
   */
  static setBackupSuspended(suspended: boolean): void {
    AutomaticBackupManager.suspended = suspended;
  }

  /**
   * Start the backup scheduler
   */
  private startScheduler(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Check every minute: an app left open past midnight becomes due again,
    // and missed ticks are harmless because the check is not time-of-day based
    this.checkInterval = window.setInterval(() => {
      this.runBackupIfDue();
    }, 60000); // Check every minute

    // Also check immediately
    setTimeout(() => this.runBackupIfDue(), 5000);
  }

  /**
   * A backup is due on the first app start of each day, and whenever a full day
   * has passed without a successful backup.
   */
  private isBackupDue(): boolean {
    const now = new Date();
    const lastBackup = this.getLastBackupDate();

    if (!lastBackup) {
      return true;
    }

    const sinceLastBackup = now.getTime() - lastBackup.getTime();
    if (sinceLastBackup < AutomaticBackupManager.MIN_BACKUP_GAP_MS) {
      return false;
    }

    // New calendar day since the last successful backup
    return lastBackup.toDateString() !== now.toDateString();
  }

  /**
   * Run an automatic backup only when one is due
   */
  private async runBackupIfDue(): Promise<void> {
    if (this.isRunning || !this.isBackupDue()) {
      return;
    }

    console.log('🕕 Automatic backup is due, starting...');
    await this.performAutomaticBackup();
  }

  /**
   * Perform automatic backup
   */
  private async performAutomaticBackup(): Promise<BackupRunResult> {
    if (this.isRunning) {
      return { status: 'skipped', message: 'A backup is already running' };
    }

    if (AutomaticBackupManager.suspended) {
      return { status: 'skipped', message: 'Database restore in progress' };
    }

    // Only a device that is allowed to upload may write the server snapshot
    if (!isServerBackupEnabled()) {
      if (!this.hasWarnedAboutDisabledBackup) {
        console.log(`🔒 ${getServerBackupDisabledMessage()}`);
        this.hasWarnedAboutDisabledBackup = true;
      }
      return { status: 'blocked', message: getServerBackupDisabledMessage() };
    }

    this.isRunning = true;
    this.setLastAttempt(new Date());

    try {
      // Check if online
      if (!navigator.onLine) {
        console.log('📱 Offline - queuing backup for when connection is restored');
        this.queueOfflineBackup();
        return { status: 'offline', message: 'You are offline. The backup was queued and will run when the connection is restored.' };
      }

      // Collect all data from IndexedDB (the app's real storage)
      const exportData = await this.collectAllData();

      if (this.isDataEmpty(exportData)) {
        console.log('📭 No data to backup, skipping automatic backup');
        return { status: 'skipped', message: 'No data found on this device to back up.' };
      }

      // Keep a local JSON copy of every snapshot that is uploaded
      this.createLocalBackup(exportData);

      // Create backup name with timestamp and device label
      const backupName = `Auto Backup (${getDeviceDisplayName()}) ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;

      // Perform backup to Supabase
      await SupabaseBackupManager.saveToSupabase(exportData, backupName);

      // Update last backup timestamp
      this.setLastBackupDate(new Date());

      // Clear any pending offline backups
      this.clearOfflineBackupQueue();

      // Clear any previous errors since backup was successful
      this.clearLastError();

      console.log('✅ Automatic backup completed successfully');

      return { status: 'success', message: backupName };

    } catch (error) {
      console.error('❌ Automatic backup failed:', error);

      // Queue for retry if it was a network error
      if (this.isNetworkError(error)) {
        this.queueOfflineBackup();
      }

      // Store error for status reporting
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.setLastError(message);

      return { status: 'failed', message };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Save the snapshot as a local JSON file on this device.
   * Browser downloads may be blocked on some platforms; this never fails the upload.
   */
  private createLocalBackup(databaseJson: any): void {
    try {
      const jsonString = JSON.stringify(databaseJson, null, 2);
      const dataBlob = new Blob([jsonString], { type: 'application/json' });

      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB').replace(/\//g, '-');
      const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }).replace(/:/g, '-');
      const filename = `GoldenStore_Complete_${dateStr}_${timeStr}.json`;

      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;

      // Temporarily add to DOM, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Give the browser time to start the download before releasing the blob
      setTimeout(() => URL.revokeObjectURL(url), 10000);

      console.log(`💾 Local backup file created: ${filename}`);
    } catch (error) {
      // Supplementary copy only - never fail the upload because of this
      console.error('❌ Local backup file failed:', error);
    }
  }

  /**
   * Collect all data from IndexedDB
   * Credit data lives in creditDBManager, everything else in appDBManager -
   * localStorage only ever held legacy copies that are gone after migration.
   */
  private async collectAllData(): Promise<any> {
    await creditDBManager.initDB();
    await appDBManager.initDB();

    const [
      clients,
      transactions,
      payments,
      priceItems,
      overItems,
      orderCategories,
      orderTemplates,
      orders,
      returns
    ] = await Promise.all([
      creditDBManager.getAllClients(),
      creditDBManager.getAllTransactions(),
      creditDBManager.getAllPayments(),
      appDBManager.getPriceListItems(),
      appDBManager.getOverItems(),
      appDBManager.getOrderCategories(),
      appDBManager.getOrderTemplates(),
      appDBManager.getOrders(),
      appDBManager.getAllReturns()
    ]);

    return {
      version: '2.0',
      appName: 'Golden Store',
      exportDate: new Date().toISOString(),

      // Which installation produced this snapshot
      device: getDeviceIdentity(),

      // Price List data
      priceList: {
        items: priceItems || []
      },

      // Credit Management data
      creditManagement: {
        clients: clients || [],
        transactions: transactions || [],
        payments: payments || []
      },

      // Over Management data
      overManagement: {
        items: overItems || []
      },

      // Order Management data
      orderManagement: {
        categories: orderCategories || [],
        itemTemplates: orderTemplates || [],
        orders: orders || []
      },

      // Returns data
      returns: returns || []
    };
  }

  /**
   * Check if data is empty (no point backing up empty database)
   */
  private isDataEmpty(data: any): boolean {
    const totalItems =
      (data?.priceList?.items?.length || 0) +
      (data?.creditManagement?.clients?.length || 0) +
      (data?.creditManagement?.transactions?.length || 0) +
      (data?.creditManagement?.payments?.length || 0) +
      (data?.overManagement?.items?.length || 0) +
      (data?.orderManagement?.categories?.length || 0) +
      (data?.orderManagement?.itemTemplates?.length || 0) +
      (data?.orderManagement?.orders?.length || 0) +
      (data?.returns?.length || 0);

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
   * Check for pending backups and run the daily backup on app startup
   */
  private checkPendingBackupsOnStartup(): void {
    if (navigator.onLine) {
      console.log('🚀 App started online, checking for pending backups...');
      setTimeout(() => this.processPendingBackups(), 3000);
    } else {
      console.log('🚀 App started offline, will queue the backup when the connection is restored');
    }

    // Backups run on every app start, at most once per day
    setTimeout(() => this.runBackupIfDue(), 5000);
  }

  /**
   * Setup network and visibility listeners
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.log('🌐 Connection restored, checking for pending backups...');
      setTimeout(() => this.processPendingBackups(), 2000);
      setTimeout(() => this.runBackupIfDue(), 4000);
    });

    // Mobile/PWA timers are paused in the background, so re-check whenever
    // the app becomes visible again
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        setTimeout(() => this.runBackupIfDue(), 2000);
      }
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

    // Only a device that is allowed to upload may write the server snapshot
    if (!isServerBackupEnabled()) {
      return;
    }

    console.log(`📤 Processing ${pendingBackups.length} pending backup(s)...`);

    this.isRunning = true;

    try {
      this.setLastAttempt(new Date());

      // Collect current data
      const exportData = await this.collectAllData();

      if (this.isDataEmpty(exportData)) {
        console.log('📭 No data to backup, clearing pending queue');
        this.clearOfflineBackupQueue();
        return;
      }

      // Keep a local JSON copy of every snapshot that is uploaded
      this.createLocalBackup(exportData);

      // Create backup name indicating it was delayed
      const backupName = `Delayed Backup (${getDeviceDisplayName()}) ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;

      // Perform backup to Supabase
      await SupabaseBackupManager.saveToSupabase(exportData, backupName);

      // Update last backup timestamp
      this.setLastBackupDate(new Date());

      // Clear pending backups
      this.clearOfflineBackupQueue();

      // Clear any previous errors since backup was successful
      this.clearLastError();

      console.log('✅ Pending backup completed successfully');

    } catch (error) {
      console.error('❌ Pending backup failed:', error);
      this.setLastError(error instanceof Error ? error.message : 'Unknown error');
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
   * Get last backup attempt time
   */
  private getLastAttemptDate(): Date | null {
    try {
      const saved = localStorage.getItem('lastAutoBackupAttempt');
      return saved ? new Date(saved) : null;
    } catch {
      return null;
    }
  }

  /**
   * Set last backup attempt time
   */
  private setLastAttempt(date: Date): void {
    try {
      localStorage.setItem('lastAutoBackupAttempt', date.toISOString());
    } catch (error) {
      console.warn('Failed to save last backup attempt:', error);
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
    return {
      lastBackup: this.getLastBackupDate(),
      lastManualBackup: this.getLastManualBackupDate(),
      lastAttempt: this.getLastAttemptDate(),
      pendingBackups: this.getPendingBackups().length,
      lastError: this.getLastError()
    };
  }

  /**
   * Record a successful server backup (manual or automatic) so the scheduler
   * does not duplicate it on the next check
   */
  public markServerBackupCompleted(): void {
    this.setLastBackupDate(new Date());
    this.clearLastError();
  }

  /**
   * Force backup now (manual trigger / testing)
   */
  public async forceBackupNow(): Promise<BackupRunResult> {
    console.log('🔄 Forcing backup now...');
    return this.performAutomaticBackup();
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
