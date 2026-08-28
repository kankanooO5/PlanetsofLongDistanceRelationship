export const DEEPSEEK_DEFAULT_MODEL =
  "deepseek-v4-flash";

export type DeepSeekJsonRequest = {
  apiKey: string;
  systemInstruction: string;
  input: string;

  model?: string;

  reasoningEffort?:
    | "low"
    | "medium"
    | "high";

  thinking?: boolean;

  maxTokens?: number;
};

export type DeepSeekJsonResult = {
  content: string;
  model: string;

  finishReason:
    | string
    | null;

  usage: {
    promptTokens:
      number | null;

    completionTokens:
      number | null;
  };
};

export async function callDeepSeekJson(
  options: DeepSeekJsonRequest,
): Promise<DeepSeekJsonResult> {
  const model =
    options.model ??
    DEEPSEEK_DEFAULT_MODEL;

  const response =
    await fetch(
      "https://api.deepseek.com/chat/completions",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${options.apiKey}`,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          model,

          messages: [
            {
              role: "system",
              content:
                options.systemInstruction,
            },
            {
              role: "user",
              content:
                options.input,
            },
          ],

          thinking: {
            type:
              options.thinking === false
                ? "disabled"
                : "enabled",
          },

          ...(
            options.thinking === false
              ? {}
              : {
                  reasoning_effort:
                    options.reasoningEffort ??
                    "high",
                }
          ),

          response_format: {
            type: "json_object",
          },

          max_tokens:
            options.maxTokens ??
            4000,

          stream: false,
        }),
      },
    );

  const raw =
    await response.text();

  if (!response.ok) {
    console.error(
      "DeepSeek JSON request failed",
      response.status,
      raw.slice(0, 1000),
    );

    throw new Error(
      `DeepSeek API 请求失败（${response.status}）`,
    );
  }

  let result: {
    choices?: Array<{
      finish_reason?:
        | string
        | null;

      message?: {
        content?:
          | string
          | null;
      };
    }>;

    usage?: {
      prompt_tokens?:
        number;

      completion_tokens?:
        number;
    };
  };

  try {
    result =
      JSON.parse(raw);
  } catch {
    throw new Error(
      "DeepSeek 返回了无法解析的响应",
    );
  }

  const choice =
    result.choices?.[0];

  const content =
    choice
      ?.message
      ?.content
      ?.trim();

  if (!content) {
    console.error(
      "DeepSeek response without final content",
      JSON.stringify({
        finishReason:
          choice?.finish_reason ??
          null,

        usage:
          result.usage ??
          null,
      }),
    );

    throw new Error(
      "DeepSeek 没有返回分析内容",
    );
  }

  return {
    content,
    model,

    finishReason:
      choice
        ?.finish_reason ??
      null,

    usage: {
      promptTokens:
        result
          .usage
          ?.prompt_tokens ??
        null,

      completionTokens:
        result
          .usage
          ?.completion_tokens ??
        null,
    },
  };
}
