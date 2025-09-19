/*
  # Recreate all required tables for Golden Price List app

  1. New Tables
    - `price_items` - Main price list items
    - `over_items` - Items that are over/out of stock
    - `clients` - Credit management clients
    - `credit_transactions` - Client transaction records
    - `payment_records` - Client payment records
    - `order_categories` - Order categories (cigarette, rum, etc.)
    - `order_item_templates` - Product templates within categories
    - `orders` - Complete orders with date and items
    - `order_items` - Individual order items with quantity and pricing

  2. Security
    - All tables have RLS DISABLED for shared access across devices
    - No user authentication required
    - All data is publicly accessible

  3. Real-time
    - All tables support real-time subscriptions
    - Changes sync instantly across all devices
*/

-- Drop existing tables if they exist
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS order_item_templates CASCADE;
DROP TABLE IF EXISTS order_categories CASCADE;
DROP TABLE IF EXISTS payment_records CASCADE;
DROP TABLE IF EXISTS credit_transactions CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS over_items CASCADE;
DROP TABLE IF EXISTS price_items CASCADE;

-- Create price_items table
CREATE TABLE price_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric(10,2) NOT NULL CHECK (price > 0),
  created_at timestamptz DEFAULT now(),
  last_edited_at timestamptz
);

-- Create over_items table
CREATE TABLE over_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  is_completed boolean DEFAULT false,
  completed_at timestamptz
);

-- Create clients table
CREATE TABLE clients (
  id text PRIMARY KEY,
  name text NOT NULL,
  total_debt numeric(10,2) DEFAULT 0 CHECK (total_debt >= 0),
  created_at timestamptz DEFAULT now(),
  last_transaction_at timestamptz DEFAULT now()
);

-- Create credit_transactions table
CREATE TABLE credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text REFERENCES clients(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  date timestamptz DEFAULT now(),
  type text DEFAULT 'debt' CHECK (type IN ('debt', 'payment'))
);

-- Create payment_records table
CREATE TABLE payment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text REFERENCES clients(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  date timestamptz DEFAULT now(),
  type text DEFAULT 'partial' CHECK (type IN ('partial', 'full'))
);

-- Create order_categories table
CREATE TABLE order_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  vat_percentage numeric(5,2) DEFAULT 15.00 CHECK (vat_percentage >= 0 AND vat_percentage <= 100),
  created_at timestamptz DEFAULT now()
);

-- Create order_item_templates table
CREATE TABLE order_item_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES order_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  unit_price numeric(10,2) NOT NULL CHECK (unit_price > 0),
  is_vat_nil boolean DEFAULT false,
  vat_percentage numeric(5,2) DEFAULT 15.00 CHECK (vat_percentage >= 0 AND vat_percentage <= 100),
  created_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES order_categories(id) ON DELETE CASCADE,
  order_date timestamptz DEFAULT now(),
  total_cost numeric(10,2) DEFAULT 0 CHECK (total_cost >= 0),
  created_at timestamptz DEFAULT now(),
  last_edited_at timestamptz
);

-- Create order_items table
CREATE TABLE order_items (
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

-- Create indexes for better performance
CREATE INDEX idx_price_items_name ON price_items(name);
CREATE INDEX idx_price_items_created_at ON price_items(created_at);

CREATE INDEX idx_over_items_is_completed ON over_items(is_completed);

CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_clients_total_debt ON clients(total_debt);

CREATE INDEX idx_credit_transactions_client_id ON credit_transactions(client_id);
CREATE INDEX idx_credit_transactions_date ON credit_transactions(date);

CREATE INDEX idx_payment_records_client_id ON payment_records(client_id);
CREATE INDEX idx_payment_records_date ON payment_records(date);

CREATE INDEX idx_order_item_templates_category_id ON order_item_templates(category_id);

CREATE INDEX idx_orders_category_id ON orders(category_id);
CREATE INDEX idx_orders_order_date ON orders(order_date);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_template_id ON order_items(template_id);

-- DISABLE RLS for all tables (shared access across all devices)
ALTER TABLE price_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE over_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;