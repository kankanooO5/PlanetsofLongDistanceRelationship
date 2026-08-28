import {
  callDeepSeekJson,
  DEEPSEEK_DEFAULT_MODEL,
} from "./deepseek-json";

import type {
  AlbumPeriodLanguageSummary,
} from "./album-period-language-summary";

export const ALBUM_EMOTION_MODEL =
  DEEPSEEK_DEFAULT_MODEL;

export const ALBUM_EMOTION_PIPELINE_VERSION =
  "album-emotion-v1";

export type TextEmotion = {
  sourceIndex: number;

  emotions: Array<{
    label: string;
    confidence: number;
  }>;
};

export type AlbumPeriodEmotionSummary = {
  analysis: {
    totalTexts: number;
    analyzedTexts: number;
  };

  emotions: Array<{
    label: string;
    count: number;
    averageConfidence: number;
  }>;

  members: Array<{
    memberId: string;
    role: "first" | "second";
    displayName: string;

    emotions: Array<{
      label: string;
      count: number;
      averageConfidence: number;
    }>;
  }>;

  sourceEmotions: Array<{
    sourceIndex: number;

    memberId: string;
    role: "first" | "second";
    displayName: string;

    sourceType:
      | "caption"
      | "comment";

    text: string;

    emotions: Array<{
      label: string;
      confidence: number;
    }>;
  }>;
};

function normalizeLabel(
  value: unknown,
) {
  return typeof value === "string"
    ? value
        .trim()
        .slice(0, 20)
    : "";
}

function normalizeConfidence(
  value: unknown,
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      1,
      Math.round(
        value * 100,
      ) / 100,
    ),
  );
}

function aggregate(
  rows: Array<{
    label: string;
    confidence: number;
  }>,
) {
  const map =
    new Map<
      string,
      {
        count: number;
        confidenceTotal: number;
      }
    >();

  for (const row of rows) {
    const current =
      map.get(row.label) ?? {
        count: 0,
        confidenceTotal: 0,
      };

    current.count += 1;
    current.confidenceTotal +=
      row.confidence;

    map.set(
      row.label,
      current,
    );
  }

  return Array.from(
    map.entries(),
  )
    .map(
      ([label, value]) => ({
        label,

        count:
          value.count,

        averageConfidence:
          Math.round(
            (
              value.confidenceTotal /
              value.count
            ) * 100,
          ) / 100,
      }),
    )
    .sort(
      (a, b) =>
        b.count - a.count ||
        b.averageConfidence -
          a.averageConfidence,
    )
    .slice(0, 12);
}

