export const PHOTO_VISION_MODEL =
  "@cf/moondream/moondream3.1-9B-A2B";

export const PHOTO_VISION_PIPELINE_VERSION =
  "photo-vision-v2";

export type PhotoVisionAnalysis = {
  caption: string;
  scene: string;
  activities: string[];
  objects: string[];
  semanticTags: string[];

  visualMood: {
    tones: string[];
    atmosphere: string;
  };
};

function arrayBufferToBase64(
  buffer: ArrayBuffer,
) {
  const bytes =
    new Uint8Array(buffer);

  const chunkSize =
    0x8000;

  let binary = "";

  for (
    let offset = 0;
    offset < bytes.length;
    offset += chunkSize
  ) {
    const chunk =
      bytes.subarray(
        offset,
        Math.min(
          offset + chunkSize,
          bytes.length,
        ),
      );

    binary +=
      String.fromCharCode(
        ...chunk,
      );
  }

  return btoa(binary);
}

function parseStringArray(
  value: unknown,
  maxItems = 15,
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item):
        item is string =>
          typeof item === "string",
    )
    .map(
      (item) =>
        item.trim(),
    )
    .filter(Boolean)
    .slice(
      0,
      maxItems,
    );
}

export function parsePhotoVisionAnalysis(
  value: string,
): PhotoVisionAnalysis {
  let raw: unknown;

  try {
    raw =
      JSON.parse(value);
  } catch {
    throw new Error(
      "照片视觉分析结果不是合法 JSON",
    );
  }

  if (
    !raw ||
    typeof raw !== "object"
  ) {
    throw new Error(
      "照片视觉分析结果格式错误",
    );
  }

  const source =
    raw as Record<
      string,
      unknown
    >;

  const mood =
    source.visualMood &&
    typeof source.visualMood ===
      "object" &&
    !Array.isArray(
      source.visualMood,
    )
      ? source.visualMood as
          Record<
            string,
            unknown
          >
      : {};

  return {
    caption:
      typeof source.caption ===
      "string"
        ? source.caption
            .trim()
            .slice(0, 1000)
        : "",

    scene:
      typeof source.scene ===
      "string"
        ? source.scene
            .trim()
            .slice(0, 300)
        : "",

    activities:
      parseStringArray(
        source.activities,
        10,
      ),

    objects:
      parseStringArray(
        source.objects,
        20,
      ),

    semanticTags:
      parseStringArray(
        source.semanticTags,
        15,
      ),

    visualMood: {
      tones:
        parseStringArray(
          mood.tones,
          8,
        ),

      atmosphere:
        typeof mood.atmosphere ===
        "string"
          ? mood.atmosphere
              .trim()
              .slice(0, 300)
          : "",
    },
  };
}

export async function analyzePhotoVision(
  ai: Ai,
  input: {
    bytes: ArrayBuffer;
    mimeType: string;
    caption?:
      string | null;
  },
) {
  const image =
    `data:${input.mimeType};base64,` +
    arrayBufferToBase64(
      input.bytes,
    );

  const question = `
Analyze the actual visual content of this image.

IMPORTANT:
Every JSON value must contain observations from THIS IMAGE.
Do not copy field descriptions or instructions into the output.
If something is not visible, use an empty array or empty string.
Do not invent information outside the image.

Do not:
- identify or guess the real identity of any person;
- infer occupation, ethnicity, health, personality, or other hidden traits;
- infer relationship quality from one photo;
- invent events that are not visibly supported.

Return valid JSON only, using exactly these keys:

{
  "caption": "",
  "scene": "",
  "activities": [],
  "objects": [],
  "semanticTags": [],
  "visualMood": {
    "tones": [],
    "atmosphere": ""
  }
}

Field requirements:
- caption: one concrete Chinese sentence describing what is visibly happening.
- scene: short Chinese scene category, such as 餐厅、街道、家中、展览、自然景观.
- activities: visible actions only.
- objects: important visible objects, food, animals, architecture, artworks, signs, etc.
- semanticTags: concise Chinese tags useful for future album search and aggregation.
- visualMood.tones: visual qualities only, such as 明亮、安静、热闹、温暖.
- visualMood.atmosphere: one short Chinese sentence about the visible atmosphere.

${input.caption
  ? `User-provided photo caption for additional context: ${input.caption}`
  : ""}

Again: inspect the image first, then fill the JSON with actual observations.
`.trim();

  const response =
    await ai.run(
      PHOTO_VISION_MODEL,
      {
        task: "query",
        image,
        question,

        reasoning:
          false,

        temperature:
          0.1,

        max_tokens:
          1500,

        stream:
          false,
      },
    ) as unknown;

  const wrapped =
    response &&
    typeof response === "object"
      ? response as {
          answer?:
            string | null;

          result?: {
            answer?:
              string | null;
          };
        }
      : {};

  const answer =
    (
      wrapped.result?.answer ??
      wrapped.answer
    )?.trim();

  if (!answer) {
    console.error(
      "Photo vision response without answer",
      JSON.stringify(
        response,
      ).slice(0, 2000),
    );

    throw new Error(
      "Vision 模型没有返回分析内容",
    );
  }

  return {
    analysis:
      parsePhotoVisionAnalysis(
        answer,
      ),

    model:
      PHOTO_VISION_MODEL,
  };
}

