export const IDEA_ANALYSIS_MODEL =
  "deepseek-v4-flash";

/*
  解析管线版本。

  即使双方答案没有变化，
  更换模型 / prompt / 分析架构后也应重新生成，
  避免继续命中旧模型结果。
*/
export const IDEA_ANALYSIS_PIPELINE_VERSION =
  "deepseek-v4-flash-v12";

export type IdeaAnalysisContent = {
  commonGround: string;
  differentViews: string;
  hiddenFocus: string;
  mutualUnderstanding: string;
  conversationPrompt: string;
};

type AnalysisAnswerInput = {
  memberId: string;
  displayName: string;
  body: string;
};

export type IdeaAnalysisHistoryInput = {
  dailyQuestionId: string;
  localDate: string;
  questionText: string;
  answers: AnalysisAnswerInput[];
};

async function sha256(
  value: string,
) {
  const bytes =
    new TextEncoder().encode(value);

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


export type IdeaAnalysisInsightHypothesisInput = {
  id: string;
  subjectType:
    | "member"
    | "relationship";
  subjectMemberId:
    string | null;
  subjectDisplayName:
    string | null;
  dimension: string;
  hypothesisText: string;
  priorSupportCount: number;
  priorContradictionCount: number;
};


export type IdeaAnalysisHistoricalSignalInput = {
  id: string;
  dailyQuestionId: string;
  localDate: string;
  subjectType:
    | "member"
    | "relationship";
  subjectMemberId:
    string | null;
  subjectDisplayName:
    string | null;
  signalType: string;
  signalText: string;
  sourceExcerpt:
    string | null;
  salience:
    | "medium"
    | "high";
};

export async function buildIdeaAnalysisSourceVersion(
  dailyQuestionId: string,
  questionId: string,
  answers: AnalysisAnswerInput[],
  history: IdeaAnalysisHistoryInput[] = [],
  insightHypotheses:
    IdeaAnalysisInsightHypothesisInput[] = [],
  historicalSignals:
    IdeaAnalysisHistoricalSignalInput[] = [],
) {
  /*
    不只依赖 updated_at。

    D1 CURRENT_TIMESTAMP 只有秒级精度，
    如果同一秒内修改两次答案，
    单靠时间可能无法发现变化。

    因此直接把正文纳入 hash。
  */
  const normalizedAnswers =
    [...answers]
      .sort((a, b) =>
        a.memberId.localeCompare(
          b.memberId,
        ),
      )
      .map((answer) => ({
        memberId:
          answer.memberId,
        displayName:
          answer.displayName,
        body:
          answer.body,
      }));

  const normalizedHistory =
    history
      .map((item) => ({
        dailyQuestionId:
          item.dailyQuestionId,
        localDate:
          item.localDate,
        questionText:
          item.questionText,
        answers:
          [...item.answers]
            .sort((a, b) =>
              a.memberId.localeCompare(
                b.memberId,
              ),
            )
            .map((answer) => ({
              memberId:
                answer.memberId,
              displayName:
                answer.displayName,
              body:
                answer.body,
            })),
      }))
      .sort((a, b) =>
        a.localDate.localeCompare(
          b.localDate,
        ),
      );


  const normalizedInsightHypotheses =
    insightHypotheses
      .map((item) => ({
        id: item.id,
        subjectType:
          item.subjectType,
        subjectMemberId:
          item.subjectMemberId,
        subjectDisplayName:
          item.subjectDisplayName,
        dimension:
          item.dimension,
        hypothesisText:
          item.hypothesisText,
        priorSupportCount:
          item.priorSupportCount,
        priorContradictionCount:
          item.priorContradictionCount,
      }))
      .sort((a, b) =>
        a.id.localeCompare(b.id),
      );


  const normalizedHistoricalSignals =
    historicalSignals
      .map((item) => ({
        id: item.id,
        dailyQuestionId:
          item.dailyQuestionId,
        localDate:
          item.localDate,
        subjectType:
          item.subjectType,
        subjectMemberId:
          item.subjectMemberId,
        subjectDisplayName:
          item.subjectDisplayName,
        signalType:
          item.signalType,
        signalText:
          item.signalText,
        sourceExcerpt:
          item.sourceExcerpt,
        salience:
          item.salience,
      }))
      .sort((a, b) =>
        a.id.localeCompare(b.id),
      );

  return sha256(
    JSON.stringify({
      pipelineVersion:
        IDEA_ANALYSIS_PIPELINE_VERSION,
      dailyQuestionId,
      questionId,
      answers:
        normalizedAnswers,
      history:
        normalizedHistory,
      insightHypotheses:
        normalizedInsightHypotheses,
      historicalSignals:
        normalizedHistoricalSignals,
    }),
  );
}

export function parseIdeaAnalysisContent(
  value: string,
): IdeaAnalysisContent {
  const parsed =
    JSON.parse(value) as Partial<IdeaAnalysisContent>;

  const fields:
    Array<
      keyof IdeaAnalysisContent
    > = [
      "commonGround",
      "differentViews",
      "hiddenFocus",
      "mutualUnderstanding",
      "conversationPrompt",
    ];

  for (const field of fields) {
    if (
      typeof parsed[field] !==
        "string" ||
      !parsed[field]?.trim()
    ) {
      throw new Error(
        `AI 解析缺少字段：${field}`,
      );
    }
  }

  return {
    commonGround:
      parsed.commonGround!.trim(),

    differentViews:
      parsed.differentViews!.trim(),

    hiddenFocus:
      parsed.hiddenFocus!.trim(),

    mutualUnderstanding:
      parsed.mutualUnderstanding!.trim(),

    conversationPrompt:
      parsed.conversationPrompt!.trim(),
  };
}

export const IDEA_ANALYSIS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,

  properties: {
    commonGround: {
      type: "string",
      description:
        "双方答案中真实存在的共同点。避免强行寻找一致。",
    },

    differentViews: {
      type: "string",
      description:
        "双方不同的视角、偏好或思考路径。以中性、友善方式表达。",
    },

    hiddenFocus: {
      type: "string",
      description:
        "从答案措辞中可以谨慎观察到的各自在意点，不进行心理诊断或过度推断。",
    },

    mutualUnderstanding: {
      type: "string",
      description:
        "帮助双方更理解彼此的一段具体、温柔的解释。",
    },

    conversationPrompt: {
      type: "string",
      description:
        "一句自然、具体、适合两个人继续聊下去的问题。",
    },
  },

  required: [
    "commonGround",
    "differentViews",
    "hiddenFocus",
    "mutualUnderstanding",
    "conversationPrompt",
  ],
} as const;


