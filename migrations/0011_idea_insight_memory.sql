PRAGMA foreign_keys = ON;

-- =========================================================
-- 妙想 · 可修正洞察假设
--
-- 不保存固定人格标签。
-- 每条记录代表一个仍然可以被未来证据支持、削弱或推翻的解释。
-- =========================================================

CREATE TABLE idea_insight_hypotheses (
  id TEXT PRIMARY KEY,

  relationship_id TEXT NOT NULL,

  -- member：主要描述某一成员
  -- relationship：描述两个人之间的互动模式
  subject_type TEXT NOT NULL
    CHECK (
      subject_type IN (
        'member',
        'relationship'
      )
    ),

  -- subject_type = member 时填写；
  -- relationship 时允许为空。
  subject_member_id TEXT,

  -- 例如：
  -- narrative_tension
  -- memory_return
  -- relational_flow
  -- intimacy_expression
  -- aesthetic_preference
  -- value_orientation
  dimension TEXT NOT NULL,

  -- 必须是一条“可修正的解释”，而不是定论。
  hypothesis_text TEXT NOT NULL
    CHECK (
      length(trim(hypothesis_text)) > 0
      AND length(hypothesis_text) <= 1000
    ),

  -- 0 ~ 1，仅用于内部排序。
  -- 新候选通常从较低值开始。
  confidence REAL NOT NULL DEFAULT 0.25
    CHECK (
      confidence >= 0
      AND confidence <= 1
    ),

  support_count INTEGER NOT NULL DEFAULT 0
    CHECK (support_count >= 0),

  contradiction_count INTEGER NOT NULL DEFAULT 0
    CHECK (contradiction_count >= 0),

  -- candidate：刚出现，证据不足
  -- emerging：出现了一些重复证据
  -- established：多个独立回答稳定支持
  -- weakened：出现明显反证
  -- retired：已经不再采用
  status TEXT NOT NULL DEFAULT 'candidate'
    CHECK (
      status IN (
        'candidate',
        'emerging',
        'established',
        'weakened',
        'retired'
      )
    ),

  first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (relationship_id)
    REFERENCES relationships(id)
    ON DELETE CASCADE,

  FOREIGN KEY (subject_member_id)
    REFERENCES relationship_members(id)
    ON DELETE CASCADE
);


CREATE INDEX idea_insight_hypotheses_relationship_idx
  ON idea_insight_hypotheses(
    relationship_id,
    status,
    confidence DESC
  );

CREATE INDEX idea_insight_hypotheses_member_idx
  ON idea_insight_hypotheses(
    subject_member_id,
    status
  );

CREATE INDEX idea_insight_hypotheses_dimension_idx
  ON idea_insight_hypotheses(
    relationship_id,
    dimension
  );


-- =========================================================
-- 妙想 · 洞察证据
--
-- 每条 evidence 必须回到真实妙想记录。
-- 同一条历史回答既可以支持，也可以反驳旧假设。
-- =========================================================

CREATE TABLE idea_insight_evidence (
  id TEXT PRIMARY KEY,

  hypothesis_id TEXT NOT NULL,

  relationship_id TEXT NOT NULL,

  daily_question_id TEXT NOT NULL,

  -- direct_answer：
  --   用户直接表达
  --
  -- entity_semantics：
  --   作品、人物、地点等文化语义辅助
  --
  -- relational_action：
  --   推荐、记住、回应、重新提起等关系动作
  --
  -- repeated_pattern：
  --   多次回答共同形成的模式
  evidence_type TEXT NOT NULL
    CHECK (
      evidence_type IN (
        'direct_answer',
        'entity_semantics',
        'relational_action',
        'repeated_pattern'
      )
    ),

  direction TEXT NOT NULL
    CHECK (
      direction IN (
        'support',
        'contradict',
        'neutral'
      )
    ),

  strength TEXT NOT NULL DEFAULT 'weak'
    CHECK (
      strength IN (
        'weak',
        'medium',
        'strong'
      )
    ),

  evidence_text TEXT NOT NULL
    CHECK (
      length(trim(evidence_text)) > 0
      AND length(evidence_text) <= 1500
    ),

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (hypothesis_id)
    REFERENCES idea_insight_hypotheses(id)
    ON DELETE CASCADE,

  FOREIGN KEY (relationship_id)
    REFERENCES relationships(id)
    ON DELETE CASCADE,

  FOREIGN KEY (daily_question_id)
    REFERENCES idea_daily_questions(id)
    ON DELETE CASCADE
);


CREATE INDEX idea_insight_evidence_hypothesis_idx
  ON idea_insight_evidence(
    hypothesis_id,
    created_at DESC
  );

CREATE INDEX idea_insight_evidence_daily_idx
  ON idea_insight_evidence(
    daily_question_id
  );

CREATE INDEX idea_insight_evidence_relationship_idx
  ON idea_insight_evidence(
    relationship_id,
    created_at DESC
  );
