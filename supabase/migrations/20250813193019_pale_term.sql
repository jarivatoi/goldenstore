/*
  # Create over_items table for shared access

  1. New Tables
    - `over_items`
      - `id` (uuid, primary key)
      - `name` (text, item name)
      - `created_at` (timestamp)
      - `is_completed` (boolean, default false)
      - `completed_at` (timestamp, nullable)

  2. Security
    - Enable RLS on `over_items` table
    - Add policy for public read/write access (shared between all users)
*/

CREATE TABLE IF NOT EXISTS over_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  is_completed boolean DEFAULT false,
  completed_at timestamptz
);

ALTER TABLE over_items ENABLE ROW LEVEL SECURITY;

-- Allow public access for shared over items list
CREATE POLICY "Allow public access to over items"
  ON over_items
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);