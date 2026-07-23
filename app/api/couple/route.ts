import { env } from "cloudflare:workers";
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { coupleSettings, messages, pokes, statuses, wishes } from "../../../db/schema";

type Role = "first" | "second";

function runtimeEnv() {
  return env as unknown as { COUPLE_CODE?: string; DB?: D1Database };
}

function isAuthorized(request: Request) {
  const expected = runtimeEnv().COUPLE_CODE;
  return Boolean(expected && request.headers.get("x-couple-code") === expected);
}

async function ensureSchema() {
  const d1 = runtimeEnv().DB;
  if (!d1) throw new Error("数据库暂时没有连接");

  await d1.batch([
    d1.prepare(`CREATE TABLE IF NOT EXISTS couple_settings (
      id INTEGER PRIMARY KEY,
      start_date TEXT NOT NULL,
      next_meeting TEXT NOT NULL,
      first_name TEXT NOT NULL DEFAULT '我',
      second_name TEXT NOT NULL DEFAULT '他'
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS statuses (
      role TEXT PRIMARY KEY,
      emoji TEXT NOT NULL,
      label TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS pokes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS wishes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
  ]);

  const db = getDb();
  await db
    .insert(coupleSettings)
    .values({
      id: 1,
      startDate: "2024-01-01",
      nextMeeting: "2026-08-20",
      firstName: "我",
      secondName: "他",
    })
    .onConflictDoNothing();
}

async function readAll() {
  const db = getDb();
  const [settingsRows, statusRows, messageRows, wishRows, pokeRows] = await Promise.all([
    db.select().from(coupleSettings).limit(1),
    db.select().from(statuses),
    db.select().from(messages).orderBy(desc(messages.createdAt), desc(messages.id)).limit(60),
    db.select().from(wishes).orderBy(desc(wishes.createdAt), desc(wishes.id)).limit(100),
    db
      .select({ count: sql<number>`count(*)` })
      .from(pokes)
      .where(sql`date(${pokes.createdAt}) = date('now')`),
  ]);

  return {
    settings: settingsRows[0],
    statuses: statusRows,
    pokesToday: Number(pokeRows[0]?.count ?? 0),
    messages: messageRows,
    wishes: wishRows,
  };
}

function validRole(value: unknown): value is Role {
  return value === "first" || value === "second";
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "暗号不对，再想一想？" }, { status: 401 });
  }

  try {
    await ensureSchema();
    return Response.json(await readAll());
  } catch {
    return Response.json({ error: "小宇宙暂时走神了，请稍后重试" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "暗号不对，再想一想？" }, { status: 401 });
  }

  try {
    await ensureSchema();
    const payload = (await request.json()) as Record<string, unknown>;
    const db = getDb();

    if (payload.type === "status" && validRole(payload.role)) {
      const emoji = String(payload.emoji ?? "").slice(0, 8);
      const label = String(payload.label ?? "").trim().slice(0, 24);
      if (!emoji || !label) throw new Error("invalid status");
      await db
        .insert(statuses)
        .values({ role: payload.role, emoji, label })
        .onConflictDoUpdate({
          target: statuses.role,
          set: { emoji, label, updatedAt: sql`CURRENT_TIMESTAMP` },
        });
    } else if (payload.type === "poke" && validRole(payload.role)) {
      await db.insert(pokes).values({ author: payload.role });
    } else if (payload.type === "message" && validRole(payload.role)) {
      const content = String(payload.content ?? "").trim().slice(0, 240);
      if (!content) throw new Error("empty message");
      await db.insert(messages).values({ author: payload.role, content });
    } else if (payload.type === "wish" && validRole(payload.role)) {
      const title = String(payload.title ?? "").trim().slice(0, 80);
      if (!title) throw new Error("empty wish");
      await db.insert(wishes).values({ author: payload.role, title });
    } else if (payload.type === "toggleWish") {
      const id = Number(payload.id);
      const [wish] = await db.select().from(wishes).where(eq(wishes.id, id)).limit(1);
      if (!wish) throw new Error("missing wish");
      await db.update(wishes).set({ completed: !wish.completed }).where(eq(wishes.id, id));
    } else {
      return Response.json({ error: "这项操作还没有准备好" }, { status: 400 });
    }

    return Response.json(await readAll());
  } catch {
    return Response.json({ error: "没有保存成功，请再试一次" }, { status: 500 });
  }
}
