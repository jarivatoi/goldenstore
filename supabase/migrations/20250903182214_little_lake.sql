/*
  # Add is_vat_included column to order_item_templates

  1. Schema Changes
    - Add `is_vat_included` column to `order_item_templates` table
    - Set default value to false for existing records
    - Allow null values for backward compatibility

  2. Data Migration
    - Existing records will have is_vat_included = false by default
    - New records can specify true/false as needed

  3. Notes
    - This column tracks whether VAT is included in the unit price
    - Used for proper price calculations and display
*/

-- Add the is_vat_included column to order_item_templates table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_item_templates' AND column_name = 'is_vat_included'
  ) THEN
    ALTER TABLE order_item_templates ADD COLUMN is_vat_included boolean DEFAULT false;
  END IF;
END $$;