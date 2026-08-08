PRAGMA foreign_keys = ON;

-- =========================================================
-- 妙想 · 洞察线索
--
-- Signal 只记录“观察到了什么”，
-- 不解释人格、心理原因或关系需求。
--
-- 多条 Signal 后续才可能形成 Hypothesis。
-- =========================================================

CREATE TABLE idea_insight_signals (
  id TEXT PRIMARY KEY,

  relationship_id TEXT NOT NULL,

  daily_question_id TEXT NOT NULL,

  -- member：主要来自某一个人的回答
  -- relationship：发生在两个人之间的互动事实
  subject_type TEXT NOT NULL
    CHECK (
      subject_type IN (
        'member',
        'relationship'
      )
    ),

  subject_member_id TEXT,

  -- 稳定的大类，避免模型每天发明新 taxonomy
  signal_type TEXT NOT NULL
    CHECK (
      signal_type IN (
        'direct_statement',
        'concrete_detail',
        'entity_reference',
        'relational_action',
        'memory_reference',
        'temporal_reference',
        'expression_pattern',
        'choice_pattern'
      )
    ),

  -- 中性观察：
  -- “回答里具体发生了什么”
  signal_text TEXT NOT NULL
    CHECK (
      length(trim(signal_text)) > 0
      AND length(signal_text) <= 1000
    ),

  -- 最接近原回答的证据片段。
  -- 可以为空，但不能编造。
  source_excerpt TEXT
    CHECK (
      source_excerpt IS NULL
      OR length(source_excerpt) <= 1000
    ),

  -- 只表示这条线索的信息密度，
  -- 不是心理置信度。
  salience TEXT NOT NULL DEFAULT 'medium'
    CHECK (
      salience IN (
        'low',
        'medium',
        'high'
      )
    ),

  -- 应用层计算，用于防止重新生成时重复写入。
  fingerprint TEXT NOT NULL UNIQUE,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (relationship_id)
    REFERENCES relationships(id)
    ON DELETE CASCADE,

  FOREIGN KEY (daily_question_id)
    REFERENCES idea_daily_questions(id)
    ON DELETE CASCADE,

  FOREIGN KEY (subject_member_id)
    REFERENCES relationship_members(id)
    ON DELETE CASCADE
);


CREATE INDEX idea_insight_signals_relationship_idx
  ON idea_insight_signals(
    relationship_id,
    created_at DESC
  );

CREATE INDEX idea_insight_signals_daily_idx
  ON idea_insight_signals(
    daily_question_id,
    created_at
  );

CREATE INDEX idea_insight_signals_member_idx
  ON idea_insight_signals(
    subject_member_id,
    created_at DESC
  );

CREATE INDEX idea_insight_signals_type_idx
  ON idea_insight_signals(
    relationship_id,
    signal_type,
    created_at DESC
  );
