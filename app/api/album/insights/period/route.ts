import {
  env,
} from "cloudflare:workers";

import {
  NextRequest,
} from "next/server";

import {
  authenticateMember,
} from "../../../../../lib/server/member-auth";

import {
  getAlbumPeriodStats,
} from "../../../../../lib/server/album-period-stats";

import {
  getAlbumPeriodCommentSummary,
} from "../../../../../lib/server/album-period-comment-summary";

import {
  getAlbumPeriodPhotoSummary,
} from "../../../../../lib/server/album-period-photo-summary";

import {
  addCalendarDays,
  dateKeyInTimezone,
  localDateStartUtc,
  normalizeRelationshipTimezone,
} from "../../../../../lib/server/relationship-date";

export const runtime = "edge";

type PeriodType =
  | "week"
  | "month";

type RelationshipRow = {
  timezone: string | null;
};

function getDatabase() {
  return env.DB as
    | D1Database
    | undefined;
}

function mondayOfWeek(
  dateKey: string,
) {
  const date =
    new Date(
      `${dateKey}T12:00:00Z`,
    );

  const weekday =
    date.getUTCDay();

  const daysSinceMonday =
    (weekday + 6) % 7;

  return addCalendarDays(
    dateKey,
    -daysSinceMonday,
  );
}

function firstDayOfMonth(
  dateKey: string,
) {
  return (
    dateKey.slice(0, 7) +
    "-01"
  );
}

function firstDayOfNextMonth(
  dateKey: string,
) {
  const [
    year,
    month,
  ] = dateKey
    .slice(0, 7)
    .split("-")
    .map(Number);

  const value =
    new Date(
      Date.UTC(
        year,
        month,
        1,
      ),
    );

  return value
    .toISOString()
    .slice(0, 10);
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

  const rawType =
    request.nextUrl
      .searchParams
      .get("type");

  if (
    rawType !== "week" &&
    rawType !== "month"
  ) {
    return Response.json(
      {
        error:
          "type 必须为 week 或 month",
      },
      {
        status: 400,
      },
    );
  }

  const periodType:
    PeriodType =
      rawType;

  const relationship =
    await database
      .prepare(
        `SELECT timezone
         FROM relationships
         WHERE id = ?
         LIMIT 1`,
      )
      .bind(
        member.relationshipId,
      )
      .first<RelationshipRow>();

  if (!relationship) {
    return Response.json(
      {
        error:
          "没有找到当前关系",
      },
      {
        status: 404,
      },
    );
  }

  const timezone =
    normalizeRelationshipTimezone(
      relationship.timezone,
    );

  const currentDate =
    dateKeyInTimezone(
      new Date(),
      timezone,
    );

  let startDate: string;
  let endDateExclusive: string;

  if (
    periodType === "week"
  ) {
    startDate =
      mondayOfWeek(
        currentDate,
      );

    endDateExclusive =
      addCalendarDays(
        startDate,
        7,
      );
  } else {
    startDate =
      firstDayOfMonth(
        currentDate,
      );

    endDateExclusive =
      firstDayOfNextMonth(
        currentDate,
      );
  }

  const startAt =
    localDateStartUtc(
      startDate,
      timezone,
    );

  const endAtExclusive =
    localDateStartUtc(
      endDateExclusive,
      timezone,
    );

  const [
    stats,
    commentSummary,
    photoSummary,
  ] =
    await Promise.all([
      getAlbumPeriodStats(
        database,
        {
          relationshipId:
            member.relationshipId,

          timezone,

          startDate,
          endDateExclusive,

          startAt,
          endAtExclusive,
        },
      ),

      getAlbumPeriodCommentSummary(
        database,
        {
          relationshipId:
            member.relationshipId,

          startAt,
          endAtExclusive,
        },
      ),

      getAlbumPeriodPhotoSummary(
        database,
        {
          relationshipId:
            member.relationshipId,

          startDate,
          endDateExclusive,
        },
      ),
    ]);

  return Response.json({
    periodType,
    timezone,

    period: {
      startDate,

      endDate:
        addCalendarDays(
          endDateExclusive,
          -1,
        ),

      endDateExclusive,
    },

    stats,
    commentSummary,
    photoSummary,
  });
}
