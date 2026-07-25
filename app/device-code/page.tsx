"use client";

import { useEffect, useState } from "react";

import { readMemberSession } from "../../lib/storage/member-session";

type PageStatus =
  | "loading"
  | "ready"
  | "error";

export default function DeviceCodePage() {
  const [status, setStatus] =
    useState<PageStatus>("loading");
  const [code, setCode] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState("");

  async function createCode() {
    setStatus("loading");
    setError("");

    const session = readMemberSession();

    if (!session) {
      setError("当前 Safari 尚未登录成员身份");
      setStatus("error");
      return;
    }

    try {
      const target =
        new URLSearchParams(window.location.search)
          .get("target") === "partner"
          ? "partner"
          : "self";

      const response = await fetch(
        "/api/member/pairing/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-member-token": session.token,
          },
          body: JSON.stringify({ target }),
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
    createCode();
  }, []);

  return (
    <main className="pairing-page">
      <section className="pairing-card">
        <p className="pairing-eyebrow">
          DEVICE PAIRING
        </p>

        {status === "loading" && (
          <>
            <h1>正在生成绑定码</h1>
            <p>
              正在为新的主屏幕应用准备独立身份。
            </p>

            <div
              className="activation-loading"
              aria-hidden="true"
            >
              <span />
              <span />
              <span />
            </div>
          </>
        )}

        {status === "ready" && (
          <>
            <h1>设备绑定码</h1>

            <p>
              打开主屏幕上的“两颗星球”，选择“绑定这台设备”，再输入下面的代码。
            </p>

            <div className="pairing-code">
              {code.slice(0, 4)}
              <span />
              {code.slice(4)}
            </div>

            <p className="pairing-expiry">
              10 分钟内有效，仅可使用一次
              <br />
              到期时间：
              {new Date(expiresAt).toLocaleTimeString(
                "zh-CN",
                {
                  hour: "2-digit",
                  minute: "2-digit",
                },
              )}
            </p>

            <button
              type="button"
              className="pairing-secondary-button"
              onClick={createCode}
            >
              重新生成
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <h1>无法生成绑定码</h1>

            <p className="pairing-error">
              {error}
            </p>

            <button
              type="button"
              className="pairing-secondary-button"
              onClick={createCode}
            >
              重试
            </button>

            <a
              href="/"
              className="pairing-home-link"
            >
              返回两颗星球
            </a>
          </>
        )}
      </section>
    </main>
  );
}
