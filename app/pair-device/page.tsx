"use client";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";

import { UniversePageShell } from "../../features/onboarding/components/UniversePageShell";
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
    <UniversePageShell
      visual="planet-device"
      eyebrow="TWO PLANETS · ONE HOME"
      title="绑定这台设备"
      description={
        <>
          输入另一台已登录设备生成的绑定码，
          将这台设备连接到属于你的星球。
        </>
      }
      footer={
        <a
          href="/"
          className="universe-flow-home-link"
        >
          返回入口
        </a>
      }
    >
      <form
        className="universe-flow-form"
        onSubmit={submit}
      >
        <div className="universe-flow-input-card">
          <div className="universe-flow-input-heading">
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
            aria-describedby="pairing-code-help"
          />

          <p
            id="pairing-code-help"
            className="universe-flow-help"
          >
            绑定码由 8 位数字或大写字母组成，
            短时间内有效。
          </p>
        </div>

        <div className="universe-flow-steps">
          <div>
            <span>1</span>
            <p>在已经登录的设备中打开“我的星球”</p>
          </div>

          <div>
            <span>2</span>
            <p>选择需要绑定或恢复的设备身份</p>
          </div>

          <div>
            <span>3</span>
            <p>将生成的 8 位代码输入这里</p>
          </div>
        </div>

        {error && (
          <p
            className="universe-flow-error"
            role="alert"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          className="universe-flow-primary-button"
          disabled={
            submitting ||
            normalizedCode.length !== 8
          }
        >
          {submitting
            ? "正在连接星球"
            : "确认绑定"}
        </button>
      </form>
    </UniversePageShell>
  );
}
