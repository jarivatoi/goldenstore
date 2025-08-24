/*
  # Create database_backups table for JSON storage

  1. New Tables
    - `database_backups`
      - `id` (uuid, primary key)
      - `backup_data` (jsonb) - Complete database JSON
      - `backup_name` (text) - User-friendly name
      - `created_at` (timestamp) - When backup was created
      - `file_size` (bigint) - Size in bytes for reference

  2. Security
    - Enable RLS on `database_backups` table
    - Add policy for public access (anonymous users)

  3. Performance
    - Index on created_at for sorting
    - JSONB for efficient JSON operations
*/

-- Create database_backups table for storing complete JSON backups
CREATE TABLE IF NOT EXISTS database_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_data jsonb NOT NULL,
  backup_name text NOT NULL DEFAULT 'Database Backup',
  created_at timestamptz DEFAULT now(),
  file_size bigint DEFAULT 0
);

-- Enable Row Level Security
ALTER TABLE database_backups ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (anonymous users)
CREATE POLICY "Public access for database_backups"
  ON database_backups
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_database_backups_created_at ON database_backups(created_at);