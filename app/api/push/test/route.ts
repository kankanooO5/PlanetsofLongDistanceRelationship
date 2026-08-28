import {
  env,
} from "cloudflare:workers";

import {
  NextRequest,
} from "next/server";

import {
  authenticateMember,
} from "../../../../lib/server/member-auth";

import {
  notifyMember,
} from "../../../../lib/server/notification-service";

export const runtime = "edge";

function getDatabase() {
  return env.DB as
    | D1Database
    | undefined;
}

export async function POST(
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

  try {
    const result =
      await notifyMember({
        database,

        origin:
          request.nextUrl.origin,

        targetMemberId:
          member.memberId,

        relationshipId:
          member.relationshipId,

        actorMemberId:
          null,

        eventType:
          "push_test",

        title:
          "测试来信已经抵达 ✦",

        body:
          "",

        deepLink:
          "/",

        payload: {
          source:
            "push_test",
        },

        ttl: 60,

        urgency:
          "normal",
      });

    if (
      result.skipped ===
      "no_subscription"
    ) {
      return Response.json(
        {
          error:
            "当前成员还没有开启任何通知设备",
        },
        {
          status: 409,
        },
      );
    }

    return Response.json({
      ok:
        result.sent > 0,

      sent:
        result.sent,

      failed:
        result.failed,

      expired:
        result.expired,

      skipped:
        result.skipped,
    });
  } catch (reason) {
    console.error(
      "Send test push failed",
      reason,
    );

    return Response.json(
      {
        error:
          reason instanceof Error
            ? reason.message
            : "测试通知发送失败",
      },
      {
        status: 500,
      },
    );
  }
}