export async function analyzeAlbumPeriodEmotion(
  apiKey: string,
  input: {
    periodType:
      | "week"
      | "month";

    languageSummary:
      AlbumPeriodLanguageSummary;
  },
) {
  const texts =
    input.languageSummary
      .sourceTexts
      .slice(
        0,
        input.periodType ===
          "month"
          ? 150
          : 80,
      );

  if (!texts.length) {
    return {
      summary: {
        analysis: {
          totalTexts: 0,
          analyzedTexts: 0,
        },

        emotions: [],
        members: [],
        sourceEmotions: [],
      } satisfies AlbumPeriodEmotionSummary,

      model: null,
      usage: null,
    };
  }

  const response =
    await callDeepSeekJson({
      apiKey,

      model:
        ALBUM_EMOTION_MODEL,

      thinking:
        false,

      systemInstruction: `
你负责识别情侣共享相簿中真实文字所呈现的“表达情绪”。

分析对象包括照片 caption 和照片留言。

你分析的是文字表现出来的情绪色彩，
不是作者真实心理状态，也不是关系质量。

优先使用自然、容易理解的中文标签，例如：
开心、轻松、温柔、想念、欣赏、惊喜、调侃、
关心、期待、兴奋、满足、好奇、无奈、委屈、
失落、平静、认真。

规则：

1. 每条文字最多输出 0-3 个明显情绪。
2. 没有明显情绪时 emotions 返回空数组。
3. “艺术”“Disney”这种纯描述不能硬判情绪。
4. “厉害！”可以识别为欣赏或惊叹。
5. “呀米呀米”可以识别为开心、满足或轻松，但不要推断真实饮食偏好。
6. emoji 可以辅助理解语气，但不能单独决定情绪。
7. 不使用“依恋、控制、焦虑型”等心理标签。
8. 不输出正能量指数、幸福度等评分。
9. confidence 仅表示文本对该标签的支持程度。
10. 相近情绪尽量使用统一标签，避免“开心/愉快/快乐”被拆成三个类别。
11. 全部使用简体中文。

严格返回 JSON：

{
  "items": [
    {
      "sourceIndex": 0,
      "emotions": [
        {
          "label": "欣赏",
          "confidence": 0.9
        }
      ]
    }
  ]
}
`.trim(),

      input:
        JSON.stringify({
          periodType:
            input.periodType,

          texts:
            texts.map(
              (item, index) => ({
                sourceIndex:
                  index,

                role:
                  item.role,

                displayName:
                  item.displayName,

                sourceType:
                  item.sourceType,

                text:
                  item.text,
              }),
            ),
        }),

      maxTokens:
        input.periodType ===
          "month"
          ? 3500
          : 2500,
    });

  let parsed: unknown;

  try {
    parsed =
      JSON.parse(
        response.content,
      );
  } catch {
    throw new Error(
      "情感分析不是合法 JSON",
    );
  }

  const rawItems =
    parsed &&
    typeof parsed ===
      "object" &&
    Array.isArray(
      (
        parsed as {
          items?: unknown;
        }
      ).items,
    )
      ? (
          parsed as {
            items: unknown[];
          }
        ).items
      : [];

  const items: TextEmotion[] =
    rawItems
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

          const sourceIndex =
            typeof row.sourceIndex ===
              "number"
              ? Math.trunc(
                  row.sourceIndex,
                )
              : -1;

          const emotions =
            Array.isArray(
              row.emotions,
            )
              ? row.emotions
                  .filter(
                    (emotion) =>
                      emotion &&
                      typeof emotion ===
                        "object",
                  )
                  .map(
                    (emotion) => {
                      const value =
                        emotion as Record<
                          string,
                          unknown
                        >;

                      return {
                        label:
                          normalizeLabel(
                            value.label,
                          ),

                        confidence:
                          normalizeConfidence(
                            value.confidence,
                          ),
                      };
                    },
                  )
                  .filter(
                    (emotion) =>
                      emotion.label &&
                      emotion.confidence >=
                        0.6,
                  )
                  .slice(0, 3)
              : [];

          return {
            sourceIndex,
            emotions,
          };
        },
      )
      .filter(
        (item) =>
          item.sourceIndex >= 0 &&
          item.sourceIndex <
            texts.length,
      );

  const allEmotionRows =
    items.flatMap(
      (item) =>
        item.emotions,
    );

  const memberGroups =
    new Map<
      string,
      {
        memberId: string;
        role:
          | "first"
          | "second";
        displayName: string;

        emotions: Array<{
          label: string;
          confidence: number;
        }>;
      }
    >();

  for (const item of items) {
    const source =
      texts[
        item.sourceIndex
      ];

    if (!source) {
      continue;
    }

    const current =
      memberGroups.get(
        source.memberId,
      ) ?? {
        memberId:
          source.memberId,

        role:
          source.role,

        displayName:
          source.displayName,

        emotions: [],
      };

    current.emotions.push(
      ...item.emotions,
    );

    memberGroups.set(
      source.memberId,
      current,
    );
  }

  const sourceEmotions =
    items
      .map(
        (item) => {
          const source =
            texts[
              item.sourceIndex
            ];

          if (!source) {
            return null;
          }

          return {
            sourceIndex:
              item.sourceIndex,

            memberId:
              source.memberId,

            role:
              source.role,

            displayName:
              source.displayName,

            sourceType:
              source.sourceType,

            text:
              source.text,

            emotions:
              item.emotions,
          };
        },
      )
      .filter(
        (
          item,
        ): item is NonNullable<
          typeof item
        > =>
          item !== null,
      );

  const summary:
    AlbumPeriodEmotionSummary = {
      analysis: {
        totalTexts:
          texts.length,

        analyzedTexts:
          items.filter(
            (item) =>
              item.emotions
                .length > 0,
          ).length,
      },

      emotions:
        aggregate(
          allEmotionRows,
        ),

      members:
        Array.from(
          memberGroups.values(),
        )
          .map(
            (member) => ({
              memberId:
                member.memberId,

              role:
                member.role,

              displayName:
                member.displayName,

              emotions:
                aggregate(
                  member.emotions,
                ),
            }),
          )
          .sort(
            (a, b) =>
              a.role.localeCompare(
                b.role,
              ),
          ),

      sourceEmotions,
    };

  return {
    summary,

    model:
      response.model,

    usage:
      response.usage,
  };
}
