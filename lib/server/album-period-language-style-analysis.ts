import {
  callDeepSeekJson,
  DEEPSEEK_DEFAULT_MODEL,
} from "./deepseek-json";

import type {
  AlbumPeriodLanguageSummary,
} from "./album-period-language-summary";

export const ALBUM_LANGUAGE_STYLE_MODEL =
  DEEPSEEK_DEFAULT_MODEL;

export const ALBUM_LANGUAGE_STYLE_PIPELINE_VERSION =
  "album-language-style-v1";

export type LanguageStyleTrait = {
  label: string;

  confidence: number;

  evidence: string;
};

export type MemberLanguageStyle = {
  memberId: string;

  role:
    | "first"
    | "second";

  displayName: string;

  styles:
    LanguageStyleTrait[];

  summary: string;
};

export type AlbumPeriodLanguageStyleSummary = {
  members:
    MemberLanguageStyle[];

  sharedTone: {
    labels: string[];

    summary: string;
  };

  confidenceNote: string;
};

function text(
  value: unknown,
  maxLength: number,
) {
  return typeof value === "string"
    ? value
        .trim()
        .slice(
          0,
          maxLength,
        )
    : "";
}

function confidence(
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

export function parseAlbumPeriodLanguageStyle(
  value: string,
): AlbumPeriodLanguageStyleSummary {
  let raw: unknown;

  try {
    raw =
      JSON.parse(value);
  } catch {
    throw new Error(
      "语言风格分析不是合法 JSON",
    );
  }

  if (
    !raw ||
    typeof raw !== "object"
  ) {
    throw new Error(
      "语言风格分析格式错误",
    );
  }

  const source =
    raw as Record<
      string,
      unknown
    >;

  const members =
    Array.isArray(
      source.members,
    )
      ? source.members
          .filter(
            (item) =>
              item &&
              typeof item ===
                "object",
          )
          .map(
            (item) => {
              const member =
                item as Record<
                  string,
                  unknown
                >;

              const role =
                member.role ===
                "second"
                  ? "second"
                  : "first";

              const styles =
                Array.isArray(
                  member.styles,
                )
                  ? member.styles
                      .filter(
                        (style) =>
                          style &&
                          typeof style ===
                            "object",
                      )
                      .map(
                        (style) => {
                          const trait =
                            style as Record<
                              string,
                              unknown
                            >;

                          return {
                            label:
                              text(
                                trait.label,
                                30,
                              ),

                            confidence:
                              confidence(
                                trait.confidence,
                              ),

                            evidence:
                              text(
                                trait.evidence,
                                300,
                              ),
                          };
                        },
                      )
                      .filter(
                        (style) =>
                          style.label &&
                          style.confidence >=
                            0.55,
                      )
                      .slice(
                        0,
                        4,
                      )
                  : [];

              return {
                memberId:
                  text(
                    member.memberId,
                    100,
                  ),

                role,

                displayName:
                  text(
                    member.displayName,
                    80,
                  ),

                styles,

                summary:
                  text(
                    member.summary,
                    500,
                  ),
              };
            },
          )
          .filter(
            (member) =>
              member.memberId,
          )
      : [];

  const shared =
    source.sharedTone &&
    typeof source.sharedTone ===
      "object"
      ? source.sharedTone as Record<
          string,
          unknown
        >
      : {};

  return {
    members,

    sharedTone: {
      labels:
        Array.isArray(
          shared.labels,
        )
          ? shared.labels
              .filter(
                (
                  item,
                ): item is string =>
                  typeof item ===
                  "string",
              )
              .map(
                (item) =>
                  item
                    .trim()
                    .slice(
                      0,
                      30,
                    ),
              )
              .filter(Boolean)
              .slice(
                0,
                4,
              )
          : [],

      summary:
        text(
          shared.summary,
          500,
        ),
    },

    confidenceNote:
      text(
        source.confidenceNote,
        300,
      ),
  };
}

export async function analyzeAlbumPeriodLanguageStyle(
  apiKey: string,
  input: {
    periodType:
      | "week"
      | "month";

    languageSummary:
      AlbumPeriodLanguageSummary;
  },
) {
  const sourceTexts =
    input.languageSummary
      .sourceTexts
      .slice(
        0,
        input.periodType ===
          "month"
          ? 120
          : 60,
      );

  const systemInstruction = `
你负责分析情侣共享相簿中两个人“这一周期的语言表达气质”。

你分析的是表达风格，不是人格、性格类型或心理状态。

例如可能出现：
幽默、直率、安静、温柔、抽象、活泼、跳脱、克制、细腻、简练、松弛、认真、感性、理性、犀利、体贴、调侃、热烈、含蓄、具体、叙事感、反应型等。

这些只是参考，不是固定分类。
可以生成更贴合原文的自然中文标签。

重要原则：

1. 必须直接依据 sourceTexts 中真实写下来的 caption 和留言判断。
2. lexicalSummary 中的长度、emoji、问句等只是辅助，不能机械映射风格。
3. 同一个人可以同时具有多个不互斥特征，例如“直率 + 温柔”“安静 + 幽默”。
4. 每个人只保留 0-4 个真正明显的风格。
5. 样本很少时宁可少判断，不要为了填满标签硬猜。
6. confidence 表示“本周期这些文本对这个判断的支持程度”，不是人格概率。
7. evidence 用一句自然中文解释依据，不需要逐字引用原文，也不要编造没有出现过的表达。
8. summary 必须使用“这周/这个月的表达更偏……”“从目前这些文字看……”等阶段性语气。
9. 禁止写“TA就是这样的人”“性格是……”等人格定论。
10. sharedTone 描述两个人这些文字放在一起形成的交流气质，例如“一个跳脱、一个简短直接”“整体偏轻松调侃”。
11. 如果双方文本太少，sharedTone 可以为空。
12. 不分析爱情程度、依恋、关系好坏、控制欲等。
13. 全部使用自然简体中文。

严格返回 JSON：

{
  "members": [
    {
      "memberId": "",
      "role": "first",
      "displayName": "",
      "styles": [
        {
          "label": "幽默",
          "confidence": 0.8,
          "evidence": ""
        }
      ],
      "summary": ""
    }
  ],
  "sharedTone": {
    "labels": [],
    "summary": ""
  },
  "confidenceNote": ""
}
`.trim();

  const payload = {
    periodType:
      input.periodType,

    lexicalSummary: {
      analysis:
        input.languageSummary
          .analysis,

      topWords:
        input.languageSummary
          .topWords,

      topEmojis:
        input.languageSummary
          .topEmojis,

      sharedWords:
        input.languageSummary
          .sharedWords,

      members:
        input.languageSummary
          .members,
    },

    sourceTexts,
  };

  const response =
    await callDeepSeekJson({
      apiKey,

      model:
        ALBUM_LANGUAGE_STYLE_MODEL,

      thinking:
        false,

      systemInstruction,

      input:
        JSON.stringify(
          payload,
          null,
          2,
        ),

      maxTokens:
        input.periodType ===
          "month"
          ? 3000
          : 2200,
    });

  return {
    summary:
      parseAlbumPeriodLanguageStyle(
        response.content,
      ),

    model:
      response.model,

    usage:
      response.usage,
  };
}
