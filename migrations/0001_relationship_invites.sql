PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS relationships (
  id TEXT PRIMARY KEY,
  start_date TEXT NOT NULL,
  next_meeting TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS relationship_members (
  id TEXT PRIMARY KEY,
  relationship_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('first', 'second')),
  display_name TEXT NOT NULL,
  device_id TEXT,
  user_id TEXT,
  joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (relationship_id)
    REFERENCES relationships(id)
    ON DELETE CASCADE,

  UNIQUE (relationship_id, role)
);

CREATE TABLE IF NOT EXISTS relationship_invites (
  id TEXT PRIMARY KEY,
  relationship_id TEXT NOT NULL,
  target_role TEXT NOT NULL CHECK (target_role IN ('first', 'second')),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (relationship_id)
    REFERENCES relationships(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS relationship_members_relationship_idx
  ON relationship_members(relationship_id);

CREATE INDEX IF NOT EXISTS relationship_invites_relationship_idx
  ON relationship_invites(relationship_id);

CREATE INDEX IF NOT EXISTS relationship_invites_expiry_idx
  ON relationship_invites(expires_at);
