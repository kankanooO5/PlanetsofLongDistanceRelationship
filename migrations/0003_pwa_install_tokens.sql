CREATE TABLE IF NOT EXISTS member_install_tokens (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (member_id)
    REFERENCES relationship_members(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS member_install_tokens_member_idx
  ON member_install_tokens(member_id);

CREATE INDEX IF NOT EXISTS member_install_tokens_expiry_idx
  ON member_install_tokens(expires_at);
