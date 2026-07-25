import { env } from "cloudflare:workers";
import { NextRequest } from "next/server";

export const runtime = "edge";

type CurrentMemberRow = {
  id: string;
  relationshipId: string;
  role: "first" | "second";
};

type TargetMemberRow = {
  id: string;
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

function createPairingCode(length = 8) {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = new Uint8Array(length);

  crypto.getRandomValues(bytes);

  return Array.from(
    bytes,
    (byte) => alphabet[byte % alphabet.length],
  ).join("");
}

export async function POST(request: NextRequest) {
  const database = getDatabase();

  if (!database) {
    return Response.json(
      { error: "当前环境尚未连接关系数据库" },
      { status: 503 },
    );
  }

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

  let body: {
    target?: "self" | "partner";
  } = {};

  try {
    body = (await request.json()) as {
      target?: "self" | "partner";
    };
  } catch {
    // 兼容没有请求体的旧调用。
  }

  const target = body.target === "partner"
    ? "partner"
    : "self";

  try {
    const memberTokenHash = await sha256(memberToken);

    const currentMember = await database
      .prepare(
        `SELECT
          relationship_members.id,
          relationship_members.relationship_id AS relationshipId,
          relationship_members.role

        FROM relationship_members

        WHERE
          relationship_members.member_token_hash = ?

          OR EXISTS (
            SELECT 1
            FROM member_sessions
            WHERE member_sessions.member_id =
                  relationship_members.id
              AND member_sessions.token_hash = ?
              AND member_sessions.revoked_at IS NULL
          )

        LIMIT 1`,
      )
      .bind(memberTokenHash, memberTokenHash)
      .first<CurrentMemberRow>();

    if (!currentMember) {
      return Response.json(
        { error: "成员身份已经失效" },
        { status: 401 },
      );
    }

    let targetMemberId = currentMember.id;

    if (target === "partner") {
      const partner = await database
        .prepare(
          `SELECT id
           FROM relationship_members
           WHERE relationship_id = ?
             AND id != ?
           LIMIT 1`,
        )
        .bind(
          currentMember.relationshipId,
          currentMember.id,
        )
        .first<TargetMemberRow>();

      if (!partner) {
        return Response.json(
          { error: "另一颗星球尚未加入这段关系" },
          { status: 404 },
        );
      }

      targetMemberId = partner.id;
    }

    await database
      .prepare(
        `UPDATE device_pairing_codes
         SET used_at = CURRENT_TIMESTAMP
         WHERE member_id = ?
           AND used_at IS NULL`,
      )
      .bind(targetMemberId)
      .run();

    let pairingCode = "";
    let pairingCodeHash = "";

    for (let attempt = 0; attempt < 5; attempt += 1) {
      pairingCode = createPairingCode();
      pairingCodeHash = await sha256(pairingCode);

      const existing = await database
        .prepare(
          `SELECT id
           FROM device_pairing_codes
           WHERE code_hash = ?
           LIMIT 1`,
        )
        .bind(pairingCodeHash)
        .first<{ id: string }>();

      if (!existing) break;

      pairingCode = "";
      pairingCodeHash = "";
    }

    if (!pairingCode || !pairingCodeHash) {
      throw new Error("Unable to generate unique pairing code");
    }

    const expiresAt = new Date(
      Date.now() + 10 * 60 * 1000,
    ).toISOString();

    await database
      .prepare(
        `INSERT INTO device_pairing_codes (
          id,
          member_id,
          code_hash,
          expires_at
        ) VALUES (?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        targetMemberId,
        pairingCodeHash,
        expiresAt,
      )
      .run();

    return Response.json({
      code: pairingCode,
      expiresAt,
      target,
    });
  } catch (reason) {
    console.error("Create device pairing code failed", reason);

    return Response.json(
      { error: "暂时无法生成设备绑定码" },
      { status: 500 },
    );
  }
}