// =========================================================
// 妙想 · 内部洞察候选
//
// 这不是用户画像，也不是最终结论。
// 只保存未来可以被继续验证、修正或推翻的候选解释。
// =========================================================

export type IdeaInsightCandidate = {
  subject:
    | "first"
    | "second"
    | "relationship";

  dimension: string;

  hypothesis: string;

  evidenceType:
    | "direct_answer"
    | "entity_semantics"
    | "relational_action"
    | "repeated_pattern";

  strength:
    | "weak"
    | "medium"
    | "strong";

  evidence: string;

  /*
    history:<signal id>
    today:<insightSignals 中的 0-based index>
  */
  sourceSignalRefs: string[];
};


export function parseIdeaInsightCandidates(
  value: string,
): IdeaInsightCandidate[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    return [];
  }

  if (
    !parsed ||
    typeof parsed !== "object"
  ) {
    return [];
  }

  const raw =
    (
      parsed as {
        insightCandidates?: unknown;
      }
    ).insightCandidates;

  if (!Array.isArray(raw)) {
    return [];
  }

  const subjects =
    new Set([
      "first",
      "second",
      "relationship",
    ]);

  const evidenceTypes =
    new Set([
      "direct_answer",
      "entity_semantics",
      "relational_action",
      "repeated_pattern",
    ]);

  const strengths =
    new Set([
      "weak",
      "medium",
      "strong",
    ]);

  const result:
    IdeaInsightCandidate[] = [];

  const seen =
    new Set<string>();

  for (const item of raw) {
    if (
      !item ||
      typeof item !== "object"
    ) {
      continue;
    }

    const candidate =
      item as Record<
        string,
        unknown
      >;

    const subject =
      candidate.subject;

    const dimension =
      candidate.dimension;

    const hypothesis =
      candidate.hypothesis;

    const evidenceType =
      candidate.evidenceType;

    const strength =
      candidate.strength;

    const evidence =
      candidate.evidence;

    const rawSourceSignalRefs =
      candidate.sourceSignalRefs;

    if (
      typeof subject !== "string" ||
      !subjects.has(subject) ||
      typeof dimension !== "string" ||
      !/^[a-z0-9_]{2,64}$/.test(
        dimension,
      ) ||
      typeof hypothesis !== "string" ||
      !hypothesis.trim() ||
      typeof evidenceType !== "string" ||
      !evidenceTypes.has(
        evidenceType,
      ) ||
      typeof strength !== "string" ||
      !strengths.has(strength) ||
      typeof evidence !== "string" ||
      !evidence.trim() ||
      !Array.isArray(
        rawSourceSignalRefs,
      )
    ) {
      continue;
    }

    const sourceSignalRefs =
      Array.from(
        new Set(
          rawSourceSignalRefs
            .filter(
              (ref):
                ref is string =>
                  typeof ref ===
                    "string" &&
                  (
                    /^history:[^\s:]+$/.test(
                      ref,
                    ) ||
                    /^today:\d{1,2}$/.test(
                      ref,
                    )
                  ),
            )
            .slice(0, 12),
        ),
      );

    const normalizedHypothesis =
      hypothesis
        .trim()
        .slice(0, 1000);

    const normalizedEvidence =
      evidence
        .trim()
        .slice(0, 1500);

    const key = [
      subject,
      dimension,
      normalizedHypothesis,
    ].join("::");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    result.push({
      subject:
        subject as
          IdeaInsightCandidate["subject"],

      dimension,

      hypothesis:
        normalizedHypothesis,

      evidenceType:
        evidenceType as
          IdeaInsightCandidate["evidenceType"],

      strength:
        strength as
          IdeaInsightCandidate["strength"],

      evidence:
        normalizedEvidence,

      sourceSignalRefs,
    });

    // 一次最多保留 4 个，
    // 防止每天无限生成人物标签。
    if (result.length >= 4) {
      break;
    }
  }

  return result;
}


