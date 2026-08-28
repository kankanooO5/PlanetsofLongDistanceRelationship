PRAGMA foreign_keys = ON;


/*
  =========================================================
  1. 单张照片 AI 视觉理解
  =========================================================
*/

CREATE TABLE photo_ai_insights (
  id TEXT PRIMARY KEY,

  photo_id TEXT NOT NULL UNIQUE,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (
      status IN (
        'pending',
        'ready',
        'failed'
      )
    ),

  caption TEXT,

  scene TEXT,

  activities_json TEXT NOT NULL DEFAULT '[]',

  objects_json TEXT NOT NULL DEFAULT '[]',

  semantic_tags_json TEXT NOT NULL DEFAULT '[]',

  visual_mood_json TEXT NOT NULL DEFAULT '{}',

  confidence_json TEXT NOT NULL DEFAULT '{}',

  source_version TEXT,

  model TEXT,

  error_message TEXT,

  analyzed_at TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (photo_id)
    REFERENCES photos(id)
    ON DELETE CASCADE
);

CREATE INDEX photo_ai_insights_status_idx
  ON photo_ai_insights(status);

CREATE INDEX photo_ai_insights_analyzed_idx
  ON photo_ai_insights(analyzed_at);


/*
  =========================================================
  2. 单条照片留言的语义理解
  =========================================================
*/

CREATE TABLE photo_comment_insights (
  id TEXT PRIMARY KEY,

  comment_id TEXT NOT NULL UNIQUE,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (
      status IN (
        'pending',
        'ready',
        'failed'
      )
    ),

  keywords_json TEXT NOT NULL DEFAULT '[]',

  themes_json TEXT NOT NULL DEFAULT '[]',

  interaction_signals_json TEXT NOT NULL DEFAULT '[]',

  sentiment_json TEXT NOT NULL DEFAULT '{}',

  source_version TEXT,

  model TEXT,

  error_message TEXT,

  analyzed_at TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (comment_id)
    REFERENCES photo_comments(id)
    ON DELETE CASCADE
);

CREATE INDEX photo_comment_insights_status_idx
  ON photo_comment_insights(status);

CREATE INDEX photo_comment_insights_analyzed_idx
  ON photo_comment_insights(analyzed_at);


/*
  =========================================================
  3. 周报 / 月报固定快照
  =========================================================
*/

CREATE TABLE album_period_reports (
  id TEXT PRIMARY KEY,

  relationship_id TEXT NOT NULL,

  period_type TEXT NOT NULL
    CHECK (
      period_type IN (
        'week',
        'month'
      )
    ),

  period_start TEXT NOT NULL,

  period_end TEXT NOT NULL,

  cutoff_at TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (
      status IN (
        'pending',
        'ready',
        'failed'
      )
    ),

  source_version TEXT NOT NULL,

  stats_json TEXT NOT NULL DEFAULT '{}',

  themes_json TEXT NOT NULL DEFAULT '{}',

  interaction_json TEXT NOT NULL DEFAULT '{}',

  keywords_json TEXT NOT NULL DEFAULT '{}',

  narrative_json TEXT NOT NULL DEFAULT '{}',

  model TEXT,

  error_message TEXT,

  generated_at TEXT,

  published_at TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (relationship_id)
    REFERENCES relationships(id)
    ON DELETE CASCADE,

  UNIQUE (
    relationship_id,
    period_type,
    period_start,
    period_end
  )
);

CREATE INDEX album_period_reports_relationship_idx
  ON album_period_reports(
    relationship_id,
    period_type,
    period_end DESC
  );

CREATE INDEX album_period_reports_publish_idx
  ON album_period_reports(
    status,
    published_at
  );


/*
  =========================================================
  4. 每份报告到底用了哪些源数据

  source_type 不做 CHECK。
  以后可以自然加入：
  photo
  photo_comment
  photo_ai_insight
  photo_comment_insight
  idea_answer
  idea_signal
  ...
  =========================================================
*/

CREATE TABLE album_period_report_sources (
  id TEXT PRIMARY KEY,

  report_id TEXT NOT NULL,

  source_type TEXT NOT NULL,

  source_id TEXT NOT NULL,

  source_version TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (report_id)
    REFERENCES album_period_reports(id)
    ON DELETE CASCADE,

  UNIQUE (
    report_id,
    source_type,
    source_id
  )
);

CREATE INDEX album_period_report_sources_report_idx
  ON album_period_report_sources(report_id);

CREATE INDEX album_period_report_sources_source_idx
  ON album_period_report_sources(
    source_type,
    source_id
  );


/*
  =========================================================
  5. 通用 Relationship Evidence 桥接层

  不修改现有 idea_insight_evidence。

  Album / 周报 / 月报产生的证据
  可以通过这里支持或反驳已有 hypothesis。

  source_type 同样保持开放，
  为未来更多数据源留空间。
  =========================================================
*/

CREATE TABLE relationship_insight_evidence (
  id TEXT PRIMARY KEY,

  hypothesis_id TEXT NOT NULL,

  relationship_id TEXT NOT NULL,

  source_type TEXT NOT NULL,

  source_id TEXT NOT NULL,

  direction TEXT NOT NULL
    CHECK (
      direction IN (
        'support',
        'contradict',
        'neutral'
      )
    ),

  strength REAL NOT NULL DEFAULT 0.5
    CHECK (
      strength >= 0
      AND strength <= 1
    ),

  evidence_text TEXT NOT NULL
    CHECK (
      length(trim(evidence_text)) > 0
      AND length(evidence_text) <= 2000
    ),

  metadata_json TEXT NOT NULL DEFAULT '{}',

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (hypothesis_id)
    REFERENCES idea_insight_hypotheses(id)
    ON DELETE CASCADE,

  FOREIGN KEY (relationship_id)
    REFERENCES relationships(id)
    ON DELETE CASCADE,

  UNIQUE (
    hypothesis_id,
    source_type,
    source_id
  )
);

CREATE INDEX relationship_insight_evidence_hypothesis_idx
  ON relationship_insight_evidence(hypothesis_id);

CREATE INDEX relationship_insight_evidence_relationship_idx
  ON relationship_insight_evidence(
    relationship_id,
    created_at DESC
  );

CREATE INDEX relationship_insight_evidence_source_idx
  ON relationship_insight_evidence(
    source_type,
    source_id
  );
