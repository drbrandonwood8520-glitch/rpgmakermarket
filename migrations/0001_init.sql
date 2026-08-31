-- Everything you sell or give away: plugins, asset packs, generators.
CREATE TABLE IF NOT EXISTS products (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  slug            TEXT UNIQUE NOT NULL,          -- url-safe id, e.g. "quest-log-mz"
  title           TEXT NOT NULL,
  summary         TEXT,                          -- one-liner for cards
  description     TEXT,                          -- full markdown/plain text
  kind            TEXT NOT NULL DEFAULT 'plugin',-- plugin | asset | generator
  price_cents     INTEGER NOT NULL DEFAULT 0,    -- 0 = free download
  cover_image     TEXT,                          -- image URL (host anywhere for now)
  file_key        TEXT,                          -- R2 key of the downloadable
  external_url    TEXT,                          -- for generators / itch links
  published       INTEGER NOT NULL DEFAULT 1,    -- 1 = visible
  sponsored_until TEXT,                          -- ISO datetime; pinned+badged while future
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One row per successful paid download grant.
CREATE TABLE IF NOT EXISTS orders (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id        INTEGER NOT NULL REFERENCES products(id),
  stripe_session_id TEXT UNIQUE,
  email             TEXT,
  amount_cents      INTEGER,
  status            TEXT NOT NULL DEFAULT 'pending', -- pending | paid
  download_token    TEXT UNIQUE,                     -- what unlocks the file
  expires_at        TEXT,                            -- ISO datetime
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Dedupe table so a retried Stripe webhook can't double-process an event.
CREATE TABLE IF NOT EXISTS stripe_events (
  id         TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_products_kind      ON products(kind);
CREATE INDEX IF NOT EXISTS idx_products_sponsored ON products(sponsored_until);
CREATE INDEX IF NOT EXISTS idx_orders_token       ON orders(download_token);
