import { env } from "cloudflare:workers";
import { NextRequest } from "next/server";

import { authenticateMember } from "../../../../lib/server/member-auth";
import {
  dateKeyInTimezone,
  normalizeRelationshipTimezone,
} from "../../../../lib/server/relationship-date";

export const runtime = "edge";

type RelationshipRow = {
  timezone: string | null;
};

type CalendarRow = {
  localDate: string;
  dailyQuestionId: string;
  selfAnswered: number;
  partnerAnswered: number;
};

function getDatabase() {
  return env.DB as D1Database | undefined;
}

function jsonError(
  error: string,
  status: number,
) {
  return Response.json(
    { error },
    { status },
  );
}

function isValidMonth(
  value: string,
) {
  if (!/^\d{4}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month] =
    value.split("-").map(Number);

  return (
    year >= 2000 &&
    year <= 2100 &&
    month >= 1 &&
    month <= 12
  );
}

export async function GET(
  request: NextRequest,
) {
  const database = getDatabase();

  if (!database) {
    return jsonError(
      "当前环境尚未连接关系数据库",
      503,
    );
  }

  try {
    const member =
      await authenticateMember(
        request,
        database,
      );

    if (!member) {
      return jsonError(
        "成员身份已经失效",
        401,
      );
    }

    const relationship =
      await database
        .prepare(
          `SELECT timezone
           FROM relationships
           WHERE id = ?
           LIMIT 1`,
        )
        .bind(member.relationshipId)
        .first<RelationshipRow>();

    if (!relationship) {
      return jsonError(
        "关系不存在",
        404,
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

    const requestedMonth =
      request.nextUrl.searchParams
        .get("month")
        ?.trim();

    const month =
      requestedMonth ||
      currentDate.slice(0, 7);

    if (!isValidMonth(month)) {
      return jsonError(
        "月份格式应为 YYYY-MM",
        400,
      );
    }

    const monthStart =
      `${month}-01`;

    const [year, monthNumber] =
      month.split("-").map(Number);

    const nextMonthDate =
      new Date(
        Date.UTC(
          year,
          monthNumber,
          1,
        ),
      );

    const nextMonth =
      `${nextMonthDate.getUTCFullYear()}-${String(
        nextMonthDate.getUTCMonth() + 1,
      ).padStart(2, "0")}-01`;

    const result =
      await database
        .prepare(
          `SELECT
            d.local_date AS localDate,
            d.id AS dailyQuestionId,

            EXISTS (
              SELECT 1
              FROM idea_answers own_answer
              WHERE
                own_answer.daily_question_id = d.id
                AND own_answer.member_id = ?
            ) AS selfAnswered,

            EXISTS (
              SELECT 1
              FROM idea_answers partner_answer
              WHERE
                partner_answer.daily_question_id = d.id
                AND partner_answer.member_id <> ?
            ) AS partnerAnswered

          FROM idea_daily_questions d

          WHERE
            d.relationship_id = ?
            AND d.local_date >= ?
            AND d.local_date < ?

          ORDER BY
            d.local_date ASC`,
        )
        .bind(
          member.memberId,
          member.memberId,
          member.relationshipId,
          monthStart,
          nextMonth,
        )
        .all<CalendarRow>();

    return Response.json({
      timezone,
      month,
      currentDate,

      days:
        result.results.map(
          (row) => ({
            localDate:
              row.localDate,

            dailyQuestionId:
              row.dailyQuestionId,

            selfAnswered:
              Boolean(
                row.selfAnswered,
              ),

            partnerAnswered:
              Boolean(
                row.partnerAnswered,
              ),

            bothAnswered:
              Boolean(
                row.selfAnswered &&
                row.partnerAnswered,
              ),
          }),
        ),
    });
  } catch (reason) {
    console.error(
      "Load idea calendar failed",
      reason,
    );

    return jsonError(
      "暂时无法读取妙想月历",
      500,
    );
  }
}
