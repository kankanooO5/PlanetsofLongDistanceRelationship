"use client";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";

import {
  readMemberSession,
  saveMemberSession,
} from "../../lib/storage/member-session";

type RedeemPayload = {
  member: {
    id: string;
    role: "first" | "second";
    token: string;
  };
  relationship: {
    id: string;
  };
  error?: string;
};

export default function PairDevicePage() {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] =
    useState(false);
  const [error, setError] = useState("");

  const normalizedCode = useMemo(
    () =>
      code
        .toUpperCase()
        .replace(/[^23456789A-HJ-NP-Z]/g, "")
        .slice(0, 8),
    [code],
  );

  const formattedCode = useMemo(() => {
    if (normalizedCode.length <= 4) {
      return normalizedCode;
    }

    return `${normalizedCode.slice(0, 4)} ${normalizedCode.slice(4)}`;
  }, [normalizedCode]);

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (normalizedCode.length !== 8) {
      setError("请输入完整的 8 位设备绑定码");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(
        "/api/member/pairing/redeem",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: normalizedCode,
          }),
          cache: "no-store",
        },
      );

      const payload =
        (await response.json()) as RedeemPayload;

      if (!response.ok) {
        throw new Error(
          payload.error ?? "设备绑定失败",
        );
      }

      saveMemberSession({
        token: payload.member.token,
        memberId: payload.member.id,
        relationshipId:
          payload.relationship.id,
        role: payload.member.role,
      });

      const savedSession = readMemberSession();

      if (
        !savedSession ||
        savedSession.token !== payload.member.token
      ) {
        throw new Error("成员身份未能保存到这台设备");
      }

      const verifyResponse = await fetch(
        "/api/member/session",
        {
          headers: {
            "x-member-token": savedSession.token,
          },
          cache: "no-store",
        },
      );

      const verifyPayload =
        await verifyResponse.json();

      if (!verifyResponse.ok) {
        throw new Error(
          verifyPayload.error ??
            "设备身份验证失败",
        );
      }

      window.location.replace("/");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "设备绑定失败",
      );
      setSubmitting(false);
    }
  }

  return (
    <main className="pairing-page">
      <div
        className="pairing-background"
        aria-hidden="true"
      >
        <span className="pairing-background-orbit pairing-background-orbit-one" />
        <span className="pairing-background-orbit pairing-background-orbit-two" />
      </div>

      <section className="pairing-card">
        <div
          className="pairing-universe"
          aria-hidden="true"
        >
          <span className="pairing-orbit pairing-orbit-outer" />
          <span className="pairing-orbit pairing-orbit-inner" />

          <span className="pairing-planet">
            <span className="pairing-planet-shine" />
          </span>

          <span className="pairing-device">
            <span />
          </span>

          <span className="pairing-signal pairing-signal-one" />
          <span className="pairing-signal pairing-signal-two" />

          <span className="pairing-star pairing-star-one">
            ✦
          </span>

          <span className="pairing-star pairing-star-two">
            ✧
          </span>
        </div>

        <header className="pairing-header">
          <p className="pairing-eyebrow">
            CONNECT THIS DEVICE
          </p>

          <h1>绑定这台设备</h1>

          <p className="pairing-description">
            输入另一台已登录设备生成的绑定码，将这台设备连接到属于你的星球。
          </p>
        </header>

        <form
          className="pairing-form"
          onSubmit={submit}
        >
          <div className="pairing-code-section">
            <div className="pairing-code-heading">
              <label htmlFor="pairing-code">
                设备绑定码
              </label>

              <span>
                {normalizedCode.length}/8
              </span>
            </div>

            <input
              id="pairing-code"
              type="text"
              value={formattedCode}
              onChange={(event) => {
                setCode(event.target.value);
                setError("");
              }}
              placeholder="ABCD 2345"
              autoCapitalize="characters"
              autoComplete="one-time-code"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
              maxLength={9}
              aria-label="设备绑定码"
              aria-describedby="pairing-code-help"
            />

            <p
              id="pairing-code-help"
              className="pairing-code-help"
            >
              绑定码由 8 位数字或大写字母组成，短时间内有效。
            </p>
          </div>

          <div className="pairing-guide">
            <div className="pairing-guide-item">
              <span>1</span>

              <p>
                在已经登录的设备中打开个人页
              </p>
            </div>

            <div className="pairing-guide-item">
              <span>2</span>

              <p>
                点击“生成设备绑定码”
              </p>
            </div>

            <div className="pairing-guide-item">
              <span>3</span>

              <p>
                将生成的 8 位代码输入这里
              </p>
            </div>
          </div>

          {error && (
            <p
              className="pairing-error"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            className="pairing-submit"
            disabled={
              submitting ||
              normalizedCode.length !== 8
            }
          >
            <span>
              {submitting
                ? "正在连接星球"
                : "确认绑定"}
            </span>

            {!submitting && (
              <span
                className="pairing-submit-arrow"
                aria-hidden="true"
              >
                →
              </span>
            )}
          </button>
        </form>

        <a
          href="/"
          className="pairing-home-link"
        >
          返回入口
        </a>
      </section>
    </main>
  );
}
