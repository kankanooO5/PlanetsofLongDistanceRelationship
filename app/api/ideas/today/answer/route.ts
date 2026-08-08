import { env } from "cloudflare:workers";
import { NextRequest } from "next/server";

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

async function getTodayContext(
  database: D1Database,
  relationshipId: string,
) {
  const relationship = await database
    .prepare(
      `SELECT timezone
       FROM relationships
       WHERE id = ?
       LIMIT 1`,
    )
    .bind(relationshipId)
    .first<RelationshipRow>();

  if (!relationship) {
    return null;
  }

  const timezone =
    normalizeRelationshipTimezone(
      relationship.timezone,
    );

  const localDate =
    dateKeyInTimezone(
      new Date(),
      timezone,
    );

  const dailyQuestion = await database
    .prepare(
      `SELECT id
       FROM idea_daily_questions
       WHERE relationship_id = ?
         AND local_date = ?
       LIMIT 1`,
    )
    .bind(
      relationshipId,
      localDate,
    )
    .first<DailyQuestionRow>();

  return {
    timezone,
    localDate,
    dailyQuestion,
  };
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

    const context = await getTodayContext(
      database,
      member.relationshipId,
    );

    if (!context) {
      return jsonError(
        "关系不存在",
        404,
      );
    }

    if (!context.dailyQuestion) {
      return Response.json({
        answer: null,
      });
    }

    const answer = await findAnswer(
      database,
      context.dailyQuestion.id,
      member.memberId,
    );

    return Response.json({
      answer: answer ?? null,
    });
  } catch (reason) {
    console.error(
      "Load idea answer failed",
      reason,
    );

    return jsonError(
      "暂时无法读取回答",
      500,
    );
  }
}

export async function POST(
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

    const payload = (await request.json()) as {
      body?: unknown;
    };

    const body =
      typeof payload.body === "string"
        ? payload.body.trim()
        : "";

    if (!body) {
      return jsonError(
        "回答不能为空",
        400,
      );
    }

    if (body.length > 1000) {
      return jsonError(
        "单条回答最多 1000 个字符",
        400,
      );
    }

    const context = await getTodayContext(
      database,
      member.relationshipId,
    );

    if (!context) {
      return jsonError(
        "关系不存在",
        404,
      );
    }

    if (!context.dailyQuestion) {
      return jsonError(
        "请先领取今天的妙想",
        409,
      );
    }

    const answerId =
      crypto.randomUUID();

    await database
      .prepare(
        `INSERT INTO idea_answers (
          id,
          daily_question_id,
          relationship_id,
          member_id,
          body
        ) VALUES (?, ?, ?, ?, ?)

        ON CONFLICT(
          daily_question_id,
          member_id
        ) DO UPDATE SET
          body = excluded.body,
          updated_at = CURRENT_TIMESTAMP`,
      )
      .bind(
        answerId,
        context.dailyQuestion.id,
        member.relationshipId,
        member.memberId,
        body,
      )
      .run();

    const answer = await findAnswer(
      database,
      context.dailyQuestion.id,
      member.memberId,
    );

    if (!answer) {
      return jsonError(
        "暂时无法保存回答",
        500,
      );
    }

    return Response.json({
      answer,
    });
  } catch (reason) {
    console.error(
      "Save idea answer failed",
      reason,
    );

    return jsonError(
      "暂时无法保存回答",
      500,
    );
  }
}
