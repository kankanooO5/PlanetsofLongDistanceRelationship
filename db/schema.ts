import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const coupleSettings = sqliteTable("couple_settings", {
  id: integer("id").primaryKey(),
  startDate: text("start_date").notNull(),
  nextMeeting: text("next_meeting").notNull(),
  firstName: text("first_name").notNull(),
  secondName: text("second_name").notNull(),
});

export const photos = sqliteTable(
  "photos",
  {
    id: text("id").primaryKey(),
    relationshipId: text("relationship_id").notNull(),
    uploadedByMemberId: text(
      "uploaded_by_member_id",
    ).notNull(),
    objectKey: text("object_key").notNull(),
    thumbnailObjectKey: text("thumbnail_object_key"),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    caption: text("caption").notNull().default(""),
    takenAt: text("taken_at").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default("CURRENT_TIMESTAMP"),
  },
  (table) => [
    uniqueIndex("photos_object_key_idx").on(
      table.objectKey,
    ),
    uniqueIndex("photos_thumbnail_object_key_idx").on(
      table.thumbnailObjectKey,
    ),
    index("photos_relationship_taken_idx").on(
      table.relationshipId,
      table.takenAt,
      table.createdAt,
    ),
    index("photos_relationship_created_idx").on(
      table.relationshipId,
      table.createdAt,
    ),
    index("photos_uploader_idx").on(
      table.uploadedByMemberId,
    ),
  ],
);


// =========================================================
// Relationships
// =========================================================

export const relationships = sqliteTable(
  "relationships",
  {
    id: text("id").primaryKey(),
    startDate: text("start_date").notNull(),
    nextMeeting: text("next_meeting").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default("CURRENT_TIMESTAMP"),
    timezone: text("timezone")
      .notNull()
      .default("Asia/Shanghai"),
  },
);


// =========================================================
// Relationship members
// =========================================================

export const relationshipMembers = sqliteTable(
  "relationship_members",
  {
    id: text("id").primaryKey(),
    relationshipId: text("relationship_id").notNull(),
    role: text("role").notNull(),
    displayName: text("display_name").notNull(),
    deviceId: text("device_id"),
    userId: text("user_id"),
    joinedAt: text("joined_at")
      .notNull()
      .default("CURRENT_TIMESTAMP"),
    memberTokenHash: text("member_token_hash"),
  },
  (table) => [
    uniqueIndex("relationship_members_relationship_role_idx").on(
      table.relationshipId,
      table.role,
    ),
    uniqueIndex("relationship_members_token_hash_idx").on(
      table.memberTokenHash,
    ),
  ],
);


// =========================================================
// 妙想 · 问题题库
// =========================================================

export const ideaQuestions = sqliteTable(
  "idea_questions",
  {
    id: text("id").primaryKey(),
    questionText: text("question_text").notNull(),
    category: text("category").notNull(),
    form: text("form").notNull(),
    intimacyLevel: integer("intimacy_level").notNull(),
    tags: text("tags").notNull().default("[]"),
    enabled: integer("enabled").notNull().default(1),
    createdAt: text("created_at")
      .notNull()
      .default("CURRENT_TIMESTAMP"),
  },
  (table) => [
    index("idea_questions_enabled_idx").on(
      table.enabled,
      table.intimacyLevel,
    ),
    index("idea_questions_category_idx").on(
      table.category,
      table.enabled,
    ),
  ],
);


// =========================================================
// 妙想 · 每日问题
// =========================================================

export const ideaDailyQuestions = sqliteTable(
  "idea_daily_questions",
  {
    id: text("id").primaryKey(),
    relationshipId: text("relationship_id").notNull(),
    questionId: text("question_id").notNull(),
    localDate: text("local_date").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default("CURRENT_TIMESTAMP"),
  },
  (table) => [
    uniqueIndex("idea_daily_relationship_date_unique_idx").on(
      table.relationshipId,
      table.localDate,
    ),
    index("idea_daily_relationship_date_idx").on(
      table.relationshipId,
      table.localDate,
    ),
    index("idea_daily_question_idx").on(
      table.questionId,
    ),
  ],
);


// =========================================================
// 妙想 · 回答
// =========================================================

export const ideaAnswers = sqliteTable(
  "idea_answers",
  {
    id: text("id").primaryKey(),
    dailyQuestionId: text("daily_question_id").notNull(),
    relationshipId: text("relationship_id").notNull(),
    memberId: text("member_id").notNull(),
    body: text("body").notNull(),
    submittedAt: text("submitted_at")
      .notNull()
      .default("CURRENT_TIMESTAMP"),
    updatedAt: text("updated_at")
      .notNull()
      .default("CURRENT_TIMESTAMP"),
  },
  (table) => [
    uniqueIndex("idea_answers_daily_member_unique_idx").on(
      table.dailyQuestionId,
      table.memberId,
    ),
    index("idea_answers_daily_idx").on(
      table.dailyQuestionId,
      table.submittedAt,
    ),
    index("idea_answers_relationship_idx").on(
      table.relationshipId,
      table.submittedAt,
    ),
    index("idea_answers_member_idx").on(
      table.memberId,
      table.submittedAt,
    ),
  ],
);


// =========================================================
// 妙想 · AI 双人解析
// =========================================================

