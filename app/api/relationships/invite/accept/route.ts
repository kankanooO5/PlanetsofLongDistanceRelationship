import { env } from "cloudflare:workers";
import { NextRequest } from "next/server";

export const runtime = "edge";

type AcceptInviteBody = {
  token?: string;
  displayName?: string;
};

type InviteRow = {
  inviteId: string;
  relationshipId: string;
  targetRole: "first" | "second";
  expiresAt: string;
  usedAt: string | null;
  startDate: string;
  nextMeeting: string;
  inviterName: string | null;
};

function getDatabase() {
  return env.DB as D1Database | undefined;
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

function normalizeName(value: unknown) {
  if (typeof value !== "string") return "小行星 B";

  const normalized = value.trim().slice(0, 30);
  return normalized || "小行星 B";
}

export async function POST(request: NextRequest) {
  const database = getDatabase();

  if (!database) {
    return Response.json(
      { error: "当前环境尚未连接关系数据库" },
      { status: 503 },
    );
  }

  let body: AcceptInviteBody;

  try {
    body = (await request.json()) as AcceptInviteBody;
  } catch {
    return Response.json(
      { error: "请求内容格式不正确" },
      { status: 400 },
    );
  }

  const token = body.token?.trim();

  if (!token || token.length < 32 || token.length > 256) {
    return Response.json(
      { error: "邀请链接不完整" },
      { status: 400 },
    );
  }

  const tokenHash = await sha256(token);
  const displayName = normalizeName(body.displayName);

  try {
    const invite = await database
      .prepare(
        `SELECT
          relationship_invites.id AS inviteId,
          relationship_invites.relationship_id AS relationshipId,
          relationship_invites.target_role AS targetRole,
          relationship_invites.expires_at AS expiresAt,
          relationship_invites.used_at AS usedAt,
          relationships.start_date AS startDate,
          relationships.next_meeting AS nextMeeting,
          inviter.display_name AS inviterName
        FROM relationship_invites
        INNER JOIN relationships
          ON relationships.id = relationship_invites.relationship_id
        LEFT JOIN relationship_members AS inviter
          ON inviter.relationship_id = relationships.id
          AND inviter.role = 'first'
        WHERE relationship_invites.token_hash = ?
        LIMIT 1`,
      )
      .bind(tokenHash)
      .first<InviteRow>();

    if (!invite) {
      return Response.json(
        { error: "这个邀请不存在或已经失效" },
        { status: 404 },
      );
    }

    if (invite.usedAt) {
      return Response.json(
        { error: "这个邀请已经被使用" },
        { status: 410 },
      );
    }

    if (new Date(invite.expiresAt).getTime() <= Date.now()) {
      return Response.json(
        { error: "这个邀请已经过期" },
        { status: 410 },
      );
    }

    const memberId = crypto.randomUUID();
    const memberToken = createRandomToken();
    const memberTokenHash = await sha256(memberToken);
    const usedAt = new Date().toISOString();

    await database.batch([
      database
        .prepare(
          `INSERT INTO relationship_members (
            id,
            relationship_id,
            role,
            display_name,
            member_token_hash
          ) VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(
          memberId,
          invite.relationshipId,
          invite.targetRole,
          displayName,
          memberTokenHash,
        ),

      database
        .prepare(
          `INSERT INTO member_sessions (
            id,
            member_id,
            token_hash
          ) VALUES (?, ?, ?)`,
        )
        .bind(
          crypto.randomUUID(),
          memberId,
          memberTokenHash,
        ),

      database
        .prepare(
          `UPDATE relationship_invites
          SET used_at = ?
          WHERE id = ?
            AND used_at IS NULL`,
        )
        .bind(usedAt, invite.inviteId),
    ]);

    return Response.json(
      {
        relationship: {
          id: invite.relationshipId,
          startDate: invite.startDate,
          nextMeeting: invite.nextMeeting,
        },
        member: {
          id: memberId,
          role: invite.targetRole,
          displayName,
          token: memberToken,
        },
        partner: {
          displayName: invite.inviterName ?? "小行星 A",
        },
      },
      { status: 201 },
    );
  } catch (reason) {
    console.error("Accept relationship invite failed", reason);

    return Response.json(
      {
        error:
          "加入小宇宙失败。邀请可能已经被使用，请重新打开链接确认。",
      },
      { status: 409 },
    );
  }
}
