CREATE TABLE IF NOT EXISTS device_pairing_codes (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  code_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (member_id)
    REFERENCES relationship_members(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS device_pairing_codes_member_idx
  ON device_pairing_codes(member_id);

CREATE INDEX IF NOT EXISTS device_pairing_codes_expiry_idx
  ON device_pairing_codes(expires_at, used_at);
