CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         CITEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE locations (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  latitude   DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude  DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX locations_user_id_idx ON locations (user_id, id);
