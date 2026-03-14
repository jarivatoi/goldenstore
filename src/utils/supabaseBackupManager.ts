/**
 * SUPABASE BACKUP MANAGER
 * =======================
 * 
 * Manages complete database JSON backups to/from Supabase
 * Provides fast backup/restore without individual table operations
 */

import { supabase } from '../lib/supabase';

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

      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB');
      const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

      const backupData = {
        backup_data: databaseJson,
        backup_name: backupName || `Golden Store Backup ${dateStr} ${timeStr}`,
        file_size: fileSize,
        created_at: now.toISOString()
      };

      // First, delete any existing backups to save space (keep only 1 backup)
      const { error: deleteError } = await supabase
        .from('database_backups')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all existing

      if (deleteError) {
        
        // Continue anyway - not critical
      }

      // Insert new backup
      const { error: insertError } = await supabase
        .from('database_backups')
        .insert(backupData);

      if (insertError) {
        throw new Error(`Failed to save backup to server: ${insertError.message}`);
      }

      
    } catch (error) {
      
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
      if (!backupRecord || !backupRecord.backup_data) {
        throw new Error('No valid backup found on server. Please create a backup first by using "Export Database" â†’ "Server Backup".');
      }

      // Parse the JSON string back to object
      let parsedBackupData;
      try {
        // Handle both string and object formats
        if (typeof backupRecord.backup_data === 'string') {
          parsedBackupData = JSON.parse(backupRecord.backup_data);
        } else if (typeof backupRecord.backup_data === 'object' && backupRecord.backup_data !== null) {
          parsedBackupData = backupRecord.backup_data;
        } else {
          throw new Error('Invalid backup data format');
        }
        
        // Validate that the parsed data has the expected structure
        if (!parsedBackupData || typeof parsedBackupData !== 'object') {
          throw new Error('Backup data is not a valid object');
        }
        
        // Check for required fields
        if (!parsedBackupData.version && !parsedBackupData.appName && !parsedBackupData.priceList && !parsedBackupData.creditManagement) {
          throw new Error('Backup data does not contain valid Golden Store data');
        }
      } catch (parseError) {
        throw new Error(`Failed to parse backup data: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`);
      }

      
      return parsedBackupData;
    } catch (error) {
      
      throw error;
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
}
