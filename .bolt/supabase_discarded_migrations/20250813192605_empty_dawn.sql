/*
  # Create over_items table for real-time sync

  1. New Tables
    - `over_items`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `user_id` (uuid, references auth.users)
      - `is_completed` (boolean, default false)
      - `completed_at` (timestamp)
      - `created_at` (timestamp, default now())

  2. Security
    - Enable RLS on `over_items` table
    - Add policy for users to manage their own items
*/

CREATE TABLE IF NOT EXISTS over_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE over_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own over items"
  ON over_items
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_over_items_user_id ON over_items(user_id);
CREATE INDEX IF NOT EXISTS idx_over_items_is_completed ON over_items(is_completed);
CREATE INDEX IF NOT EXISTS idx_over_items_created_at ON over_items(created_at);