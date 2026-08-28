type TextEntryRow = {
  memberId: string;
  role: "first" | "second";
  displayName: string;
  sourceType: "caption" | "comment";
  text: string;
};

type CountItem = {
  text: string;
  count: number;
};

export type MemberLexicalSummary = {
  memberId: string;
  role: "first" | "second";
  displayName: string;

  entries: number;
  captions: number;
  comments: number;

  totalChars: number;
  avgChars: number;

  shortEntryRate: number;
  emojiEntryRate: number;
  questionEntryRate: number;
  exclamationEntryRate: number;
  laughterEntryRate: number;

  topWords: CountItem[];
  topEmojis: CountItem[];
};

export type AlbumPeriodLanguageSummary = {
  analysis: {
    totalEntries: number;
    totalChars: number;
  };

  topWords: CountItem[];
  topEmojis: CountItem[];
  sharedWords: string[];

  members: MemberLexicalSummary[];

  sourceTexts: Array<{
    memberId: string;
    role: "first" | "second";
    displayName: string;
    sourceType: "caption" | "comment";
    text: string;
  }>;
};

const STOP_WORDS = new Set([
  "的",
  "了",
  "是",
  "在",
  "我",
  "你",
  "他",
  "她",
  "它",
  "我们",
  "你们",
  "他们",
  "一个",
  "这个",
  "那个",
  "一下",
  "还有",
  "就是",
  "然后",
  "感觉",
  "真的",
  "有点",
  "这么",
  "怎么",
  "什么",
  "可以",
  "还是",
  "已经",
  "没有",
  "不是",
  "因为",
  "所以",
  "但是",
  "而且",
  "也",
  "都",
  "就",
  "还",
  "又",
  "很",
  "太",
  "啊",
  "呀",
  "哦",
  "呢",
  "吧",
  "吗",
]);

function round(
  value: number,
) {
  return Math.round(
    value * 100,
  ) / 100;
}

function ratio(
  count: number,
  total: number,
) {
  return total
    ? round(count / total)
    : 0;
}

function countChars(
  value: string,
) {
  return Array.from(
    value.replace(
      /\s+/g,
      "",
    ),
  ).length;
}

function emojisIn(
  value: string,
) {
  return (
    value.match(
      /\p{Extended_Pictographic}/gu,
    ) ?? []
  );
}

