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
      
      const backupData = {
        backup_data: databaseJson,
        backup_name: backupName || `Golden Store Backup ${new Date().toLocaleDateString('en-GB')}`,
        file_size: fileSize,
        created_at: new Date().toISOString()
      };

      // First, delete any existing backups to save space (keep only 1 backup)
      const { error: deleteError } = await supabase
        .from('database_backups')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all existing

      if (deleteError) {
        console.warn('Warning: Could not clear old backups:', deleteError);
        // Continue anyway - not critical
      }

      // Insert new backup
      const { error: insertError } = await supabase
        .from('database_backups')
        .insert(backupData);

      if (insertError) {
        throw new Error(`Failed to save backup to server: ${insertError.message}`);
      }

      console.log(`✅ Database backup saved to Supabase (${(fileSize / 1024).toFixed(1)} KB)`);
    } catch (error) {
      console.error('❌ Supabase backup failed:', error);
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
        console.warn('Supabase query error:', error);
        throw new Error(`Failed to load backup from server: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error('No backup found on server. Please create a backup first by using "Export Database" → "Server Backup".');
      }

      const backupRecord = data[0];
      if (!backupRecord || !backupRecord.backup_data) {
        throw new Error('No valid backup found on server. Please create a backup first by using "Export Database" → "Server Backup".');
      }

      // Debug logging to understand what we received
      console.log('📊 Backup record retrieved:', {
        id: backupRecord.id,
        backup_name: backupRecord.backup_name,
        created_at: backupRecord.created_at,
        file_size: backupRecord.file_size,
        backup_data_type: typeof backupRecord.backup_data,
        backup_data_is_null: backupRecord.backup_data === null,
        backup_data_is_undefined: backupRecord.backup_data === undefined,
        backup_data_keys: backupRecord.backup_data ? Object.keys(backupRecord.backup_data) : 'N/A'
      });


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

      console.log(`✅ Database backup loaded from Supabase (${(backupRecord.file_size / 1024).toFixed(1)} KB)`);
      return parsedBackupData;
    } catch (error) {
      console.error('❌ Supabase backup load failed:', error);
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
        console.warn('Error checking backup existence:', error);
        return false;
      }

      // Return true if any records exist
      return (count || 0) > 0;
    } catch (error) {
      console.warn('Exception checking backup existence:', error);
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
      return {
        name: backupRecord.backup_name,
        date: new Date(backupRecord.created_at).toLocaleDateString('en-GB'),
        size: backupRecord.file_size
      };
    } catch (error) {
      return null;
    }
  }
}