type CommentInsightRow = {
  memberId: string;
  role: "first" | "second";
  displayName: string;

  status:
    | "pending"
    | "ready"
    | "failed"
    | null;

  keywordsJson:
    | string
    | null;

  themesJson:
    | string
    | null;

  interactionSignalsJson:
    | string
    | null;

  sentimentJson:
    | string
    | null;
};

type CountItem = {
  text: string;
  count: number;
};

type SignalItem = {
  type: string;
  count: number;
  averageConfidence: number;
};

type MemberSummary = {
  memberId: string;
  role: "first" | "second";
  displayName: string;

  totalComments: number;
  analyzedComments: number;

  keywords: CountItem[];
  themes: CountItem[];
  interactionSignals: SignalItem[];
};

export type AlbumPeriodCommentSummary = {
  analysis: {
    totalComments: number;
    ready: number;
    pending: number;
    failed: number;
    missing: number;
    coverageRate: number;
  };

  keywords: CountItem[];
  themes: CountItem[];

  interactionSignals:
    SignalItem[];

  sentiment: {
    valence: Record<
      string,
      number
    >;

    intensity: Record<
      string,
      number
    >;

    tones: CountItem[];
  };

  members: MemberSummary[];
};

function ratio(
  numerator: number,
  denominator: number,
) {
  if (!denominator) {
    return 0;
  }

  return Number(
    (
      numerator /
      denominator
    ).toFixed(4),
  );
}

