/*
  # Add VAT Included Column to Order Item Templates

  1. Schema Changes
    - Add `is_vat_included` column to `order_item_templates` table
    - Set default value to `false` for existing records
    - Add check constraint to ensure valid boolean values

  2. Data Migration
    - All existing records will have `is_vat_included` set to `false` by default
    - This maintains backward compatibility

  3. Security
    - No RLS changes needed as table inherits existing policies
*/

-- Add the is_vat_included column to order_item_templates table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_item_templates' AND column_name = 'is_vat_included'
  ) THEN
    ALTER TABLE order_item_templates 
    ADD COLUMN is_vat_included boolean DEFAULT false;
    
    -- Add comment for documentation
    COMMENT ON COLUMN order_item_templates.is_vat_included IS 'Whether VAT is already included in the unit price';
    
    -- Update existing records to have explicit false value
    UPDATE order_item_templates 
    SET is_vat_included = false 
    WHERE is_vat_included IS NULL;
    
    -- Make the column NOT NULL after setting default values
    ALTER TABLE order_item_templates 
    ALTER COLUMN is_vat_included SET NOT NULL;
    
    RAISE NOTICE 'Added is_vat_included column to order_item_templates table';
  ELSE
    RAISE NOTICE 'Column is_vat_included already exists in order_item_templates table';
  END IF;
END $$;