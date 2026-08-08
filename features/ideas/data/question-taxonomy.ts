import type {
  IdeaCategory,
  IdeaForm,
} from "../types/idea";

export const IDEA_CATEGORY_LABELS: Record<
  IdeaCategory,
  string
> = {
  relationship: "关系",
  daily_life: "生活",
  emotion: "情感",
  memory: "回忆",
  future: "未来",
  work: "工作",
  study: "学习",
  friends: "朋友",
  family: "家庭",
  pets: "宠物",
  travel: "旅行",
  food: "食物",
  literature: "文学",
  film: "电影",
  music: "音乐",
  games: "游戏",
  aesthetics: "审美",
  imagination: "想象",
};

export const IDEA_FORM_LABELS: Record<
  IdeaForm,
  string
> = {
  describe: "描述",
  recall: "回忆",
  imagine: "想象",
  explain: "说明",
  compare: "对比",
  recommend: "推荐",
  choose: "选择",
  predict: "预测",
  hypothetical: "假设",
};

/**
 * 第一批题库目标：108 题。
 *
 * 不是要求每个主题机械地平均出现，
 * 而是给关系、生活、情感、回忆等高价值主题
 * 稍高的出现权重。
 */
export const IDEA_CATEGORY_TARGETS:
  Record<IdeaCategory, number> = {
  relationship: 10,
  daily_life: 9,
  emotion: 9,
  memory: 8,
  future: 8,

  work: 5,
  study: 5,
  friends: 6,
  family: 5,
  pets: 4,

  travel: 6,
  food: 6,

  literature: 4,
  film: 4,
  music: 4,
  games: 4,

  aesthetics: 5,
  imagination: 6,
};

/**
 * 深浅题比例。
 *
 * 1：轻松、低压力
 * 2：日常偏好
 * 3：个人经历与理解
 * 4：较深的关系与价值观
 * 5：高亲密度、需要认真思考
 *
 * 第一批刻意减少 Level 5，
 * 避免每天都像在进行关系审讯。
 */
export const IDEA_INTIMACY_TARGETS = {
  1: 22,
  2: 28,
  3: 28,
  4: 20,
  5: 10,
} as const;

/**
 * 随机抽取时后续遵循的基础规则。
 */
export const IDEA_ROTATION_RULES = {
  repeatWindowDays: 90,
  avoidSameCategoryDays: 2,
  avoidSameFormDays: 1,

  intimacyPattern: [
    1,
    2,
    3,
    2,
    4,
    1,
    3,
    2,
    5,
  ],
} as const;