function tokenize(
  value: string,
) {
  const SegmenterCtor =
    (
      Intl as unknown as {
        Segmenter?: new (
          locale: string,
          options: {
            granularity: "word";
          },
        ) => {
          segment: (
            input: string,
          ) => Iterable<{
            segment: string;
            isWordLike?: boolean;
          }>;
        };
      }
    ).Segmenter;

  if (!SegmenterCtor) {
    return (
      value
        .toLowerCase()
        .match(
          /[\p{Script=Han}]{2,}|[a-z][a-z0-9'-]+/gu,
        ) ?? []
    ).filter(
      (word) =>
        !STOP_WORDS.has(word),
    );
  }

  const segmenter =
    new SegmenterCtor(
      "zh-CN",
      {
        granularity: "word",
      },
    );

  return Array.from(
    segmenter.segment(value),
  )
    .filter(
      (item) =>
        item.isWordLike,
    )
    .map(
      (item) =>
        item.segment
          .toLowerCase()
          .trim(),
    )
    .filter(
      (word) =>
        word.length >= 2 &&
        !STOP_WORDS.has(word),
    );
}

function topCounts(
  values: string[],
  limit: number,
): CountItem[] {
  const counts =
    new Map<
      string,
      number
    >();

  for (
    const value of values
  ) {
    counts.set(
      value,
      (
        counts.get(value) ??
        0
      ) + 1,
    );
  }

  return Array.from(
    counts.entries(),
  )
    .map(
      ([text, count]) => ({
        text,
        count,
      }),
    )
    .sort(
      (a, b) =>
        b.count - a.count ||
        a.text.localeCompare(
          b.text,
          "zh-CN",
        ),
    )
    .slice(
      0,
      limit,
    );
}

function summarizeMember(
  rows: TextEntryRow[],
): MemberLexicalSummary {
  const first =
    rows[0];

  const charCounts =
    rows.map(
      (row) =>
        countChars(
          row.text,
        ),
    );

  const words =
    rows.flatMap(
      (row) =>
        tokenize(
          row.text,
        ),
    );

  const emojis =
    rows.flatMap(
      (row) =>
        emojisIn(
          row.text,
        ),
    );

  const totalChars =
    charCounts.reduce(
      (sum, value) =>
        sum + value,
      0,
    );

  return {
    memberId:
      first.memberId,

    role:
      first.role,

    displayName:
      first.displayName,

    entries:
      rows.length,

    captions:
      rows.filter(
        (row) =>
          row.sourceType ===
          "caption",
      ).length,

    comments:
      rows.filter(
        (row) =>
          row.sourceType ===
          "comment",
      ).length,

    totalChars,

    avgChars:
      rows.length
        ? round(
            totalChars /
              rows.length,
          )
        : 0,

    shortEntryRate:
      ratio(
        charCounts.filter(
          (count) =>
            count <= 12,
        ).length,
        rows.length,
      ),

    emojiEntryRate:
      ratio(
        rows.filter(
          (row) =>
            emojisIn(
              row.text,
            ).length > 0,
        ).length,
        rows.length,
      ),

    questionEntryRate:
      ratio(
        rows.filter(
          (row) =>
            /[?？]/.test(
              row.text,
            ),
        ).length,
        rows.length,
      ),

    exclamationEntryRate:
      ratio(
        rows.filter(
          (row) =>
            /[!！]/.test(
              row.text,
            ),
        ).length,
        rows.length,
      ),

    laughterEntryRate:
      ratio(
        rows.filter(
          (row) =>
            /(哈哈|嘿嘿|嘻嘻|hhh+|lol)/i.test(
              row.text,
            ),
        ).length,
        rows.length,
      ),

    topWords:
      topCounts(
        words,
        12,
      ),

    topEmojis:
      topCounts(
        emojis,
        8,
      ),
  };
}

export async function getAlbumPeriodLanguageSummary(
  database: D1Database,
  input: {
    relationshipId: string;

    startDate: string;
    endDateExclusive: string;

    startAt: string;
    endAtExclusive: string;
  },
): Promise<AlbumPeriodLanguageSummary> {
  const [
    captions,
    comments,
  ] =
    await Promise.all([
      database
        .prepare(
          `
          SELECT
            rm.id AS memberId,
            rm.role AS role,
            rm.display_name AS displayName,
            'caption' AS sourceType,
            p.caption AS text

          FROM photos p

          INNER JOIN relationship_members rm
            ON rm.id =
               p.uploaded_by_member_id

          WHERE
            p.relationship_id = ?
            AND p.taken_at >= ?
            AND p.taken_at < ?
            AND p.caption IS NOT NULL
            AND TRIM(p.caption) <> ''

          ORDER BY
            p.taken_at ASC,
            p.created_at ASC
          `,
        )
        .bind(
          input.relationshipId,
          input.startDate,
          input.endDateExclusive,
        )
        .all<TextEntryRow>(),

      database
        .prepare(
          `
          SELECT
            rm.id AS memberId,
            rm.role AS role,
            rm.display_name AS displayName,
            'comment' AS sourceType,
            pc.body AS text

          FROM photo_comments pc

          INNER JOIN relationship_members rm
            ON rm.id =
               pc.member_id

          WHERE
            pc.relationship_id = ?
            AND pc.created_at >= ?
            AND pc.created_at < ?
            AND TRIM(pc.body) <> ''

          ORDER BY
            pc.created_at ASC
          `,
        )
        .bind(
          input.relationshipId,
          input.startAt,
          input.endAtExclusive,
        )
        .all<TextEntryRow>(),
    ]);

  const rows = [
    ...captions.results,
    ...comments.results,
  ];

  const grouped =
    new Map<
      string,
      TextEntryRow[]
    >();

  for (
    const row of rows
  ) {
    const current =
      grouped.get(
        row.memberId,
      ) ?? [];

    current.push(row);

    grouped.set(
      row.memberId,
      current,
    );
  }

  const members =
    Array.from(
      grouped.values(),
    )
      .map(
        summarizeMember,
      )
      .sort(
        (a, b) =>
          a.role.localeCompare(
            b.role,
          ),
      );

  const allWords =
    rows.flatMap(
      (row) =>
        tokenize(
          row.text,
        ),
    );

  const allEmojis =
    rows.flatMap(
      (row) =>
        emojisIn(
          row.text,
        ),
    );

  const memberWordSets =
    members.map(
      (member) =>
        new Set(
          member.topWords.map(
            (item) =>
              item.text,
          ),
        ),
    );

  const sharedWords =
    memberWordSets.length >= 2
      ? Array.from(
          memberWordSets[0],
        )
          .filter(
            (word) =>
              memberWordSets
                .slice(1)
                .every(
                  (set) =>
                    set.has(word),
                ),
          )
          .slice(0, 10)
      : [];

  return {
    analysis: {
      totalEntries:
        rows.length,

      totalChars:
        rows.reduce(
          (sum, row) =>
            sum +
            countChars(
              row.text,
            ),
          0,
        ),
    },

    topWords:
      topCounts(
        allWords,
        20,
      ),

    topEmojis:
      topCounts(
        allEmojis,
        12,
      ),

    sharedWords,

    members,

    sourceTexts:
      rows.map(
        (row) => ({
          memberId:
            row.memberId,

          role:
            row.role,

          displayName:
            row.displayName,

          sourceType:
            row.sourceType,

          text:
            row.text,
        }),
      ),
  };
}
