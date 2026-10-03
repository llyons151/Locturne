-- Locturne waitlist (Cloudflare D1). Apply with:
--   npx wrangler d1 execute locturne-waitlist --remote --file=./schema.sql
-- Safe to run again: it only creates what's missing.

CREATE TABLE IF NOT EXISTS signups (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  -- Trimmed and lowercased by the function, so UNIQUE is the dedupe.
  email        TEXT NOT NULL UNIQUE,
  -- First touch only: a repeat sign-up never overwrites where someone first came from.
  src          TEXT,              -- ?src= on the bio link, e.g. tt-stairs-01
  utm_source   TEXT,
  utm_medium   TEXT,
  utm_campaign TEXT,
  utm_content  TEXT,
  utm_term     TEXT,
  ref          TEXT,              -- referring site's hostname only, e.g. www.tiktok.com
  country      TEXT,              -- two-letter country from Cloudflare (request.cf.country)
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  -- Set when someone asks to be removed from mailings but we keep the row for counts.
  unsubscribed_at TEXT
);

CREATE INDEX IF NOT EXISTS signups_src ON signups (src);
CREATE INDEX IF NOT EXISTS signups_created_at ON signups (created_at);
