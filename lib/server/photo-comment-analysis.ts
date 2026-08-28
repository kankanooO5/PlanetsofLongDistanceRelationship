import {
  callDeepSeekJson,
  DEEPSEEK_DEFAULT_MODEL,
} from "./deepseek-json";

export const PHOTO_COMMENT_ANALYSIS_MODEL =
  DEEPSEEK_DEFAULT_MODEL;

export const PHOTO_COMMENT_ANALYSIS_PIPELINE_VERSION =
  "photo-comment-v2";

const INTERACTION_SIGNAL_TYPES = [
  "affection",
  "care",
  "humor",
  "curiosity",
  "support",
  "shared_memory",
  "planning",
  "appreciation",
] as const;

export type PhotoCommentInteractionSignalType =
  typeof INTERACTION_SIGNAL_TYPES[number];

export type PhotoCommentInteractionSignal = {
  type:
    PhotoCommentInteractionSignalType;

  evidence: string;

  confidence: number;
};

export type PhotoCommentSentiment = {
  valence:
    | "positive"
    | "neutral"
    | "mixed"
    | "negative";

  intensity:
    | "low"
    | "medium"
    | "high";

  tones: string[];

  note: string;
};

export type PhotoCommentAnalysis = {
  keywords: string[];
  themes: string[];

  interactionSignals:
    PhotoCommentInteractionSignal[];

  sentiment:
    PhotoCommentSentiment;
};

export type AnalyzePhotoCommentInput = {
  commentId: string;
  body: string;

  authorDisplayName?:
    string | null;

  photoOwnerDisplayName?:
    string | null;
};

async function sha256(
  value: string,
) {
  const bytes =
    new TextEncoder().encode(
      value,
    );

  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      bytes,
    );

  return Array.from(
    new Uint8Array(digest),
    (byte) =>
      byte
        .toString(16)
        .padStart(2, "0"),
  ).join("");
}

export async function buildPhotoCommentSourceVersion(
  input:
    AnalyzePhotoCommentInput,
) {
  return sha256(
    JSON.stringify({
      pipeline:
        PHOTO_COMMENT_ANALYSIS_PIPELINE_VERSION,

      commentId:
        input.commentId,

      body:
        input.body.trim(),
    }),
  );
}

function normalizeStringArray(
  value: unknown,
  maxItems = 12,
) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen =
    new Set<string>();

  const result:
    string[] = [];

  for (const item of value) {
    if (
      typeof item !== "string"
    ) {
      continue;
    }

    const text =
      item.trim();

    if (
      !text ||
      text.length > 80 ||
      seen.has(text)
    ) {
      continue;
    }

    seen.add(text);
    result.push(text);

    if (
      result.length >=
      maxItems
    ) {
      break;
    }
  }

  return result;
}

function normalizeConfidence(
  value: unknown,
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return 0.5;
  }

  return Math.max(
    0,
    Math.min(
      1,
      Number(
        value.toFixed(2),
      ),
    ),
  );
}

