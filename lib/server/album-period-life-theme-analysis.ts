import {
  callDeepSeekJson,
  DEEPSEEK_DEFAULT_MODEL,
} from "./deepseek-json";

import type {
  AlbumPeriodSourceMoments,
} from "./album-period-source-moments";

export const ALBUM_LIFE_THEME_MODEL =
  DEEPSEEK_DEFAULT_MODEL;

export const ALBUM_LIFE_THEME_PIPELINE_VERSION =
  "album-life-theme-v1";

const THEME_LABELS = [
  "美食饮品",
  "游戏娱乐",
  "可爱小物",
  "文化艺术",
  "空间建筑",
  "自然风景",
  "出行旅行",
  "学习工作",
  "居家生活",
  "穿搭购物",
  "运动健康",
  "宠物动物",
  "社交相聚",
  "纪念庆祝",
  "其他",
] as const;

type ThemeLabel =
  typeof THEME_LABELS[number];

type ThemeAssignment = {
  photoId: string;

  themes: Array<{
    label: ThemeLabel;
    confidence: number;
    detail: string;
  }>;
};

type ThemeCount = {
  label: ThemeLabel;
  count: number;
  photoRate: number;
};

export type AlbumPeriodLifeThemeSummary = {
  analysis: {
    totalPhotos: number;
    classifiedPhotos: number;
  };

  themes: ThemeCount[];

  sharedThemes: ThemeLabel[];

  members: Array<{
    memberId: string;
    role: "first" | "second";
    displayName: string;

    totalPhotos: number;

    themes: ThemeCount[];
  }>;

  sourceAssignments:
    ThemeAssignment[];
};

function round(
  value: number,
) {
  return Math.round(
    value * 100,
  ) / 100;
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
      round(value),
    ),
  );
}

function isThemeLabel(
  value: unknown,
): value is ThemeLabel {
  return (
    typeof value === "string" &&
    (
      THEME_LABELS as readonly string[]
    ).includes(value)
  );
}

function countThemes(
  assignments:
    ThemeAssignment[],
  denominator: number,
): ThemeCount[] {
  const counts =
    new Map<
      ThemeLabel,
      number
    >();

  for (
    const assignment
    of assignments
  ) {
    const unique =
      new Set(
        assignment.themes.map(
          (theme) =>
            theme.label,
        ),
      );

    for (
      const label
      of unique
    ) {
      counts.set(
        label,
        (
          counts.get(label) ??
          0
        ) + 1,
      );
    }
  }

  return Array.from(
    counts.entries(),
  )
    .map(
      ([label, count]) => ({
        label,
        count,

        photoRate:
          denominator
            ? round(
                count /
                  denominator,
              )
            : 0,
      }),
    )
    .sort(
      (a, b) =>
        b.count - a.count ||
        a.label.localeCompare(
          b.label,
          "zh-CN",
        ),
    );
}

