PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT NOT NULL,
  image_url TEXT
);

CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  description TEXT,
  brand       TEXT NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  image_url   TEXT,
  specs       TEXT NOT NULL DEFAULT '[]',
  badge       TEXT
);

CREATE TABLE IF NOT EXISTS stores (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  name     TEXT NOT NULL,
  location TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id       INTEGER NOT NULL REFERENCES stores(id),
  product_id     INTEGER NOT NULL REFERENCES products(id),
  price          REAL NOT NULL,
  original_price REAL,
  stock          INTEGER NOT NULL DEFAULT 0,
  shelf_note     TEXT,
  UNIQUE(store_id, product_id)
);

CREATE TABLE IF NOT EXISTS price_history (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  price      REAL NOT NULL,
  month      INTEGER NOT NULL,
  year       INTEGER NOT NULL
);
