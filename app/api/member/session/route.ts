import { env } from "cloudflare:workers";
import { NextRequest } from "next/server";

export const runtime = "edge";

type MemberRow = {
  sessionId: string | null;
  memberId: string;
  relationshipId: string;
  role: "first" | "second";
  displayName: string;
  partnerId: string | null;
  partnerName: string | null;
  startDate: string;
  nextMeeting: string;
};

function getDatabase() {
  return env.DB as D1Database | undefined;
}

async function sha256(value: string) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoded,
  );

  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function GET(request: NextRequest) {
  const memberToken =
    request.headers.get("x-member-token")?.trim();

  if (
    !memberToken ||
    memberToken.length < 32 ||
    memberToken.length > 256
  ) {
    return Response.json(
      { error: "成员身份凭证缺失" },
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

  try {
    const memberTokenHash = await sha256(memberToken);

    const row = await database
      .prepare(
        `SELECT
          (
            SELECT member_sessions.id
            FROM member_sessions
            WHERE member_sessions.member_id =
                  current_member.id
              AND member_sessions.token_hash = ?
              AND member_sessions.revoked_at IS NULL
            LIMIT 1
          ) AS sessionId,

          current_member.id AS memberId,
          current_member.relationship_id AS relationshipId,
          current_member.role AS role,
          current_member.display_name AS displayName,

          partner.id AS partnerId,
          partner.display_name AS partnerName,

          relationships.start_date AS startDate,
          relationships.next_meeting AS nextMeeting

        FROM relationship_members AS current_member

        INNER JOIN relationships
          ON relationships.id =
             current_member.relationship_id

        LEFT JOIN relationship_members AS partner
          ON partner.relationship_id =
             current_member.relationship_id
          AND partner.role != current_member.role

        WHERE
          current_member.member_token_hash = ?

          OR EXISTS (
            SELECT 1
            FROM member_sessions
            WHERE member_sessions.member_id =
                  current_member.id
              AND member_sessions.token_hash = ?
              AND member_sessions.revoked_at IS NULL
          )

        LIMIT 1`,
      )
      .bind(
        memberTokenHash,
        memberTokenHash,
        memberTokenHash,
      )
      .first<MemberRow>();

    if (!row) {
      return Response.json(
        { error: "成员身份已经失效，请重新加入" },
        { status: 401 },
      );
    }

    if (row.sessionId) {
      await database
        .prepare(
          `UPDATE member_sessions
           SET last_used_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
        )
        .bind(row.sessionId)
        .run();
    }

    const firstName =
      row.role === "first"
        ? row.displayName
        : row.partnerName ?? "小行星 A";

    const secondName =
      row.role === "second"
        ? row.displayName
        : row.partnerName ?? "小行星 B";

    return Response.json({
      settings: {
        startDate: row.startDate,
        nextMeeting: row.nextMeeting,
        firstName,
        secondName,
      },

      relationship: {
        id: row.relationshipId,
      },

      member: {
        id: row.memberId,
        role: row.role,
        displayName: row.displayName,
      },

      partner: {
        id: row.partnerId,
        displayName:
          row.partnerName ??
          (row.role === "first"
            ? "小行星 B"
            : "小行星 A"),
      },
    });
  } catch (reason) {
    console.error("Load member session failed", reason);

    return Response.json(
      { error: "小宇宙暂时无法连接，请稍后再试" },
      { status: 500 },
    );
  }
}
