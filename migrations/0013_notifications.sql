PRAGMA foreign_keys = ON;

-- =========================================================
-- Notifications · Push subscriptions
--
-- 一个 member 可以拥有多个设备 / 浏览器订阅。
-- endpoint 唯一标识一个 Web Push subscription。
-- 失效订阅暂不物理删除，以便保留投递状态与排查记录。
-- =========================================================

CREATE TABLE push_subscriptions (
  id TEXT PRIMARY KEY,

  member_id TEXT NOT NULL,

  endpoint TEXT NOT NULL,

  p256dh TEXT NOT NULL,

  auth TEXT NOT NULL,

  user_agent TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  revoked_at TEXT,

  FOREIGN KEY (member_id)
    REFERENCES relationship_members(id)
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX push_subscriptions_endpoint_unique_idx
  ON push_subscriptions(endpoint);

CREATE INDEX push_subscriptions_member_active_idx
  ON push_subscriptions(
    member_id,
    revoked_at
  );


-- =========================================================
-- Notifications · Preferences
--
-- 不把 event_type 写死成 SQL enum：
-- 以后增加 message_received / anniversary /
-- custom_reminder 等类型无需改表结构。
--
-- 没有 preference 记录时，由应用层采用默认策略。
-- =========================================================

CREATE TABLE notification_preferences (
  id TEXT PRIMARY KEY,

  member_id TEXT NOT NULL,

  event_type TEXT NOT NULL,

  enabled INTEGER NOT NULL DEFAULT 1
    CHECK (enabled IN (0, 1)),

  -- full：
  --   锁屏允许显示具体通知内容
  --
  -- private：
  --   只显示类似「收到一条来自另一颗星球的新消息」
  preview_mode TEXT NOT NULL DEFAULT 'full'
    CHECK (
      preview_mode IN (
        'full',
        'private'
      )
    ),

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (member_id)
    REFERENCES relationship_members(id)
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX notification_preferences_member_event_unique_idx
  ON notification_preferences(
    member_id,
    event_type
  );

CREATE INDEX notification_preferences_member_idx
  ON notification_preferences(
    member_id,
    enabled
  );


-- =========================================================
-- Notifications · Events
--
-- 一条 event 代表「某个成员应该知道的一件事」。
--
-- relationship_id 可以为空：
-- 例如未来系统级 release_update。
--
-- actor_member_id 可以为空：
-- 例如系统提醒、版本更新。
--
-- target_member_id 始终存在：
-- 一条 event 对应一个接收成员。
--
-- payload_json 保存业务扩展字段，例如：
-- photoId / localDate / analysisId / releaseId 等。
-- =========================================================

CREATE TABLE notification_events (
  id TEXT PRIMARY KEY,

  relationship_id TEXT,

  actor_member_id TEXT,

  target_member_id TEXT NOT NULL,

  event_type TEXT NOT NULL,

  title TEXT NOT NULL,

  body TEXT NOT NULL,

  deep_link TEXT,

  payload_json TEXT NOT NULL DEFAULT '{}',

  -- 用于避免接口重试时重复创建同一业务通知。
  -- NULL 表示该事件不需要幂等去重。
  dedupe_key TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  read_at TEXT,

  FOREIGN KEY (relationship_id)
    REFERENCES relationships(id)
    ON DELETE CASCADE,

  FOREIGN KEY (actor_member_id)
    REFERENCES relationship_members(id)
    ON DELETE CASCADE,

  FOREIGN KEY (target_member_id)
    REFERENCES relationship_members(id)
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX notification_events_dedupe_unique_idx
  ON notification_events(dedupe_key);

CREATE INDEX notification_events_target_created_idx
  ON notification_events(
    target_member_id,
    created_at DESC
  );

CREATE INDEX notification_events_target_unread_idx
  ON notification_events(
    target_member_id,
    read_at,
    created_at DESC
  );

CREATE INDEX notification_events_relationship_idx
  ON notification_events(
    relationship_id,
    created_at DESC
  );

CREATE INDEX notification_events_type_idx
  ON notification_events(
    event_type,
    created_at DESC
  );


-- =========================================================
-- Notifications · Deliveries
--
-- event 是「要告诉用户什么」；
-- delivery 是「具体向哪个设备发送，结果如何」。
--
-- 一个 event 可以投递到同一成员的 iPhone、
-- iPad、Mac 等多个 subscription。
-- =========================================================

CREATE TABLE notification_deliveries (
  id TEXT PRIMARY KEY,

  event_id TEXT NOT NULL,

  subscription_id TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (
      status IN (
        'pending',
        'sent',
        'failed',
        'expired'
      )
    ),

  attempted_at TEXT,

  sent_at TEXT,

  error_message TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (event_id)
    REFERENCES notification_events(id)
    ON DELETE CASCADE,

  FOREIGN KEY (subscription_id)
    REFERENCES push_subscriptions(id)
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX notification_deliveries_event_subscription_unique_idx
  ON notification_deliveries(
    event_id,
    subscription_id
  );

CREATE INDEX notification_deliveries_status_idx
  ON notification_deliveries(
    status,
    created_at
  );

CREATE INDEX notification_deliveries_subscription_idx
  ON notification_deliveries(
    subscription_id,
    created_at DESC
  );
