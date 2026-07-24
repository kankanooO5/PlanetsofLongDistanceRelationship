import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const coupleSettings = sqliteTable("couple_settings", {
  id: integer("id").primaryKey(),
  startDate: text("start_date").notNull(),
  nextMeeting: text("next_meeting").notNull(),
  firstName: text("first_name").notNull().default("我"),
  secondName: text("second_name").notNull().default("他"),
});

export const statuses = sqliteTable("statuses", {
  role: text("role").primaryKey(),
  emoji: text("emoji").notNull(),
  label: text("label").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const pokes = sqliteTable("pokes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  author: text("author").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  author: text("author").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const wishes = sqliteTable("wishes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  author: text("author").notNull(),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
