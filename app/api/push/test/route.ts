import {
  buildPushPayload,
  type PushSubscription,
  type VapidKeys,
} from "@block65/webcrypto-web-push";

import { env } from "cloudflare:workers";
import { NextRequest } from "next/server";

import {
  authenticateMember,
} from "../../../../lib/server/member-auth";

export const runtime = "edge";

type PushEnvironment = {
  VAPID_SERVER_PUBLIC_KEY?: string;
  VAPID_SERVER_PRIVATE_KEY?: string;
};

type SubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
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

  const pushEnv =
    env as unknown as PushEnvironment;

  const publicKey =
    pushEnv.VAPID_SERVER_PUBLIC_KEY?.trim();

  const privateKey =
    pushEnv.VAPID_SERVER_PRIVATE_KEY?.trim();

  if (!publicKey || !privateKey) {
    return Response.json(
      {
        error:
          "当前环境尚未配置完整 Push 密钥",
      },
      { status: 503 },
    );
  }

  const result =
    await database
      .prepare(
        `SELECT
          id,
          endpoint,
          p256dh,
          auth
        FROM push_subscriptions
        WHERE member_id = ?
          AND revoked_at IS NULL`,
      )
      .bind(member.memberId)
      .all<SubscriptionRow>();

  const subscriptions =
    result.results ?? [];

  if (subscriptions.length === 0) {
    return Response.json(
      {
        error:
          "当前成员还没有开启任何通知设备",
      },
      { status: 409 },
    );
  }

  const eventId =
    crypto.randomUUID();

  const title =
    "两颗星球 ✦";

  const body =
    "测试成功，我们已经可以从小宇宙给你寄来消息啦。";

  await database
    .prepare(
      `INSERT INTO notification_events (
        id,
        relationship_id,
        actor_member_id,
        target_member_id,
        event_type,
        title,
        body,
        deep_link,
        payload_json
      ) VALUES (
        ?, ?, NULL, ?, ?, ?, ?, ?, ?
      )`,
    )
    .bind(
      eventId,
      member.relationshipId,
      member.memberId,
      "push_test",
      title,
      body,
      "/",
      JSON.stringify({
        source: "push_test",
      }),
    )
    .run();

  const vapid: VapidKeys = {
    subject: request.nextUrl.origin,
    publicKey,
    privateKey,
  };

  let sent = 0;
  let failed = 0;
  let expired = 0;

  for (const row of subscriptions) {
    const deliveryId =
      crypto.randomUUID();

    await database
      .prepare(
        `INSERT INTO notification_deliveries (
          id,
          event_id,
          subscription_id,
          status
        ) VALUES (
          ?, ?, ?, 'pending'
        )`,
      )
      .bind(
        deliveryId,
        eventId,
        row.id,
      )
      .run();

    const subscription:
      PushSubscription = {
        endpoint: row.endpoint,
        expirationTime: null,
        keys: {
          p256dh: row.p256dh,
          auth: row.auth,
        },
      };

    try {
      const payload =
        await buildPushPayload(
          {
            data: {
              title,
              body,
              url: "/",
              eventType: "push_test",
              eventId,
            },
            options: {
              ttl: 60,
              urgency: "normal",
            },
          },
          subscription,
          vapid,
        );

      const pushResponse =
        await fetch(
          subscription.endpoint,
          payload,
        );

      if (pushResponse.ok) {
        sent += 1;

        await database
          .prepare(
            `UPDATE notification_deliveries
             SET
               status = 'sent',
               attempted_at = CURRENT_TIMESTAMP,
               sent_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
          )
          .bind(deliveryId)
          .run();

        continue;
      }

      if (
        pushResponse.status === 404 ||
        pushResponse.status === 410
      ) {
        expired += 1;

        await database.batch([
          database
            .prepare(
              `UPDATE push_subscriptions
               SET revoked_at = CURRENT_TIMESTAMP
               WHERE id = ?`,
            )
            .bind(row.id),

          database
            .prepare(
              `UPDATE notification_deliveries
               SET
                 status = 'expired',
                 attempted_at = CURRENT_TIMESTAMP,
                 error_message = ?
               WHERE id = ?`,
            )
            .bind(
              `Push service returned ${pushResponse.status}`,
              deliveryId,
            ),
        ]);

        continue;
      }

      failed += 1;

      await database
        .prepare(
          `UPDATE notification_deliveries
           SET
             status = 'failed',
             attempted_at = CURRENT_TIMESTAMP,
             error_message = ?
           WHERE id = ?`,
        )
        .bind(
          `Push service returned ${pushResponse.status}`,
          deliveryId,
        )
        .run();
    } catch (reason) {
      failed += 1;

      const message =
        reason instanceof Error
          ? reason.message
          : "Unknown push error";

      await database
        .prepare(
          `UPDATE notification_deliveries
           SET
             status = 'failed',
             attempted_at = CURRENT_TIMESTAMP,
             error_message = ?
           WHERE id = ?`,
        )
        .bind(
          message.slice(0, 1000),
          deliveryId,
        )
        .run();
    }
  }

  return Response.json({
    ok: sent > 0,
    sent,
    failed,
    expired,
  });
}
