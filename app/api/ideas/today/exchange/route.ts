import { env } from "cloudflare:workers";
import { NextRequest } from "next/server";

import { canRevealPartnerIdeaAnswer } from "../../../../../lib/server/idea-answer-access";
import { authenticateMember } from "../../../../../lib/server/member-auth";
import {
  dateKeyInTimezone,
  normalizeRelationshipTimezone,
} from "../../../../../lib/server/relationship-date";

export const runtime = "edge";

type RelationshipRow = {
  timezone: string | null;
};

type DailyQuestionRow = {
  id: string;
  localDate: string;
};

type MemberRow = {
  memberId: string;
  displayName: string;
};

type AnswerRow = {
  id: string;
  memberId: string;
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

async function findAnswer(
  database: D1Database,
  dailyQuestionId: string,
  memberId: string,
) {
  return database
    .prepare(
      `SELECT
        id,
        member_id AS memberId,
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
) {
  const database = getDatabase();

  if (!database) {
    return jsonError(
      "当前环境尚未连接关系数据库",
      503,
    );
  }

  try {
    const member = await authenticateMember(
      request,
      database,
    );

    if (!member) {
      return jsonError(
        "成员身份已经失效",
        401,
      );
    }

    const relationship = await database
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

    const dailyQuestion = await database
      .prepare(
        `SELECT
          id,
          local_date AS localDate
         FROM idea_daily_questions
         WHERE relationship_id = ?
           AND local_date = ?
         LIMIT 1`,
      )
      .bind(
        member.relationshipId,
        currentDate,
      )
      .first<DailyQuestionRow>();

    if (!dailyQuestion) {
      return Response.json({
        localDate: currentDate,
        myAnswer: null,
        partner: null,
        bothAnswered: false,
      });
    }

    const myAnswer =
      await findAnswer(
        database,
        dailyQuestion.id,
        member.memberId,
      );

    const partner = await database
      .prepare(
        `SELECT
          id AS memberId,
          display_name AS displayName
         FROM relationship_members
         WHERE relationship_id = ?
           AND id <> ?
         LIMIT 1`,
      )
      .bind(
        member.relationshipId,
        member.memberId,
      )
      .first<MemberRow>();

    if (!partner) {
      return Response.json({
        localDate: dailyQuestion.localDate,
        myAnswer: myAnswer ?? null,
        partner: null,
        bothAnswered: false,
      });
    }

    const partnerAnswer =
      await findAnswer(
        database,
        dailyQuestion.id,
        partner.memberId,
      );

    const canRevealPartner =
      canRevealPartnerIdeaAnswer(
        dailyQuestion.localDate,
        currentDate,
        Boolean(myAnswer),
      );

    const bothAnswered =
      Boolean(
        myAnswer &&
        partnerAnswer,
      );

    /*
      注意：
      未解锁时绝不把 partnerAnswer.body
      发送到浏览器。

      前端只能知道“TA 已回答”，
      无法从 Network 提前读到正文。
    */
    return Response.json({
      localDate: dailyQuestion.localDate,

      myAnswer: myAnswer ?? null,

      partner: {
        memberId: partner.memberId,
        displayName: partner.displayName,
        answered: Boolean(partnerAnswer),

        answer:
          canRevealPartner &&
          partnerAnswer
            ? partnerAnswer
            : null,
      },

      canRevealPartner,
      bothAnswered,
    });
  } catch (reason) {
    console.error(
      "Load idea exchange failed",
      reason,
    );

    return jsonError(
      "暂时无法读取彼此的回答",
      500,
    );
  }
}
