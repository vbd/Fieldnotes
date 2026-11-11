-- Additive Microsoft OneDrive connection storage; does not alter existing records.
CREATE TABLE IF NOT EXISTS microsoft_backup_connection (
  id INTEGER PRIMARY KEY CHECK(id=1),
  account_id TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  connected_at TEXT NOT NULL,
  last_backup_at TEXT
);
