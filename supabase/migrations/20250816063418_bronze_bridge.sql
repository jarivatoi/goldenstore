/*
  # Add gross_price column to price_items table

  1. Changes
    - Add `gross_price` column to `price_items` table
    - Set default value to 0 for existing records
    - Add check constraint to ensure gross_price is non-negative

  2. Notes
    - This migration adds the missing gross_price column that the application expects
    - Existing records will have gross_price set to 0 by default
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'price_items' AND column_name = 'gross_price'
  ) THEN
    ALTER TABLE price_items ADD COLUMN gross_price numeric(10,2) DEFAULT 0;
    
    -- Add check constraint to ensure gross_price is non-negative
    ALTER TABLE price_items ADD CONSTRAINT price_items_gross_price_check CHECK (gross_price >= 0);
  END IF;
END $$;