export async function analyzeAlbumPeriodLifeThemes(
  apiKey: string,
  input: {
    periodType:
      | "week"
      | "month";

    sourceMoments:
      AlbumPeriodSourceMoments;
  },
) {
  const photos =
    input.sourceMoments
      .photos;

  if (!photos.length) {
    return {
      summary: {
        analysis: {
          totalPhotos: 0,
          classifiedPhotos: 0,
        },

        themes: [],
        sharedThemes: [],
        members: [],
        sourceAssignments: [],
      } satisfies AlbumPeriodLifeThemeSummary,

      model: null,
      usage: null,
    };
  }

  const response =
    await callDeepSeekJson({
      apiKey,

      model:
        ALBUM_LIFE_THEME_MODEL,

      thinking:
        false,

      systemInstruction: `
你负责把情侣共享相簿中的每张照片归入稳定的“生活主题”。

这些主题会被用于周/月统计和未来跨周期比较，因此分类必须稳定、克制。

只允许使用以下一级主题：

${THEME_LABELS.join("、")}

规则：

1. 每张照片选择 1-3 个真正相关的主题。
2. 优先少而准确，不要为了丰富而强行贴满三个。
3. 美食饮品：正餐、零食、烧烤、甜品、咖啡、奶茶、饮料等。
4. 游戏娱乐：电子游戏、桌游、游乐活动等。
5. 可爱小物：毛绒玩偶、挂件、收藏品、装饰小物等。
6. 文化艺术：艺术品、博物馆、展览、文化内容、艺术活动等。
7. 空间建筑：照片重点在室内设计、建筑、店铺空间或装饰环境本身。
8. 自然风景：天空、植物、山水、海边、自然景观等。
9. 出行旅行：必须有明确移动、旅行、景点、交通等证据，不能看到陌生环境就猜旅行。
10. 学习工作：学习、办公、课程、书籍、工作场景等。
11. 居家生活：明确的家庭、房间、家务、日常居住场景。
12. 穿搭购物：服饰、搭配、购买商品、逛店等。
13. 运动健康：运动、健身、身体活动等。
14. 宠物动物：真实动物或以动物为核心的内容；普通毛绒玩偶归“可爱小物”。
15. 社交相聚：必须有明确多人聚会、朋友家人互动等证据；单独一张食物照片不能推断聚餐。
16. 纪念庆祝：必须有生日、节日、纪念日、庆祝仪式等明确证据。
17. 如果无法可靠进入其他类别，再使用“其他”。
18. detail 用几个字描述该分类对应的具体内容，例如“烤串”“游戏截图”“毛绒小熊”。
19. caption、aiCaption、scene、semanticTags 都只是证据，不要补全照片之外的故事。
20. photoId 必须原样返回。
21. confidence 表示照片对分类的支持程度。
22. 全部使用简体中文。

严格返回 JSON：

{
  "items": [
    {
      "photoId": "",
      "themes": [
        {
          "label": "美食饮品",
          "confidence": 0.95,
          "detail": "烤串"
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

          photos:
            photos.map(
              (photo) => ({
                photoId:
                  photo.photoId,

                uploader:
                  photo.uploader
                    .displayName,

                userCaption:
                  photo.userCaption,

                aiCaption:
                  photo.aiCaption,

                scene:
                  photo.scene,

                semanticTags:
                  photo.semanticTags,
              }),
            ),
        }),

      maxTokens:
        input.periodType ===
          "month"
          ? 4000
          : 2800,
    });

  let parsed: unknown;

  try {
    parsed =
      JSON.parse(
        response.content,
      );
  } catch {
    throw new Error(
      "生活主题分析不是合法 JSON",
    );
  }

  const validPhotoIds =
    new Set(
      photos.map(
        (photo) =>
          photo.photoId,
      ),
    );

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

  const sourceAssignments:
    ThemeAssignment[] =
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

            const photoId =
              typeof row.photoId ===
                "string"
                ? row.photoId
                : "";

            const themes =
              Array.isArray(
                row.themes,
              )
                ? row.themes
                    .filter(
                      (theme) =>
                        theme &&
                        typeof theme ===
                          "object",
                    )
                    .map(
                      (theme) => {
                        const value =
                          theme as Record<
                            string,
                            unknown
                          >;

                        if (
                          !isThemeLabel(
                            value.label,
                          )
                        ) {
                          return null;
                        }

                        const confidence =
                          normalizeConfidence(
                            value.confidence,
                          );

                        if (
                          confidence <
                          0.6
                        ) {
                          return null;
                        }

                        return {
                          label:
                            value.label,

                          confidence,

                          detail:
                            typeof value.detail ===
                              "string"
                              ? value.detail
                                  .trim()
                                  .slice(
                                    0,
                                    80,
                                  )
                              : "",
                        };
                      },
                    )
                    .filter(
                      (
                        theme,
                      ): theme is NonNullable<
                        typeof theme
                      > =>
                        theme !==
                        null,
                    )
                    .slice(
                      0,
                      3,
                    )
                : [];

            return {
              photoId,
              themes,
            };
          },
        )
        .filter(
          (item) =>
            validPhotoIds.has(
              item.photoId,
            ) &&
            item.themes.length >
              0,
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
        photoIds: Set<string>;
      }
    >();

  for (
    const photo
    of photos
  ) {
    const current =
      memberGroups.get(
        photo.uploader
          .memberId,
      ) ?? {
        memberId:
          photo.uploader
            .memberId,

        role:
          photo.uploader
            .role,

        displayName:
          photo.uploader
            .displayName,

        photoIds:
          new Set<string>(),
      };

    current.photoIds.add(
      photo.photoId,
    );

    memberGroups.set(
      photo.uploader
        .memberId,
      current,
    );
  }

  const members =
    Array.from(
      memberGroups.values(),
    )
      .map(
        (member) => {
          const assignments =
            sourceAssignments
              .filter(
                (assignment) =>
                  member.photoIds
                    .has(
                      assignment
                        .photoId,
                    ),
              );

          return {
            memberId:
              member.memberId,

            role:
              member.role,

            displayName:
              member.displayName,

            totalPhotos:
              member.photoIds
                .size,

            themes:
              countThemes(
                assignments,
                member.photoIds
                  .size,
              ),
          };
        },
      )
      .sort(
        (a, b) =>
          a.role.localeCompare(
            b.role,
          ),
      );

  const sharedThemes =
    members.length >= 2
      ? members[0]
          .themes
          .map(
            (theme) =>
              theme.label,
          )
          .filter(
            (label) =>
              members
                .slice(1)
                .every(
                  (member) =>
                    member.themes
                      .some(
                        (theme) =>
                          theme.label ===
                          label,
                      ),
                ),
          )
      : [];

  const summary:
    AlbumPeriodLifeThemeSummary = {
      analysis: {
        totalPhotos:
          photos.length,

        classifiedPhotos:
          sourceAssignments
            .length,
      },

      themes:
        countThemes(
          sourceAssignments,
          photos.length,
        ),

      sharedThemes,

      members,

      sourceAssignments,
    };

  return {
    summary,

    model:
      response.model,

    usage:
      response.usage,
  };
}
