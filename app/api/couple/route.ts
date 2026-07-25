import { NextRequest } from "next/server";
import { env } from "cloudflare:workers";

export const runtime = "edge";

type CoupleSettings = {
  startDate: string;
  nextMeeting: string;
  firstName: string;
  secondName: string;
};

const DEFAULT_SETTINGS: CoupleSettings = {
  startDate: "2025-05-23",
  nextMeeting: "2026-08-31",
  firstName: "小行星 A",
  secondName: "小行星 B",
};

function isAuthorized(request: NextRequest) {
  const expectedCode = process.env.COUPLE_CODE;
  const actualCode = request.headers.get("x-couple-code")?.trim();

  return Boolean(expectedCode && actualCode && actualCode === expectedCode);
}

function getD1Database() {
  return env.DB as D1Database | undefined;
}

async function ensureTables(d1: D1Database) {
  await d1
    .prepare(
      `CREATE TABLE IF NOT EXISTS couple_settings (
        id INTEGER PRIMARY KEY,
        start_date TEXT NOT NULL,
        next_meeting TEXT NOT NULL,
        first_name TEXT NOT NULL,
        second_name TEXT NOT NULL
      )`,
    )
    .run();
}

async function loadSettings(d1: D1Database): Promise<CoupleSettings> {
  const row = await d1
    .prepare(
      `SELECT
        start_date as startDate,
        next_meeting as nextMeeting,
        first_name as firstName,
        second_name as secondName
      FROM couple_settings
      ORDER BY id ASC
      LIMIT 1`,
    )
    .first<CoupleSettings>();

  return row ?? DEFAULT_SETTINGS;
}

async function loadCoupleData() {
  const d1 = getD1Database();

  if (!d1) {
    return {
      settings: DEFAULT_SETTINGS,
    };
  }

  await ensureTables(d1);

  return {
    settings: await loadSettings(d1),
  };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "暗号不对，再想一想？" }, { status: 401 });
  }

  try {
    const data = await loadCoupleData();
    return Response.json(data);
  } catch (reason) {
    console.error(reason);
    return Response.json({ error: "小宇宙暂时走神了，请稍后重试" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
