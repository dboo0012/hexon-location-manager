-- D1 (SQLite) schema for the Cloudflare deployment. Mirrors src/db/migrations/001_init.sql
-- (PostgreSQL): case-insensitive unique emails, per-user locations, coordinate range checks.
-- Applied with: npx wrangler d1 migrations apply hexon-locations --remote

CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE locations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  latitude   REAL NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude  REAL NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX locations_user_id_idx ON locations (user_id, id);
