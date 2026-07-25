import { env } from "cloudflare:workers";
import { NextRequest } from "next/server";

export const runtime = "edge";

type InviteRow = {
  inviteId: string;
  relationshipId: string;
  targetRole: "first" | "second";
  expiresAt: string;
  usedAt: string | null;
  startDate: string;
  nextMeeting: string;
  creatorName: string | null;
};

function getDatabase() {
  return env.DB as D1Database | undefined;
}

async function sha256(value: string) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);

  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim();

  if (!token || token.length < 32 || token.length > 256) {
    return Response.json(
      {
        valid: false,
        error: "邀请链接不完整",
      },
      { status: 400 },
    );
  }

  const database = getDatabase();

  if (!database) {
    return Response.json(
      {
        valid: false,
        error: "当前环境尚未连接关系数据库",
      },
      { status: 503 },
    );
  }

  try {
    const tokenHash = await sha256(token);

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
          creator.display_name AS creatorName
        FROM relationship_invites
        INNER JOIN relationships
          ON relationships.id = relationship_invites.relationship_id
        LEFT JOIN relationship_members AS creator
          ON creator.relationship_id = relationships.id
          AND creator.role = 'first'
        WHERE relationship_invites.token_hash = ?
        LIMIT 1`,
      )
      .bind(tokenHash)
      .first<InviteRow>();

    if (!invite) {
      return Response.json(
        {
          valid: false,
          error: "这个邀请不存在或已经失效",
        },
        { status: 404 },
      );
    }

    if (invite.usedAt) {
      return Response.json(
        {
          valid: false,
          error: "这个邀请已经被使用",
        },
        { status: 410 },
      );
    }

    if (new Date(invite.expiresAt).getTime() <= Date.now()) {
      return Response.json(
        {
          valid: false,
          error: "这个邀请已经过期",
        },
        { status: 410 },
      );
    }

    return Response.json({
      valid: true,
      relationship: {
        id: invite.relationshipId,
        startDate: invite.startDate,
        nextMeeting: invite.nextMeeting,
      },
      inviter: {
        displayName: invite.creatorName ?? "小行星 A",
      },
      invitation: {
        targetRole: invite.targetRole,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (reason) {
    console.error("Validate relationship invite failed", reason);

    return Response.json(
      {
        valid: false,
        error: "邀请链接暂时无法验证，请稍后重试",
      },
      { status: 500 },
    );
  }
}
