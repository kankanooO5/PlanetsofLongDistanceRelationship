export const IDEA_ANALYSIS_MODEL =
  "@cf/zai-org/glm-4.7-flash";

export type IdeaAnalysisContent = {
  commonGround: string;
  differentViews: string;
  hiddenFocus: string;
  mutualUnderstanding: string;
  conversationPrompt: string;
};

type AnalysisAnswerInput = {
  memberId: string;
  body: string;
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

export async function buildIdeaAnalysisSourceVersion(
  dailyQuestionId: string,
  questionId: string,
  answers: AnalysisAnswerInput[],
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
        body:
          answer.body,
      }));

  return sha256(
    JSON.stringify({
      dailyQuestionId,
      questionId,
      answers:
        normalizedAnswers,
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