function parseArray(
  value:
    | string
    | null,
) {
  if (!value) {
    return [];
  }

  try {
    const parsed =
      JSON.parse(value);

    return Array.isArray(
      parsed,
    )
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function parseObject(
  value:
    | string
    | null,
) {
  if (!value) {
    return {};
  }

  try {
    const parsed =
      JSON.parse(value);

    return (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
    )
      ? parsed as
          Record<
            string,
            unknown
          >
      : {};
  } catch {
    return {};
  }
}

function addCount(
  map:
    Map<string, number>,
  value: unknown,
) {
  if (
    typeof value !== "string"
  ) {
    return;
  }

  const text =
    value.trim();

  if (!text) {
    return;
  }

  map.set(
    text,
    (
      map.get(text) ??
      0
    ) + 1,
  );
}

function topCounts(
  map:
    Map<string, number>,
  limit: number,
): CountItem[] {
  return [
    ...map.entries(),
  ]
    .map(
      ([text, count]) => ({
        text,
        count,
      }),
    )
    .sort(
      (a, b) =>
        b.count -
          a.count ||
        a.text.localeCompare(
          b.text,
        ),
    )
    .slice(
      0,
      limit,
    );
}

type SignalAccumulator = {
  count: number;
  confidenceTotal: number;
};

function addSignal(
  map:
    Map<
      string,
      SignalAccumulator
    >,
  value: unknown,
) {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return;
  }

  const signal =
    value as Record<
      string,
      unknown
    >;

  const type =
    typeof signal.type ===
      "string"
      ? signal.type.trim()
      : "";

  if (!type) {
    return;
  }

  const confidence =
    typeof signal.confidence ===
      "number" &&
    Number.isFinite(
      signal.confidence,
    )
      ? signal.confidence
      : 0;

  const current =
    map.get(type) ?? {
      count: 0,
      confidenceTotal: 0,
    };

  current.count += 1;
  current.confidenceTotal +=
    confidence;

  map.set(
    type,
    current,
  );
}

function topSignals(
  map:
    Map<
      string,
      SignalAccumulator
    >,
): SignalItem[] {
  return [
    ...map.entries(),
  ]
    .map(
      ([
        type,
        value,
      ]) => ({
        type,

        count:
          value.count,

        averageConfidence:
          value.count
            ? Number(
                (
                  value
                    .confidenceTotal /
                  value.count
                ).toFixed(2),
              )
            : 0,
      }),
    )
    .sort(
      (a, b) =>
        b.count -
          a.count ||
        b.averageConfidence -
          a.averageConfidence ||
        a.type.localeCompare(
          b.type,
        ),
    );
}

export async function getAlbumPeriodCommentSummary(
  database: D1Database,
  input: {
    relationshipId: string;
    startAt: string;
    endAtExclusive: string;
  },
): Promise<AlbumPeriodCommentSummary> {
  const rows =
    await database
      .prepare(
        `
        SELECT
          pc.member_id AS memberId,
          rm.role AS role,
          rm.display_name AS displayName,

          pci.status AS status,

          pci.keywords_json AS keywordsJson,
          pci.themes_json AS themesJson,
          pci.interaction_signals_json AS interactionSignalsJson,
          pci.sentiment_json AS sentimentJson

        FROM photo_comments pc

        INNER JOIN relationship_members rm
          ON rm.id = pc.member_id

        LEFT JOIN photo_comment_insights pci
          ON pci.comment_id = pc.id

        WHERE
          pc.relationship_id = ?
          AND pc.created_at >= ?
          AND pc.created_at < ?

        ORDER BY
          pc.created_at ASC,
          pc.rowid ASC
        `,
      )
      .bind(
        input.relationshipId,
        input.startAt,
        input.endAtExclusive,
      )
      .all<CommentInsightRow>();

  const keywords =
    new Map<
      string,
      number
    >();

  const themes =
    new Map<
      string,
      number
    >();

  const tones =
    new Map<
      string,
      number
    >();

  const signals =
    new Map<
      string,
      SignalAccumulator
    >();

  const valence:
    Record<string, number> =
      {};

  const intensity:
    Record<string, number> =
      {};

  const statusCounts = {
    ready: 0,
    pending: 0,
    failed: 0,
    missing: 0,
  };

  type MemberAccumulator = {
    memberId: string;
    role:
      | "first"
      | "second";
    displayName: string;

    totalComments: number;
    analyzedComments: number;

    keywords:
      Map<
        string,
        number
      >;

    themes:
      Map<
        string,
        number
      >;

    signals:
      Map<
        string,
        SignalAccumulator
      >;
  };

  const memberMap =
    new Map<
      string,
      MemberAccumulator
    >();

  for (
    const row of
      rows.results
  ) {
    const member =
      memberMap.get(
        row.memberId,
      ) ?? {
        memberId:
          row.memberId,

        role:
          row.role,

        displayName:
          row.displayName,

        totalComments: 0,
        analyzedComments: 0,

        keywords:
          new Map(),

        themes:
          new Map(),

        signals:
          new Map(),
      };

    member.totalComments += 1;

    memberMap.set(
      row.memberId,
      member,
    );

    if (!row.status) {
      statusCounts.missing += 1;
      continue;
    }

    if (
      row.status ===
      "pending"
    ) {
      statusCounts.pending += 1;
      continue;
    }

    if (
      row.status ===
      "failed"
    ) {
      statusCounts.failed += 1;
      continue;
    }

    statusCounts.ready += 1;
    member.analyzedComments += 1;

    for (
      const keyword of
        parseArray(
          row.keywordsJson,
        )
    ) {
      addCount(
        keywords,
        keyword,
      );

      addCount(
        member.keywords,
        keyword,
      );
    }

    for (
      const theme of
        parseArray(
          row.themesJson,
        )
    ) {
      addCount(
        themes,
        theme,
      );

      addCount(
        member.themes,
        theme,
      );
    }

    for (
      const signal of
        parseArray(
          row.interactionSignalsJson,
        )
    ) {
      addSignal(
        signals,
        signal,
      );

      addSignal(
        member.signals,
        signal,
      );
    }

    const sentiment =
      parseObject(
        row.sentimentJson,
      );

    if (
      typeof sentiment.valence ===
      "string"
    ) {
      valence[
        sentiment.valence
      ] =
        (
          valence[
            sentiment.valence
          ] ?? 0
        ) + 1;
    }

    if (
      typeof sentiment.intensity ===
      "string"
    ) {
      intensity[
        sentiment.intensity
      ] =
        (
          intensity[
            sentiment.intensity
          ] ?? 0
        ) + 1;
    }

    if (
      Array.isArray(
        sentiment.tones,
      )
    ) {
      for (
        const tone of
          sentiment.tones
      ) {
        addCount(
          tones,
          tone,
        );
      }
    }
  }

  const totalComments =
    rows.results.length;

  return {
    analysis: {
      totalComments,

      ready:
        statusCounts.ready,

      pending:
        statusCounts.pending,

      failed:
        statusCounts.failed,

      missing:
        statusCounts.missing,

      coverageRate:
        ratio(
          statusCounts.ready,
          totalComments,
        ),
    },

    keywords:
      topCounts(
        keywords,
        15,
      ),

    themes:
      topCounts(
        themes,
        12,
      ),

    interactionSignals:
      topSignals(
        signals,
      ),

    sentiment: {
      valence,
      intensity,

      tones:
        topCounts(
          tones,
          12,
        ),
    },

    members: [
      ...memberMap.values(),
    ]
      .map(
        (member) => ({
          memberId:
            member.memberId,

          role:
            member.role,

          displayName:
            member.displayName,

          totalComments:
            member.totalComments,

          analyzedComments:
            member.analyzedComments,

          keywords:
            topCounts(
              member.keywords,
              10,
            ),

          themes:
            topCounts(
              member.themes,
              8,
            ),

          interactionSignals:
            topSignals(
              member.signals,
            ),
        }),
      )
      .sort(
        (a, b) =>
          a.role.localeCompare(
            b.role,
          ),
      ),
  };
}