export function parsePhotoCommentAnalysis(
  value: string,
): PhotoCommentAnalysis {
  let raw: unknown;

  try {
    raw =
      JSON.parse(value);
  } catch {
    throw new Error(
      "留言分析结果不是合法 JSON",
    );
  }

  if (
    !raw ||
    typeof raw !== "object"
  ) {
    throw new Error(
      "留言分析结果格式错误",
    );
  }

  const source =
    raw as Record<
      string,
      unknown
    >;

  const rawSignals =
    Array.isArray(
      source.interactionSignals,
    )
      ? source.interactionSignals
      : [];

  const interactionSignals:
    PhotoCommentInteractionSignal[] =
      [];

  for (
    const value of
      rawSignals
  ) {
    if (
      !value ||
      typeof value !==
        "object"
    ) {
      continue;
    }

    const signal =
      value as Record<
        string,
        unknown
      >;

    const type =
      typeof signal.type ===
      "string"
        ? signal.type
        : "";

    if (
      !INTERACTION_SIGNAL_TYPES.includes(
        type as
          PhotoCommentInteractionSignalType,
      )
    ) {
      continue;
    }

    const evidence =
      typeof signal.evidence ===
      "string"
        ? signal.evidence.trim()
        : "";

    if (
      !evidence ||
      evidence.length > 300
    ) {
      continue;
    }

    const confidence =
      normalizeConfidence(
        signal.confidence,
      );

    if (confidence < 0.6) {
      continue;
    }

    interactionSignals.push({
      type:
        type as
          PhotoCommentInteractionSignalType,

      evidence,

      confidence,
    });

    if (
      interactionSignals.length >=
      8
    ) {
      break;
    }
  }

  const rawSentiment =
    source.sentiment &&
    typeof source.sentiment ===
      "object"
      ? source.sentiment as
          Record<
            string,
            unknown
          >
      : {};

  const validValence =
    [
      "positive",
      "neutral",
      "mixed",
      "negative",
    ] as const;

  const validIntensity =
    [
      "low",
      "medium",
      "high",
    ] as const;

  const valence =
    typeof rawSentiment.valence ===
      "string" &&
    validValence.includes(
      rawSentiment.valence as
        typeof validValence[number],
    )
      ? rawSentiment.valence as
          typeof validValence[number]
      : "neutral";

  const intensity =
    typeof rawSentiment.intensity ===
      "string" &&
    validIntensity.includes(
      rawSentiment.intensity as
        typeof validIntensity[number],
    )
      ? rawSentiment.intensity as
          typeof validIntensity[number]
      : "low";

  const note =
    typeof rawSentiment.note ===
      "string"
      ? rawSentiment.note
          .trim()
          .slice(0, 300)
      : "";

  return {
    keywords:
      normalizeStringArray(
        source.keywords,
        10,
      ),

    themes:
      normalizeStringArray(
        source.themes,
        8,
      ),

    interactionSignals,

    sentiment: {
      valence,
      intensity,

      tones:
        normalizeStringArray(
          rawSentiment.tones,
          6,
        ),

      note,
    },
  };
}

export async function analyzePhotoComment(
  apiKey: string,
  input:
    AnalyzePhotoCommentInput,
) {
  const body =
    input.body.trim();

  if (!body) {
    throw new Error(
      "留言正文为空",
    );
  }

  const sourceVersion =
    await buildPhotoCommentSourceVersion(
      input,
    );

  const systemInstruction = `
你负责分析情侣共享相簿中的单条照片留言。

你的任务是描述文本中实际出现的内容和互动方式，
而不是判断两个人的感情好坏。

严格遵守：
1. 不诊断人格、依恋类型或心理疾病。
2. 不根据单条留言推断长期关系状态。
3. 不编造留言之外的背景。
4. 可以识别亲昵、关心、玩笑、好奇、支持、共同回忆等明确互动信号。
5. evidence 必须直接来自或紧贴原留言表达。
6. keywords 只提取能够独立表达信息的名词、称呼、对象、地点、动作或有辨识度的表达。
   不要把“说是”“感觉”“真的”“然后”等普通连接词、虚词或残缺短语作为关键词。
7. interactionSignals 只有在文本中存在明确证据时才输出。
   不要为了凑类别而推断；不确定的信号宁可省略。
8. 输出必须是 JSON object，不要输出 Markdown。

输出结构：
{
  "keywords": ["高信息量词语或表达"],
  "themes": ["留言涉及的主题"],
  "interactionSignals": [
    {
      "type": "affection | care | humor | curiosity | support | shared_memory | planning | appreciation",
      "evidence": "对应的具体文本证据",
      "confidence": 0.0
    }
  ],
  "sentiment": {
    "valence": "positive | neutral | mixed | negative",
    "intensity": "low | medium | high",
    "tones": ["具体情绪或语气"],
    "note": "一句中性说明"
  }
}
`.trim();

  const contextLines = [
    input.authorDisplayName
      ? `留言者：${input.authorDisplayName}`
      : null,

    input.photoOwnerDisplayName
      ? `照片上传者：${input.photoOwnerDisplayName}`
      : null,

    `留言正文：${body}`,
  ]
    .filter(Boolean)
    .join("\n");

  const response =
    await callDeepSeekJson({
      apiKey,

      model:
        PHOTO_COMMENT_ANALYSIS_MODEL,

      systemInstruction,

      input:
        contextLines,

      reasoningEffort:
        "medium",

      maxTokens:
        2000,
    });

  return {
    analysis:
      parsePhotoCommentAnalysis(
        response.content,
      ),

    sourceVersion,

    model:
      response.model,

    usage:
      response.usage,
  };
}
