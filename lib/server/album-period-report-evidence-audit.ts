import {
  callDeepSeekJson,
  DEEPSEEK_DEFAULT_MODEL,
} from "./deepseek-json";

import type {
  AlbumReportNarrative,
} from "./album-period-report-analysis";

export const ALBUM_REPORT_EVIDENCE_AUDIT_MODEL =
  DEEPSEEK_DEFAULT_MODEL;

export const ALBUM_REPORT_EVIDENCE_AUDIT_PIPELINE_VERSION =
  "album-report-evidence-audit-v1";

type SourceMoments = {
  photos?: Array<{
    photoId?: string;
    [key: string]: unknown;
  }>;

  comments?: Array<{
    commentId?: string;
    [key: string]: unknown;
  }>;
};

type AuditPatch = {
  statsNarrative: string;

  highlights: Array<{
    index: number;
    title: string;
    text: string;
  }>;

  languageAndEmotionNarrative:
    string;

  playfulObservations: Array<{
    index: number;
    text: string;
  }>;

  seasonalNote: string;
};

function text(
  value: unknown,
  maxLength: number,
) {
  return typeof value === "string"
    ? value.trim().slice(
        0,
        maxLength,
      )
    : "";
}

function parsePatch(
  value: string,
): AuditPatch {
  let raw: unknown;

  try {
    raw =
      JSON.parse(value);
  } catch {
    throw new Error(
      "Evidence audit 不是合法 JSON",
    );
  }

  if (
    !raw ||
    typeof raw !== "object"
  ) {
    throw new Error(
      "Evidence audit 格式错误",
    );
  }

  const source =
    raw as Record<
      string,
      unknown
    >;

  return {
    statsNarrative:
      text(
        source.statsNarrative,
        1200,
      ),

    highlights:
      Array.isArray(
        source.highlights,
      )
        ? source.highlights
            .filter(
              (item) =>
                item &&
                typeof item ===
                  "object",
            )
            .map(
              (item) => {
                const row =
                  item as Record<
                    string,
                    unknown
                  >;

                return {
                  index:
                    typeof row.index ===
                      "number"
                      ? Math.trunc(
                          row.index,
                        )
                      : -1,

                  title:
                    text(
                      row.title,
                      100,
                    ),

                  text:
                    text(
                      row.text,
                      900,
                    ),
                };
              },
            )
            .filter(
              (item) =>
                item.index >= 0,
            )
        : [],

    languageAndEmotionNarrative:
      text(
        source
          .languageAndEmotionNarrative,
        1400,
      ),

    playfulObservations:
      Array.isArray(
        source.playfulObservations,
      )
        ? source.playfulObservations
            .filter(
              (item) =>
                item &&
                typeof item ===
                  "object",
            )
            .map(
              (item) => {
                const row =
                  item as Record<
                    string,
                    unknown
                  >;

                return {
                  index:
                    typeof row.index ===
                      "number"
                      ? Math.trunc(
                          row.index,
                        )
                      : -1,

                  text:
                    text(
                      row.text,
                      600,
                    ),
                };
              },
            )
            .filter(
              (item) =>
                item.index >= 0,
            )
        : [],

    seasonalNote:
      text(
        source.seasonalNote,
        1000,
      ),
  };
}

function uniqueValidIds(
  values: unknown,
  valid: Set<string>,
) {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(
    new Set(
      values
        .filter(
          (
            value,
          ): value is string =>
            typeof value ===
              "string",
        )
        .map(
          (value) =>
            value.trim(),
        )
        .filter(
          (value) =>
            value &&
            valid.has(value),
        ),
    ),
  );
}

