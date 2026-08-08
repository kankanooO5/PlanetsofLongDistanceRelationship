import { env } from "cloudflare:workers";
import { NextRequest } from "next/server";

import { canRevealPartnerIdeaAnswer } from "../../../../lib/server/idea-answer-access";
import { authenticateMember } from "../../../../lib/server/member-auth";
import {
  dateKeyInTimezone,
  normalizeRelationshipTimezone,
} from "../../../../lib/server/relationship-date";

export const runtime = "edge";

type RouteContext = {
  params:
    | Promise<{
        date: string;
      }>
    | {
        date: string;
      };
};

type RelationshipRow = {
  timezone: string | null;
};

type DailyQuestionRow = {
  dailyQuestionId: string;
  localDate: string;

  questionId: string;
  questionText: string;
  category: string;
  form: string;
  intimacyLevel: number;
};

type MemberRow = {
  memberId: string;
  displayName: string;
};

type AnswerRow = {
  id: string;
  body: string;
  submittedAt: string;
  updatedAt: string;
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

function isValidDateKey(
  value: string,
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    return false;
  }

  const date =
    new Date(
      `${value}T00:00:00Z`,
    );

  return (
    !Number.isNaN(
      date.getTime(),
    ) &&
    date.toISOString().slice(
      0,
      10,
    ) === value
  );
}

async function findAnswer(
  database: D1Database,
  dailyQuestionId: string,
  memberId: string,
) {
  return database
    .prepare(
      `SELECT
        id,
        body,
        submitted_at AS submittedAt,
        updated_at AS updatedAt
       FROM idea_answers
       WHERE daily_question_id = ?
         AND member_id = ?
       LIMIT 1`,
    )
    .bind(
      dailyQuestionId,
      memberId,
    )
    .first<AnswerRow>();
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
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

    const params =
      await context.params;

    const requestedDate =
      params.date?.trim();

    if (
      !requestedDate ||
      !isValidDateKey(
        requestedDate,
      )
    ) {
      return jsonError(
        "日期格式应为 YYYY-MM-DD",
        400,
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

    if (
      requestedDate >
      currentDate
    ) {
      return jsonError(
        "还不能查看未来的妙想",
        400,
      );
    }

    const dailyQuestion =
      await database
        .prepare(
          `SELECT
            d.id AS dailyQuestionId,
            d.local_date AS localDate,

            q.id AS questionId,
            q.question_text AS questionText,
            q.category,
            q.form,
            q.intimacy_level AS intimacyLevel

           FROM idea_daily_questions d

           INNER JOIN idea_questions q
             ON q.id =
                d.question_id

           WHERE
             d.relationship_id = ?
             AND d.local_date = ?

           LIMIT 1`,
        )
        .bind(
          member.relationshipId,
          requestedDate,
        )
        .first<DailyQuestionRow>();

    if (!dailyQuestion) {
      return Response.json({
        timezone,
        currentDate,
        localDate:
          requestedDate,
        exists: false,
      });
    }

    const partner =
      await database
        .prepare(
          `SELECT
            id AS memberId,
            display_name AS displayName

           FROM relationship_members

           WHERE
             relationship_id = ?
             AND id <> ?

           LIMIT 1`,
        )
        .bind(
          member.relationshipId,
          member.memberId,
        )
        .first<MemberRow>();

    const myAnswer =
      await findAnswer(
        database,
        dailyQuestion
          .dailyQuestionId,
        member.memberId,
      );

    const partnerAnswer =
      partner
        ? await findAnswer(
            database,
            dailyQuestion
              .dailyQuestionId,
            partner.memberId,
          )
        : null;

    const canRevealPartner =
      canRevealPartnerIdeaAnswer(
        dailyQuestion.localDate,
        currentDate,
        Boolean(myAnswer),
      );

    return Response.json({
      timezone,
      currentDate,
      localDate:
        dailyQuestion.localDate,
      exists: true,

      dailyQuestion: {
        id:
          dailyQuestion
            .dailyQuestionId,

        question: {
          id:
            dailyQuestion
              .questionId,

          text:
            dailyQuestion
              .questionText,

          category:
            dailyQuestion
              .category,

          form:
            dailyQuestion.form,

          intimacyLevel:
            dailyQuestion
              .intimacyLevel,
        },
      },

      myAnswer:
        myAnswer ?? null,

      partner:
        partner
          ? {
              memberId:
                partner.memberId,

              displayName:
                partner.displayName,

              answered:
                Boolean(
                  partnerAnswer,
                ),

              /*
                当天自己没答：
                answer = null

                历史日期：
                自动解锁正文。
              */
              answer:
                canRevealPartner &&
                partnerAnswer
                  ? partnerAnswer
                  : null,
            }
          : null,

      canRevealPartner,

      bothAnswered:
        Boolean(
          myAnswer &&
            partnerAnswer,
        ),
    });
  } catch (reason) {
    console.error(
      "Load idea history failed",
      reason,
    );

    return jsonError(
      "暂时无法读取这一天的妙想",
      500,
    );
  }
}
