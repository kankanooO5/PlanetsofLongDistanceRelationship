import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const coupleSettings = sqliteTable("couple_settings", {
  id: integer("id").primaryKey(),
  startDate: text("start_date").notNull(),
  nextMeeting: text("next_meeting").notNull(),
  firstName: text("first_name").notNull(),
  secondName: text("second_name").notNull(),
});
