import type { PhotoComment } from "../../features/album/types/photo-comment";

type ErrorPayload = {
  error?: string;
};

type CommentListPayload = {
  comments: PhotoComment[];
};

const commentCache = new Map<string, PhotoComment[]>();

const pendingRequests = new Map<string, Promise<PhotoComment[]>>();

function cacheKey(photoId: string, memberToken: string) {
  return `${memberToken}:${photoId}`;
}

async function readError(response: Response) {
  try {
    const payload = (await response.json()) as ErrorPayload;

    return payload.error ?? "请求失败，请稍后再试";
  } catch {
    return "请求失败，请稍后再试";
  }
}

export function getCachedPhotoComments(photoId: string, memberToken: string) {
  return commentCache.get(cacheKey(photoId, memberToken));
}

export async function fetchPhotoComments(
  photoId: string,
  memberToken: string,
  options?: {
    force?: boolean;
  },
) {
  const key = cacheKey(photoId, memberToken);

  if (!options?.force) {
    const cached = commentCache.get(key);

    if (cached) {
      return cached;
    }

    const pending = pendingRequests.get(key);

    if (pending) {
      return pending;
    }
  }

  const request = fetch(`/api/photos/${encodeURIComponent(photoId)}/comments`, {
    headers: {
      "x-member-token": memberToken,
    },
    cache: "no-store",
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const payload = (await response.json()) as CommentListPayload;

      commentCache.set(key, payload.comments);

      return payload.comments;
    })
    .finally(() => {
      pendingRequests.delete(key);
    });

  pendingRequests.set(key, request);

  return request;
}

export function preloadPhotoComments(
  photoId: string,
  memberToken: string,
  options?: {
    force?: boolean;
  },
) {
  return fetchPhotoComments(photoId, memberToken, options).catch(() => []);
}

export async function sendPhotoComment(
  photoId: string,
  memberToken: string,
  body: string,
) {
  const response = await fetch(
    `/api/photos/${encodeURIComponent(photoId)}/comments`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-member-token": memberToken,
      },
      body: JSON.stringify({
        body,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const payload = (await response.json()) as {
    comment: PhotoComment;
  };

  const key = cacheKey(photoId, memberToken);

  const existing = commentCache.get(key) ?? [];

  commentCache.set(key, [...existing, payload.comment]);

  return payload.comment;
}

export const PHOTO_COMMENT_READ_STATE_EVENT = "photo-comment-read-state-change";

function seenCommentStorageKey(memberToken: string, photoId: string) {
  return `two-planets-photo-comment-seen:${memberToken}:${photoId}`;
}

function readSeenCommentIds(memberToken: string, photoId: string) {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const rawValue = window.localStorage.getItem(
      seenCommentStorageKey(memberToken, photoId),
    );

    const values = rawValue ? (JSON.parse(rawValue) as string[]) : [];

    return new Set(values.filter(Boolean));
  } catch {
    return new Set<string>();
  }
}

function writeSeenCommentIds(
  memberToken: string,
  photoId: string,
  commentIds: Set<string>,
) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      seenCommentStorageKey(memberToken, photoId),
      JSON.stringify([...commentIds]),
    );
  } catch {
    // localStorage may be unavailable in private mode.
  }
}

export function getUnreadPhotoCommentCount(
  photoId: string,
  memberToken: string,
  currentMemberId: string,
) {
  const comments = getCachedPhotoComments(photoId, memberToken) ?? [];
  const seenCommentIds = readSeenCommentIds(memberToken, photoId);

  return comments.filter(
    (comment) =>
      comment.memberId !== currentMemberId && !seenCommentIds.has(comment.id),
  ).length;
}

export function markPhotoCommentsRead(
  photoId: string,
  memberToken: string,
  currentMemberId: string,
  comments = getCachedPhotoComments(photoId, memberToken) ?? [],
) {
  const seenCommentIds = readSeenCommentIds(memberToken, photoId);

  comments.forEach((comment) => {
    if (comment.memberId !== currentMemberId) {
      seenCommentIds.add(comment.id);
    }
  });

  writeSeenCommentIds(memberToken, photoId, seenCommentIds);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(PHOTO_COMMENT_READ_STATE_EVENT, {
        detail: {
          photoId,
        },
      }),
    );
  }
}
