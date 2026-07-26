import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const coupleSettings = sqliteTable("couple_settings", {
  id: integer("id").primaryKey(),
  startDate: text("start_date").notNull(),
  nextMeeting: text("next_meeting").notNull(),
  firstName: text("first_name").notNull(),
  secondName: text("second_name").notNull(),
});

export const photos = sqliteTable(
  "photos",
  {
    id: text("id").primaryKey(),
    relationshipId: text("relationship_id").notNull(),
    uploadedByMemberId: text(
      "uploaded_by_member_id",
    ).notNull(),
    objectKey: text("object_key").notNull(),
    thumbnailObjectKey: text("thumbnail_object_key"),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    caption: text("caption").notNull().default(""),
    takenAt: text("taken_at").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default("CURRENT_TIMESTAMP"),
  },
  (table) => [
    uniqueIndex("photos_object_key_idx").on(
      table.objectKey,
    ),
    uniqueIndex("photos_thumbnail_object_key_idx").on(
      table.thumbnailObjectKey,
    ),
    index("photos_relationship_taken_idx").on(
      table.relationshipId,
      table.takenAt,
      table.createdAt,
    ),
    index("photos_relationship_created_idx").on(
      table.relationshipId,
      table.createdAt,
    ),
    index("photos_uploader_idx").on(
      table.uploadedByMemberId,
    ),
  ],
);