export const PHOTO_VISION_QWEN_MODEL =
  "@cf/qwen/qwen3.8-27b";

export async function analyzePhotoVisionQwen(
  ai: Ai,
  input: {
    bytes: ArrayBuffer;
    mimeType: string;
    caption?:
      string | null;
  },
) {
  const image =
    `data:${input.mimeType};base64,` +
    arrayBufferToBase64(
      input.bytes,
    );

  const instruction = `
请分析这张照片的实际画面内容。

所有输出文字必须使用简体中文。
不要输出英文标签。
不要识别或猜测人物真实身份，不推断职业、民族、健康、人格或关系质量。
只描述画面中有明确依据的信息。

请严格输出以下 JSON：

{
  "caption": "",
  "scene": "",
  "activities": [],
  "objects": [],
  "semanticTags": [],
  "visualMood": {
    "tones": [],
    "atmosphere": ""
  }
}

要求：
- caption：一句具体、自然的中文画面描述；
- scene：简短中文场景类别；
- activities：明确可见的活动；
- objects：有信息价值的主要物体、食物、建筑、展品等；
- semanticTags：适合未来相簿检索和统计的中文标签；
- visualMood.tones：只写画面的视觉气质；
- visualMood.atmosphere：一句中文视觉氛围说明；
- 看不出来的内容留空，不要猜测；
- scene 和 semanticTags 只能写画面有明确视觉依据的内容；
- 不要仅凭氛围猜测时间、地点或消费场景，例如“夜宵”“大排档”“旅行”；
- 如果无法确认具体食材或物体类别，使用更宽泛但可靠的名称；
- semanticTags 优先保留可用于长期统计的稳定概念，最多 10 个。
${input.caption
  ? `照片主人填写的文字：${input.caption}`
  : ""}
`.trim();

  const raw =
    await ai.run(
      PHOTO_VISION_QWEN_MODEL,
      {
        messages: [
          {
            role: "user",
            content: [
              {
                type:
                  "image_url",

                image_url: {
                  url:
                    image,
                },
              },
              {
                type:
                  "text",

                text:
                  instruction,
              },
            ],
          },
        ],

        reasoning_effort:
          "low",

        response_format: {
          type:
            "json_object",
        },

        temperature:
          0.1,

        max_tokens:
          1500,

        stream:
          false,
      },
    ) as unknown;

  const wrapped =
    raw &&
    typeof raw === "object"
      ? raw as {
          choices?: Array<{
            message?: {
              content?:
                string | null;
            };
          }>;

          result?: {
            choices?: Array<{
              message?: {
                content?:
                  string | null;
              };
            }>;
          };
        }
      : {};

  const content =
    (
      wrapped.result
        ?.choices?.[0]
        ?.message
        ?.content ??
      wrapped
        .choices?.[0]
        ?.message
        ?.content
    )?.trim();

  if (!content) {
    console.error(
      "Qwen vision response without content",
      JSON.stringify(
        raw,
      ).slice(0, 2000),
    );

    throw new Error(
      "Qwen Vision 没有返回分析内容",
    );
  }

  return {
    analysis:
      parsePhotoVisionAnalysis(
        content,
      ),

    model:
      PHOTO_VISION_QWEN_MODEL,
  };
}

