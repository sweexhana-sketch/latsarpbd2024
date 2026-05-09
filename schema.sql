-- ============================================================
-- SIMLATSAR PBD — Schema PostgreSQL (Neon)
-- Jalankan ini di Neon SQL Editor sebelum deploy
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id       SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name     TEXT NOT NULL,
  role     TEXT DEFAULT 'viewer'
);

CREATE TABLE IF NOT EXISTS peserta (
  id        SERIAL PRIMARY KEY,
  nama      TEXT NOT NULL,
  nip       TEXT UNIQUE NOT NULL,
  golongan  TEXT NOT NULL,
  gelombang INTEGER NOT NULL,
  angkatan  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS dokumen (
  id            SERIAL PRIMARY KEY,
  peserta_nip   TEXT NOT NULL,
  jenis_dokumen TEXT NOT NULL,
  file_path     TEXT,
  file_url      TEXT,
  status        TEXT DEFAULT 'pending',
  upload_date   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
