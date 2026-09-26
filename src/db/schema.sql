-- StockSense Core Database Schema
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS warehouses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(warehouse_id, code)
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('inventory_manager', 'warehouse_staff')),
  warehouse_id TEXT REFERENCES warehouses(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id),
  uom TEXT NOT NULL DEFAULT 'Units',
  reorder_min REAL NOT NULL DEFAULT 0,
  reorder_max REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK(reorder_min >= 0),
  CHECK(reorder_max = 0 OR reorder_max > reorder_min)
);

-- StockLevel: Cached / Derived table for rapid queries
CREATE TABLE IF NOT EXISTS stock_levels (
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  qty REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (product_id, location_id)
);

-- StockLedger: Append-only ground-truth movement ledger
CREATE TABLE IF NOT EXISTS stock_ledgers (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id),
  location_id TEXT NOT NULL REFERENCES locations(id),
  delta REAL NOT NULL,
  doc_type TEXT NOT NULL CHECK(doc_type IN ('receipt', 'delivery', 'transfer', 'adjustment')),
  doc_id TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK(status IN ('draft', 'waiting', 'ready', 'done', 'canceled')) DEFAULT 'draft',
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
  party TEXT NOT NULL,
  reference TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  validated_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS receipt_lines (
  id TEXT PRIMARY KEY,
  receipt_id TEXT NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  location_id TEXT NOT NULL REFERENCES locations(id),
  expected_qty REAL NOT NULL,
  received_qty REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS delivery_orders (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK(status IN ('draft', 'waiting', 'ready', 'done', 'canceled')) DEFAULT 'draft',
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
  party TEXT NOT NULL,
  reference TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  validated_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS delivery_lines (
  id TEXT PRIMARY KEY,
  delivery_id TEXT NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  location_id TEXT NOT NULL REFERENCES locations(id),
  expected_qty REAL NOT NULL,
  picked_qty REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS transfers (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK(status IN ('draft', 'waiting', 'ready', 'done', 'canceled')) DEFAULT 'draft',
  product_id TEXT NOT NULL REFERENCES products(id),
  qty REAL NOT NULL CHECK(qty > 0),
  from_location_id TEXT NOT NULL REFERENCES locations(id),
  to_location_id TEXT NOT NULL REFERENCES locations(id),
  created_by TEXT NOT NULL REFERENCES users(id),
  validated_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS adjustments (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id),
  location_id TEXT NOT NULL REFERENCES locations(id),
  counted_qty REAL NOT NULL CHECK(counted_qty >= 0),
  delta REAL NOT NULL,
  reason TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS otp_requests (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS idempotency_logs (
  idempotency_key TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL,
  user_id TEXT NOT NULL,
  response_code INTEGER NOT NULL,
  response_body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Essential Performance & Integrity Indexes
CREATE INDEX IF NOT EXISTS idx_stock_levels_prod_loc ON stock_levels(product_id, location_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledgers_prod_loc ON stock_ledgers(product_id, location_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledgers_doc ON stock_ledgers(doc_type, doc_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_otp_email_created ON otp_requests(email, created_at);
CREATE INDEX IF NOT EXISTS idx_receipts_wh_status ON receipts(warehouse_id, status);
CREATE INDEX IF NOT EXISTS idx_deliveries_wh_status ON delivery_orders(warehouse_id, status);
