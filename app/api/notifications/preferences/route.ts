import { env } from "cloudflare:workers";
import { NextRequest } from "next/server";

import {
  authenticateMember,
} from "../../../../lib/server/member-auth";

export const runtime = "edge";

const SUPPORTED_EVENT_TYPES = [
  "photo_uploaded",
  "photo_comment_added",
  "idea_answer_submitted",
  "idea_analysis_ready",
] as const;

type SupportedEventType =
  (typeof SUPPORTED_EVENT_TYPES)[number];

type PreferenceRow = {
  eventType: string;
  enabled: number;
};

function getDatabase() {
  return env.DB as
    | D1Database
    | undefined;
}

function isSupportedEventType(
  value: unknown,
): value is SupportedEventType {
  return (
    typeof value === "string" &&
    (
      SUPPORTED_EVENT_TYPES as readonly string[]
    ).includes(value)
  );
}

export async function GET(
  request: NextRequest,
) {
  const database =
    getDatabase();

  if (!database) {
    return Response.json(
      {
        error:
          "当前环境尚未连接关系数据库",
      },
      {
        status: 503,
      },
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
      {
        status: 401,
      },
    );
  }

  const result =
    await database
      .prepare(
        `SELECT
          event_type AS eventType,
          enabled
        FROM notification_preferences
        WHERE member_id = ?`,
      )
      .bind(
        member.memberId,
      )
      .all<PreferenceRow>();

  const stored =
    new Map(
      result.results.map(
        (row) => [
          row.eventType,
          row.enabled !== 0,
        ],
      ),
    );

  return Response.json({
    preferences:
      SUPPORTED_EVENT_TYPES.map(
        (eventType) => ({
          eventType,
          enabled:
            stored.get(
              eventType,
            ) ?? true,
        }),
      ),
  });
}

export async function PATCH(
  request: NextRequest,
) {
  const database =
    getDatabase();

  if (!database) {
    return Response.json(
      {
        error:
          "当前环境尚未连接关系数据库",
      },
      {
        status: 503,
      },
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
      {
        status: 401,
      },
    );
  }

  let payload: {
    eventType?: unknown;
    enabled?: unknown;
  };

  try {
    payload =
      (await request.json()) as {
        eventType?: unknown;
        enabled?: unknown;
      };
  } catch {
    return Response.json(
      {
        error:
          "请求格式无效",
      },
      {
        status: 400,
      },
    );
  }

  if (
    !isSupportedEventType(
      payload.eventType,
    )
  ) {
    return Response.json(
      {
        error:
          "不支持的通知类型",
      },
      {
        status: 400,
      },
    );
  }

  if (
    typeof payload.enabled !==
    "boolean"
  ) {
    return Response.json(
      {
        error:
          "通知状态无效",
      },
      {
        status: 400,
      },
    );
  }

  const eventType =
    payload.eventType;

  const enabled =
    payload.enabled;

  await database
    .prepare(
      `INSERT INTO notification_preferences (
        id,
        member_id,
        event_type,
        enabled,
        preview_mode
      ) VALUES (
        ?, ?, ?, ?, 'full'
      )

      ON CONFLICT(
        member_id,
        event_type
      ) DO UPDATE SET
        enabled =
          excluded.enabled,
        updated_at =
          CURRENT_TIMESTAMP`,
    )
    .bind(
      crypto.randomUUID(),
      member.memberId,
      eventType,
      enabled ? 1 : 0,
    )
    .run();

  return Response.json({
    preference: {
      eventType,
      enabled,
    },
  });
}
