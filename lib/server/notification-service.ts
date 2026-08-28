import {
  buildPushPayload,
  type PushSubscription,
  type VapidKeys,
} from "@block65/webcrypto-web-push";

import { env } from "cloudflare:workers";

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

type PreferenceRow = {
  enabled: number;
  previewMode: "full" | "private";
};

export type NotificationEventType =
  | "push_test"
  | "photo_uploaded"
  | "photo_comment_added"
  | "idea_answer_submitted"
  | "idea_analysis_ready"
  | "idea_reminder"
  | "release_update"
  | (string & {});

export type NotifyMemberInput = {
  database: D1Database;

  origin: string;

  targetMemberId: string;

  relationshipId?: string | null;

  actorMemberId?: string | null;

  eventType: NotificationEventType;

  title: string;

  body: string;

  deepLink?: string | null;

  payload?: Record<string, unknown>;

  dedupeKey?: string | null;

  ttl?: number;

  urgency?: "low" | "normal" | "high";
};

export type NotifyMemberResult = {
  eventId: string;
  sent: number;
  failed: number;
  expired: number;

  skipped:
    | null
    | "disabled"
    | "no_subscription"
    | "duplicate";
};

async function createNotificationEvent(
  input: NotifyMemberInput,
) {
  const eventId =
    crypto.randomUUID();

  if (input.dedupeKey) {
    await input.database
      .prepare(
        `INSERT OR IGNORE INTO notification_events (
          id,
          relationship_id,
          actor_member_id,
          target_member_id,
          event_type,
          title,
          body,
          deep_link,
          payload_json,
          dedupe_key
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )`,
      )
      .bind(
        eventId,
        input.relationshipId ?? null,
        input.actorMemberId ?? null,
        input.targetMemberId,
        input.eventType,
        input.title,
        input.body,
        input.deepLink ?? null,
        JSON.stringify(
          input.payload ?? {},
        ),
        input.dedupeKey,
      )
      .run();

    const stored =
      await input.database
        .prepare(
          `SELECT id
           FROM notification_events
           WHERE dedupe_key = ?
           LIMIT 1`,
        )
        .bind(input.dedupeKey)
        .first<{ id: string }>();

    if (!stored) {
      throw new Error(
        "Notification event was not created",
      );
    }

    return {
      eventId: stored.id,
      duplicate:
        stored.id !== eventId,
    };
  }

  await input.database
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
        payload_json,
        dedupe_key
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL
      )`,
    )
    .bind(
      eventId,
      input.relationshipId ?? null,
      input.actorMemberId ?? null,
      input.targetMemberId,
      input.eventType,
      input.title,
      input.body,
      input.deepLink ?? null,
      JSON.stringify(
        input.payload ?? {},
      ),
    )
    .run();

  return {
    eventId,
    duplicate: false,
  };
}

export async function notifyMember(
  input: NotifyMemberInput,
): Promise<NotifyMemberResult> {
  const {
    eventId,
    duplicate,
  } =
    await createNotificationEvent(
      input,
    );

  if (duplicate) {
    return {
      eventId,
      sent: 0,
      failed: 0,
      expired: 0,
      skipped: "duplicate",
    };
  }

  const preference =
    await input.database
      .prepare(
        `SELECT
          enabled,
          preview_mode AS previewMode
        FROM notification_preferences
        WHERE member_id = ?
          AND event_type = ?
        LIMIT 1`,
      )
      .bind(
        input.targetMemberId,
        input.eventType,
      )
      .first<PreferenceRow>();

  if (
    preference &&
    preference.enabled === 0
  ) {
    return {
      eventId,
      sent: 0,
      failed: 0,
      expired: 0,
      skipped: "disabled",
    };
  }

  const subscriptionResult =
    await input.database
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
      .bind(
        input.targetMemberId,
      )
      .all<SubscriptionRow>();

  const subscriptions =
    subscriptionResult.results ?? [];

  if (
    subscriptions.length === 0
  ) {
    return {
      eventId,
      sent: 0,
      failed: 0,
      expired: 0,
      skipped: "no_subscription",
    };
  }

  const pushEnv =
    env as unknown as PushEnvironment;

  const publicKey =
    pushEnv
      .VAPID_SERVER_PUBLIC_KEY
      ?.trim();

  const privateKey =
    pushEnv
      .VAPID_SERVER_PRIVATE_KEY
      ?.trim();

  if (
    !publicKey ||
    !privateKey
  ) {
    throw new Error(
      "当前环境尚未配置完整 Push 密钥",
    );
  }

  const vapid: VapidKeys = {
    subject: input.origin,
    publicKey,
    privateKey,
  };

  const pushBody =
    input.body.length === 0
      ? ""
      : preference?.previewMode ===
          "private"
        ? input.actorMemberId
          ? "另一颗星球有一条新消息 ✦"
          : "两颗星球有一条新消息 ✦"
        : input.body;

  let sent = 0;
  let failed = 0;
  let expired = 0;

  for (
    const row of subscriptions
  ) {
    const deliveryId =
      crypto.randomUUID();

    await input.database
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
      const pushPayload =
        await buildPushPayload(
          {
            data: {
              title:
                input.title,
              body:
                pushBody,
              url:
                input.deepLink ??
                "/",
              eventType:
                input.eventType,
              eventId,
            },

            options: {
              ttl:
                input.ttl ??
                60,

              urgency:
                input.urgency ??
                "normal",
            },
          },
          subscription,
          vapid,
        );

      const response =
        await fetch(
          subscription.endpoint,
          pushPayload,
        );

      if (response.ok) {
        sent += 1;

        await input.database
          .prepare(
            `UPDATE notification_deliveries
             SET
               status = 'sent',
               attempted_at = CURRENT_TIMESTAMP,
               sent_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
          )
          .bind(
            deliveryId,
          )
          .run();

        continue;
      }

      if (
        response.status === 404 ||
        response.status === 410
      ) {
        expired += 1;

        await input.database.batch([
          input.database
            .prepare(
              `UPDATE push_subscriptions
               SET revoked_at =
                 CURRENT_TIMESTAMP
               WHERE id = ?`,
            )
            .bind(
              row.id,
            ),

          input.database
            .prepare(
              `UPDATE notification_deliveries
               SET
                 status = 'expired',
                 attempted_at =
                   CURRENT_TIMESTAMP,
                 error_message = ?
               WHERE id = ?`,
            )
            .bind(
              `Push service returned ${response.status}`,
              deliveryId,
            ),
        ]);

        continue;
      }

      failed += 1;

      await input.database
        .prepare(
          `UPDATE notification_deliveries
           SET
             status = 'failed',
             attempted_at =
               CURRENT_TIMESTAMP,
             error_message = ?
           WHERE id = ?`,
        )
        .bind(
          `Push service returned ${response.status}`,
          deliveryId,
        )
        .run();
    } catch (reason) {
      failed += 1;

      const message =
        reason instanceof Error
          ? reason.message
          : "Unknown push error";

      await input.database
        .prepare(
          `UPDATE notification_deliveries
           SET
             status = 'failed',
             attempted_at =
               CURRENT_TIMESTAMP,
             error_message = ?
           WHERE id = ?`,
        )
        .bind(
          message.slice(
            0,
            1000,
          ),
          deliveryId,
        )
        .run();
    }
  }

  return {
    eventId,
    sent,
    failed,
    expired,
    skipped: null,
  };
}