// =========================================================
// 妙想 · 对历史洞察的今日验证
// =========================================================

export type IdeaInsightEvaluation = {
  hypothesisId: string;

  verdict:
    | "support"
    | "contradict"
    | "refine"
    | "unrelated";

  matchQuality:
    | "exact"
    | "adjacent"
    | "none";

  evidenceType:
    | "direct_answer"
    | "entity_semantics"
    | "relational_action"
    | "repeated_pattern";

  strength:
    | "weak"
    | "medium"
    | "strong";

  evidence: string;

  refinedHypothesis:
    string | null;
};


export function parseIdeaInsightEvaluations(
  value: string,
): IdeaInsightEvaluation[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    return [];
  }

  if (
    !parsed ||
    typeof parsed !== "object"
  ) {
    return [];
  }

  const raw =
    (
      parsed as {
        insightEvaluations?: unknown;
      }
    ).insightEvaluations;

  if (!Array.isArray(raw)) {
    return [];
  }

  const verdicts =
    new Set([
      "support",
      "contradict",
      "refine",
      "unrelated",
    ]);

  const matchQualities =
    new Set([
      "exact",
      "adjacent",
      "none",
    ]);

  const evidenceTypes =
    new Set([
      "direct_answer",
      "entity_semantics",
      "relational_action",
      "repeated_pattern",
    ]);

  const strengths =
    new Set([
      "weak",
      "medium",
      "strong",
    ]);

  const result:
    IdeaInsightEvaluation[] = [];

  const seen =
    new Set<string>();

  for (const item of raw) {
    if (
      !item ||
      typeof item !== "object"
    ) {
      continue;
    }

    const value =
      item as Record<
        string,
        unknown
      >;

    const hypothesisId =
      value.hypothesisId;

    const verdict =
      value.verdict;

    const matchQuality =
      value.matchQuality;

    const evidenceType =
      value.evidenceType;

    const strength =
      value.strength;

    const evidence =
      value.evidence;

    const refinedHypothesis =
      value.refinedHypothesis;

    if (
      typeof hypothesisId !== "string" ||
      !hypothesisId.trim() ||
      typeof verdict !== "string" ||
      !verdicts.has(verdict) ||
      typeof matchQuality !== "string" ||
      !matchQualities.has(
        matchQuality,
      ) ||
      typeof evidenceType !== "string" ||
      !evidenceTypes.has(
        evidenceType,
      ) ||
      typeof strength !== "string" ||
      !strengths.has(strength) ||
      typeof evidence !== "string" ||
      !evidence.trim()
    ) {
      continue;
    }

    if (
      verdict === "refine" &&
      (
        typeof refinedHypothesis !==
          "string" ||
        !refinedHypothesis.trim()
      )
    ) {
      continue;
    }

    if (seen.has(hypothesisId)) {
      continue;
    }

    seen.add(hypothesisId);

    result.push({
      hypothesisId:
        hypothesisId.trim(),

      verdict:
        verdict as
          IdeaInsightEvaluation["verdict"],

      matchQuality:
        matchQuality as
          IdeaInsightEvaluation["matchQuality"],

      evidenceType:
        evidenceType as
          IdeaInsightEvaluation["evidenceType"],

      strength:
        strength as
          IdeaInsightEvaluation["strength"],

      evidence:
        evidence
          .trim()
          .slice(0, 1500),

      refinedHypothesis:
        verdict === "refine"
          ? (
              refinedHypothesis as string
            )
              .trim()
              .slice(0, 1000)
          : null,
    });

    if (result.length >= 12) {
      break;
    }
  }

  return result;
}


