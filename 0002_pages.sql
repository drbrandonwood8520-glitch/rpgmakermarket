-- Visual-builder pages. Each page is a JSON node-tree authored at /admin/builder
-- and served publicly at /pg/<slug> once published.
CREATE TABLE IF NOT EXISTS pages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT UNIQUE NOT NULL,            -- url-safe id, served at /pg/<slug>
  title       TEXT NOT NULL DEFAULT 'Untitled',
  tree        TEXT NOT NULL DEFAULT '{}',      -- JSON: the page node-tree
  published   INTEGER NOT NULL DEFAULT 0,      -- 1 = visible at /pg/<slug>
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pages_published ON pages(published);
