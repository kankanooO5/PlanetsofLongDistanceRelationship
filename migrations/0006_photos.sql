PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  relationship_id TEXT NOT NULL,
  uploaded_by_member_id TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  width INTEGER,
  height INTEGER,
  caption TEXT NOT NULL DEFAULT '',
  taken_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (relationship_id)
    REFERENCES relationships(id)
    ON DELETE CASCADE,

  FOREIGN KEY (uploaded_by_member_id)
    REFERENCES relationship_members(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS photos_relationship_taken_idx
  ON photos(
    relationship_id,
    taken_at DESC,
    created_at DESC
  );

CREATE INDEX IF NOT EXISTS photos_relationship_created_idx
  ON photos(
    relationship_id,
    created_at DESC
  );

CREATE INDEX IF NOT EXISTS photos_uploader_idx
  ON photos(uploaded_by_member_id);