export const ideaAnalyses = sqliteTable(
  "idea_analyses",
  {
    id: text("id").primaryKey(),
    dailyQuestionId: text("daily_question_id").notNull(),
    relationshipId: text("relationship_id").notNull(),
    status: text("status").notNull().default("pending"),
    analysisJson: text("analysis_json"),
    sourceVersion: text("source_version"),
    model: text("model"),
    errorMessage: text("error_message"),
    generatedAt: text("generated_at"),
    createdAt: text("created_at")
      .notNull()
      .default("CURRENT_TIMESTAMP"),
    updatedAt: text("updated_at")
      .notNull()
      .default("CURRENT_TIMESTAMP"),
  },
  (table) => [
    uniqueIndex("idea_analyses_daily_unique_idx").on(
      table.dailyQuestionId,
    ),
    index("idea_analyses_relationship_idx").on(
      table.relationshipId,
      table.createdAt,
    ),
  ],
);


// =========================================================
// 妙想 · 可修正洞察假设
// =========================================================

export const ideaInsightHypotheses = sqliteTable(
  "idea_insight_hypotheses",
  {
    id: text("id").primaryKey(),

    relationshipId:
      text("relationship_id").notNull(),

    subjectType:
      text("subject_type").notNull(),

    subjectMemberId:
      text("subject_member_id"),

    dimension:
      text("dimension").notNull(),

    hypothesisText:
      text("hypothesis_text").notNull(),

    confidence:
      real("confidence")
        .notNull()
        .default(0.25),

    supportCount:
      integer("support_count")
        .notNull()
        .default(0),

    contradictionCount:
      integer("contradiction_count")
        .notNull()
        .default(0),

    status:
      text("status")
        .notNull()
        .default("candidate"),

    firstSeenAt:
      text("first_seen_at")
        .notNull()
        .default("CURRENT_TIMESTAMP"),

    lastSeenAt:
      text("last_seen_at")
        .notNull()
        .default("CURRENT_TIMESTAMP"),

    createdAt:
      text("created_at")
        .notNull()
        .default("CURRENT_TIMESTAMP"),

    updatedAt:
      text("updated_at")
        .notNull()
        .default("CURRENT_TIMESTAMP"),
  },
  (table) => [
    index(
      "idea_insight_hypotheses_relationship_idx",
    ).on(
      table.relationshipId,
      table.status,
      table.confidence,
    ),

    index(
      "idea_insight_hypotheses_member_idx",
    ).on(
      table.subjectMemberId,
      table.status,
    ),

    index(
      "idea_insight_hypotheses_dimension_idx",
    ).on(
      table.relationshipId,
      table.dimension,
    ),
  ],
);


// =========================================================
// 妙想 · 洞察证据
// =========================================================

export const ideaInsightEvidence = sqliteTable(
  "idea_insight_evidence",
  {
    id: text("id").primaryKey(),

    hypothesisId:
      text("hypothesis_id").notNull(),

    relationshipId:
      text("relationship_id").notNull(),

    dailyQuestionId:
      text("daily_question_id").notNull(),

    evidenceType:
      text("evidence_type").notNull(),

    direction:
      text("direction").notNull(),

    strength:
      text("strength")
        .notNull()
        .default("weak"),

    evidenceText:
      text("evidence_text").notNull(),

    createdAt:
      text("created_at")
        .notNull()
        .default("CURRENT_TIMESTAMP"),
  },
  (table) => [
    index(
      "idea_insight_evidence_hypothesis_idx",
    ).on(
      table.hypothesisId,
      table.createdAt,
    ),

    index(
      "idea_insight_evidence_daily_idx",
    ).on(
      table.dailyQuestionId,
    ),

    index(
      "idea_insight_evidence_relationship_idx",
    ).on(
      table.relationshipId,
      table.createdAt,
    ),
  ],
);


// =========================================================
// 妙想 · 洞察线索
//
// Signal 只记录观察事实，
// 不承担人格或心理解释。
// =========================================================

export const ideaInsightSignals = sqliteTable(
  "idea_insight_signals",
  {
    id: text("id").primaryKey(),

    relationshipId:
      text("relationship_id").notNull(),

    dailyQuestionId:
      text("daily_question_id").notNull(),

    subjectType:
      text("subject_type").notNull(),

    subjectMemberId:
      text("subject_member_id"),

    signalType:
      text("signal_type").notNull(),

    signalText:
      text("signal_text").notNull(),

    sourceExcerpt:
      text("source_excerpt"),

    salience:
      text("salience")
        .notNull()
        .default("medium"),

    fingerprint:
      text("fingerprint")
        .notNull()
        .unique(),

    createdAt:
      text("created_at")
        .notNull()
        .default("CURRENT_TIMESTAMP"),
  },
  (table) => [
    index(
      "idea_insight_signals_relationship_idx",
    ).on(
      table.relationshipId,
      table.createdAt,
    ),

    index(
      "idea_insight_signals_daily_idx",
    ).on(
      table.dailyQuestionId,
      table.createdAt,
    ),

    index(
      "idea_insight_signals_member_idx",
    ).on(
      table.subjectMemberId,
      table.createdAt,
    ),

    index(
      "idea_insight_signals_type_idx",
    ).on(
      table.relationshipId,
      table.signalType,
      table.createdAt,
    ),
  ],
);
