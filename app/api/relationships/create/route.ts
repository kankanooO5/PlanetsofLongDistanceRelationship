import { NextRequest } from "next/server";
import { env } from "cloudflare:workers";

export const runtime = "edge";

type CreateRelationshipBody = {
  creatorName?: string;
  partnerName?: string;
  startDate?: string;
  nextMeeting?: string;
};

const INVITE_VALID_DAYS = 7;

function isAuthorized(request: NextRequest) {
  const expectedCode = process.env.COUPLE_CODE;
  const actualCode = request.headers.get("x-couple-code")?.trim();

  return Boolean(
    expectedCode &&
      actualCode &&
      actualCode === expectedCode,
  );
}

function getDatabase() {
  return env.DB as D1Database | undefined;
}

function normalizeName(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;

  const normalized = value.trim().slice(0, 30);
  return normalized || fallback;
}

function normalizeDate(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;

  const normalized = value.trim();

  return /^\d{4}-\d{2}-\d{2}$/.test(normalized)
    ? normalized
    : fallback;
}

function createRandomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);

  return Array.from(
    bytes,
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function sha256(value: string) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);

  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return Response.json(
      { error: "暗号不对，再想一想？" },
      { status: 401 },
    );
  }

  const database = getDatabase();

  if (!database) {
    return Response.json(
      { error: "当前环境尚未连接关系数据库" },
      { status: 503 },
    );
  }

  let body: CreateRelationshipBody;

  try {
    body = (await request.json()) as CreateRelationshipBody;
  } catch {
    return Response.json(
      { error: "请求内容格式不正确" },
      { status: 400 },
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  const creatorName = normalizeName(
    body.creatorName,
    "小行星 A",
  );

  const partnerName = normalizeName(
    body.partnerName,
    "小行星 B",
  );

  const startDate = normalizeDate(body.startDate, today);
  const nextMeeting = normalizeDate(
    body.nextMeeting,
    today,
  );

  const relationshipId = crypto.randomUUID();
  const creatorMemberId = crypto.randomUUID();
  const inviteId = crypto.randomUUID();

  const inviteToken = createRandomToken();
  const tokenHash = await sha256(inviteToken);

  const expiresAt = new Date(
    Date.now() + INVITE_VALID_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  try {
    await database.batch([
      database
        .prepare(
          `INSERT INTO relationships (
            id,
            start_date,
            next_meeting
          ) VALUES (?, ?, ?)`,
        )
        .bind(
          relationshipId,
          startDate,
          nextMeeting,
        ),

      database
        .prepare(
          `INSERT INTO relationship_members (
            id,
            relationship_id,
            role,
            display_name
          ) VALUES (?, ?, 'first', ?)`,
        )
        .bind(
          creatorMemberId,
          relationshipId,
          creatorName,
        ),

      database
        .prepare(
          `INSERT INTO relationship_invites (
            id,
            relationship_id,
            target_role,
            token_hash,
            expires_at
          ) VALUES (?, ?, 'second', ?, ?)`,
        )
        .bind(
          inviteId,
          relationshipId,
          tokenHash,
          expiresAt,
        ),
    ]);

    const inviteUrl = new URL("/join", request.nextUrl.origin);
    inviteUrl.searchParams.set("token", inviteToken);

    return Response.json(
      {
        relationship: {
          id: relationshipId,
          startDate,
          nextMeeting,
        },
        creator: {
          memberId: creatorMemberId,
          role: "first",
          displayName: creatorName,
        },
        invite: {
          partnerName,
          url: inviteUrl.toString(),
          expiresAt,
        },
      },
      { status: 201 },
    );
  } catch (reason) {
    console.error("Create relationship failed", reason);

    return Response.json(
      { error: "创建小宇宙失败，请稍后重试" },
      { status: 500 },
    );
  }
}
