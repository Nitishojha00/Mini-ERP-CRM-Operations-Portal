-- Mini ERP + CRM Operations Portal - PostgreSQL Schema

CREATE TYPE user_role AS ENUM ('Admin', 'Sales', 'Warehouse', 'Accounts');
CREATE TYPE customer_type AS ENUM ('Retail', 'Wholesale', 'Distributor');
CREATE TYPE customer_status AS ENUM ('Lead', 'Active', 'Inactive');
CREATE TYPE movement_type AS ENUM ('IN', 'OUT');
CREATE TYPE challan_status AS ENUM ('Draft', 'Confirmed', 'Cancelled');

-- USERS
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'Sales',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CUSTOMERS
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  customer_name VARCHAR(150) NOT NULL,
  mobile_number VARCHAR(20) NOT NULL,
  email VARCHAR(160),
  business_name VARCHAR(160),
  gst_number VARCHAR(20),
  customer_type customer_type NOT NULL DEFAULT 'Retail',
  address TEXT,
  status customer_status NOT NULL DEFAULT 'Lead',
  follow_up_date DATE,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_name ON customers (customer_name);
CREATE INDEX idx_customers_status ON customers (status);

-- CUSTOMER FOLLOW-UP NOTES (history log, separate from single "notes" field)
CREATE TABLE customer_followups (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  follow_up_date DATE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PRODUCTS
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  product_name VARCHAR(160) NOT NULL,
  sku VARCHAR(60) UNIQUE NOT NULL,
  category VARCHAR(100),
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  current_stock INTEGER NOT NULL DEFAULT 0,
  min_stock_alert INTEGER NOT NULL DEFAULT 0,
  location VARCHAR(120),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_sku ON products (sku);
CREATE INDEX idx_products_name ON products (product_name);

-- STOCK MOVEMENTS
CREATE TABLE stock_movements (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity_changed INTEGER NOT NULL,
  movement_type movement_type NOT NULL,
  reason VARCHAR(200),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_movements_product ON stock_movements (product_id);

-- SALES CHALLANS
CREATE TABLE challans (
  id SERIAL PRIMARY KEY,
  challan_number VARCHAR(40) UNIQUE NOT NULL,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  total_quantity INTEGER NOT NULL DEFAULT 0,
  status challan_status NOT NULL DEFAULT 'Draft',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);

-- CHALLAN ITEMS (stores product SNAPSHOT data, not only product_id, per spec)
CREATE TABLE challan_items (
  id SERIAL PRIMARY KEY,
  challan_id INTEGER NOT NULL REFERENCES challans(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  product_name_snapshot VARCHAR(160) NOT NULL,
  sku_snapshot VARCHAR(60) NOT NULL,
  unit_price_snapshot NUMERIC(12,2) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0)
);

CREATE INDEX idx_challan_items_challan ON challan_items (challan_id);
