-- Add cloud-backup authorization and delivery receipts without changing business records.
CREATE TABLE IF NOT EXISTS backup_connections (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  email TEXT NOT NULL,
  folder_id TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  connected_at TEXT NOT NULL,
  last_backup_at TEXT,
  last_drive_backup_at TEXT,
  last_email_backup_at TEXT,
  last_error TEXT
);
CREATE TABLE IF NOT EXISTS backup_oauth_states (
  state_hash TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS backup_runs (
  id TEXT PRIMARY KEY,
  trigger TEXT NOT NULL,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  filename TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  drive_state TEXT NOT NULL DEFAULT 'pending',
  drive_file_id TEXT,
  email_state TEXT NOT NULL DEFAULT 'pending',
  email_message_id TEXT,
  last_error TEXT,
  queued INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS backup_locks (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
