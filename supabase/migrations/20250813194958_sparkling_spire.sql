/*
  # Create price_items table

  1. New Tables
    - `price_items`
      - `id` (text, primary key)
      - `name` (text, not null)
      - `price` (numeric(10,2), not null, must be positive)
      - `created_at` (timestamptz, default now())
      - `last_edited_at` (timestamptz, nullable)

  2. Security
    - Enable RLS on `price_items` table
    - Add policy for public access (since app uses anonymous authentication)

  3. Performance
    - Add indexes for common queries (name, created_at)
*/

-- Create the price_items table
CREATE TABLE IF NOT EXISTS price_items (
  id text PRIMARY KEY,
  name text NOT NULL,
  price numeric(10,2) NOT NULL CHECK (price > 0),
  created_at timestamptz DEFAULT now(),
  last_edited_at timestamptz
);

-- Enable Row Level Security
ALTER TABLE price_items ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (anonymous users can read/write)
CREATE POLICY "Public access for price_items"
  ON price_items
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_price_items_name ON price_items (name);
CREATE INDEX IF NOT EXISTS idx_price_items_created_at ON price_items (created_at);