ALTER TABLE photos
ADD COLUMN thumbnail_object_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS photos_thumbnail_object_key_idx
  ON photos(thumbnail_object_key)
  WHERE thumbnail_object_key IS NOT NULL;
