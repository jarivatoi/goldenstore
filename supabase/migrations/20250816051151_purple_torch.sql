/*
  # Drop credit management tables

  This migration removes all credit-related tables since the application
  now uses localStorage for credit management instead of Supabase.

  ## Tables being dropped:
  - `credit_payments` - Payment records
  - `credit_transactions` - Transaction records  
  - `credit_clients` - Client information

  ## Notes:
  - Tables are dropped in reverse dependency order to avoid foreign key conflicts
  - Uses IF EXISTS to prevent errors if tables don't exist
*/

-- Drop credit_payments table (has foreign key to credit_clients)
DROP TABLE IF EXISTS credit_payments;

-- Drop credit_transactions table (has foreign key to credit_clients)
DROP TABLE IF EXISTS credit_transactions;

-- Drop credit_clients table (parent table)
DROP TABLE IF EXISTS credit_clients;