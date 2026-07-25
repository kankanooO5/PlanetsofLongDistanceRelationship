ALTER TABLE relationship_members
ADD COLUMN member_token_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS relationship_members_token_hash_idx
  ON relationship_members(member_token_hash);
