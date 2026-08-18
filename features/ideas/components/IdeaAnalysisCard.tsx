"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  fetchIdeaAnalysis,
  generateIdeaAnalysis,
  generateIdeaInsights,
  type IdeaAnalysisContent,
  type IdeaAnalysisState,
} from "../../../lib/api/idea-analysis-client";
import {
  readIdeaAnalysisCache,
  writeIdeaAnalysisCache,
} from "../../../lib/storage/idea-page-cache";
import { readMemberSession } from "../../../lib/storage/member-session";

const MINIMUM_ANIMATION_MS = 1800;

function wait(ms: number) {
  return new Promise<void>(
    (resolve) => {
      window.setTimeout(
        resolve,
        ms,
      );
    },
  );
}

export function IdeaAnalysisCard({
  enabled,
  revision,
  date,
  historical = false,
}: {
  enabled: boolean;
  revision: string;
  date?: string;
  historical?: boolean;
}) {
  const cachedDate =
    date ?? "";

  const [initialAnalysis] =
    useState(() =>
      readIdeaAnalysisCache(
        cachedDate,
        revision,
      ),
    );

  const [
    analysis,
    setAnalysis,
  ] =
    useState<IdeaAnalysisContent | null>(
      initialAnalysis,
    );

  const [
    revealed,
    setRevealed,
  ] =
    useState(
      Boolean(initialAnalysis),
    );

  const [
    generating,
    setGenerating,
  ] =
    useState(false);

  const [
    checking,
    setChecking,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    needsRefresh,
    setNeedsRefresh,
  ] =
    useState(false);

  const [
    updateAvailable,
    setUpdateAvailable,
  ] =
    useState(false);

  /*
    同一张解析卡只维护一份正在进行中的
    visible analysis 请求。

    后台预热与用户主动点击都会复用它，
    避免在同一页面重复调用 DeepSeek。
  */
  const generationPromiseRef =
    useRef<
      Promise<IdeaAnalysisState> | null
    >(null);

  const startAnalysisGeneration =
    useCallback(
      (
        memberToken: string,
        force = false,
      ) => {
        /*
          历史“更新分析”必须启动一份新的请求，
          不能复用之前已经 resolve 的 Promise。
        */
        if (force) {
          generationPromiseRef.current =
            null;
        }

        if (
          !generationPromiseRef.current
        ) {
          generationPromiseRef.current =
            generateIdeaAnalysis(
              memberToken,
              date,
              {
                historical,
                force,
              },
            )
              .then((result) => {
                /*
                  Visible 一完成，
                  长期记忆立刻后台继续。

                  不等待、不阻塞 UI。
                */
                if (
                  !historical &&
                  result.status ===
                    "ready" &&
                  result.analysis
                ) {
                  void generateIdeaInsights(
                    memberToken,
                    date,
                  ).catch(
                    (reason) => {
                      console.error(
                        "idea insight generation failed",
                        reason,
                      );
                    },
                  );
                }

                return result;
              })
              .catch((reason) => {
                /*
                  失败后释放 Promise，
                  用户点击时仍可重新尝试。
                */
                generationPromiseRef.current =
                  null;

                throw reason;
              });
        }

        return generationPromiseRef.current;
      },
      [
        date,
        historical,
      ],
    );

  useEffect(() => {
    /*
      双方任意一人的回答发生变化，
      revision 都会变化。

      立即收起旧解析，重新向服务端确认
      当前答案是否已有对应缓存。
    */
    /*
      新的一天或双方答案发生变化后，
      不复用上一版本的生成请求。
    */
    generationPromiseRef.current =
      null;

    const localAnalysis =
      readIdeaAnalysisCache(
        date ?? "",
        revision,
      );

    setAnalysis(
      localAnalysis,
    );
    setRevealed(
      Boolean(localAnalysis),
    );
    setNeedsRefresh(false);
    setUpdateAvailable(false);
    setError("");

    if (!enabled) {
      return;
    }

    let cancelled = false;

    async function checkCache() {
      const session =
        readMemberSession();

      if (!session) {
        return;
      }

      setChecking(true);

      try {
        const result =
          await fetchIdeaAnalysis(
            session.token,
            date,
            historical,
          );

        if (cancelled) {
          return;
        }

        if (
          result.status === "ready" &&
          result.analysis
        ) {
          /*
            即使已经有缓存，
            也先不自动展开。

            解析仍由用户主动点击“解锁”。
          */
          setAnalysis(
            result.analysis,
          );

          writeIdeaAnalysisCache(
            date ?? "",
            revision,
            result.analysis,
          );

          /*
            D1 已经有当前答案版本的解析时，
            直接展示，不要求再次点击解锁。
          */
          setRevealed(true);
          setNeedsRefresh(false);
          setUpdateAvailable(
            Boolean(
              result.updateAvailable,
            ),
          );
          return;
        }

        /*
          stale=true 表示数据库里存在旧解析，
          但双方答案已经发生变化。
        */
        setNeedsRefresh(
          Boolean(result.stale),
        );

        /*
          服务端没有当前版本 ready 解析。

          不等用户点击：
          现在就开始静默生成。

          用户之后点击时会复用
          generationPromiseRef，
          不会再发第二份 visible 请求。
        */
        if (!historical) {
          void startAnalysisGeneration(
            session.token,
          ).catch(() => {
            /*
              今天的解析允许静默预热。

              历史日期绝不自动重算，
              必须由用户主动点击。
            */
          });
        }
      } catch {
        /*
          这里只是静默预检查。

          真正点击时如果失败，
          再向用户显示错误。
        */
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    }

    void checkCache();

    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    revision,
    date,
    startAnalysisGeneration,
    historical,
  ]);

  if (!enabled) {
    return null;
  }

  async function handleReveal() {
    if (
      generating ||
      checking
    ) {
      return;
    }

    setGenerating(true);
    setError("");

    const startedAt =
      Date.now();

    try {
      let resultAnalysis =
        analysis;

      if (!resultAnalysis) {
        const session =
          readMemberSession();

        if (!session) {
          throw new Error(
            "当前设备尚未绑定成员身份",
          );
        }

        /*
          如果后台预热正在进行：
          → 等同一份 Promise。

          如果已经预热完成：
          → Promise 几乎立即返回。

          如果此前没有预热：
          → 此处才真正启动请求。
        */
        const result =
          await startAnalysisGeneration(
            session.token,
          );

        if (
          result.status !==
            "ready" ||
          !result.analysis
        ) {
          throw new Error(
            "解析暂时还没有准备好",
          );
        }

        resultAnalysis =
          result.analysis;

        setAnalysis(
          result.analysis,
        );

        writeIdeaAnalysisCache(
          date ?? "",
          revision,
          result.analysis,
        );

        setNeedsRefresh(false);

      }

      /*
        第一次调用模型可能需要几秒；
        缓存命中可能非常快。

        保证动画至少存在一小段时间，
        避免缓存命中时出现“闪一下”。
      */
      const elapsed =
        Date.now() -
        startedAt;

      const remaining =
        Math.max(
          0,
          MINIMUM_ANIMATION_MS -
            elapsed,
        );

      if (remaining) {
        await wait(remaining);
      }

      setRevealed(true);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "双人解析暂时没有生成成功",
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleUpdateAnalysis() {
    if (
      generating ||
      checking
    ) {
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

    setGenerating(true);
    setError("");

    try {
      const result =
        await startAnalysisGeneration(
          session.token,
          true,
        );

      if (
        result.status !== "ready" ||
        !result.analysis
      ) {
        throw new Error(
          "新版解析暂时还没有准备好",
        );
      }

      setAnalysis(
        result.analysis,
      );

      writeIdeaAnalysisCache(
        date ?? "",
        revision,
        result.analysis,
      );

      setUpdateAvailable(false);
      setNeedsRefresh(false);
      setRevealed(true);
    } catch (reason) {
      /*
        更新失败时不清掉 analysis。

        用户仍然继续看到旧历史解析。
      */
      setError(
        reason instanceof Error
          ? reason.message
          : "更新分析暂时没有成功",
      );
    } finally {
      setGenerating(false);
    }
  }

  if (revealed && analysis) {
    return (
      <section className="idea-analysis-result">
        <div className="idea-analysis-result-header">
          <div className="idea-analysis-mini-orbit">
            <i />
            <i />
          </div>

          <div>
            <small>
              TWO LITTLE WORLDS
            </small>

            <h3>
              今天的我们
            </h3>
          </div>
        </div>

        <div className="idea-analysis-grid">
          <article className="idea-analysis-section idea-analysis-narrative">
            <p>
              {
                analysis.commonGround
              }
            </p>

            <p>
              {
                analysis.differentViews
              }
            </p>

            <p>
              {
                analysis.hiddenFocus
              }
            </p>

            <p>
              {
                analysis.mutualUnderstanding
              }
            </p>
          </article>

          <article className="idea-analysis-section idea-analysis-conversation">
            <span>
              今晚还可以聊
            </span>

            <p>
              {
                analysis.conversationPrompt
              }
            </p>
          </article>
        </div>

        {historical ? (
          <div className="idea-analysis-update">
            {updateAvailable ? (
              <small>
                有新版分析能力可用
              </small>
            ) : null}

            {error ? (
              <p className="idea-analysis-error">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              disabled={
                generating ||
                checking
              }
              onClick={() => {
                void handleUpdateAnalysis();
              }}
            >
              {generating
                ? "正在更新分析…"
                : "更新分析"}
            </button>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className="idea-analysis-unlock-card">
      {generating ? (
        <div className="idea-analysis-generating">
          <div
            className="idea-analysis-planets"
            aria-hidden="true"
          >
            <span className="idea-analysis-planet idea-analysis-planet-first" />

            <span className="idea-analysis-glow" />

            <span className="idea-analysis-planet idea-analysis-planet-second" />
          </div>

          <strong>
            正在靠近彼此的星球…
          </strong>

          <p>
            把今天的两个答案，
            放在一起看看。
          </p>
        </div>
      ) : (
        <>
          <div
            className="idea-analysis-symbol"
            aria-hidden="true"
          >
            <span />
            <i>✦</i>
            <span />
          </div>

          <small className="idea-analysis-eyebrow">
            {needsRefresh
              ? "ANSWERS UPDATED"
              : "BOTH ANSWERED"}
          </small>

          <h3>
            {needsRefresh
              ? "答案更新了，再看看现在的我们"
              : "看看我们今天想到了一起吗？"}
          </h3>

          {error ? (
            <p className="idea-analysis-error">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            disabled={checking}
            onClick={() => {
              void handleReveal();
            }}
          >
            {checking
              ? "正在准备…"
              : analysis
                ? "打开今天的解析"
                : needsRefresh
                  ? "重新解析最新答案"
                  : "解锁双人解析"}
          </button>
        </>
      )}
    </section>
  );
}
