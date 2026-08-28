"use client";

import {
  useEffect,
  useState,
} from "react";
import Link from "next/link";

import {
  enablePush,
  getPushStatus,
  sendTestPush,
  type PushClientStatus,
} from "../../../lib/api/push-client";

import type { CoupleSettings, Role } from "../../shared/types";

type ProfileTabProps = {
  settings: CoupleSettings;
  role: Role;
  onLogout: () => void;
};

export function ProfileTab({ settings, role, onLogout }: ProfileTabProps) {
  const currentName =
    role === "first" ? settings.firstName : settings.secondName;

  const [
    pushStatus,
    setPushStatus,
  ] = useState<PushClientStatus>(
    "checking",
  );

  const [
    pushMessage,
    setPushMessage,
  ] = useState("");

  const [
    enablingPush,
    setEnablingPush,
  ] = useState(false);

  const [
    sendingTestPush,
    setSendingTestPush,
  ] = useState(false);

  useEffect(() => {
    let disposed = false;

    void getPushStatus()
      .then((status) => {
        if (!disposed) {
          setPushStatus(status);
        }
      })
      .catch(() => {
        if (!disposed) {
          setPushStatus(
            "unsupported",
          );
        }
      });

    return () => {
      disposed = true;
    };
  }, []);

  async function handleEnablePush() {
    setEnablingPush(true);
    setPushMessage("");

    try {
      await enablePush();
      setPushStatus("enabled");
      setPushMessage(
        "这台设备已经可以收到星球来信 ✦",
      );
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : "暂时无法开启通知";

      setPushMessage(message);

      const nextStatus =
        await getPushStatus()
          .catch(
            () =>
              "unsupported" as const,
          );

      setPushStatus(nextStatus);
    } finally {
      setEnablingPush(false);
    }
  }

  async function handleSendTestPush() {
    setSendingTestPush(true);
    setPushMessage("");

    try {
      const result =
        await sendTestPush();

      setPushMessage(
        result.sent
          ? `测试来信已发出 ✦`
          : "通知没有成功送达，请稍后再试",
      );
    } catch (reason) {
      setPushMessage(
        reason instanceof Error
          ? reason.message
          : "测试通知发送失败",
      );
    } finally {
      setSendingTestPush(false);
    }
  }

  function handleLogout() {
    const confirmed = window.confirm(
      "退出后，这台设备将返回关系入口页。关系和另一台设备的数据不会被删除。",
    );

    if (!confirmed) return;

    onLogout();
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">OUR LITTLE UNIVERSE</p>

          <h1>我的</h1>
        </div>
      </header>

      <section className="content tab-page">
        <div className="profile-card">
          <div className="profile-avatar" aria-hidden="true">
            ✦
          </div>

          <div className="profile-card-copy">
            <p className="profile-card-label">CURRENT PLANET</p>

            <h2>{currentName}</h2>

            <p>这台设备已经绑定当前星球</p>
          </div>
        </div>

        <section className="profile-notification-card">
          <div className="profile-notification-copy">
            <div>
              <p className="profile-notification-eyebrow">
                PLANET MAIL
              </p>

              <h3>星球来信</h3>

              <p>
                不错过另一颗星球留下的新照片、留言和妙想。
              </p>
            </div>

            <span
              className={`profile-notification-status profile-notification-status-${pushStatus}`}
            >
              {pushStatus === "checking"
                ? "检查中"
                : pushStatus === "enabled"
                  ? "已开启"
                  : pushStatus === "blocked"
                    ? "已关闭"
                    : pushStatus === "needs-install"
                      ? "需安装"
                      : pushStatus === "unsupported"
                        ? "不支持"
                        : "尚未开启"}
            </span>
          </div>

          {pushStatus === "needs-install" ? (
            <p className="profile-notification-help">
              在 iPhone 上，请先从 Safari 将“两颗星球”添加到主屏幕，再从主屏幕打开。
            </p>
          ) : null}

          {pushStatus === "blocked" ? (
            <p className="profile-notification-help">
              系统已经关闭通知权限，请前往设备设置重新允许“两颗星球”发送通知。
            </p>
          ) : null}

          {pushMessage ? (
            <p className="profile-notification-message">
              {pushMessage}
            </p>
          ) : null}

          {pushStatus === "disabled" ? (
            <button
              type="button"
              className="profile-notification-button"
              disabled={enablingPush}
              onClick={() => {
                void handleEnablePush();
              }}
            >
              {enablingPush
                ? "正在连接小宇宙…"
                : "开启星球来信"}
            </button>
          ) : null}

          {pushStatus === "enabled" ? (
            <button
              type="button"
              className="profile-notification-test-button"
              disabled={sendingTestPush}
              onClick={() => {
                void handleSendTestPush();
              }}
            >
              {sendingTestPush
                ? "正在发送…"
                : "发送测试来信"}
            </button>
          ) : null}
        </section>

        <div className="profile-list">
          <Link href="/device-code?target=self" className="profile-list-item">
            <span>绑定我的另一台设备</span>
            <strong aria-hidden="true">›</strong>
          </Link>

          <Link
            href="/device-code?target=partner"
            className="profile-list-item"
          >
            <span>恢复另一颗星球</span>
            <strong aria-hidden="true">›</strong>
          </Link>
        </div>

        <button
          type="button"
          className="profile-logout-button"
          onClick={handleLogout}
        >
          退出这台设备
        </button>

        <p className="profile-logout-note">
          只清除当前设备保存的成员身份，不会删除你们的关系。
        </p>
      </section>
    </>
  );
}
