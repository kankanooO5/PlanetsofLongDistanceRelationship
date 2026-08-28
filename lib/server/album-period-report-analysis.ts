import {
  callDeepSeekJson,
} from "./deepseek-json";

export const ALBUM_REPORT_MODEL =
  "deepseek-v4-flash";

export const ALBUM_REPORT_PIPELINE_VERSION =
  "album-period-report-v10";

export type AlbumReportNarrative = {
  title: string;

  opening: string;

  statsNarrative: string;

  highlights: Array<{
    emoji: string;
    title: string;
    text: string;

    sourcePhotoIds: string[];
    sourceCommentIds: string[];
  }>;

  languageAndEmotion: {
    emotionKeywords: string[];

    memberStyles: Array<{
      displayName: string;
      styles: string[];
    }>;

    sharedTone: string[];

    narrative: string;
  };

  playfulObservations: Array<{
    emoji: string;
    text: string;

    sourcePhotoIds: string[];
    sourceCommentIds: string[];
  }>;

  seasonalNote: string;

  closing: string;
};

export type AlbumReportAnalysisInput = {
  periodType:
    | "week"
    | "month";

  periodStart: string;
  periodEnd: string;

  stats: unknown;
  commentSummary: unknown;
  photoSummary: unknown;
  sourceMoments: unknown;
  seasonalContext: unknown;
  languageSummary: unknown;
  languageStyleSummary: unknown;
  emotionSummary: unknown;
  lifeThemeSummary: unknown;
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

function stringArray(
  value: unknown,
  limit: number,
) {
  return Array.isArray(value)
    ? value
        .filter(
          (
            item,
          ): item is string =>
            typeof item ===
            "string",
        )
        .map(
          (item) =>
            item.trim(),
        )
        .filter(Boolean)
        .slice(
          0,
          limit,
        )
    : [];
}

export function parseAlbumReportNarrative(
  value: string,
): AlbumReportNarrative {
  let raw: unknown;

  try {
    raw =
      JSON.parse(value);
  } catch {
    throw new Error(
      "相簿报告不是合法 JSON",
    );
  }

  if (
    !raw ||
    typeof raw !== "object"
  ) {
    throw new Error(
      "相簿报告格式错误",
    );
  }

  const source =
    raw as Record<
      string,
      unknown
    >;

  const highlights =
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
              const value =
                item as Record<
                  string,
                  unknown
                >;

              return {
                emoji:
                  text(
                    value.emoji,
                    8,
                  ),

                title:
                  text(
                    value.title,
                    80,
                  ),

                text:
                  text(
                    value.text,
                    700,
                  ),

                sourcePhotoIds:
                  stringArray(
                    value.sourcePhotoIds,
                    12,
                  ),

                sourceCommentIds:
                  stringArray(
                    value.sourceCommentIds,
                    20,
                  ),
              };
            },
          )
          .filter(
            (item) =>
              item.title &&
              item.text,
          )
          .slice(0, 6)
      : [];

  const playfulObservations =
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
              const value =
                item as Record<
                  string,
                  unknown
                >;

              return {
                emoji:
                  text(
                    value.emoji,
                    8,
                  ),

                text:
                  text(
                    value.text,
                    400,
                  ),

                sourcePhotoIds:
                  stringArray(
                    value.sourcePhotoIds,
                    12,
                  ),

                sourceCommentIds:
                  stringArray(
                    value.sourceCommentIds,
                    20,
                  ),
              };
            },
          )
          .filter(
            (item) =>
              item.text,
          )
          .slice(0, 2)
      : [];

  return {
    title:
      text(
        source.title,
        100,
      ),

    opening:
      text(
        source.opening,
        1000,
      ),

    statsNarrative:
      text(
        source.statsNarrative,
        1000,
      ),

    highlights,

    languageAndEmotion: (() => {
      const raw =
        source.languageAndEmotion &&
        typeof source.languageAndEmotion ===
          "object"
          ? source.languageAndEmotion as Record<
              string,
              unknown
            >
          : {};

      const memberStyles =
        Array.isArray(
          raw.memberStyles,
        )
          ? raw.memberStyles
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

                  return {
                    displayName:
                      text(
                        member.displayName,
                        80,
                      ),

                    styles:
                      Array.isArray(
                        member.styles,
                      )
                        ? member.styles
                            .filter(
                              (
                                style,
                              ): style is string =>
                                typeof style ===
                                "string",
                            )
                            .map(
                              (style) =>
                                style
                                  .trim()
                                  .slice(
                                    0,
                                    30,
                                  ),
                            )
                            .filter(
                              Boolean,
                            )
                            .slice(
                              0,
                              4,
                            )
                        : [],
                  };
                },
              )
              .filter(
                (member) =>
                  member.displayName,
              )
          : [];

      return {
        emotionKeywords:
          Array.isArray(
            raw.emotionKeywords,
          )
            ? raw.emotionKeywords
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
                        20,
                      ),
                )
                .filter(
                  Boolean,
                )
                .slice(
                  0,
                  8,
                )
            : [],

        memberStyles,

        sharedTone:
          Array.isArray(
            raw.sharedTone,
          )
            ? raw.sharedTone
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
                .filter(
                  Boolean,
                )
                .slice(
                  0,
                  4,
                )
            : [],

        narrative:
          text(
            raw.narrative,
            1000,
          ),
      };
    })(),

    playfulObservations,

    seasonalNote:
      text(
        source.seasonalNote,
        800,
      ),

    closing:
      text(
        source.closing,
        600,
      ),
  };
}

