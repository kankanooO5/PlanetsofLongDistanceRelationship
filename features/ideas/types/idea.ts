export const IDEA_CATEGORIES = [
  "relationship",
  "daily_life",
  "emotion",
  "memory",
  "future",
  "work",
  "study",
  "friends",
  "family",
  "pets",
  "travel",
  "food",
  "literature",
  "film",
  "music",
  "games",
  "aesthetics",
  "imagination",
] as const;

export type IdeaCategory =
  (typeof IDEA_CATEGORIES)[number];

export const IDEA_FORMS = [
  "describe",
  "recall",
  "imagine",
  "explain",
  "compare",
  "recommend",
  "choose",
  "predict",
  "hypothetical",
] as const;

export type IdeaForm =
  (typeof IDEA_FORMS)[number];

export type IdeaIntimacyLevel =
  | 1
  | 2
  | 3
  | 4
  | 5;

export type IdeaQuestionSeed = {
  id: string;
  text: string;
  category: IdeaCategory;
  form: IdeaForm;
  intimacyLevel: IdeaIntimacyLevel;
  tags: string[];
};
