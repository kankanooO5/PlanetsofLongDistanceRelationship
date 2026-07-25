"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { saveMemberSession } from "../../lib/storage/member-session";

type CreateResponse = {
  relationship: {
    id: string;
    startDate: string;
    nextMeeting: string;
  };
  creator: {
    memberId: string;
    role: "first";
    displayName: string;
    token: string;
  };
  invite: {
    partnerName: string;
    url: string;
    expiresAt: string;
  };
};

type PageStatus =
  | "form"
  | "submitting"
  | "created"
  | "error";

export default function CreateRelationshipPage() {
  const [code, setCode] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [startDate, setStartDate] = useState("2025-05-23");
  const [nextMeeting, setNextMeeting] = useState("2026-08-31");
  const [status, setStatus] = useState<PageStatus>("form");
  const [result, setResult] = useState<CreateResponse | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function createRelationship(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !code.trim() ||
      !creatorName.trim() ||
      !partnerName.trim() ||
      !startDate ||
      !nextMeeting
    ) {
      setError("请填写完整信息");
      return;
    }

    setStatus("submitting");
    setError("");

    try {
      const response = await fetch(
        "/api/relationships/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-couple-code": code.trim(),
          },
          body: JSON.stringify({
            creatorName: creatorName.trim(),
            partnerName: partnerName.trim(),
            startDate,
            nextMeeting,
          }),
        },
      );

      const payload = (await response.json()) as
        | CreateResponse
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "创建小宇宙失败",
        );
      }

      const created = payload as CreateResponse;

      saveMemberSession({
        token: created.creator.token,
        memberId: created.creator.memberId,
        relationshipId: created.relationship.id,
        role: created.creator.role,
      });

      setResult(created);
      setStatus("created");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "创建小宇宙失败",
      );
      setStatus("error");
    }
  }

  async function copyInviteLink() {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(result.invite.url);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setError("复制失败，请长按邀请链接手动复制");
    }
  }

  if (status === "created" && result) {
    return (
      <main className="create-page">
        <div className="create-orbit create-orbit-one" />
        <div className="create-orbit create-orbit-two" />

        <section className="create-card create-success-card">
          <div className="create-success-planets" aria-hidden="true">
            <span className="create-success-planet create-success-planet-a" />
            <span className="create-success-path" />
            <span className="create-success-planet create-success-planet-b" />
          </div>

          <p className="create-eyebrow">
            YOUR UNIVERSE IS READY
          </p>

          <h1>你们的小宇宙已经诞生</h1>

          <p className="create-copy">
            你已经固定成为第一颗星球。把下面的邀请链接发送给
            {result.invite.partnerName}，对方接受后会固定成为第二颗星球。
          </p>

          <section className="invite-result">
            <p>一次性邀请链接</p>

            <div className="invite-result-url">
              {result.invite.url}
            </div>

            <button
              type="button"
              className="primary-button"
              onClick={copyInviteLink}
            >
              {copied ? "已复制邀请链接" : "复制邀请链接"}
            </button>
          </section>

          <p className="create-expiry">
            邀请有效期至：
            {new Date(result.invite.expiresAt).toLocaleString(
              "zh-CN",
            )}
          </p>

          {error && <p className="form-error">{error}</p>}

          <a className="create-enter-link" href="/">
            进入我的星球
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="create-page">
      <div className="create-orbit create-orbit-one" />
      <div className="create-orbit create-orbit-two" />

      <section className="create-card">
        <div className="create-brand-mark" aria-hidden="true">
          <span />
          <span />
        </div>

        <p className="create-eyebrow">
          CREATE TWO PLANETS
        </p>

        <h1>创建我们的星球</h1>

        <p className="create-copy">
          你将成为第一颗星球，并获得一条只属于另一颗星球的一次性邀请链接。
        </p>

        <form
          className="create-form"
          onSubmit={createRelationship}
        >
          <label htmlFor="create-code">测试版暗号</label>
          <input
            id="create-code"
            type="password"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="输入测试环境暗号"
            autoComplete="current-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
          />

          <div className="create-name-grid">
            <div>
              <label htmlFor="creator-name">你的名字</label>
              <input
                id="creator-name"
                value={creatorName}
                onChange={(event) =>
                  setCreatorName(event.target.value)
                }
                placeholder="第一颗星球"
                maxLength={30}
                autoComplete="name"
                required
              />
            </div>

            <div>
              <label htmlFor="partner-name">
                对方的名字
              </label>
              <input
                id="partner-name"
                value={partnerName}
                onChange={(event) =>
                  setPartnerName(event.target.value)
                }
                placeholder="第二颗星球"
                maxLength={30}
                required
              />
            </div>
          </div>

          <div className="create-date-grid">
            <div>
              <label htmlFor="start-date">恋爱开始日</label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(event) =>
                  setStartDate(event.target.value)
                }
                required
              />
            </div>

            <div>
              <label htmlFor="next-meeting">
                下次见面日
              </label>
              <input
                id="next-meeting"
                type="date"
                value={nextMeeting}
                onChange={(event) =>
                  setNextMeeting(event.target.value)
                }
                required
              />
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button
            className="primary-button"
            type="submit"
            disabled={status === "submitting"}
          >
            {status === "submitting"
              ? "正在生成小宇宙…"
              : "创建并生成邀请链接"}
          </button>
        </form>

        <p className="create-note">
          创建成功后，当前设备会固定绑定为第一颗星球。
        </p>
      </section>
    </main>
  );
}