// =========================================================
// 妙想 · 洞察事实线索
//
// Signal 只记录“观察到了什么”。
// 不负责解释人格、心理原因或关系需求。
// =========================================================

export type IdeaInsightSignal = {
  subject:
    | "first"
    | "second"
    | "relationship";

  signalType:
    | "direct_statement"
    | "concrete_detail"
    | "entity_reference"
    | "relational_action"
    | "memory_reference"
    | "temporal_reference"
    | "expression_pattern"
    | "choice_pattern";

  signalText: string;

  sourceExcerpt:
    string | null;

  salience:
    | "low"
    | "medium"
    | "high";
};


export function parseIdeaInsightSignals(
  value: string,
): IdeaInsightSignal[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    return [];
  }

  if (
    !parsed ||
    typeof parsed !== "object"
  ) {
    return [];
  }

  const raw =
    (
      parsed as {
        insightSignals?: unknown;
      }
    ).insightSignals;

  if (!Array.isArray(raw)) {
    return [];
  }

  const subjects =
    new Set([
      "first",
      "second",
      "relationship",
    ]);

  const signalTypes =
    new Set([
      "direct_statement",
      "concrete_detail",
      "entity_reference",
      "relational_action",
      "memory_reference",
      "temporal_reference",
      "expression_pattern",
      "choice_pattern",
    ]);

  const saliences =
    new Set([
      "low",
      "medium",
      "high",
    ]);

  const result:
    IdeaInsightSignal[] = [];

  const seen =
    new Set<string>();

  for (const item of raw) {
    if (
      !item ||
      typeof item !== "object"
    ) {
      continue;
    }

    const signal =
      item as Record<
        string,
        unknown
      >;

    const subject =
      signal.subject;

    const signalType =
      signal.signalType;

    const signalText =
      signal.signalText;

    const sourceExcerpt =
      signal.sourceExcerpt;

    const salience =
      signal.salience;

    if (
      typeof subject !== "string" ||
      !subjects.has(subject) ||
      typeof signalType !== "string" ||
      !signalTypes.has(signalType) ||
      typeof signalText !== "string" ||
      !signalText.trim() ||
      typeof salience !== "string" ||
      !saliences.has(salience)
    ) {
      continue;
    }

    if (
      sourceExcerpt !== null &&
      sourceExcerpt !== undefined &&
      typeof sourceExcerpt !== "string"
    ) {
      continue;
    }

    const normalizedText =
      signalText
        .trim()
        .slice(0, 1000);

    const normalizedExcerpt =
      typeof sourceExcerpt === "string"
        ? sourceExcerpt
            .trim()
            .slice(0, 1000)
        : null;

    const key = [
      subject,
      signalType,
      normalizedText,
    ].join("::");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    result.push({
      subject:
        subject as
          IdeaInsightSignal["subject"],

      signalType:
        signalType as
          IdeaInsightSignal["signalType"],

      signalText:
        normalizedText,

      sourceExcerpt:
        normalizedExcerpt ||
        null,

      salience:
        salience as
          IdeaInsightSignal["salience"],
    });

    // 每天只保留少量高价值事实线索。
    if (result.length >= 8) {
      break;
    }
  }

  return result;
}
