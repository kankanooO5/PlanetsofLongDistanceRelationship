PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS photo_comments (
  id TEXT PRIMARY KEY,
  photo_id TEXT NOT NULL,
  relationship_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (photo_id)
    REFERENCES photos(id)
    ON DELETE CASCADE,

  FOREIGN KEY (relationship_id)
    REFERENCES relationships(id)
    ON DELETE CASCADE,

  FOREIGN KEY (member_id)
    REFERENCES relationship_members(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS photo_comments_photo_created_idx
  ON photo_comments(
    photo_id,
    created_at ASC
  );

CREATE INDEX IF NOT EXISTS photo_comments_relationship_idx
  ON photo_comments(relationship_id);

CREATE INDEX IF NOT EXISTS photo_comments_member_idx
  ON photo_comments(member_id);
