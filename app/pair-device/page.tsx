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
      <section className="pairing-card">
        <p className="pairing-eyebrow">
          CONNECT THIS DEVICE
        </p>

        <h1>绑定这台设备</h1>

        <p>
          请在已经登录的 Safari 中打开“生成设备绑定码”，然后将代码输入这里。
        </p>

        <form
          className="pairing-form"
          onSubmit={submit}
        >
          <input
            type="text"
            value={normalizedCode}
            onChange={(event) => {
              setCode(event.target.value);
              setError("");
            }}
            placeholder="ABCD 2345"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
            maxLength={8}
            aria-label="设备绑定码"
          />

          {error && (
            <p className="pairing-error">
              {error}
            </p>
          )}

          <button
            type="submit"
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
