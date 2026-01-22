/*
  # Create shared tables for anonymous users

  1. New Tables
    - `price_items` - Shared price list items (no user_id required)
    - `clients` - Shared credit clients (no user_id required)  
    - `credit_transactions` - Shared credit transactions (no user_id required)
    - `payment_records` - Shared payment records (no user_id required)
    - `over_items` - Shared over/inventory items (no user_id required)
    - `order_categories` - Shared order categories (no user_id required)
    - `order_item_templates` - Shared order templates (no user_id required)
    - `orders` - Shared orders (no user_id required)
    - `order_items` - Shared order items (no user_id required)

  2. Security
    - Enable RLS on all tables
    - Allow anonymous users to read/write all data
    - All data is shared across anonymous users

  3. Real-time
    - Enable real-time on all tables for live sync
*/

-- Enable anonymous authentication
UPDATE auth.config SET enable_anonymous_users = true;

-- Price Items Table (shared)
CREATE TABLE IF NOT EXISTS price_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric(10,2) NOT NULL CHECK (price > 0),
  created_at timestamptz DEFAULT now(),
  last_edited_at timestamptz
);

ALTER TABLE price_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anonymous users can manage price items"
  ON price_items
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_price_items_created_at ON price_items(created_at);
CREATE INDEX IF NOT EXISTS idx_price_items_name ON price_items(name);

-- Clients Table (shared)
CREATE TABLE IF NOT EXISTS clients (
  id text PRIMARY KEY,
  name text NOT NULL,
  total_debt numeric(10,2) DEFAULT 0 CHECK (total_debt >= 0),
  created_at timestamptz DEFAULT now(),
  last_transaction_at timestamptz DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anonymous users can manage clients"
  ON clients
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_total_debt ON clients(total_debt);

-- Credit Transactions Table (shared)
CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text REFERENCES clients(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  date timestamptz DEFAULT now(),
  type text DEFAULT 'debt' CHECK (type IN ('debt', 'payment'))
);

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anonymous users can manage credit transactions"
  ON credit_transactions
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_credit_transactions_client_id ON credit_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_date ON credit_transactions(date);

-- Payment Records Table (shared)
CREATE TABLE IF NOT EXISTS payment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text REFERENCES clients(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  date timestamptz DEFAULT now(),
  type text DEFAULT 'partial' CHECK (type IN ('partial', 'full'))
);

ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anonymous users can manage payment records"
  ON payment_records
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_records_client_id ON payment_records(client_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_date ON payment_records(date);

-- Over Items Table (shared)
CREATE TABLE IF NOT EXISTS over_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  is_completed boolean DEFAULT false,
  completed_at timestamptz
);

ALTER TABLE over_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anonymous users can manage over items"
  ON over_items
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_over_items_is_completed ON over_items(is_completed);

-- Order Categories Table (shared)
CREATE TABLE IF NOT EXISTS order_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  vat_percentage numeric(5,2) DEFAULT 15.00 CHECK (vat_percentage >= 0 AND vat_percentage <= 100),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anonymous users can manage order categories"
  ON order_categories
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Order Item Templates Table (shared)
CREATE TABLE IF NOT EXISTS order_item_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES order_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  unit_price numeric(10,2) NOT NULL CHECK (unit_price > 0),
  is_vat_nil boolean DEFAULT false,
  vat_percentage numeric(5,2) DEFAULT 15.00 CHECK (vat_percentage >= 0 AND vat_percentage <= 100),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_item_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anonymous users can manage order item templates"
  ON order_item_templates
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_order_item_templates_category_id ON order_item_templates(category_id);

-- Orders Table (shared)
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES order_categories(id) ON DELETE CASCADE,
  order_date timestamptz DEFAULT now(),
  total_cost numeric(10,2) DEFAULT 0 CHECK (total_cost >= 0),
  created_at timestamptz DEFAULT now(),
  last_edited_at timestamptz
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anonymous users can manage orders"
  ON orders
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_category_id ON orders(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);

-- Order Items Table (shared)
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  template_id uuid REFERENCES order_item_templates(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(10,2) NOT NULL CHECK (unit_price > 0),
  is_vat_nil boolean DEFAULT false,
  vat_amount numeric(10,2) DEFAULT 0 CHECK (vat_amount >= 0),
  total_price numeric(10,2) NOT NULL CHECK (total_price >= 0),
  is_available boolean DEFAULT true
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anonymous users can manage order items"
  ON order_items
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_template_id ON order_items(template_id);

-- Enable real-time for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE price_items;
ALTER PUBLICATION supabase_realtime ADD TABLE clients;
ALTER PUBLICATION supabase_realtime ADD TABLE credit_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE payment_records;
ALTER PUBLICATION supabase_realtime ADD TABLE over_items;
ALTER PUBLICATION supabase_realtime ADD TABLE order_categories;
ALTER PUBLICATION supabase_realtime ADD TABLE order_item_templates;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;