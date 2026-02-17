/*
  # Add bottles_owed column to credit_clients table

  1. Schema Changes
    - Add `bottles_owed` column to `credit_clients` table
    - Column type: text (stores JSON string)
    - Default value: empty JSON object for bottle counts

  2. Data Migration
    - Set default value for existing records
    - Initialize with empty bottle counts

  3. Notes
    - This column stores JSON data as text for bottle tracking
    - Format: {"beer": 0, "guinness": 0, "malta": 0, "coca": 0, "chopines": 0}
*/

-- Add bottles_owed column to credit_clients table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_clients' AND column_name = 'bottles_owed'
  ) THEN
    ALTER TABLE credit_clients ADD COLUMN bottles_owed text DEFAULT '{"beer": 0, "guinness": 0, "malta": 0, "coca": 0, "chopines": 0}';
  END IF;
END $$;

-- Update existing records to have the default bottles_owed value
UPDATE credit_clients 
SET bottles_owed = '{"beer": 0, "guinness": 0, "malta": 0, "coca": 0, "chopines": 0}'
WHERE bottles_owed IS NULL;