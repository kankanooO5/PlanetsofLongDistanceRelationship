import { env } from "cloudflare:workers";
import { NextRequest } from "next/server";

import { IDEA_ROTATION_RULES } from "../../../../features/ideas/data/question-taxonomy";
import { authenticateMember } from "../../../../lib/server/member-auth";
import {
  addCalendarDays,
  calendarDayOrdinal,
  dateKeyInTimezone,
  normalizeRelationshipTimezone,
} from "../../../../lib/server/relationship-date";

export const runtime = "edge";

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

type QuestionCandidate = {
  id: string;
  questionText: string;
  category: string;
  form: string;
  intimacyLevel: number;
};

type RecentCategoryRow = {
  category: string;
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

async function findDailyQuestion(
  database: D1Database,
  relationshipId: string,
  localDate: string,
) {
  return database
    .prepare(
      `SELECT
        idea_daily_questions.id AS dailyQuestionId,
        idea_daily_questions.local_date AS localDate,

        idea_questions.id AS questionId,
        idea_questions.question_text AS questionText,
        idea_questions.category,
        idea_questions.form,
        idea_questions.intimacy_level AS intimacyLevel

      FROM idea_daily_questions

      INNER JOIN idea_questions
        ON idea_questions.id =
           idea_daily_questions.question_id

      WHERE
        idea_daily_questions.relationship_id = ?
        AND idea_daily_questions.local_date = ?

      LIMIT 1`,
    )
    .bind(
      relationshipId,
      localDate,
    )
    .first<DailyQuestionRow>();
}

function serializeDailyQuestion(
  row: DailyQuestionRow,
  timezone: string,
) {
  return {
    timezone,

    dailyQuestion: {
      id: row.dailyQuestionId,
      localDate: row.localDate,

      question: {
        id: row.questionId,
        text: row.questionText,
        category: row.category,
        form: row.form,
        intimacyLevel: row.intimacyLevel,
      },
    },
  };
}

function randomItem<T>(
  values: T[],
) {
  if (values.length === 0) {
    return null;
  }

  const random = new Uint32Array(1);
  crypto.getRandomValues(random);

  return values[
    random[0] % values.length
  ];
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

    const localDate =
      dateKeyInTimezone(
        new Date(),
        timezone,
      );

    /*
      如果今天已经抽过题，直接返回。

      两个人无论谁先打开，
      都会读到同一条 daily question。
    */
    const existing =
      await findDailyQuestion(
        database,
        member.relationshipId,
        localDate,
      );

    if (existing) {
      return Response.json(
        serializeDailyQuestion(
          existing,
          timezone,
        ),
      );
    }

    /*
      排除最近 90 天已经使用过的问题。
    */
    const repeatCutoff =
      addCalendarDays(
        localDate,
        -IDEA_ROTATION_RULES.repeatWindowDays,
      );

    const candidateResult = await database
      .prepare(
        `SELECT
          idea_questions.id,
          idea_questions.question_text AS questionText,
          idea_questions.category,
          idea_questions.form,
          idea_questions.intimacy_level AS intimacyLevel

        FROM idea_questions

        WHERE
          idea_questions.enabled = 1

          AND NOT EXISTS (
            SELECT 1
            FROM idea_daily_questions

            WHERE
              idea_daily_questions.relationship_id = ?
              AND idea_daily_questions.question_id =
                  idea_questions.id
              AND idea_daily_questions.local_date >= ?
              AND idea_daily_questions.local_date < ?
          )`,
      )
      .bind(
        member.relationshipId,
        repeatCutoff,
        localDate,
      )
      .all<QuestionCandidate>();

    let candidates =
      candidateResult.results;

    /*
      理论上 108 道题 + 90 天重复窗口不会耗尽。

      这里仍然提供兜底，以后题库调整时不会因为
      候选为空导致当天完全没有问题。
    */
    if (candidates.length === 0) {
      const fallback = await database
        .prepare(
          `SELECT
            id,
            question_text AS questionText,
            category,
            form,
            intimacy_level AS intimacyLevel
          FROM idea_questions
          WHERE enabled = 1`,
        )
        .all<QuestionCandidate>();

      candidates = fallback.results;
    }

    if (candidates.length === 0) {
      return jsonError(
        "妙想题库暂时为空",
        503,
      );
    }

    /*
      最近两天尽量不要出现同一个主题。
    */
    const recentCategoriesResult =
      await database
        .prepare(
          `SELECT
            idea_questions.category

          FROM idea_daily_questions

          INNER JOIN idea_questions
            ON idea_questions.id =
               idea_daily_questions.question_id

          WHERE
            idea_daily_questions.relationship_id = ?
            AND idea_daily_questions.local_date < ?

          ORDER BY
            idea_daily_questions.local_date DESC

          LIMIT ?`,
        )
        .bind(
          member.relationshipId,
          localDate,
          IDEA_ROTATION_RULES.avoidSameCategoryDays,
        )
        .all<RecentCategoryRow>();

    const recentCategories = new Set(
      recentCategoriesResult.results.map(
        (row) => row.category,
      ),
    );

    /*
      按预设节奏轮换题目深浅：

      1 → 2 → 3 → 2 → 4 → 1 → 3 → 2 → 5
    */
    const intimacyPattern =
      IDEA_ROTATION_RULES.intimacyPattern;

    const ordinal =
      calendarDayOrdinal(localDate);

    const desiredLevel =
      intimacyPattern[
        ordinal % intimacyPattern.length
      ];

    /*
      候选优先级：

      ① 深浅符合 + 最近主题未出现
      ② 深浅符合
      ③ 最近主题未出现
      ④ 任意可用题
    */
    const preferred =
      candidates.filter(
        (question) =>
          question.intimacyLevel ===
            desiredLevel &&
          !recentCategories.has(
            question.category,
          ),
      );

    const matchingLevel =
      candidates.filter(
        (question) =>
          question.intimacyLevel ===
          desiredLevel,
      );

    const freshCategory =
      candidates.filter(
        (question) =>
          !recentCategories.has(
            question.category,
          ),
      );

    const pool =
      preferred.length > 0
        ? preferred
        : matchingLevel.length > 0
          ? matchingLevel
          : freshCategory.length > 0
            ? freshCategory
            : candidates;

    const selected =
      randomItem(pool);

    if (!selected) {
      return jsonError(
        "今天暂时没有合适的妙想",
        503,
      );
    }

    /*
      INSERT OR IGNORE 是并发保护。

      如果两个人恰好同时第一次打开：
      - 两边可能各自随机到不同问题
      - UNIQUE(relationship_id, local_date)
        只允许第一条真正写入
      - 第二条会被忽略
      - 最后双方都重新读取数据库中的同一条
    */
    await database
      .prepare(
        `INSERT OR IGNORE INTO idea_daily_questions (
          id,
          relationship_id,
          question_id,
          local_date
        ) VALUES (?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        member.relationshipId,
        selected.id,
        localDate,
      )
      .run();

    const dailyQuestion =
      await findDailyQuestion(
        database,
        member.relationshipId,
        localDate,
      );

    if (!dailyQuestion) {
      return jsonError(
        "暂时无法生成今天的妙想",
        500,
      );
    }

    return Response.json(
      serializeDailyQuestion(
        dailyQuestion,
        timezone,
      ),
    );
  } catch (reason) {
    console.error(
      "Load daily idea question failed",
      reason,
    );

    return jsonError(
      "暂时无法读取今天的妙想",
      500,
    );
  }
}
