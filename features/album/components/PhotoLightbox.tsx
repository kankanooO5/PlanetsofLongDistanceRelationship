"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import {
  fetchPhotoComments,
  getCachedPhotoComments,
  markPhotoCommentsRead,
  sendPhotoComment,
} from "../../../lib/api/photo-comment-client";
import { fetchPhotoObjectUrl } from "../../../lib/api/photo-client";
import { readMemberSession } from "../../../lib/storage/member-session";
import type { AlbumPhoto } from "../types/album";
import type { PhotoComment } from "../types/photo-comment";

type PhotoLightboxProps = {
  photo: AlbumPhoto | null;
  onClose: () => void;
};

function formatPhotoDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatCommentTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function PhotoLightbox({ photo, onClose }: PhotoLightboxProps) {
  const [originalUrl, setOriginalUrl] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [comments, setComments] = useState<PhotoComment[]>([]);

  const [commentsLoading, setCommentsLoading] = useState(false);

  const [commentSending, setCommentSending] = useState(false);

  const [commentBody, setCommentBody] = useState("");

  const [commentError, setCommentError] = useState("");
  const [lastSentCommentId, setLastSentCommentId] = useState("");
  const commentsListRef = useRef<HTMLDivElement | null>(null);

  function scrollCommentsToBottom(behavior: ScrollBehavior = "auto") {
    requestAnimationFrame(() => {
      const list = commentsListRef.current;
      if (!list) return;

      list.scrollTo({
        top: list.scrollHeight,
        behavior,
      });
    });
  }

  const session = readMemberSession();

  useEffect(() => {
    if (!photo) {
      setOriginalUrl("");
      setError("");
      setLoading(false);
      return;
    }

    let cancelled = false;
    let createdObjectUrl = "";

    if (!session) {
      setError("当前设备尚未绑定成员身份");
      return;
    }

    setOriginalUrl("");
    setLoading(true);
    setError("");

    void fetchPhotoObjectUrl(photo.id, session.token, "original")
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }

        createdObjectUrl = url;
        setOriginalUrl(url);
      })
      .catch((reason) => {
        if (cancelled) return;

        setError(reason instanceof Error ? reason.message : "原图暂时无法读取");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;

      if (createdObjectUrl) {
        URL.revokeObjectURL(createdObjectUrl);
      }
    };
  }, [photo?.id]);

  useEffect(() => {
    const root = document.documentElement;

    function updateComposerBottom() {
      const viewport = window.visualViewport;

      if (!viewport) {
        root.style.setProperty("--photo-composer-bottom", "46px");
        return;
      }

      const keyboardHeight = Math.max(
        0,
        window.innerHeight - viewport.height - viewport.offsetTop,
      );

      root.style.setProperty(
        "--photo-composer-bottom",
        keyboardHeight > 80 ? `${Math.round(keyboardHeight + 8)}px` : "46px",
      );
    }

    updateComposerBottom();

    window.visualViewport?.addEventListener("resize", updateComposerBottom);
    window.visualViewport?.addEventListener("scroll", updateComposerBottom);
    window.addEventListener("resize", updateComposerBottom);

    return () => {
      root.style.removeProperty("--photo-composer-bottom");
      window.visualViewport?.removeEventListener(
        "resize",
        updateComposerBottom,
      );
      window.visualViewport?.removeEventListener(
        "scroll",
        updateComposerBottom,
      );
      window.removeEventListener("resize", updateComposerBottom);
    };
  }, []);

  useEffect(() => {
    if (!photo || !session) {
      setComments([]);
      return;
    }

    let cancelled = false;

    const cachedComments = getCachedPhotoComments(photo.id, session.token);

    if (cachedComments) {
      setComments(cachedComments);
      markPhotoCommentsRead(
        photo.id,
        session.token,
        session.memberId,
        cachedComments,
      );
      setCommentsLoading(false);
    } else {
      setComments([]);
      setCommentsLoading(true);
    }

    setCommentError("");
    setLastSentCommentId("");

    void fetchPhotoComments(photo.id, session.token)
      .then((loadedComments) => {
        if (!cancelled) {
          setComments(loadedComments);
          markPhotoCommentsRead(
            photo.id,
            session.token,
            session.memberId,
            loadedComments,
          );
        }
      })
      .catch((reason) => {
        if (!cancelled) {
          setCommentError(
            reason instanceof Error ? reason.message : "暂时无法读取留言",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCommentsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [photo?.id]);

  useEffect(() => {
    if (!photo) return;

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;

      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [photo, onClose]);

  useEffect(() => {
    if (!photo || commentsLoading) return;

    scrollCommentsToBottom();
  }, [photo?.id, comments.length, commentsLoading]);

  useEffect(() => {
    function handleViewportChange() {
      window.setTimeout(() => scrollCommentsToBottom("smooth"), 90);
    }

    window.visualViewport?.addEventListener("resize", handleViewportChange);
    window.visualViewport?.addEventListener("scroll", handleViewportChange);

    return () => {
      window.visualViewport?.removeEventListener(
        "resize",
        handleViewportChange,
      );
      window.visualViewport?.removeEventListener(
        "scroll",
        handleViewportChange,
      );
    };
  }, [photo?.id]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const body = commentBody.trim();

    if (!photo || !session || !body || commentSending) {
      return;
    }

    setCommentSending(true);
    setCommentError("");

    try {
      const createdComment = await sendPhotoComment(
        photo.id,
        session.token,
        body,
      );

      setComments((current) => [...current, createdComment]);
      scrollCommentsToBottom("smooth");
      setLastSentCommentId(createdComment.id);

      window.setTimeout(() => {
        setLastSentCommentId((current) =>
          current === createdComment.id ? "" : current,
        );
      }, 520);

      setCommentBody("");
    } catch (reason) {
      setCommentError(
        reason instanceof Error ? reason.message : "留言发送失败",
      );
    } finally {
      setCommentSending(false);
    }
  }

  if (!photo) return null;

  const displayedUrl = originalUrl;

  return (
    <div
      className="photo-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="照片原图预览"
      onClick={onClose}
    >
      <button
        type="button"
        className="photo-lightbox-close"
        onClick={onClose}
        aria-label="关闭原图"
      >
        ×
      </button>

      <div
        className="photo-lightbox-content photo-lightbox-with-comments"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="photo-lightbox-image">
          {!error && displayedUrl && (
            <img
              className={
                originalUrl
                  ? "photo-lightbox-original"
                  : "photo-lightbox-placeholder"
              }
              src={displayedUrl}
              alt={photo.caption || "照片原图"}
            />
          )}

          {loading && (
            <span
              className="photo-lightbox-loading-indicator"
              aria-label="正在加载原图"
            />
          )}

          {error && (
            <div className="photo-lightbox-error">
              <p>{error}</p>
            </div>
          )}
        </div>

        {(photo.caption || photo.takenAt) && (
          <footer className="photo-lightbox-caption">
            {photo.caption && <p>{photo.caption}</p>}

            <time dateTime={photo.takenAt}>
              {formatPhotoDate(photo.takenAt)}
            </time>
          </footer>
        )}

        <section className="photo-comments">
          <div className="photo-comments-list" ref={commentsListRef}>
            {commentsLoading && (
              <p className="photo-comments-status">正在接收电波…</p>
            )}

            {!commentsLoading && comments.length === 0 && (
              <p className="photo-comments-status">还没有留言</p>
            )}

            {comments.map((comment, index) => {
              const isMine = comment.memberId === session?.memberId;
              const previousComment = comments[index - 1];
              const shouldShowTime =
                !previousComment ||
                previousComment.memberId !== comment.memberId ||
                Math.abs(
                  new Date(comment.createdAt).getTime() -
                    new Date(previousComment.createdAt).getTime(),
                ) >=
                  60 * 1000;

              return (
                <div
                  className={`photo-comment-row ${
                    isMine
                      ? "photo-comment-row-mine"
                      : "photo-comment-row-partner"
                  } ${
                    comment.id === lastSentCommentId
                      ? "photo-comment-row-just-sent"
                      : ""
                  }`}
                  key={comment.id}
                >
                  {(!isMine || shouldShowTime) && (
                    <div className="photo-comment-meta">
                      {shouldShowTime && (
                        <time dateTime={comment.createdAt}>
                          {formatCommentTime(comment.createdAt)}
                        </time>
                      )}
                    </div>
                  )}

                  <div className="photo-comment-bubble">{comment.body}</div>
                </div>
              );
            })}
          </div>

          {commentError && (
            <p className="photo-comment-error" role="alert">
              {commentError}
            </p>
          )}

          <form className="photo-comment-composer" onSubmit={handleSubmit}>
            <input
              type="text"
              value={commentBody}
              onChange={(event) => setCommentBody(event.target.value)}
              onFocus={() => scrollCommentsToBottom("smooth")}
              maxLength={1000}
              placeholder="发送一条留言"
              aria-label="照片留言"
            />

            <button
              type="submit"
              disabled={commentSending || !commentBody.trim()}
              aria-label="发送留言"
            >
              ↑
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
