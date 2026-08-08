"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { IdeaAnalysisCard } from "./IdeaAnalysisCard";
import { IdeaCalendar } from "./IdeaCalendar";
import { IdeaHistoryDetail } from "./IdeaHistoryDetail";

import {
  fetchMyTodayIdeaAnswer,
  fetchTodayIdea,
  fetchTodayIdeaExchange,
  saveMyTodayIdeaAnswer,
  type IdeaAnswer,
  type TodayIdea,
  type TodayIdeaExchange,
} from "../../../lib/api/idea-client";
import {
  clearLegacyIdeaSessionCache,
  readIdeaTodayCache,
  writeIdeaTodayCache,
} from "../../../lib/storage/idea-page-cache";
import { readMemberSession } from "../../../lib/storage/member-session";

function formatIdeaDate(
  value: string,
) {
  const [year, month, day] =
    value.split("-").map(Number);

  if (!year || !month || !day) {
    return value;
  }

  return `${month}月${day}日`;
}

export function IdeasTab() {
  const [initialCache] =
    useState(() =>
      readIdeaTodayCache(),
    );

  const [todayIdea, setTodayIdea] =
    useState<TodayIdea | null>(
      initialCache?.todayIdea ?? null,
    );

  const [answer, setAnswer] =
    useState<IdeaAnswer | null>(
      initialCache?.answer ?? null,
    );

  const [exchange, setExchange] =
    useState<TodayIdeaExchange | null>(
      initialCache?.exchange ?? null,
    );

  const [body, setBody] =
    useState("");

  const [
    selectedDate,
    setSelectedDate,
  ] = useState("");

  const [
    editingAnswer,
    setEditingAnswer,
  ] = useState(false);

  const [loading, setLoading] =
    useState(!initialCache);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [
    savedNotice,
    setSavedNotice,
  ] = useState("");

  useEffect(() => {
    clearLegacyIdeaSessionCache();

    let cancelled = false;

    async function load() {
      const session =
        readMemberSession();

      if (!session) {
        setError(
          "当前设备尚未绑定成员身份",
        );
        setLoading(false);
        return;
      }

      try {
        /*
          先确保今天的 daily question
          已经生成，再读取回答状态。
        */
        const idea =
          await fetchTodayIdea(
            session.token,
          );

        if (cancelled) return;

        setTodayIdea(idea);

        setSelectedDate(
          (current) =>
            current ||
            idea.dailyQuestion.localDate,
        );

        const [
          savedAnswer,
          loadedExchange,
        ] = await Promise.all([
          fetchMyTodayIdeaAnswer(
            session.token,
          ),
          fetchTodayIdeaExchange(
            session.token,
          ),
        ]);

        if (cancelled) return;

        setAnswer(savedAnswer);
        setBody(
          savedAnswer?.body ?? "",
        );
        setEditingAnswer(false);
        setExchange(
          loadedExchange,
        );

        writeIdeaTodayCache({
          todayIdea: idea,
          answer: savedAnswer,
          exchange: loadedExchange,
        });

        setError("");
      } catch (reason) {
        if (cancelled) return;

        setError(
          reason instanceof Error
            ? reason.message
            : "暂时无法读取今天的妙想",
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
  }, []);

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const content = body.trim();

    if (!content || saving) {
      return;
    }

    const session =
      readMemberSession();

    if (!session) {
      setError(
        "当前设备尚未绑定成员身份",
      );
      return;
    }

    setSaving(true);
    setError("");
    setSavedNotice("");

    const wasAlreadyAnswered =
      Boolean(answer);

    try {
      const saved =
        await saveMyTodayIdeaAnswer(
          session.token,
          content,
        );

      /*
        提交后立刻重新读取 exchange。

        如果对方已经回答，
        此时服务端才会把正文解锁给我。
      */
      const loadedExchange =
        await fetchTodayIdeaExchange(
          session.token,
        );

      setAnswer(saved);
      setBody(saved.body);
      setEditingAnswer(false);
      setExchange(
        loadedExchange,
      );

      if (todayIdea) {
        writeIdeaTodayCache({
          todayIdea,
          answer: saved,
          exchange: loadedExchange,
        });
      }

      setSavedNotice(
        wasAlreadyAnswered
          ? "回答已经更新"
          : "今天的妙想已经留下",
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "暂时无法保存回答",
      );
    } finally {
      setSaving(false);
    }
  }

  const partner =
    exchange?.partner ?? null;

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">
            OUR LITTLE UNIVERSE
          </p>

          <h1>妙想</h1>
        </div>
      </header>

      <section className="content tab-page ideas-page">
        <IdeaCalendar
          selectedDate={
            selectedDate ||
            todayIdea?.dailyQuestion.localDate ||
            ""
          }
          onSelectDate={setSelectedDate}
        />

        {todayIdea &&
        selectedDate &&
        selectedDate !==
          todayIdea.dailyQuestion.localDate ? (
          <IdeaHistoryDetail
            date={selectedDate}
          />
        ) : loading ? (
          <div className="idea-state-card idea-state-card-loading">
            <p>
              正在寻找今天的妙想…
            </p>
          </div>
        ) : error && !todayIdea ? (
          <div className="idea-state-card">
            <span
              className="idea-state-star"
              aria-hidden="true"
            >
              ☆
            </span>

            <p>{error}</p>
          </div>
        ) : todayIdea ? (
          <>
            <article className="idea-question-card">
              <div className="idea-question-meta">
                <span>
                  {formatIdeaDate(
                    todayIdea
                      .dailyQuestion
                      .localDate,
                  )}
                </span>

                <span aria-hidden="true">
                  ·
                </span>

                <span>
                  今日妙想
                </span>
              </div>

              <h2>
                {
                  todayIdea
                    .dailyQuestion
                    .question
                    .text
                }
              </h2>
            </article>

            {answer && !editingAnswer ? (
              <article className="idea-partner-card idea-own-card">
                <div className="idea-partner-heading">
                  <span>
                    我的回答
                  </span>

                  <button
                    type="button"
                    className="idea-own-edit-button"
                    onClick={() => {
                      setEditingAnswer(true);
                      setSavedNotice("");
                    }}
                  >
                    修改
                  </button>
                </div>

                <div className="idea-partner-answer idea-own-answer">
                  <p>
                    {answer.body}
                  </p>

                  {savedNotice ? (
                    <small className="idea-own-saved-notice">
                      {savedNotice}
                    </small>
                  ) : null}
                </div>
              </article>
            ) : (
              <form
                className="idea-answer-card"
                onSubmit={handleSubmit}
              >
                <div className="idea-answer-heading">
                  <div>
                    <span className="idea-answer-label">
                      我的回答
                    </span>

                    <small>
                      {answer
                        ? "修改后重新提交即可保存"
                        : "写下答案后，就能看看 TA 的想法"}
                    </small>
                  </div>

                  <span className="idea-answer-count">
                    {body.length}/1000
                  </span>
                </div>

                <textarea
                  value={body}
                  maxLength={1000}
                  placeholder="想到什么，就慢慢写下来吧…"
                  onChange={(event) => {
                    setBody(
                      event.target.value,
                    );
                    setSavedNotice("");
                  }}
                />

                {error ? (
                  <p className="idea-answer-error">
                    {error}
                  </p>
                ) : null}

                {answer ? (
                  <button
                    type="button"
                    className="idea-answer-cancel"
                    onClick={() => {
                      setBody(answer.body);
                      setEditingAnswer(false);
                      setError("");
                      setSavedNotice("");
                    }}
                  >
                    取消修改
                  </button>
                ) : null}

                <button
                  type="submit"
                  disabled={
                    saving ||
                    body.trim().length === 0
                  }
                >
                  {saving
                    ? "正在保存…"
                    : answer
                      ? "保存修改"
                      : "提交回答"}
                </button>
              </form>
            )}

            <article className="idea-partner-card">
              <div className="idea-partner-heading">
                <span>
                  {partner
                    ? `${partner.displayName} 的回答`
                    : "另一颗星球的回答"}
                </span>

                {partner?.answered ? (
                  <small>
                    已回答
                  </small>
                ) : (
                  <small>
                    尚未回答
                  </small>
                )}
              </div>

              {!partner ? (
                <div className="idea-partner-state">
                  <span aria-hidden="true">
                    ◌
                  </span>

                  <p>
                    另一颗星球还没有加入。
                  </p>
                </div>
              ) : partner.answer ? (
                <div className="idea-partner-answer">
                  <p>
                    {partner.answer.body}
                  </p>

                  {exchange?.bothAnswered ? (
                    <small>
                      你们都留下了答案，
                      双人解析即将可以解锁。
                    </small>
                  ) : null}
                </div>
              ) : partner.answered ? (
                <div className="idea-partner-state idea-partner-locked">
                  <span aria-hidden="true">
                    ◇
                  </span>

                  <p>
                    TA 已经留下回答。
                  </p>

                  <small>
                    写下自己的答案后，
                    就可以打开看看。
                  </small>
                </div>
              ) : (
                <div className="idea-partner-state">
                  <span aria-hidden="true">
                    ◌
                  </span>

                  <p>
                    TA 还没有回答今天的问题。
                  </p>

                  <small>
                    等另一颗星球慢慢写下来吧。
                  </small>
                </div>
              )}
            </article>

            <IdeaAnalysisCard
              enabled={Boolean(
                exchange?.bothAnswered,
              )}
              date={
                todayIdea.dailyQuestion.localDate
              }
              revision={[
                exchange?.myAnswer?.updatedAt ?? "",
                exchange?.partner?.answer?.updatedAt ?? "",
              ].join("|")}
            />
          </>
        ) : null}
      </section>
    </>
  );
}
