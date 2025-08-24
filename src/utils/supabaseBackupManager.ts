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
      const { data, error } = await supabase
        .from('database_backups')
        .select('id, backup_data, backup_name, created_at, file_size')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('No backup found on server');
        }
        throw new Error(`Failed to load backup from server: ${error.message}`);
      }

      if (!data || !data.backup_data) {
        return null;
      }

      // Debug logging to understand what we received
      console.log('📊 Backup record retrieved:', {
        id: data.id,
        backup_name: data.backup_name,
        created_at: data.created_at,
        file_size: data.file_size,
        backup_data_type: typeof data.backup_data,
        backup_data_is_null: data.backup_data === null,
        backup_data_is_undefined: data.backup_data === undefined,
        backup_data_keys: data.backup_data ? Object.keys(data.backup_data) : 'N/A'
      });


      // Parse the JSON string back to object
      let parsedBackupData;
      try {
        parsedBackupData = typeof data.backup_data === 'string' 
          ? JSON.parse(data.backup_data) 
          : data.backup_data;
      } catch (parseError) {
        throw new Error(`Failed to parse backup data: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`);
      }

      console.log(`✅ Database backup loaded from Supabase (${(data.file_size / 1024).toFixed(1)} KB)`);
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
      const { data, error } = await supabase
        .from('database_backups')
        .select('backup_data')
        .limit(1);

      if (error || !data || data.length === 0) {
        return false;
      }

      const backupData = data[0].backup_data;
      
      // Check if backup_data is valid (not null, undefined, or empty)
      if (!backupData || 
          backupData === null || 
          backupData === undefined ||
          (typeof backupData === 'string' && backupData.trim() === '') ||
          (typeof backupData === 'object' && Object.keys(backupData).length === 0)) {
        return false;
      }

      return true;
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
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        name: data.backup_name,
        date: new Date(data.created_at).toLocaleDateString('en-GB'),
        size: data.file_size
      };
    } catch (error) {
      return null;
    }
  }
}