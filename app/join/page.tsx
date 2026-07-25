"use client";

import { useEffect, useState } from "react";

import {
  readMemberSession,
  saveMemberSession,
} from "../../lib/storage/member-session";

type InviteData = {
  valid: true;
  relationship: {
    id: string;
    startDate: string;
    nextMeeting: string;
  };
  inviter: {
    displayName: string;
  };
  invitation: {
    targetRole: "first" | "second";
    expiresAt: string;
  };
};

type JoinStatus =
  | "loading"
  | "ready"
  | "submitting"
  | "success"
  | "error";

export default function JoinPage() {
  const [token, setToken] = useState("");
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState<JoinStatus>("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const currentToken =
      new URLSearchParams(window.location.search)
        .get("token")
        ?.trim() ?? "";

    setToken(currentToken);

    if (!currentToken) {
      setError("邀请链接不完整");
      setStatus("error");
      return;
    }

    fetch(
      `/api/relationships/invite?token=${encodeURIComponent(
        currentToken,
      )}`,
      {
        cache: "no-store",
      },
    )
      .then(async (response) => {
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(
            payload.error ?? "这个邀请暂时无法打开",
          );
        }

        return payload as InviteData;
      })
      .then((payload) => {
        setInvite(payload);
        setStatus("ready");
      })
      .catch((reason) => {
        setError(
          reason instanceof Error
            ? reason.message
            : "这个邀请暂时无法打开",
        );
        setStatus("error");
      });
  }, []);

  async function acceptInvite(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const normalizedName = displayName.trim();

    if (!normalizedName) {
      setError("请先填写你的名字");
      return;
    }

    setStatus("submitting");
    setError("");

    try {
      const response = await fetch(
        "/api/relationships/invite/accept",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            displayName: normalizedName,
          }),
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload.error ?? "加入小宇宙失败",
        );
      }

      saveMemberSession({
        token: payload.member.token,
        memberId: payload.member.id,
        relationshipId: payload.relationship.id,
        role: payload.member.role,
      });

      const savedSession = readMemberSession();

      if (
        !savedSession ||
        savedSession.token !== payload.member.token ||
        savedSession.memberId !== payload.member.id ||
        savedSession.relationshipId !== payload.relationship.id
      ) {
        throw new Error("成员身份未能保存，请检查浏览器存储权限");
      }

      const sessionResponse = await fetch("/api/member/session", {
        method: "GET",
        headers: {
          "x-member-token": savedSession.token,
        },
        cache: "no-store",
      });

      const sessionPayload = await sessionResponse.json();

      if (!sessionResponse.ok) {
        throw new Error(
          sessionPayload.error ?? "成员身份验证失败",
        );
      }

      setStatus("success");

      window.setTimeout(() => {
        window.location.assign("/?joined=1");
      }, 900);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "加入小宇宙失败",
      );
      setStatus("ready");
    }
  }

  return (
    <main className="join-page">
      <div className="join-orbit join-orbit-one" />
      <div className="join-orbit join-orbit-two" />

      <section className="join-card">
        <div className="join-planets" aria-hidden="true">
          <span className="join-planet join-planet-a" />
          <span className="join-connection" />
          <span className="join-planet join-planet-b" />
        </div>

        <p className="join-eyebrow">
          TWO PLANETS · ONE HOME
        </p>

        {status === "loading" && (
          <>
            <h1>正在确认邀请</h1>
            <p className="join-copy">
              正在寻找属于你们的那颗小宇宙……
            </p>
            <div className="join-loading" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <h1>没有找到这封邀请</h1>
            <p className="join-copy">{error}</p>
            <a className="join-home-link" href="/">
              返回两颗星球
            </a>
          </>
        )}

        {invite &&
          (status === "ready" ||
            status === "submitting") && (
            <>
              <h1>
                {invite.inviter.displayName}
                <br />
                邀请你加入小宇宙
              </h1>

              <p className="join-copy">
                接受后，你将固定成为另一颗星球。这个邀请只能使用一次。
              </p>

              <form
                className="join-form"
                onSubmit={acceptInvite}
              >
                <label htmlFor="join-name">
                  你希望对方怎样称呼你
                </label>

                <input
                  id="join-name"
                  value={displayName}
                  onChange={(event) =>
                    setDisplayName(event.target.value)
                  }
                  placeholder="输入你的名字"
                  maxLength={30}
                  autoComplete="name"
                  enterKeyHint="done"
                  required
                />

                {error && (
                  <p className="form-error">{error}</p>
                )}

                <button
                  className="primary-button"
                  type="submit"
                  disabled={status === "submitting"}
                >
                  {status === "submitting"
                    ? "正在加入…"
                    : "接受邀请，成为另一颗星球"}
                </button>
              </form>

              <p className="join-note">
                身份绑定后不能在两颗星球之间随意切换
              </p>
            </>
          )}

        {status === "success" && (
          <>
            <h1>欢迎回家</h1>
            <p className="join-copy">
              你的星球已经和对方连在一起。
            </p>
            <div className="join-success-mark" aria-hidden="true">
              ✓
            </div>
          </>
        )}
      </section>
    </main>
  );
}
