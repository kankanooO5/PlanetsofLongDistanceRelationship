import { env } from "cloudflare:workers";
import { NextRequest } from "next/server";

export const runtime = "edge";

type PairingRow = {
  pairingId: string;
  memberId: string;
  relationshipId: string;
  role: "first" | "second";
  expiresAt: string;
  usedAt: string | null;
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
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoded,
  );

  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
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

  let body: { code?: string };

  try {
    body = (await request.json()) as {
      code?: string;
    };
  } catch {
    return Response.json(
      { error: "请求内容格式不正确" },
      { status: 400 },
    );
  }

  const pairingCode = body.code
    ?.trim()
    .toUpperCase()
    .replace(/[\s-]/g, "");

  if (!pairingCode || pairingCode.length !== 8) {
    return Response.json(
      { error: "请输入完整的 8 位设备绑定码" },
      { status: 400 },
    );
  }

  try {
    const pairingCodeHash = await sha256(pairingCode);

    const pairing = await database
      .prepare(
        `SELECT
          device_pairing_codes.id AS pairingId,
          device_pairing_codes.member_id AS memberId,
          device_pairing_codes.expires_at AS expiresAt,
          device_pairing_codes.used_at AS usedAt,
          relationship_members.relationship_id AS relationshipId,
          relationship_members.role AS role

        FROM device_pairing_codes

        INNER JOIN relationship_members
          ON relationship_members.id =
             device_pairing_codes.member_id

        WHERE device_pairing_codes.code_hash = ?

        LIMIT 1`,
      )
      .bind(pairingCodeHash)
      .first<PairingRow>();

    if (!pairing) {
      return Response.json(
        { error: "设备绑定码不正确" },
        { status: 404 },
      );
    }

    if (pairing.usedAt) {
      return Response.json(
        { error: "该设备绑定码已经被使用" },
        { status: 410 },
      );
    }

    if (
      new Date(pairing.expiresAt).getTime() <=
      Date.now()
    ) {
      return Response.json(
        { error: "设备绑定码已经过期" },
        { status: 410 },
      );
    }

    const memberToken = createRandomToken();
    const memberTokenHash = await sha256(memberToken);
    const sessionId = crypto.randomUUID();
    const usedAt = new Date().toISOString();

    await database.batch([
      database
        .prepare(
          `INSERT INTO member_sessions (
            id,
            member_id,
            token_hash
          ) VALUES (?, ?, ?)`,
        )
        .bind(
          sessionId,
          pairing.memberId,
          memberTokenHash,
        ),

      database
        .prepare(
          `UPDATE device_pairing_codes
           SET used_at = ?
           WHERE id = ?
             AND used_at IS NULL`,
        )
        .bind(usedAt, pairing.pairingId),
    ]);

    return Response.json({
      member: {
        id: pairing.memberId,
        role: pairing.role,
        token: memberToken,
      },

      relationship: {
        id: pairing.relationshipId,
      },
    });
  } catch (reason) {
    console.error("Redeem device pairing code failed", reason);

    return Response.json(
      { error: "设备绑定失败，请稍后再试" },
      { status: 500 },
    );
  }
}
