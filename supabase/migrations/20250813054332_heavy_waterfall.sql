/*
  # Complete Database Schema for Golden Price List App

  1. New Tables
    - `price_items` - Main price list items
    - `clients` - Credit management clients
    - `credit_transactions` - Client transactions/debts
    - `payment_records` - Client payments
    - `over_items` - Items that are over/out of stock
    - `order_categories` - Order categories (cigarette, rum, etc.)
    - `order_item_templates` - Product templates within categories
    - `orders` - Complete orders
    - `order_items` - Individual items within orders

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data

  3. Features
    - UUID primary keys for all tables
    - Proper foreign key relationships
    - Timestamps for audit trails
    - Indexes for performance
*/

-- Price Items Table
CREATE TABLE IF NOT EXISTS price_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price decimal(10,2) NOT NULL CHECK (price > 0),
  created_at timestamptz DEFAULT now(),
  last_edited_at timestamptz,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Clients Table
CREATE TABLE IF NOT EXISTS clients (
  id text PRIMARY KEY, -- Keep as text for custom ID format (001, 002, etc.)
  name text NOT NULL,
  total_debt decimal(10,2) DEFAULT 0 CHECK (total_debt >= 0),
  created_at timestamptz DEFAULT now(),
  last_transaction_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Credit Transactions Table
CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text REFERENCES clients(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount decimal(10,2) NOT NULL CHECK (amount > 0),
  date timestamptz DEFAULT now(),
  type text DEFAULT 'debt' CHECK (type IN ('debt', 'payment')),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Payment Records Table
CREATE TABLE IF NOT EXISTS payment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text REFERENCES clients(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL CHECK (amount > 0),
  date timestamptz DEFAULT now(),
  type text DEFAULT 'partial' CHECK (type IN ('partial', 'full')),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Over Items Table (items that are over/out of stock)
CREATE TABLE IF NOT EXISTS over_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Order Categories Table
CREATE TABLE IF NOT EXISTS order_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  vat_percentage decimal(5,2) DEFAULT 15.00 CHECK (vat_percentage >= 0 AND vat_percentage <= 100),
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Order Item Templates Table
CREATE TABLE IF NOT EXISTS order_item_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES order_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  unit_price decimal(10,2) NOT NULL CHECK (unit_price > 0),
  is_vat_nil boolean DEFAULT false,
  vat_percentage decimal(5,2) DEFAULT 15.00 CHECK (vat_percentage >= 0 AND vat_percentage <= 100),
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES order_categories(id) ON DELETE CASCADE,
  order_date timestamptz DEFAULT now(),
  total_cost decimal(10,2) DEFAULT 0 CHECK (total_cost >= 0),
  created_at timestamptz DEFAULT now(),
  last_edited_at timestamptz,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  template_id uuid REFERENCES order_item_templates(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL CHECK (unit_price > 0),
  is_vat_nil boolean DEFAULT false,
  vat_amount decimal(10,2) DEFAULT 0 CHECK (vat_amount >= 0),
  total_price decimal(10,2) NOT NULL CHECK (total_price >= 0),
  is_available boolean DEFAULT true,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable Row Level Security on all tables
ALTER TABLE price_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE over_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Price Items
CREATE POLICY "Users can manage their own price items"
  ON price_items
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Clients
CREATE POLICY "Users can manage their own clients"
  ON clients
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Credit Transactions
CREATE POLICY "Users can manage their own credit transactions"
  ON credit_transactions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Payment Records
CREATE POLICY "Users can manage their own payment records"
  ON payment_records
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Over Items
CREATE POLICY "Users can manage their own over items"
  ON over_items
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Order Categories
CREATE POLICY "Users can manage their own order categories"
  ON order_categories
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Order Item Templates
CREATE POLICY "Users can manage their own order item templates"
  ON order_item_templates
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Orders
CREATE POLICY "Users can manage their own orders"
  ON orders
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Order Items
CREATE POLICY "Users can manage their own order items"
  ON order_items
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_price_items_user_id ON price_items(user_id);
CREATE INDEX IF NOT EXISTS idx_price_items_name ON price_items(name);
CREATE INDEX IF NOT EXISTS idx_price_items_created_at ON price_items(created_at);

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_total_debt ON clients(total_debt);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_client_id ON credit_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_date ON credit_transactions(date);

CREATE INDEX IF NOT EXISTS idx_payment_records_user_id ON payment_records(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_client_id ON payment_records(client_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_date ON payment_records(date);

CREATE INDEX IF NOT EXISTS idx_over_items_user_id ON over_items(user_id);
CREATE INDEX IF NOT EXISTS idx_over_items_is_completed ON over_items(is_completed);

CREATE INDEX IF NOT EXISTS idx_order_categories_user_id ON order_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_order_item_templates_user_id ON order_item_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_order_item_templates_category_id ON order_item_templates(category_id);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_category_id ON orders(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);

CREATE INDEX IF NOT EXISTS idx_order_items_user_id ON order_items(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_template_id ON order_items(template_id);