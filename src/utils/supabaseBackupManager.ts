/**
 * SUPABASE BACKUP MANAGER
 * =======================
 * 
 * Manages complete database JSON backups to/from Supabase
 * Provides fast backup/restore without individual table operations
 */

import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase';
import { countSnapshotRecords } from './databaseRestore';

export interface DatabaseBackup {
  id: string;
  backup_data: any;
  backup_name: string;
  created_at: string;
  file_size: number;
}

export class SupabaseBackupManager {
  
  /**
   * Save complete database JSON to Supabase
   * Overwrites any existing backup to save space
   */
  static async saveToSupabase(databaseJson: any, backupName?: string): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase not available');
    }

    try {
      const jsonString = JSON.stringify(databaseJson);
      const fileSize = new Blob([jsonString]).size;

      // Safety valve: an empty database must never overwrite a real snapshot
      // (typical after a reinstall, before the server restore has run)
      const snapshotCounts = countSnapshotRecords(databaseJson);
      const existing = await SupabaseBackupManager.getServerSnapshotMeta();
      const serverHasRealData = !!existing && (existing.fileSize || 0) > 100 * 1024;

      if (snapshotCounts.total === 0 && serverHasRealData) {
        throw new Error(
          `Refusing to upload an empty database over the server backup "${existing!.name}" ` +
          `(${(existing!.fileSize / 1024 / 1024).toFixed(1)} MB). Restore that backup first.`
        );
      }

      // The credit module lives in its own IndexedDB and can be lost on its own
      // (a reinstall or a partial restore). Such a snapshot would wipe every
      // client, transaction and payment on the server.
      if (
        serverHasRealData &&
        snapshotCounts.clients === 0 &&
        snapshotCounts.transactions === 0 &&
        snapshotCounts.payments === 0
      ) {
        throw new Error(
          `Refusing to upload: this device has no credit data (clients, transactions, payments) ` +
          `but the server backup "${existing!.name}" is ${(existing!.fileSize / 1024 / 1024).toFixed(1)} MB. ` +
          `Restore that backup before backing up.`
        );
      }

      console.log('📊 Backup size:', (fileSize / 1024).toFixed(2), 'KB');
      console.log('📡 Starting backup to Supabase...');

      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB');
      const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

      const backupData = {
        backup_data: databaseJson,
        backup_name: backupName || `Golden Store Backup ${dateStr} ${timeStr}`,
        file_size: fileSize,
        created_at: now.toISOString()
      };

      // Retry logic for mobile devices - retry up to 3 times with exponential backoff
      const maxRetries = 3;
      let lastError: Error | null = null;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🔄 Attempt ${attempt} of ${maxRetries}`);
          
          // First, delete any existing backups to save space (keep only 1 backup)
          const { error: deleteError } = await supabase
            .from('database_backups')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all existing

          if (deleteError) {
            console.warn('⚠️ Delete error (non-critical):', deleteError.message);
            // Continue anyway - not critical
          }

          // Insert new backup
          const { error: insertError } = await supabase
            .from('database_backups')
            .insert(backupData);

          if (insertError) {
            console.error('❌ Insert error:', insertError);
            
            // Provide more specific error message
            let errorMessage = `Failed to save backup to server: ${insertError.message}`;
            
            if (insertError.message.includes('timeout') || insertError.message.includes('abort')) {
              errorMessage = 'Server backup failed: Connection timeout. The request took too long to complete. Please check your internet connection and try again.';
            } else if (insertError.message.includes('network') || insertError.message.includes('fetch')) {
              errorMessage = 'Server backup failed: No internet connection. Please check your network settings and try again.';
            } else if (insertError.message.includes('JWT') || insertError.message.includes('auth')) {
              errorMessage = 'Server backup failed: Authentication error. Please try logging in again.';
            }
            
            lastError = new Error(errorMessage);
            
            // If this is a network/timeout error and we have retries left, wait and retry
            if (attempt < maxRetries && 
                (insertError.message.includes('timeout') || 
                 insertError.message.includes('network') || 
                 insertError.message.includes('fetch'))) {
              const delayMs = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
              console.log(`⏳ Waiting ${delayMs/1000}s before retry...`);
              await new Promise(resolve => setTimeout(resolve, delayMs));
              continue; // Retry
            }
            
            throw new Error(errorMessage);
          }

          console.log('✅ Backup completed successfully');
          break; // Success - exit retry loop
          
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          // If we've exhausted retries, throw the error
          if (attempt >= maxRetries) {
            throw lastError;
          }
          
          // Otherwise, continue to next retry
          console.warn(`⚠️ Attempt ${attempt} failed, will retry...`);
        }
      }

      
    } catch (error) {
      console.error('❌ Backup failed:', error);
      throw error;
    }
  }

  /**
   * Load complete database JSON from Supabase
   * Gets the most recent backup
   */
  static async loadFromSupabase(): Promise<any> {
    if (!supabase) {
      throw new Error('Supabase not available');
    }

    try {
      const { data, error, count } = await supabase
        .from('database_backups')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        
        throw new Error(`Failed to load backup from server: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error('No backup found on server. Please create a backup first by using "Export Database" â†’ "Server Backup".');
      }

      const backupRecord = data[0];
      return SupabaseBackupManager.parseBackupPayload(backupRecord);
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Validate a database_backups row and return its payload
   */
  private static parseBackupPayload(backupRecord: any): any {
    if (!backupRecord || !backupRecord.backup_data) {
      throw new Error('No valid backup found on server. Please create a backup first by using "Export Database" → "Server Backup".');
    }

    try {
      let parsedBackupData;

      // Handle both string and object formats
      if (typeof backupRecord.backup_data === 'string') {
        parsedBackupData = JSON.parse(backupRecord.backup_data);
      } else if (typeof backupRecord.backup_data === 'object' && backupRecord.backup_data !== null) {
        parsedBackupData = backupRecord.backup_data;
      } else {
        throw new Error('Invalid backup data format');
      }

      if (!parsedBackupData || typeof parsedBackupData !== 'object') {
        throw new Error('Backup data is not a valid object');
      }

      if (!parsedBackupData.version && !parsedBackupData.appName && !parsedBackupData.priceList && !parsedBackupData.creditManagement) {
        throw new Error('Backup data does not contain valid Golden Store data');
      }

      return parsedBackupData;
    } catch (parseError) {
      throw new Error(`Failed to parse backup data: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`);
    }
  }

  /**
   * Load the latest backup while reporting real download progress (0-100).
   * Streams the response so the caller can show a percentage instead of a spinner.
   */
  static async loadFromSupabaseWithProgress(
    onProgress?: (percent: number) => void
  ): Promise<{ data: any; name: string | null; createdAt: string | null; fileSize: number | null }> {
    const url = `${supabaseUrl}/rest/v1/database_backups?select=backup_data,backup_name,created_at,file_size&order=created_at.desc&limit=1`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);

    try {
      // PostgREST usually answers without content-length (compressed/chunked),
      // so the stored file size is used as the expected download total
      const meta = await SupabaseBackupManager.getServerSnapshotMeta();
      const expectedTotal = meta?.fileSize ? Math.round(meta.fileSize * 1.05) : 0;

      const response = await fetch(url, {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
          Accept: 'application/json'
        },
        credentials: 'omit',
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Failed to load backup from server: ${response.status} ${response.statusText}`);
      }

      const total = Number(response.headers.get('content-length') || 0) || expectedTotal;
      let text = '';

      if (response.body && typeof response.body.getReader === 'function') {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let received = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done || !value) break;

          received += value.byteLength;
          text += decoder.decode(value, { stream: true });

          if (onProgress && total > 0) {
            onProgress(Math.min(99, Math.round((received / total) * 100)));
          }
        }
        text += decoder.decode();
      } else {
        text = await response.text();
        onProgress?.(99);
      }

      const rows = JSON.parse(text);
      if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error('No backup found on server. Please create a backup first by using "Export Database" → "Server Backup".');
      }

      const row = rows[0];
      return {
        data: SupabaseBackupManager.parseBackupPayload(row),
        name: row.backup_name || null,
        createdAt: row.created_at || null,
        fileSize: row.file_size || null
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Metadata of the current server snapshot (used to detect an empty upload)
   */
  static async getServerSnapshotMeta(): Promise<{ name: string; createdAt: string; fileSize: number } | null> {
    if (!supabase) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('database_backups')
        .select('backup_name, created_at, file_size')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) {
        return null;
      }

      const row = data[0];
      return {
        name: row.backup_name || 'Server backup',
        createdAt: row.created_at,
        fileSize: row.file_size || 0
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if backup exists on Supabase
   */
  static async hasBackupOnSupabase(): Promise<boolean> {
    if (!supabase) {
      return false;
    }

    try {
      const { count, error } = await supabase
        .from('database_backups')
        .select('*', { count: 'exact', head: true });

      if (error) {
        
        return false;
      }

      // Return true if any records exist
      return (count || 0) > 0;
    } catch (error) {
      
      return false;
    }
  }

  /**
   * Get backup info from Supabase
   */
  static async getBackupInfo(): Promise<{ name: string; date: string; size: number } | null> {
    if (!supabase) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('database_backups')
        .select('backup_name, created_at, file_size')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) {
        return null;
      }

      const backupRecord = data[0];
      const createdDate = new Date(backupRecord.created_at);
      const dateStr = createdDate.toLocaleDateString('en-GB');
      const timeStr = createdDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

      return {
        name: 'Supabase',
        date: `${dateStr} ${timeStr}`,
        size: backupRecord.file_size
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Check network quality before backup
   */
  static async checkNetworkQuality(): Promise<{ good: boolean; message: string }> {
    // Check if online
    if (!navigator.onLine) {
      return { good: false, message: 'No internet connection detected' };
    }
    
    // Try a quick ping to Supabase
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch('https://nmlroqlmtelytoghuyos.supabase.co/rest/v1/', {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        return { good: true, message: 'Network connection is good' };
      } else {
        return { good: false, message: 'Supabase server is not responding properly' };
      }
    } catch (error) {
      return { good: false, message: 'Cannot reach Supabase server. Please check your internet connection.' };
    }
  }
}
