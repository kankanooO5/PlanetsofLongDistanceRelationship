"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  fetchIdeaHistoryDay,
  type IdeaHistoryDay,
} from "../../../lib/api/idea-history-client";
import { IdeaAnalysisCard } from "./IdeaAnalysisCard";
import { readMemberSession } from "../../../lib/storage/member-session";

function formatDate(value: string) {
  const [year, month, day] =
    value.split("-").map(Number);

  if (!year || !month || !day) {
    return value;
  }

  return `${month}月${day}日`;
}

export function IdeaHistoryDetail({
  date,
}: {
  date: string;
}) {
  const [history, setHistory] =
    useState<IdeaHistoryDay | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const session = readMemberSession();

      if (!session) {
        setError("当前设备尚未绑定成员身份");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const result =
          await fetchIdeaHistoryDay(
            session.token,
            date,
          );

        if (cancelled) return;

        setHistory(result);
      } catch (reason) {
        if (cancelled) return;

        setError(
          reason instanceof Error
            ? reason.message
            : "暂时无法读取这一天的妙想",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [date]);

  if (loading) {
    return (
      <div className="idea-state-card idea-state-card-centered">
        <p>正在翻开这一天的妙想…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="idea-state-card idea-state-card-centered">
        <p>{error}</p>
      </div>
    );
  }

  if (!history?.exists) {
    return (
      <div className="idea-state-card idea-state-card-centered">
        <p>
          {formatDate(date)}
          还没有留下妙想。
        </p>
      </div>
    );
  }

  const question =
    history.dailyQuestion!.question;

  const partner =
    history.partner ?? null;

  return (
    <>
      <article className="idea-question-card">
        <div className="idea-question-meta">
          <span>
            {formatDate(history.localDate)}
          </span>

          <span aria-hidden="true">
            ·
          </span>

          <span>那天的妙想</span>
        </div>

        <h2>{question.text}</h2>
      </article>

      <article className="idea-partner-card idea-own-card">
        <div className="idea-partner-heading">
          <span>我的回答</span>

          <small>历史记录</small>
        </div>

        {history.myAnswer ? (
          <div className="idea-partner-answer idea-own-answer">
            <p>{history.myAnswer.body}</p>
          </div>
        ) : (
          <div className="idea-partner-state idea-partner-state-centered idea-own-empty-state">
            <p>那天你没有留下回答。</p>
          </div>
        )}
      </article>

      <article className="idea-partner-card">
        <div className="idea-partner-heading">
          <span>
            {partner
              ? `${partner.displayName} 的回答`
              : "另一颗星球的回答"}
          </span>

          {partner ? (
            <small>
              {partner.answered
                ? "已回答"
                : "未回答"}
            </small>
          ) : null}
        </div>

        {!partner ? (
          <div className="idea-partner-state idea-partner-state-centered">
            <p>另一颗星球当时还没有加入。</p>
          </div>
        ) : partner.answer ? (
          <div className="idea-partner-answer">
            <p>{partner.answer.body}</p>
          </div>
        ) : partner.answered ? (
          <div className="idea-partner-state idea-partner-state-centered idea-partner-locked">
            <p>这份回答暂时没有解锁。</p>
          </div>
        ) : (
          <div className="idea-partner-state idea-partner-state-centered">
            <p>TA 那天没有留下回答。</p>
          </div>
        )}
      </article>

      <IdeaAnalysisCard
        historical
        enabled={Boolean(
          history.bothAnswered,
        )}
        revision={[
          history.myAnswer?.updatedAt ?? "",
          history.partner?.answer?.updatedAt ?? "",
        ].join("|")}
        date={history.localDate}
      />
    </>
  );
}
