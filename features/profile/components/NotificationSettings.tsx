"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  loadNotificationPreferences,
  updateNotificationPreference,
  type NotificationPreferenceEventType,
} from "../../../lib/api/notification-preferences";

import {
  enablePush,
  getPushStatus,
  type PushClientStatus,
} from "../../../lib/api/push-client";

type NotificationSettingsProps = {
  onBack: () => void;
};

const ITEMS: Array<{
  eventType: NotificationPreferenceEventType;
  title: string;
}> = [
  {
    eventType:
      "photo_uploaded",
    title:
      "新照片",
  },
  {
    eventType:
      "photo_comment_added",
    title:
      "照片留言",
  },
  {
    eventType:
      "idea_answer_submitted",
    title:
      "妙想回答",
  },
  {
    eventType:
      "idea_analysis_ready",
    title:
      "双人解析",
  },
];

export function NotificationSettings({
  onBack,
}: NotificationSettingsProps) {
  const [
    pushStatus,
    setPushStatus,
  ] =
    useState<PushClientStatus>(
      "checking",
    );

  const [
    preferences,
    setPreferences,
  ] = useState<
    Record<
      NotificationPreferenceEventType,
      boolean
    >
  >({
    photo_uploaded: true,
    photo_comment_added: true,
    idea_answer_submitted: true,
    idea_analysis_ready: true,
  });

  const [
    loadingPreferences,
    setLoadingPreferences,
  ] = useState(true);

  const [
    pending,
    setPending,
  ] = useState<
    Set<NotificationPreferenceEventType>
  >(
    new Set(),
  );

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    enabling,
    setEnabling,
  ] = useState(false);

  const [
    testing,
    setTesting,
  ] = useState(false);


  useEffect(() => {
    let disposed = false;

    void Promise.all([
      getPushStatus(),
      loadNotificationPreferences(),
    ])
      .then(
        ([
          status,
          loadedPreferences,
        ]) => {
          if (disposed) {
            return;
          }

          setPushStatus(status);

          setPreferences(
            (current) => {
              const next = {
                ...current,
              };

              for (
                const item
                of loadedPreferences
              ) {
                next[
                  item.eventType
                ] =
                  item.enabled;
              }

              return next;
            },
          );
        },
      )
      .catch((reason) => {
        if (disposed) {
          return;
        }

        setMessage(
          reason instanceof Error
            ? reason.message
            : "暂时无法读取通知设置",
        );
      })
      .finally(() => {
        if (!disposed) {
          setLoadingPreferences(
            false,
          );
        }
      });

    return () => {
      disposed = true;
    };
  }, []);

  async function handleEnablePush() {
    setEnabling(true);
    setMessage("");

    try {
      await enablePush();

      setPushStatus(
        "enabled",
      );

      setMessage(
        "这台设备已经可以收到星球来信 ✦",
      );
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "暂时无法开启通知",
      );

      const nextStatus =
        await getPushStatus()
          .catch(
            () =>
              "unsupported" as const,
          );

      setPushStatus(nextStatus);
    } finally {
      setEnabling(false);
    }
  }

  async function handleToggle(
    eventType:
      NotificationPreferenceEventType,
  ) {
    if (
      pending.has(
        eventType,
      )
    ) {
      return;
    }

    const previous =
      preferences[eventType];

    const next =
      !previous;

    // 乐观更新：
    // 手指点击后立即滑动，不等待网络。
    setPreferences(
      (current) => ({
        ...current,
        [eventType]:
          next,
      }),
    );

    setPending(
      (current) => {
        const updated =
          new Set(current);

        updated.add(
          eventType,
        );

        return updated;
      },
    );

    setMessage("");

    try {
      await updateNotificationPreference(
        eventType,
        next,
      );
    } catch (reason) {
      // 保存失败才回弹。
      setPreferences(
        (current) => ({
          ...current,
          [eventType]:
            previous,
        }),
      );

      setMessage(
        reason instanceof Error
          ? reason.message
          : "暂时无法保存通知设置",
      );
    } finally {
      setPending(
        (current) => {
          const updated =
            new Set(current);

          updated.delete(
            eventType,
          );

          return updated;
        },
      );
    }
  }


  return (
    <div className="notification-settings-view">
      <header className="topbar notification-settings-topbar">
        <button
          type="button"
          className="notification-settings-back"
          onClick={onBack}
          aria-label="返回我的"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M15 4L7 12L15 20"
            />
          </svg>
        </button>

        <h1>通知</h1>
      </header>

      <section className="content tab-page notification-settings-page">
        <section className="notification-settings-system-card">
          <div>
            <p className="notification-settings-system-label">
              星球来信
            </p>

            <p className="notification-settings-system-copy">
              {pushStatus ===
              "enabled"
                ? "这台设备已允许两颗星球发送通知"
                : pushStatus ===
                    "blocked"
                  ? "系统通知权限已关闭"
                  : pushStatus ===
                      "needs-install"
                    ? "请先将两颗星球添加到主屏幕"
                    : pushStatus ===
                        "unsupported"
                      ? "当前设备暂不支持系统通知"
                      : pushStatus ===
                          "checking"
                        ? "正在检查通知状态"
                        : "这台设备尚未开启通知"}
            </p>
          </div>

          <span
            className={`notification-settings-system-dot ${
              pushStatus ===
              "enabled"
                ? "is-on"
                : ""
            }`}
            aria-hidden="true"
          />
        </section>

        {pushStatus ===
        "disabled" ? (
          <button
            type="button"
            className="profile-notification-button"
            disabled={enabling}
            onClick={() => {
              void handleEnablePush();
            }}
          >
            {enabling
              ? "正在开启…"
              : "开启星球来信"}
          </button>
        ) : null}

        {pushStatus ===
        "blocked" ? (
          <p className="notification-settings-note">
            请前往设备系统设置，重新允许“两颗星球”发送通知。
          </p>
        ) : null}

        {pushStatus ===
        "needs-install" ? (
          <p className="notification-settings-note">
            在 iPhone 上，请先从 Safari 将“两颗星球”添加到主屏幕，再从主屏幕打开。
          </p>
        ) : null}

        <div className="notification-settings-section-heading">
          <p>来自另一颗星球</p>
        </div>

        <section
          className={`notification-settings-list ${
            loadingPreferences
              ? "is-loading"
              : ""
          }`}
        >
          {ITEMS.map(
            (item) => {
              const enabled =
                preferences[
                  item.eventType
                ];

              const saving =
                pending.has(
                  item.eventType,
                );

              return (
                <div
                  className="notification-settings-row"
                  key={
                    item.eventType
                  }
                >
                  <div className="notification-settings-row-copy">
                    <strong>
                      {item.title}
                    </strong>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={
                      enabled
                    }
                    aria-label={`${item.title}${
                      enabled
                        ? "已开启"
                        : "已关闭"
                    }`}
                    className={`notification-switch ${
                      enabled
                        ? "is-on"
                        : ""
                    } ${
                      saving
                        ? "is-saving"
                        : ""
                    }`}
                    onClick={() => {
                      void handleToggle(
                        item.eventType,
                      );
                    }}
                  >
                    <span
                      className="notification-switch-thumb"
                      aria-hidden="true"
                    />
                  </button>
                </div>
              );
            },
          )}
        </section>

        {message ? (
          <p className="notification-settings-message">
            {message}
          </p>
        ) : null}

      </section>
    </div>
  );
}
