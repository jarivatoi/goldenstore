/*
  # Remove Credit Management Tables

  1. Tables to Remove
    - `clients` - Client information and debt tracking
    - `credit_transactions` - Transaction records for items taken
    - `payment_records` - Payment history records

  2. Security
    - Remove all RLS policies for credit tables
    - Clean up any related indexes

  3. Notes
    - Credit management will now use local storage only
    - This removes all credit data from the database permanently
*/

-- Remove credit tables (order matters due to foreign keys)
DROP TABLE IF EXISTS payment_records CASCADE;
DROP TABLE IF EXISTS credit_transactions CASCADE;
DROP TABLE IF EXISTS clients CASCADE;

-- Note: Indexes and policies are automatically dropped with CASCADE