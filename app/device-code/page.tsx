"use client";

import { useEffect, useState } from "react";

import { UniversePageShell } from "../../features/onboarding/components/UniversePageShell";
import { readMemberSession } from "../../lib/storage/member-session";

type PageStatus = "loading" | "ready" | "error";
type PairingTarget = "self" | "partner";

export default function DeviceCodePage() {
  const [status, setStatus] =
    useState<PageStatus>("loading");
  const [target, setTarget] =
    useState<PairingTarget>("self");
  const [code, setCode] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState("");

  async function createCode(
    currentTarget: PairingTarget,
  ) {
    setStatus("loading");
    setError("");

    const session = readMemberSession();

    if (!session) {
      setError("当前设备尚未登录成员身份");
      setStatus("error");
      return;
    }

    try {
      const response = await fetch(
        "/api/member/pairing/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-member-token": session.token,
          },
          body: JSON.stringify({
            target: currentTarget,
          }),
          cache: "no-store",
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload.error ?? "无法生成设备绑定码",
        );
      }

      setCode(payload.code);
      setExpiresAt(payload.expiresAt);
      setStatus("ready");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "无法生成设备绑定码",
      );
      setStatus("error");
    }
  }

  useEffect(() => {
    const currentTarget =
      new URLSearchParams(window.location.search)
        .get("target") === "partner"
        ? "partner"
        : "self";

    setTarget(currentTarget);
    createCode(currentTarget);
  }, []);

  const isPartner = target === "partner";

  return (
    <UniversePageShell
      visual={
        isPartner
          ? "two-planets"
          : "planet-device"
      }
      eyebrow="TWO PLANETS · ONE HOME"
      title={
        isPartner
          ? "恢复另一颗星球"
          : "绑定我的另一台设备"
      }
      description={
        isPartner ? (
          <>
            为关系中的另一位固定成员生成恢复码，
            让对方在自己的设备上重新回到这颗小宇宙。
          </>
        ) : (
          <>
            为你的另一台设备生成绑定码，
            让它继续使用当前星球身份。
          </>
        )
      }
      footer={
        <a
          href="/"
          className="universe-flow-home-link"
        >
          返回我的星球
        </a>
      }
    >
      {status === "loading" && (
        <div className="universe-flow-loading">
          <p>正在生成一次性设备绑定码</p>

          <div
            className="activation-loading"
            aria-hidden="true"
          >
            <span />
            <span />
            <span />
          </div>
        </div>
      )}

      {status === "ready" && (
        <div className="universe-flow-code-content">
          <div className="universe-flow-code-card">
            <p>一次性设备绑定码</p>

            <div
              className="universe-flow-code"
              aria-label={`设备绑定码 ${code}`}
            >
              <strong>{code.slice(0, 4)}</strong>
              <span />
              <strong>{code.slice(4)}</strong>
            </div>

            <small>
              10 分钟内有效，仅可使用一次
              <br />
              到期时间：
              {new Date(
                expiresAt,
              ).toLocaleTimeString("zh-CN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </small>
          </div>

          <div className="universe-flow-steps">
            <div>
              <span>1</span>
              <p>在需要绑定的设备上打开“两颗星球”</p>
            </div>

            <div>
              <span>2</span>
              <p>选择“绑定这台设备”</p>
            </div>

            <div>
              <span>3</span>
              <p>输入上方的 8 位代码</p>
            </div>
          </div>

          {isPartner && (
            <div className="universe-flow-notice">
              <span aria-hidden="true">✦</span>

              <p>
                该代码会恢复另一位成员身份，
                请只在对方自己的设备上使用。
              </p>
            </div>
          )}

          <button
            type="button"
            className="universe-flow-secondary-button"
            onClick={() => createCode(target)}
          >
            重新生成
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="universe-flow-loading">
          <h2>无法生成绑定码</h2>

          <p
            className="universe-flow-error"
            role="alert"
          >
            {error}
          </p>

          <button
            type="button"
            className="universe-flow-secondary-button"
            onClick={() => createCode(target)}
          >
            重试
          </button>
        </div>
      )}
    </UniversePageShell>
  );
}
