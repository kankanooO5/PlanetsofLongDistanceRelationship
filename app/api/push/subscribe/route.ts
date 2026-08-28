import { env } from "cloudflare:workers";
import { NextRequest } from "next/server";

import { authenticateMember } from "../../../../lib/server/member-auth";

export const runtime = "edge";

type SubscriptionBody = {
  endpoint?: string;
  expirationTime?: number | null;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

function getDatabase() {
  return env.DB as D1Database | undefined;
}

export async function POST(
  request: NextRequest,
) {
  const database = getDatabase();

  if (!database) {
    return Response.json(
      {
        error:
          "当前环境尚未连接关系数据库",
      },
      { status: 503 },
    );
  }

  const member =
    await authenticateMember(
      request,
      database,
    );

  if (!member) {
    return Response.json(
      {
        error:
          "成员身份已经失效，请重新加入",
      },
      { status: 401 },
    );
  }

  let body: SubscriptionBody;

  try {
    body =
      (await request.json()) as SubscriptionBody;
  } catch {
    return Response.json(
      {
        error:
          "Push subscription 格式不正确",
      },
      { status: 400 },
    );
  }

  const endpoint =
    body.endpoint?.trim();

  const p256dh =
    body.keys?.p256dh?.trim();

  const auth =
    body.keys?.auth?.trim();

  if (
    !endpoint ||
    !endpoint.startsWith("https://") ||
    !p256dh ||
    !auth
  ) {
    return Response.json(
      {
        error:
          "Push subscription 内容不完整",
      },
      { status: 400 },
    );
  }

  const subscriptionId =
    crypto.randomUUID();

  const userAgent =
    request.headers
      .get("user-agent")
      ?.slice(0, 1000) ?? null;

  try {
    await database
      .prepare(
        `INSERT INTO push_subscriptions (
          id,
          member_id,
          endpoint,
          p256dh,
          auth,
          user_agent,
          created_at,
          last_seen_at,
          revoked_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP,
          NULL
        )

        ON CONFLICT(endpoint)
        DO UPDATE SET
          member_id = excluded.member_id,
          p256dh = excluded.p256dh,
          auth = excluded.auth,
          user_agent = excluded.user_agent,
          last_seen_at = CURRENT_TIMESTAMP,
          revoked_at = NULL`,
      )
      .bind(
        subscriptionId,
        member.memberId,
        endpoint,
        p256dh,
        auth,
        userAgent,
      )
      .run();

    return Response.json({
      ok: true,
    });
  } catch (reason) {
    console.error(
      "Save push subscription failed",
      reason,
    );

    return Response.json(
      {
        error:
          "暂时无法保存通知设备",
      },
      { status: 500 },
    );
  }
}
