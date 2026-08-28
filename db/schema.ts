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


// =========================================================
// Notifications · Push subscriptions
// =========================================================

export const pushSubscriptions = sqliteTable(
  "push_subscriptions",
  {
    id: text("id").primaryKey(),

    memberId:
      text("member_id").notNull(),

    endpoint:
      text("endpoint").notNull(),

    p256dh:
      text("p256dh").notNull(),

    auth:
      text("auth").notNull(),

    userAgent:
      text("user_agent"),

    createdAt:
      text("created_at")
        .notNull()
        .default("CURRENT_TIMESTAMP"),

    lastSeenAt:
      text("last_seen_at")
        .notNull()
        .default("CURRENT_TIMESTAMP"),

    revokedAt:
      text("revoked_at"),
  },
  (table) => [
    uniqueIndex(
      "push_subscriptions_endpoint_unique_idx",
    ).on(
      table.endpoint,
    ),

    index(
      "push_subscriptions_member_active_idx",
    ).on(
      table.memberId,
      table.revokedAt,
    ),
  ],
);


// =========================================================
// Notifications · Preferences
// =========================================================

export const notificationPreferences = sqliteTable(
  "notification_preferences",
  {
    id: text("id").primaryKey(),

    memberId:
      text("member_id").notNull(),

    eventType:
      text("event_type").notNull(),

    enabled:
      integer("enabled")
        .notNull()
        .default(1),

    previewMode:
      text("preview_mode")
        .notNull()
        .default("full"),

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
    uniqueIndex(
      "notification_preferences_member_event_unique_idx",
    ).on(
      table.memberId,
      table.eventType,
    ),

    index(
      "notification_preferences_member_idx",
    ).on(
      table.memberId,
      table.enabled,
    ),
  ],
);


// =========================================================
// Notifications · Events
// =========================================================

export const notificationEvents = sqliteTable(
  "notification_events",
  {
    id: text("id").primaryKey(),

    relationshipId:
      text("relationship_id"),

    actorMemberId:
      text("actor_member_id"),

    targetMemberId:
      text("target_member_id").notNull(),

    eventType:
      text("event_type").notNull(),

    title:
      text("title").notNull(),

    body:
      text("body").notNull(),

    deepLink:
      text("deep_link"),

    payloadJson:
      text("payload_json")
        .notNull()
        .default("{}"),

    dedupeKey:
      text("dedupe_key"),

    createdAt:
      text("created_at")
        .notNull()
        .default("CURRENT_TIMESTAMP"),

    readAt:
      text("read_at"),
  },
  (table) => [
    uniqueIndex(
      "notification_events_dedupe_unique_idx",
    ).on(
      table.dedupeKey,
    ),

    index(
      "notification_events_target_created_idx",
    ).on(
      table.targetMemberId,
      table.createdAt,
    ),

    index(
      "notification_events_target_unread_idx",
    ).on(
      table.targetMemberId,
      table.readAt,
      table.createdAt,
    ),

    index(
      "notification_events_relationship_idx",
    ).on(
      table.relationshipId,
      table.createdAt,
    ),

    index(
      "notification_events_type_idx",
    ).on(
      table.eventType,
      table.createdAt,
    ),
  ],
);


// =========================================================
// Notifications · Deliveries
// =========================================================

export const notificationDeliveries = sqliteTable(
  "notification_deliveries",
  {
    id: text("id").primaryKey(),

    eventId:
      text("event_id").notNull(),

    subscriptionId:
      text("subscription_id").notNull(),

    status:
      text("status")
        .notNull()
        .default("pending"),

    attemptedAt:
      text("attempted_at"),

    sentAt:
      text("sent_at"),

    errorMessage:
      text("error_message"),

    createdAt:
      text("created_at")
        .notNull()
        .default("CURRENT_TIMESTAMP"),
  },
  (table) => [
    uniqueIndex(
      "notification_deliveries_event_subscription_unique_idx",
    ).on(
      table.eventId,
      table.subscriptionId,
    ),

    index(
      "notification_deliveries_status_idx",
    ).on(
      table.status,
      table.createdAt,
    ),

    index(
      "notification_deliveries_subscription_idx",
    ).on(
      table.subscriptionId,
      table.createdAt,
    ),
  ],
);
// =========================================================
// Album Insights · Photo AI
// =========================================================

export const photoAiInsights = sqliteTable(
  "photo_ai_insights",
  {
    id: text("id").primaryKey(),

    photoId:
      text("photo_id").notNull(),

    status:
      text("status")
        .notNull()
        .default("pending"),

    caption:
      text("caption"),

    scene:
      text("scene"),

    activitiesJson:
      text("activities_json")
        .notNull()
        .default("[]"),

    objectsJson:
      text("objects_json")
        .notNull()
        .default("[]"),

    semanticTagsJson:
      text("semantic_tags_json")
        .notNull()
        .default("[]"),

    visualMoodJson:
      text("visual_mood_json")
        .notNull()
        .default("{}"),

    confidenceJson:
      text("confidence_json")
        .notNull()
        .default("{}"),

    sourceVersion:
      text("source_version"),

    model:
      text("model"),

    errorMessage:
      text("error_message"),

    analyzedAt:
      text("analyzed_at"),

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
    uniqueIndex(
      "photo_ai_insights_photo_unique_idx",
    ).on(
      table.photoId,
    ),

    index(
      "photo_ai_insights_status_idx",
    ).on(
      table.status,
    ),

    index(
      "photo_ai_insights_analyzed_idx",
    ).on(
      table.analyzedAt,
    ),
  ],
);


