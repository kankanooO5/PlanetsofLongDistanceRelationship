PRAGMA foreign_keys = ON;

-- =========================================================
-- Relationship timezone
-- 每段关系共用一个日期边界，避免异地双方进入不同“今天”
-- 现有关系先使用 Asia/Shanghai，后续可在设置中修改。
-- =========================================================

ALTER TABLE relationships
ADD COLUMN timezone TEXT NOT NULL DEFAULT 'Asia/Shanghai';


-- =========================================================
-- Idea question bank
-- =========================================================

CREATE TABLE idea_questions (
  id TEXT PRIMARY KEY,

  question_text TEXT NOT NULL
    CHECK (
      length(trim(question_text)) > 0
      AND length(question_text) <= 500
    ),

  category TEXT NOT NULL,

  form TEXT NOT NULL
    CHECK (
      form IN (
        'describe',
        'recall',
        'imagine',
        'explain',
        'compare',
        'recommend',
        'choose',
        'predict',
        'hypothetical'
      )
    ),

  intimacy_level INTEGER NOT NULL
    CHECK (
      intimacy_level >= 1
      AND intimacy_level <= 5
    ),

  tags TEXT NOT NULL DEFAULT '[]',

  enabled INTEGER NOT NULL DEFAULT 1
    CHECK (enabled IN (0, 1)),

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idea_questions_enabled_idx
  ON idea_questions(
    enabled,
    intimacy_level
  );

CREATE INDEX idea_questions_category_idx
  ON idea_questions(
    category,
    enabled
  );


-- =========================================================
-- Daily question
--
-- 一段关系在一个 local_date 只能对应一道题。
-- local_date 使用关系 timezone 计算，格式 YYYY-MM-DD。
-- =========================================================

CREATE TABLE idea_daily_questions (
  id TEXT PRIMARY KEY,

  relationship_id TEXT NOT NULL,

  question_id TEXT NOT NULL,

  local_date TEXT NOT NULL
    CHECK (length(local_date) = 10),

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (relationship_id)
    REFERENCES relationships(id)
    ON DELETE CASCADE,

  FOREIGN KEY (question_id)
    REFERENCES idea_questions(id)
    ON DELETE RESTRICT,

  UNIQUE (
    relationship_id,
    local_date
  )
);

CREATE INDEX idea_daily_relationship_date_idx
  ON idea_daily_questions(
    relationship_id,
    local_date DESC
  );

CREATE INDEX idea_daily_question_idx
  ON idea_daily_questions(
    question_id
  );


-- =========================================================
-- Answers
--
-- 一个成员对一道每日问题只能拥有一份回答。
-- 重新提交使用 UPDATE，不新增第二行。
-- =========================================================

CREATE TABLE idea_answers (
  id TEXT PRIMARY KEY,

  daily_question_id TEXT NOT NULL,

  relationship_id TEXT NOT NULL,

  member_id TEXT NOT NULL,

  body TEXT NOT NULL
    CHECK (
      length(trim(body)) > 0
      AND length(body) <= 1000
    ),

  submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (daily_question_id)
    REFERENCES idea_daily_questions(id)
    ON DELETE CASCADE,

  FOREIGN KEY (relationship_id)
    REFERENCES relationships(id)
    ON DELETE CASCADE,

  FOREIGN KEY (member_id)
    REFERENCES relationship_members(id)
    ON DELETE CASCADE,

  UNIQUE (
    daily_question_id,
    member_id
  )
);

CREATE INDEX idea_answers_daily_idx
  ON idea_answers(
    daily_question_id,
    submitted_at
  );

CREATE INDEX idea_answers_relationship_idx
  ON idea_answers(
    relationship_id,
    submitted_at DESC
  );

CREATE INDEX idea_answers_member_idx
  ON idea_answers(
    member_id,
    submitted_at DESC
  );


-- =========================================================
-- AI analysis
--
-- 当前一天只保存一份“最新解析”。
-- source_version 用于判断双方修改回答后，旧解析是否已经失效。
-- V1 可以完全不使用这张表。
-- =========================================================

CREATE TABLE idea_analyses (
  id TEXT PRIMARY KEY,

  daily_question_id TEXT NOT NULL UNIQUE,

  relationship_id TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (
      status IN (
        'pending',
        'ready',
        'failed'
      )
    ),

  analysis_json TEXT,

  source_version TEXT,

  model TEXT,

  error_message TEXT,

  generated_at TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (daily_question_id)
    REFERENCES idea_daily_questions(id)
    ON DELETE CASCADE,

  FOREIGN KEY (relationship_id)
    REFERENCES relationships(id)
    ON DELETE CASCADE
);

CREATE INDEX idea_analyses_relationship_idx
  ON idea_analyses(
    relationship_id,
    created_at DESC
  );