export async function generateAlbumPeriodReport(
  apiKey: string,
  input:
    AlbumReportAnalysisInput,
) {
  const isWeek =
    input.periodType ===
    "week";

  const systemInstruction = `
你负责撰写情侣共享相簿里的“星球周记 / 星球月记”。

这不是数据分析报告，也不是心理分析。
它应该像两颗相隔很远的星球共同保存的一页生活回忆：
温馨、亲切、活泼、有一点俏皮，也可以偶尔有一点诗意。

底层数据必须真实，但表达方式可以有想象力。

例如数字可以写成：
- “本周两颗星球之间一共传送了 8 段影像电波。”
- “这个月相簿接住了 23 个生活瞬间。”
- “5 条留言落在 3 张照片下面。”
- “还有一些空空的留言栏，也安安静静地陪这些照片待在相簿里。”

允许有轻微文学性留白，例如：
“那些没有留言的照片里，说不定也藏着一些不用说出口的默契。”

但必须区分：
- 事实：可以直接陈述；
- 文学表达：可以柔软联想，但不能伪装成事实；
- 轻猜测：必须使用问句、“好像”“是不是”“也许”等保留语气。

特别适合出现的内容：

一、固定数据叙事
每期都要自然写到一些核心数字，但不要像报表：
- 照片总数；
- 双方分别上传多少；
- 留言数；
- 有留言的照片数量或留言覆盖率；
- 活跃天数等值得提及时可以写。

二、本期高光
从当期数据里自己挑 2-5 个真正有意思的主题。
每期不需要固定栏目。

lifeThemeSummary 是经过逐图分类后程序统计出的真实生活主题。
其中：
- themes 表示整个周期各生活主题出现于多少张照片；
- members 表示两颗星球各自在记录什么；
- sharedThemes 表示双方本周期都出现过的主题；
- sourceAssignments 可以核对某个主题具体来自哪些照片。

可以根据这些事实进行更活泼的文学表达，例如：
- 美食饮品占比较高时：“这周的星球好像有点馋。”
- 可爱小物重复出现时：“毛茸茸居民最近有点多。”
- 双方都出现美食饮品时：“两颗星球这周倒是在吃吃喝喝上达成了某种默契。”

这些文学表达只属于本期周记/月记，不代表长期偏好或真实关系推断。

高光可以来自：
- 美食；
- 游戏；
- 可爱小物；
- 文化艺术；
- 空间与风景；
- 某个反复出镜的物体；
- 某种视觉气质；
- 留言中的玩笑、欣赏、关心；
- 某个人这一期特别常记录的东西；
- 双方共同出现的生活主题；
- 意外的小发现；
- 其他当期真正值得说的内容。

三、两颗星球的语言与情感
这一部分是每期固定存在的轻量模块，对应最终 JSON 的 languageAndEmotion。

它不是心理分析，而是回答三个很生活化的问题：
- 这期文字里主要呈现出了哪些情绪？
- 两个人这期分别更像怎样在说话？
- 两颗星球放在一起，形成了怎样的交流气质？

languageSummary 提供确定性事实：
- 高频词；
- 共同使用的词；
- emoji；
- 双方文字量及基础表达指标。

languageStyleSummary 提供本周期表达气质：
- 例如幽默、直率、温柔、安静、抽象、跳脱、简练、细腻、调侃等；
- 这些只代表本周期文本表现，不代表人格定论。

emotionSummary 提供本周期真实文字中可观察到的情绪色彩，例如：
- 欣赏；
- 轻松；
- 开心；
- 温柔；
- 想念；
- 调侃；
- 惊喜；
- 期待等。

这些词描述的是“文字呈现出来的情绪”，不是作者真实心理状态。
如果样本很少，不要硬总结所谓“本周主情绪”。

emotionSummary.sourceEmotions 将情绪绑定到了具体真实文字。
当你要说“某一条 caption / 留言呈现出开心、满足、调侃”等具体情绪时，
只能使用与那条文字完全对应的 sourceEmotions。
不得把 A 的情绪标签借给 B，也不得把周期聚合情绪套到某一张照片上。

commentSummary 更偏向留言互动：
- 主题；
- 欣赏、玩笑、关心、支持、共同回忆等互动信号。

可以自然写成：
- “这周两颗星球说话都挺俏皮，短短几句话里已经藏了不少玩笑。”
- “yy 这周的表达更跳脱一点，ww 则常常用很短的话直接接住。”
- “这个月反复出现的词是‘小熊’和‘好吃’，最近是不是都被软乎乎和香喷喷的东西包围了？”

生成 languageAndEmotion 时：

1. emotionKeywords 只从 emotionSummary 中选择有实际证据的 0-8 个情感关键词。
2. memberStyles 只使用 languageStyleSummary 中已经存在的本期风格，不要自行新增人格标签。
3. sharedTone 使用 languageStyleSummary.sharedTone 中有证据的交流气质。
4. narrative 才负责把这些内容写成自然、温馨、活泼的一小段。
5. narrative 不要写成“yy：简练 80%，ww：回应型 60%”这种分析报告。
6. 可以引用当期真实词汇作为例子，例如“软fufu”“呀米呀米”，让文字更有生活感。
7. 不得把“本期表达气质”写成人格定论。
8. 如果文字样本很少，不要为了填满而硬总结。emotionKeywords / memberStyles / sharedTone 可以为空，但 narrative 仍然保留一句很轻的表达，例如：
   “这周两颗星球更习惯用照片说话，留下来的文字还不多。”
9. 如果有足够素材，可以写成类似：
   “这周留下来的话都短短的，却有不少情绪藏在里面。yy 的表达更活泼一点，‘软fufu’和表情让文字显得很轻；ww 则更直接，‘呀米呀米’和‘厉害！’几乎一句就把反应送到了另一颗星球。”
10. 不要求每期语言模块篇幅一样，周报轻一些，月报可以更丰富。

四、轻松的小发现
允许输出 0-2 条 playfulObservations。

例如：
- “炸鸡这周已经出现三次了，yy 最近是不是很容易被香香的东西收买？”
- “小熊最近的出镜率有点高，是不是悄悄成了这颗星球的新居民？”

这种内容不能写成稳定人格或长期偏好。
只能是基于当期重复事实产生的轻猜测。

五、时间感
如果输入中提供了 seasonalContext，
并且它与照片内容确实能形成自然呼应，
可以写一小段 seasonalNote。

例如：
“处暑刚过，夏天已经走到后半程。照片里却还是暖暖的：烧烤、黄灯和大片绿色。”

不要为了完成栏目强行写节气。
没有自然联系时 seasonalNote 可以为空。

事实边界：
1. 不诊断人格、依恋类型或心理状态。
2. 不根据照片数量判断谁更爱谁。
3. 不把上传量、留言量包装成关系评分。
4. 不把一次行为写成长期稳定特征。
5. 没有跨周期比较数据时，不得说“越来越”“比上周更多”“有所下降”等。
6. 具体照片、留言和动作优先依据 sourceMoments。
7. stats / commentSummary / photoSummary 用于周期层面的统计和模式归纳。
8. 可以有适度文学性，但不能虚构关键事实。
9. playful observation 必须用保留语气，不得写成确定结论。
10. 全部使用自然简体中文。
11. 不需要把所有输入信息都写进去，宁可挑真正有趣的。
12. 不要机械重复“本周”“这一周”，语言可以自然变化。
13. 对无法从上下文确定含义的缩写、代号、英文简称或自造词，例如“lkwg”，不得自行翻译、扩写或解释其意思；可以原样提及，也可以略过。
14. “是不是最近喜欢……”“是不是成了新习惯……”之类 playful observation，必须至少有两个独立事实支持。只有一次出现时，不得使用“每次”“总是”“习惯”“经常”等泛化表达。
15. 文学性表达可以自由，但不能改变事实归属：谁说的话、谁表现出的情绪、哪张照片出现了什么，都不能串到另一个来源。
16. title 不得包含具体日期、日期范围或周次编号。周期日期会由界面单独展示，标题只负责表达本期气质。
17. 不得把一次出现写成“又”“越来越多”“常驻”“第二次”“最近经常”等趋势，除非输入中明确存在跨周期或重复次数证据。
18. 可以对已有事实做文学联想，但不能自行制造数量、时间、人物动作或具体事件。

${isWeek
  ? `
这是周报：
- 像一页轻巧的生活周记；
- 聚焦“这一周收集到了什么”；
- highlights 通常 2-4 条；
- playfulObservations 0-2 条；
- 整体不要太长。
`
  : `
这是月报：
- 比周报更完整；
- 可以寻找一个月里反复出现的生活母题；
- 可以观察双方记录内容和互动方式的重复模式；
- highlights 通常 3-6 条；
- playfulObservations 0-2 条；
- 如果输入包含跨周期比较数据，可以适度谈趋势，否则不要自行比较。
`}

证据引用要求：

每个 highlight 和 playfulObservation 除了用户可见文字之外，
还必须返回隐藏的 sourcePhotoIds 和 sourceCommentIds。

这些字段只用于后台事实校对，不会展示给用户。

规则：
1. 写到某一张具体照片时，必须把对应 photoId 放进 sourcePhotoIds。
2. 同一段综合了多张照片，就把所有相关 photoId 都放进去。
3. 引用、讨论或根据某条具体留言发挥时，把对应 commentId 放进 sourceCommentIds。
4. 只使用 sourceMoments 中真实存在的 ID。
5. 不得编造 ID。
6. 不要因为是文学表达就省略 evidence；只要文学表达建立在某张真实照片或留言上，就应该引用它。
7. 如果某个 playful observation 基于“某主题出现多次”，应引用支撑这个观察的相关照片。
8. sourcePhotoIds / sourceCommentIds 永远不要写进用户可见的 title 或 text。

严格返回 JSON：

{
  "title": "",
  "opening": "",
  "statsNarrative": "",
  "highlights": [
    {
      "emoji": "",
      "title": "",
      "text": "",
      "sourcePhotoIds": [],
      "sourceCommentIds": []
    }
  ],
  "languageAndEmotion": {
    "emotionKeywords": [],
    "memberStyles": [
      {
        "displayName": "",
        "styles": []
      }
    ],
    "sharedTone": [],
    "narrative": ""
  },
  "playfulObservations": [
    {
      "emoji": "",
      "text": "",
      "sourcePhotoIds": [],
      "sourceCommentIds": []
    }
  ],
  "seasonalNote": "",
  "closing": ""
}
`.trim();

  const payload = {
    period: {
      type:
        input.periodType,

      start:
        input.periodStart,

      end:
        input.periodEnd,
    },

    stats:
      input.stats,

    commentSummary:
      input.commentSummary,

    photoSummary:
      input.photoSummary,

    sourceMoments:
      input.sourceMoments,

    seasonalContext:
      input.seasonalContext,

    languageSummary:
      input.languageSummary,

    languageStyleSummary:
      input.languageStyleSummary,

    emotionSummary:
      input.emotionSummary,

    lifeThemeSummary:
      input.lifeThemeSummary,
  };

  const response =
    await callDeepSeekJson({
      apiKey,

      model:
        ALBUM_REPORT_MODEL,

      systemInstruction,

      input:
        JSON.stringify(
          payload,
          null,
          2,
        ),

      thinking:
        false,

      maxTokens:
        input.periodType ===
          "month"
          ? 5000
          : 3500,
    });

  const narrative =
    parseAlbumReportNarrative(
      response.content,
    );

  const emotionSource =
    input.emotionSummary &&
    typeof input.emotionSummary ===
      "object"
      ? input.emotionSummary as Record<
          string,
          unknown
        >
      : {};

  const emotionKeywords =
    Array.isArray(
      emotionSource.emotions,
    )
      ? emotionSource.emotions
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

              return typeof row.label ===
                "string"
                ? row.label.trim()
                : "";
            },
          )
          .filter(Boolean)
          .slice(0, 8)
      : [];

  const styleSource =
    input.languageStyleSummary &&
    typeof input.languageStyleSummary ===
      "object"
      ? input.languageStyleSummary as Record<
          string,
          unknown
        >
      : {};

  const memberStyles =
    Array.isArray(
      styleSource.members,
    )
      ? styleSource.members
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
                          const row =
                            style as Record<
                              string,
                              unknown
                            >;

                          return typeof row.label ===
                            "string"
                            ? row.label.trim()
                            : "";
                        },
                      )
                      .filter(Boolean)
                      .slice(0, 4)
                  : [];

              return {
                displayName:
                  typeof member.displayName ===
                    "string"
                    ? member.displayName.trim()
                    : "",

                styles,
              };
            },
          )
          .filter(
            (member) =>
              member.displayName,
          )
      : [];

  const sharedToneSource =
    styleSource.sharedTone &&
    typeof styleSource.sharedTone ===
      "object"
      ? styleSource.sharedTone as Record<
          string,
          unknown
        >
      : {};

  const sharedTone =
    Array.isArray(
      sharedToneSource.labels,
    )
      ? sharedToneSource.labels
          .filter(
            (
              item,
            ): item is string =>
              typeof item ===
              "string",
          )
          .map(
            (item) =>
              item.trim(),
          )
          .filter(Boolean)
          .slice(0, 4)
      : [];

  narrative.languageAndEmotion = {
    emotionKeywords,
    memberStyles,
    sharedTone,

    narrative:
      narrative.languageAndEmotion
        .narrative,
  };

  return {
    narrative,

    model:
      response.model,

    usage:
      response.usage,
  };
}
