CREATE TABLE IF NOT EXISTS ballots (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL,
  candidates      TEXT NOT NULL DEFAULT '[]',
  active          INTEGER NOT NULL DEFAULT 1,
  official_method TEXT NOT NULL DEFAULT 'ivstar',
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Migration for existing databases:
-- ALTER TABLE ballots ADD COLUMN official_method TEXT NOT NULL DEFAULT 'mj';

CREATE TABLE IF NOT EXISTS votes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ballot_id   INTEGER NOT NULL REFERENCES ballots(id) ON DELETE CASCADE,
  voter_name  TEXT NOT NULL,
  session_id  TEXT NOT NULL,
  ratings     TEXT NOT NULL DEFAULT '{}',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(ballot_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_ballot_id ON votes(ballot_id);
CREATE INDEX IF NOT EXISTS idx_ballots_active ON ballots(active);
