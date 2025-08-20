/*
  # Allow zero amount transactions

  1. Database Changes
    - Modify `credit_transactions_amount_check` constraint to allow amounts >= 0
    - This enables recording of non-monetary transactions (like notes or reminders)

  2. Security
    - Maintains existing RLS policies
    - No changes to table structure or permissions
*/

-- Drop the existing constraint that requires amount > 0
ALTER TABLE credit_transactions DROP CONSTRAINT IF EXISTS credit_transactions_amount_check;

-- Add new constraint that allows amount >= 0
ALTER TABLE credit_transactions ADD CONSTRAINT credit_transactions_amount_check CHECK (amount >= 0);