// =========================================================
// Album Insights · Photo Comment AI
// =========================================================

export const photoCommentInsights = sqliteTable(
  "photo_comment_insights",
  {
    id: text("id").primaryKey(),

    commentId:
      text("comment_id").notNull(),

    status:
      text("status")
        .notNull()
        .default("pending"),

    keywordsJson:
      text("keywords_json")
        .notNull()
        .default("[]"),

    themesJson:
      text("themes_json")
        .notNull()
        .default("[]"),

    interactionSignalsJson:
      text("interaction_signals_json")
        .notNull()
        .default("[]"),

    sentimentJson:
      text("sentiment_json")
        .notNull()
        .default("{}"),

    sourceVersion:
      text("source_version"),

    model:
      text("model"),

    errorMessage:
      text("error_message"),

    analyzedAt:
      text("analyzed_at"),

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
    uniqueIndex(
      "photo_comment_insights_comment_unique_idx",
    ).on(
      table.commentId,
    ),

    index(
      "photo_comment_insights_status_idx",
    ).on(
      table.status,
    ),

    index(
      "photo_comment_insights_analyzed_idx",
    ).on(
      table.analyzedAt,
    ),
  ],
);


// =========================================================
// Album Insights · Period Reports
// =========================================================

export const albumPeriodReports = sqliteTable(
  "album_period_reports",
  {
    id: text("id").primaryKey(),

    relationshipId:
      text("relationship_id").notNull(),

    periodType:
      text("period_type").notNull(),

    periodStart:
      text("period_start").notNull(),

    periodEnd:
      text("period_end").notNull(),

    cutoffAt:
      text("cutoff_at").notNull(),

    status:
      text("status")
        .notNull()
        .default("pending"),

    sourceVersion:
      text("source_version").notNull(),

    statsJson:
      text("stats_json")
        .notNull()
        .default("{}"),

    themesJson:
      text("themes_json")
        .notNull()
        .default("{}"),

    interactionJson:
      text("interaction_json")
        .notNull()
        .default("{}"),

    keywordsJson:
      text("keywords_json")
        .notNull()
        .default("{}"),

    narrativeJson:
      text("narrative_json")
        .notNull()
        .default("{}"),

    model:
      text("model"),

    errorMessage:
      text("error_message"),

    generatedAt:
      text("generated_at"),

    publishedAt:
      text("published_at"),

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
    uniqueIndex(
      "album_period_reports_period_unique_idx",
    ).on(
      table.relationshipId,
      table.periodType,
      table.periodStart,
      table.periodEnd,
    ),

    index(
      "album_period_reports_relationship_idx",
    ).on(
      table.relationshipId,
      table.periodType,
      table.periodEnd.desc(),
    ),

    index(
      "album_period_reports_publish_idx",
    ).on(
      table.status,
      table.publishedAt,
    ),
  ],
);


// =========================================================
// Album Insights · Period Report Sources
// =========================================================

export const albumPeriodReportSources = sqliteTable(
  "album_period_report_sources",
  {
    id: text("id").primaryKey(),

    reportId:
      text("report_id").notNull(),

    sourceType:
      text("source_type").notNull(),

    sourceId:
      text("source_id").notNull(),

    sourceVersion:
      text("source_version"),

    createdAt:
      text("created_at")
        .notNull()
        .default("CURRENT_TIMESTAMP"),
  },
  (table) => [
    uniqueIndex(
      "album_period_report_sources_unique_idx",
    ).on(
      table.reportId,
      table.sourceType,
      table.sourceId,
    ),

    index(
      "album_period_report_sources_report_idx",
    ).on(
      table.reportId,
    ),

    index(
      "album_period_report_sources_source_idx",
    ).on(
      table.sourceType,
      table.sourceId,
    ),
  ],
);


// =========================================================
// Relationship Insights · General Evidence Bridge
// =========================================================

export const relationshipInsightEvidence = sqliteTable(
  "relationship_insight_evidence",
  {
    id: text("id").primaryKey(),

    hypothesisId:
      text("hypothesis_id").notNull(),

    relationshipId:
      text("relationship_id").notNull(),

    sourceType:
      text("source_type").notNull(),

    sourceId:
      text("source_id").notNull(),

    direction:
      text("direction").notNull(),

    strength:
      real("strength")
        .notNull()
        .default(0.5),

    evidenceText:
      text("evidence_text").notNull(),

    metadataJson:
      text("metadata_json")
        .notNull()
        .default("{}"),

    createdAt:
      text("created_at")
        .notNull()
        .default("CURRENT_TIMESTAMP"),
  },
  (table) => [
    uniqueIndex(
      "relationship_insight_evidence_source_unique_idx",
    ).on(
      table.hypothesisId,
      table.sourceType,
      table.sourceId,
    ),

    index(
      "relationship_insight_evidence_hypothesis_idx",
    ).on(
      table.hypothesisId,
    ),

    index(
      "relationship_insight_evidence_relationship_idx",
    ).on(
      table.relationshipId,
      table.createdAt.desc(),
    ),

    index(
      "relationship_insight_evidence_source_idx",
    ).on(
      table.sourceType,
      table.sourceId,
    ),
  ],
);
