CREATE TABLE IF NOT EXISTS records (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('estimate', 'invoice')),
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  review_token TEXT UNIQUE,
  data TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_records_kind_created ON records(kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_records_status ON records(kind, status);
CREATE TABLE IF NOT EXISTS login_attempts (
  ip TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  last_at INTEGER NOT NULL
);
