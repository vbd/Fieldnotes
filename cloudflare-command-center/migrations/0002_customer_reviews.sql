-- Add customer feedback without altering or removing existing business records.
CREATE TABLE IF NOT EXISTS customer_reviews (
  id TEXT PRIMARY KEY,
  estimate_id TEXT NOT NULL UNIQUE REFERENCES records(id),
  created_at TEXT NOT NULL,
  data TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_customer_reviews_created ON customer_reviews(created_at DESC);
