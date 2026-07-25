CREATE TABLE IF NOT EXISTS member_sessions (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TEXT,
  revoked_at TEXT,

  FOREIGN KEY (member_id)
    REFERENCES relationship_members(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS member_sessions_member_idx
  ON member_sessions(member_id);

CREATE INDEX IF NOT EXISTS member_sessions_active_idx
  ON member_sessions(token_hash, revoked_at);

INSERT OR IGNORE INTO member_sessions (
  id,
  member_id,
  token_hash,
  created_at
)
SELECT
  lower(hex(randomblob(16))),
  id,
  member_token_hash,
  CURRENT_TIMESTAMP
FROM relationship_members
WHERE member_token_hash IS NOT NULL;