export async function auditAlbumPeriodReportEvidence(
  apiKey: string,
  input: {
    periodType:
      | "week"
      | "month";

    periodStart: string;
    periodEnd: string;

    stats: unknown;

    sourceMoments: unknown;

    languageSummary: unknown;
    languageStyleSummary: unknown;
    emotionSummary: unknown;

    lifeThemeSummary: unknown;

    seasonalContext: unknown;

    narrative:
      AlbumReportNarrative;
  },
) {
  const sourceMoments =
    (
      input.sourceMoments &&
      typeof input.sourceMoments ===
        "object"
    )
      ? input.sourceMoments as SourceMoments
      : {};

  const photos =
    Array.isArray(
      sourceMoments.photos,
    )
      ? sourceMoments.photos
      : [];

  const comments =
    Array.isArray(
      sourceMoments.comments,
    )
      ? sourceMoments.comments
      : [];

  const photoMap =
    new Map(
      photos
        .filter(
          (photo) =>
            typeof photo.photoId ===
              "string",
        )
        .map(
          (photo) => [
            photo.photoId as string,
            photo,
          ]),
    );

  const commentMap =
    new Map(
      comments
        .filter(
          (comment) =>
            typeof comment.commentId ===
              "string",
        )
        .map(
          (comment) => [
            comment.commentId as string,
            comment,
          ]),
    );

  const validPhotoIds =
    new Set(
      photoMap.keys(),
    );

  const validCommentIds =
    new Set(
      commentMap.keys(),
    );

  const highlights =
    input.narrative
      .highlights
      .map(
        (item, index) => {
          const sourcePhotoIds =
            uniqueValidIds(
              item.sourcePhotoIds,
              validPhotoIds,
            );

          const sourceCommentIds =
            uniqueValidIds(
              item.sourceCommentIds,
              validCommentIds,
            );

          return {
            index,

            draft: {
              title:
                item.title,

              text:
                item.text,
            },

            sourcePhotoIds,
            sourceCommentIds,

            evidence: {
              photos:
                sourcePhotoIds
                  .map(
                    (id) =>
                      photoMap.get(id),
                  )
                  .filter(Boolean),

              comments:
                sourceCommentIds
                  .map(
                    (id) =>
                      commentMap.get(id),
                  )
                  .filter(Boolean),
            },
          };
        },
      );

  const playfulObservations =
    input.narrative
      .playfulObservations
      .map(
        (item, index) => {
          const sourcePhotoIds =
            uniqueValidIds(
              item.sourcePhotoIds,
              validPhotoIds,
            );

          const sourceCommentIds =
            uniqueValidIds(
              item.sourceCommentIds,
              validCommentIds,
            );

          return {
            index,

            draft:
              item.text,

            sourcePhotoIds,
            sourceCommentIds,

            evidence: {
              photos:
                sourcePhotoIds
                  .map(
                    (id) =>
                      photoMap.get(id),
                  )
                  .filter(Boolean),

              comments:
                sourceCommentIds
                  .map(
                    (id) =>
                      commentMap.get(id),
                  )
                  .filter(Boolean),
            },
          };
        },
      );

  const response =
    await callDeepSeekJson({
      apiKey,

      model:
        ALBUM_REPORT_EVIDENCE_AUDIT_MODEL,

      thinking:
        false,

      systemInstruction: `
你是“两颗星球”相簿周记/月记的事实校对编辑。

你的任务只有一个：
修正用户可见文字里的具体事实错误，同时尽最大可能保留原有文风。

允许自由保留：
- 拟人；
- 比喻；
- 调侃；
- 诗意表达；
- “也许”“好像”“是不是”式文学联想；
- “夏天舍不得走”“小熊是星球居民”“香气飘过屏幕”等。

不能保留的错误：
- 数字错误；
- 日期错误；
- 作者错位；
- caption / 留言归属错误；
- 人物动作错误；
- 把两张照片拼成一个真实事件；
- 把一次出现写成确定的长期趋势；
- 把未知缩写解释成确定含义。

最重要的规则：

【statsNarrative】
只能依据 period + stats 校对。

【每一条 highlight】
只能依据该 highlight 自己的 evidence.photos / evidence.comments 校对。
禁止使用其他 highlight 的证据。
如果引用证据不足以支持某个具体事实，就把那一小处改得更模糊，但不要把整段改成严肃报告。

【languageAndEmotionNarrative】
只能依据：
languageSummary
languageStyleSummary
emotionSummary
校对。
特别检查“谁说了哪句话”和“谁呈现什么表达风格”。

【每一条 playfulObservation】
只能依据它自己携带的 evidence。
文学猜想可以保留，但它前面的事实前提必须真实。

【seasonalNote】
只能依据 seasonalContext 校对节气事实。
文学化季节描写可以保留。

不要修改结构化标签。
不要新增事实。
尽量少改原稿。

严格返回 JSON：

{
  "statsNarrative": "",
  "highlights": [
    {
      "index": 0,
      "title": "",
      "text": ""
    }
  ],
  "languageAndEmotionNarrative": "",
  "playfulObservations": [
    {
      "index": 0,
      "text": ""
    }
  ],
  "seasonalNote": ""
}
`.trim(),

      input:
        JSON.stringify(
          {
            period: {
              type:
                input.periodType,

              start:
                input.periodStart,

              end:
                input.periodEnd,
            },

            statsSection: {
              facts:
                input.stats,

              draft:
                input.narrative
                  .statsNarrative,
            },

            highlightSections:
              highlights,

            languageSection: {
              facts: {
                languageSummary:
                  input.languageSummary,

                languageStyleSummary:
                  input
                    .languageStyleSummary,

                emotionSummary:
                  input.emotionSummary,
              },

              draft:
                input.narrative
                  .languageAndEmotion
                  .narrative,
            },

            playfulSections:
              playfulObservations,

            seasonalSection: {
              facts:
                input
                  .seasonalContext,

              draft:
                input.narrative
                  .seasonalNote,
            },
          },
          null,
          2,
        ),

      maxTokens:
        input.periodType ===
          "month"
          ? 5500
          : 4000,
    });

  const patch =
    parsePatch(
      response.content,
    );

  const highlightPatchMap =
    new Map(
      patch.highlights.map(
        (item) => [
          item.index,
          item,
        ],
      ),
    );

  const playfulPatchMap =
    new Map(
      patch
        .playfulObservations
        .map(
          (item) => [
            item.index,
            item,
          ],
        ),
    );

  const narrative:
    AlbumReportNarrative = {
      ...input.narrative,

      statsNarrative:
        patch.statsNarrative ||
        input.narrative
          .statsNarrative,

      highlights:
        input.narrative
          .highlights
          .map(
            (item, index) => {
              const checked =
                highlightPatchMap
                  .get(index);

              return {
                ...item,

                sourcePhotoIds:
                  uniqueValidIds(
                    item.sourcePhotoIds,
                    validPhotoIds,
                  ),

                sourceCommentIds:
                  uniqueValidIds(
                    item.sourceCommentIds,
                    validCommentIds,
                  ),

                title:
                  checked?.title ||
                  item.title,

                text:
                  checked?.text ||
                  item.text,
              };
            },
          ),

      languageAndEmotion: {
        ...input.narrative
          .languageAndEmotion,

        narrative:
          patch
            .languageAndEmotionNarrative ||
          input.narrative
            .languageAndEmotion
            .narrative,
      },

      playfulObservations:
        input.narrative
          .playfulObservations
          .map(
            (item, index) => ({
              ...item,

              sourcePhotoIds:
                uniqueValidIds(
                  item.sourcePhotoIds,
                  validPhotoIds,
                ),

              sourceCommentIds:
                uniqueValidIds(
                  item.sourceCommentIds,
                  validCommentIds,
                ),

              text:
                playfulPatchMap
                  .get(index)
                  ?.text ||
                item.text,
            }),
          ),

      seasonalNote:
        patch.seasonalNote ||
        input.narrative
          .seasonalNote,
    };

  return {
    narrative,

    model:
      response.model,

    usage:
      response.usage,
  };
}
