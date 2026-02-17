/*
  # Create credit management tables

  1. New Tables
    - `credit_clients`
      - `id` (text, primary key) - Client ID like G001, G002
      - `name` (text) - Client name
      - `total_debt` (numeric) - Outstanding amount
      - `created_at` (timestamp) - When client was added
      - `last_transaction_at` (timestamp) - Last activity date
    
    - `credit_transactions` 
      - `id` (uuid, primary key)
      - `client_id` (text, foreign key) - Reference to credit_clients
      - `description` (text) - Item description
      - `amount` (numeric) - Transaction amount
      - `date` (timestamp) - Transaction date
      - `type` (text) - 'debt' or 'payment'
    
    - `credit_payments`
      - `id` (uuid, primary key) 
      - `client_id` (text, foreign key) - Reference to credit_clients
      - `amount` (numeric) - Payment amount
      - `date` (timestamp) - Payment date
      - `type` (text) - 'partial' or 'full'

  2. Security
    - Enable RLS on all tables
    - Add policies for public access (anonymous users)
*/

-- Create credit_clients table
CREATE TABLE IF NOT EXISTS credit_clients (
  id text PRIMARY KEY,
  name text NOT NULL,
  total_debt numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  last_transaction_at timestamptz DEFAULT now()
);

-- Create credit_transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  description text NOT NULL,
  amount numeric(10,2) NOT NULL,
  date timestamptz DEFAULT now(),
  type text DEFAULT 'debt',
  CONSTRAINT credit_transactions_client_id_fkey 
    FOREIGN KEY (client_id) REFERENCES credit_clients(id) ON DELETE CASCADE,
  CONSTRAINT credit_transactions_amount_check 
    CHECK (amount > 0),
  CONSTRAINT credit_transactions_type_check 
    CHECK (type IN ('debt', 'payment'))
);

-- Create credit_payments table
CREATE TABLE IF NOT EXISTS credit_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  amount numeric(10,2) NOT NULL,
  date timestamptz DEFAULT now(),
  type text DEFAULT 'partial',
  CONSTRAINT credit_payments_client_id_fkey 
    FOREIGN KEY (client_id) REFERENCES credit_clients(id) ON DELETE CASCADE,
  CONSTRAINT credit_payments_amount_check 
    CHECK (amount > 0),
  CONSTRAINT credit_payments_type_check 
    CHECK (type IN ('partial', 'full'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_credit_clients_name ON credit_clients(name);
CREATE INDEX IF NOT EXISTS idx_credit_clients_total_debt ON credit_clients(total_debt);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_client_id ON credit_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_date ON credit_transactions(date);
CREATE INDEX IF NOT EXISTS idx_credit_payments_client_id ON credit_payments(client_id);
CREATE INDEX IF NOT EXISTS idx_credit_payments_date ON credit_payments(date);

-- Enable Row Level Security
ALTER TABLE credit_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_payments ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (anonymous users)
CREATE POLICY "Public access for credit_clients"
  ON credit_clients
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public access for credit_transactions"
  ON credit_transactions
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public access for credit_payments"
  ON credit_payments
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);