import {
  env,
} from "cloudflare:workers";

import {
  NextRequest,
} from "next/server";

import {
  authenticateMember,
} from "../../../../../../lib/server/member-auth";

import {
  getAlbumPeriodStats,
} from "../../../../../../lib/server/album-period-stats";

import {
  getAlbumPeriodCommentSummary,
} from "../../../../../../lib/server/album-period-comment-summary";

import {
  getAlbumPeriodPhotoSummary,
} from "../../../../../../lib/server/album-period-photo-summary";

import {
  getAlbumPeriodSourceMoments,
} from "../../../../../../lib/server/album-period-source-moments";

import {
  getAlbumPeriodSeasonalContext,
} from "../../../../../../lib/server/album-period-seasonal-context";

import {
  getAlbumPeriodLanguageSummary,
} from "../../../../../../lib/server/album-period-language-summary";

import {
  analyzeAlbumPeriodLanguageStyle,
} from "../../../../../../lib/server/album-period-language-style-analysis";

import {
  analyzeAlbumPeriodEmotion,
} from "../../../../../../lib/server/album-period-emotion-analysis";

import {
  analyzeAlbumPeriodLifeThemes,
} from "../../../../../../lib/server/album-period-life-theme-analysis";

import {
  generateAlbumPeriodReport,
} from "../../../../../../lib/server/album-period-report-analysis";

import {
  auditAlbumPeriodReportEvidence,
} from "../../../../../../lib/server/album-period-report-evidence-audit";

import {
  addCalendarDays,
  dateKeyInTimezone,
  localDateStartUtc,
  normalizeRelationshipTimezone,
} from "../../../../../../lib/server/relationship-date";

export const runtime = "edge";

type RelationshipRow = {
  timezone:
    | string
    | null;
};

function mondayOfWeek(
  dateKey: string,
) {
  const date =
    new Date(
      `${dateKey}T12:00:00Z`,
    );

  const weekday =
    date.getUTCDay();

  return addCalendarDays(
    dateKey,
    -((weekday + 6) % 7),
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

  return new Date(
    Date.UTC(
      year,
      month,
      1,
    ),
  )
    .toISOString()
    .slice(0, 10);
}

export async function POST(
  request: NextRequest,
) {
  const database =
    env.DB as
      | D1Database
      | undefined;

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
          "成员身份已经失效",
      },
      {
        status: 401,
      },
    );
  }

  const payload =
    await request
      .json()
      .catch(
        () => ({}),
      ) as {
        type?: unknown;
      };

  const periodType =
    payload.type === "month"
      ? "month"
      : payload.type === "week"
        ? "week"
        : null;

  if (!periodType) {
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

  const endDate =
    addCalendarDays(
      endDateExclusive,
      -1,
    );

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
    sourceMoments,
    languageSummary,
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

      getAlbumPeriodSourceMoments(
        database,
        {
          relationshipId:
            member.relationshipId,

          startDate,
          endDateExclusive,

          startAt,
          endAtExclusive,
        },
      ),

      getAlbumPeriodLanguageSummary(
        database,
        {
          relationshipId:
            member.relationshipId,

          startDate,
          endDateExclusive,

          startAt,
          endAtExclusive,
        },
      ),
    ]);

  const seasonalContext =
    getAlbumPeriodSeasonalContext({
      startDate,
      endDate,
    });

  const apiKey =
    (
      env as unknown as {
        DEEPSEEK_API_KEY?: string;
      }
    )
      .DEEPSEEK_API_KEY
      ?.trim();

  if (!apiKey) {
    return Response.json(
      {
        error:
          "DEEPSEEK_API_KEY 未配置",
      },
      {
        status: 503,
      },
    );
  }

  const [
    languageStyle,
    emotion,
    lifeThemes,
  ] =
    await Promise.all([
      analyzeAlbumPeriodLanguageStyle(
        apiKey,
        {
          periodType,
          languageSummary,
        },
      ),

      analyzeAlbumPeriodEmotion(
        apiKey,
        {
          periodType,
          languageSummary,
        },
      ),

      analyzeAlbumPeriodLifeThemes(
        apiKey,
        {
          periodType,
          sourceMoments,
        },
      ),
    ]);

  const report =
    await generateAlbumPeriodReport(
      apiKey,
      {
        periodType,
        periodStart:
          startDate,
        periodEnd:
          endDate,

        stats,
        commentSummary,
        photoSummary,
        sourceMoments,
        seasonalContext,
        languageSummary,

        languageStyleSummary:
          languageStyle.summary,

        emotionSummary:
          emotion.summary,

        lifeThemeSummary:
          lifeThemes.summary,
      },
    );

  const audited =
    await auditAlbumPeriodReportEvidence(
      apiKey,
      {
        periodType,

        periodStart:
          startDate,

        periodEnd:
          endDate,

        stats,
        sourceMoments,
        seasonalContext,
        languageSummary,

        languageStyleSummary:
          languageStyle.summary,

        emotionSummary:
          emotion.summary,

        lifeThemeSummary:
          lifeThemes.summary,

        narrative:
          report.narrative,
      },
    );

  return Response.json({
    periodType,
    timezone,

    period: {
      startDate,
      endDate,
    },

    seasonalContext,

    languageSummary,

    languageStyleSummary:
      languageStyle.summary,

    emotionSummary:
      emotion.summary,

    lifeThemeSummary:
      lifeThemes.summary,

    draftNarrative:
      report.narrative,

    narrative:
      audited.narrative,

    model:
      report.model,

    auditModel:
      audited.model,

    usage:
      report.usage,
  });
}
