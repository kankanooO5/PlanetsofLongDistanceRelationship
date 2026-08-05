"use client";

import React, {
  ChangeEvent,
  CSSProperties,
  PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getUnreadPhotoCommentCount,
  PHOTO_COMMENT_READ_STATE_EVENT,
  preloadPhotoComments,
} from "../../../lib/api/photo-comment-client";
import { readMemberSession } from "../../../lib/storage/member-session";
import { formatLocalTime } from "../../../lib/utils/date";
import type { AlbumPhoto, UploadPhotoInput } from "../types/album";
import { createPhotoThumbnail } from "../utils/compress-image";

type TodayPhotosCardProps = {
  photos: AlbumPhoto[];
  uploading: boolean;
  error?: string;
  onUpload: (input: UploadPhotoInput) => Promise<unknown>;
  onOpenPhoto: (photo: AlbumPhoto) => void;
  loadThumbnail: (photoId: string) => Promise<void>;
};

type SwipeDirection = 1 | -1;

function localDateString() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function photoOwnerRole(photo: AlbumPhoto) {
  const record = photo as AlbumPhoto & Record<string, unknown>;

  const value =
    record.uploaderRole ??
    record.authorRole ??
    record.memberRole ??
    record.createdByRole ??
    record.role ??
    record.senderRole ??
    record.sender;

  return typeof value === "string" ? value : "";
}

function newPhotoSeenStorageKey(currentRole: string) {
  return `two-planets-seen-incoming-photos:${currentRole || "unknown"}`;
}

function readSeenIncomingPhotoIds(currentRole: string) {
  if (typeof window === "undefined") {
    return new Set<string>();
  }

  try {
    const raw = window.localStorage.getItem(
      newPhotoSeenStorageKey(currentRole),
    );
    const ids = raw ? JSON.parse(raw) : [];

    return new Set(
      Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : [],
    );
  } catch {
    return new Set<string>();
  }
}

function writeSeenIncomingPhotoIds(currentRole: string, ids: Set<string>) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      newPhotoSeenStorageKey(currentRole),
      JSON.stringify([...ids]),
    );
  } catch {
    // localStorage 不可用时跳过，不影响主流程。
  }
}

function photoIsFromOtherSide(
  photo: AlbumPhoto,
  currentMemberId: string,
  currentRole: string,
) {
  const record = photo as AlbumPhoto & Record<string, unknown>;
  const uploadedByMemberId = record.uploadedByMemberId;

  if (typeof uploadedByMemberId === "string" && currentMemberId) {
    return uploadedByMemberId !== currentMemberId;
  }

  const ownerRole = photoOwnerRole(photo);

  if (!ownerRole || !currentRole) {
    return false;
  }

  return ownerRole !== currentRole;
}

function photoMetaForDisplay(photo: AlbumPhoto) {
  const record = photo as AlbumPhoto & Record<string, unknown>;

  const uploader =
    record.uploaderName ??
    record.authorName ??
    record.memberName ??
    record.createdByName ??
    record.role ??
    "我们";

  const rawTime =
    record.createdAt ??
    record.created_at ??
    record.uploadedAt ??
    record.uploaded_at ??
    record.date;

  console.log("PHOTO TIME DEBUG", {
    createdAt: record.createdAt,
    created_at: record.created_at,
    uploadedAt: record.uploadedAt,
    uploaded_at: record.uploaded_at,
    date: record.date,
    rawTime,
  });

  let timeText = "刚刚";

  if (typeof rawTime === "string" || typeof rawTime === "number") {
    const normalized =
      typeof rawTime === "string" &&
      !rawTime.includes("T") &&
      !rawTime.endsWith("Z")
        ? rawTime.replace(" ", "T") + "Z"
        : rawTime;

    const date = new Date(normalized);

    if (!Number.isNaN(date.getTime())) {
      timeText = formatLocalTime(rawTime);
    }
  }

  return `${String(uploader)} · ${timeText}`;
}

function wrappedIndex(index: number, length: number) {
  if (length === 0) return 0;

  return (index + length) % length;
}

function buildStackPhotos({
  photos,
  activeIndex,
}: {
  photos: AlbumPhoto[];
  activeIndex: number;
}) {
  if (photos.length === 0) {
    return [];
  }

  const stack: Array<{
    photo: AlbumPhoto;
    stackIndex: number;
  }> = [];

  const seenPhotoIds = new Set<string>();

  function addPhoto(photoIndex: number, stackIndex: number) {
    const photo = photos[wrappedIndex(photoIndex, photos.length)];

    if (!photo) return;
    if (seenPhotoIds.has(photo.id)) return;

    stack.push({
      photo,
      stackIndex,
    });

    seenPhotoIds.add(photo.id);
  }

  // 0 = 当前照片，居中最上层。
  addPhoto(activeIndex, 0);

  // 1 = 上一张照片，左侧轻微露出。
  if (photos.length >= 3) {
    addPhoto(activeIndex - 1, 1);
  }

  // 2 = 下一张照片，右侧轻微露出。
  if (photos.length >= 2) {
    addPhoto(activeIndex + 1, 2);
  }

  return stack;
}

export function TodayPhotosCard({
  photos,
  uploading,
  error,
  onUpload,
  onOpenPhoto,
  loadThumbnail,
}: TodayPhotosCardProps) {
  const session = readMemberSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pointerStartXRef = useRef<number | null>(null);
  const pointerStartYRef = useRef<number | null>(null);
  const pointerMovedRef = useRef(false);
  const pointerTrackingRef = useRef(false);
  const gestureDirectionRef = useRef<"horizontal" | "vertical" | null>(null);
  const swipeDirectionRef = useRef<SwipeDirection>(1);
  const lastPointerXRef = useRef<number | null>(null);
  const lastPointerTimeRef = useRef<number | null>(null);
  const swipeVelocityRef = useRef(0);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [localError, setLocalError] = useState("");

  const [activeIndex, setActiveIndex] = useState(0);
  const [stackDirection, setStackDirection] = useState<SwipeDirection>(1);
  const [dragOffset, setDragOffset] = useState(0);

  const [dragging, setDragging] = useState(false);
  const [finishingSwipe, setFinishingSwipe] = useState(false);
  const [resettingStack, setResettingStack] = useState(false);
  const seenPhotoIdsRef = useRef<Set<string> | null>(null);
  const [newIncomingPhotoIds, setNewIncomingPhotoIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [unreadCommentCounts, setUnreadCommentCounts] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    if (activeIndex >= photos.length) {
      setActiveIndex(Math.max(0, photos.length - 1));
    }
  }, [activeIndex, photos.length]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!session || photos.length === 0) return;

    for (const photo of photos) {
      void preloadPhotoComments(photo.id, session.token);
    }
  }, [photos]);

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function clearSelection() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl("");
    setCaption("");
    setLocalError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setLocalError("请选择图片文件");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setLocalError("原图大小需要控制在 20MB 以内");
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setLocalError("");
  }

  async function handleUpload() {
    if (!selectedFile) {
      openFilePicker();
      return;
    }

    setLocalError("");

    try {
      const thumbnail = await createPhotoThumbnail(selectedFile);

      await onUpload({
        originalFile: selectedFile,
        thumbnailFile: thumbnail.thumbnailFile,
        caption: caption.trim(),
        takenAt: localDateString(),
        width: thumbnail.originalWidth,
        height: thumbnail.originalHeight,
      });

      setActiveIndex(0);
      setStackDirection(1);
      clearSelection();
    } catch (reason) {
      setLocalError(reason instanceof Error ? reason.message : "照片上传失败");
    }
  }

  function showPreviousPhoto() {
    if (photos.length <= 1 || finishingSwipe || resettingStack) return;

    setStackDirection(-1);
    swipeDirectionRef.current = -1;
    setActiveIndex((current) => wrappedIndex(current - 1, photos.length));
  }

  function showNextPhoto() {
    if (photos.length <= 1 || finishingSwipe || resettingStack) return;

    setStackDirection(1);
    swipeDirectionRef.current = 1;
    setActiveIndex((current) => wrappedIndex(current + 1, photos.length));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (photos.length <= 1 || finishingSwipe || resettingStack) {
      return;
    }

    pointerStartXRef.current = event.clientX;
    pointerStartYRef.current = event.clientY;
    lastPointerXRef.current = event.clientX;
    lastPointerTimeRef.current = performance.now();
    swipeVelocityRef.current = 0;
    pointerMovedRef.current = false;
    pointerTrackingRef.current = true;
    gestureDirectionRef.current = null;

    setDragging(false);
    setDragOffset(0);

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (
      !pointerTrackingRef.current ||
      pointerStartXRef.current === null ||
      pointerStartYRef.current === null
    ) {
      return;
    }

    const deltaX = event.clientX - pointerStartXRef.current;
    const deltaY = event.clientY - pointerStartYRef.current;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const now = performance.now();

    if (
      lastPointerXRef.current !== null &&
      lastPointerTimeRef.current !== null
    ) {
      const elapsed = Math.max(1, now - lastPointerTimeRef.current);
      const instantVelocity =
        (event.clientX - lastPointerXRef.current) / elapsed;

      swipeVelocityRef.current =
        swipeVelocityRef.current * 0.35 + instantVelocity * 0.65;
    }

    lastPointerXRef.current = event.clientX;
    lastPointerTimeRef.current = now;

    if (!gestureDirectionRef.current) {
      if (absX >= 5 && absX >= absY * 0.72) {
        gestureDirectionRef.current = "horizontal";
      } else if (absY >= 12 && absY > absX * 1.55) {
        gestureDirectionRef.current = "vertical";
      } else {
        return;
      }
    }

    if (gestureDirectionRef.current === "vertical") {
      pointerTrackingRef.current = false;
      return;
    }

    if (!dragging) {
      setDragging(true);
    }

    event.preventDefault();

    if (absX > 4) {
      pointerMovedRef.current = true;
    }

    const nextStackDirection: SwipeDirection = deltaX < 0 ? 1 : -1;

    swipeDirectionRef.current = nextStackDirection;

    const maxDragOffset = 96;
    const clampedOffset = Math.sign(deltaX) * Math.min(absX, maxDragOffset);

    setDragOffset(clampedOffset);
  }

  function finishDrag() {
    if (!dragging) {
      return;
    }

    const distanceThreshold = 72;
    const velocityThreshold = 0.42;
    const minVelocityDistance = 14;
    const velocity = swipeVelocityRef.current;

    const shouldGoNext =
      dragOffset <= -distanceThreshold ||
      (velocity <= -velocityThreshold && dragOffset <= -minVelocityDistance);

    const shouldGoPrevious =
      dragOffset >= distanceThreshold ||
      (velocity >= velocityThreshold && dragOffset >= minVelocityDistance);

    setDragging(false);

    if (!shouldGoNext && !shouldGoPrevious) {
      setResettingStack(true);
      setDragOffset(0);
      swipeVelocityRef.current = 0;

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setResettingStack(false);
          pointerTrackingRef.current = false;
          pointerMovedRef.current = false;
        });
      });

      return;
    }

    const indexStep: SwipeDirection = shouldGoNext ? 1 : -1;

    swipeDirectionRef.current = indexStep;
    setStackDirection(indexStep);
    setResettingStack(true);
    setFinishingSwipe(false);
    setActiveIndex((current) =>
      wrappedIndex(current + indexStep, photos.length),
    );
    setDragOffset(0);
    swipeVelocityRef.current = 0;

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setResettingStack(false);
        pointerTrackingRef.current = false;
        pointerMovedRef.current = false;
      });
    });
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    finishDrag();
  }

  function handlePointerCancel() {
    finishDrag();
  }

  const visiblePhotos = buildStackPhotos({
    photos,
    activeIndex,
  });


  useEffect(() => {
    if (photos.length === 0) {
      return;
    }

    const indexes = [
      activeIndex - 1,
      activeIndex,
      activeIndex + 1,
    ];

    indexes.forEach((index) => {
      const photo =
        photos[wrappedIndex(index, photos.length)];

      if (!photo?.thumbnailUrl) {
        return;
      }

      const image = new Image();
      image.src = photo.thumbnailUrl;
    });
  }, [activeIndex, photos]);

  const activePhoto = photos[activeIndex] ?? null;

  useEffect(() => {
    if (!activePhoto) {
      return;
    }

    const indexes = [
      activeIndex - 1,
      activeIndex,
      activeIndex + 1,
    ];

    indexes.forEach((index) => {
      const photo =
        photos[
          wrappedIndex(
            index,
            photos.length,
          )
        ];

      if (
        photo &&
        !photo.thumbnailUrl
      ) {
        void loadThumbnail(photo.id);
      }
    });
  }, [
    activeIndex,
    activePhoto,
    loadThumbnail,
    photos,
  ]);

  const dragProgress = Math.min(1, Math.abs(dragOffset) / 96);

  useEffect(() => {
    if (photos.length === 0) {
      return;
    }

    const currentSession = readMemberSession();
    const currentMemberId =
      typeof currentSession?.memberId === "string"
        ? currentSession.memberId
        : "";
    const currentRole =
      typeof currentSession?.role === "string" ? currentSession.role : "";

    const currentIds = new Set(photos.map((photo) => photo.id));
    const seenIncomingIds = readSeenIncomingPhotoIds(currentRole);

    /*
      首次进入时，如果本地没有任何记录，先把当前照片作为已见过处理。
      这样不会给历史照片误打 NEW。
      之后只要出现新的对方照片，就会显示 NEW。
    */
    if (seenPhotoIdsRef.current === null && seenIncomingIds.size === 0) {
      const incomingIds = photos
        .filter((photo) =>
          photoIsFromOtherSide(photo, currentMemberId, currentRole),
        )
        .map((photo) => photo.id);

      writeSeenIncomingPhotoIds(currentRole, new Set(incomingIds));
      seenPhotoIdsRef.current = currentIds;
      return;
    }

    const unreadIncomingPhotos = photos.filter(
      (photo) =>
        photoIsFromOtherSide(photo, currentMemberId, currentRole) &&
        !seenIncomingIds.has(photo.id),
    );

    if (unreadIncomingPhotos.length > 0) {
      const latestUnread = unreadIncomingPhotos[0];
      const latestIndex = photos.findIndex(
        (photo) => photo.id === latestUnread.id,
      );

      if (latestIndex >= 0) {
        setActiveIndex(latestIndex);
        setStackDirection(1);
        setDragOffset(0);
      }

      setNewIncomingPhotoIds(
        new Set(unreadIncomingPhotos.map((photo) => photo.id)),
      );
    } else {
      setNewIncomingPhotoIds(new Set());
    }

    seenPhotoIdsRef.current = currentIds;
  }, [photos]);

  useEffect(() => {
    if (!session?.token || !session.memberId) {
      setUnreadCommentCounts({});
      return;
    }

    let cancelled = false;

    async function refreshUnreadCommentCounts() {
      await Promise.all(
        photos.map((photo) =>
          preloadPhotoComments(photo.id, session.token, {
            force: true,
          }),
        ),
      );

      if (cancelled) return;

      const nextCounts: Record<string, number> = {};

      photos.forEach((photo) => {
        const unreadCount = getUnreadPhotoCommentCount(
          photo.id,
          session.token,
          session.memberId,
        );

        if (unreadCount > 0) {
          nextCounts[photo.id] = unreadCount;
        }
      });

      setUnreadCommentCounts(nextCounts);
    }

    void refreshUnreadCommentCounts();

    const intervalId = window.setInterval(refreshUnreadCommentCounts, 15000);

    function handleReadStateChange() {
      void refreshUnreadCommentCounts();
    }

    window.addEventListener(
      PHOTO_COMMENT_READ_STATE_EVENT,
      handleReadStateChange,
    );

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener(
        PHOTO_COMMENT_READ_STATE_EVENT,
        handleReadStateChange,
      );
    };
  }, [photos, session?.token, session?.memberId]);

  function dismissNewPhotoBadge(photoId: string) {
    const currentSession = readMemberSession();
    const currentRole =
      typeof currentSession?.role === "string" ? currentSession.role : "";

    const seenIncomingIds = readSeenIncomingPhotoIds(currentRole);
    seenIncomingIds.add(photoId);
    writeSeenIncomingPhotoIds(currentRole, seenIncomingIds);

    setNewIncomingPhotoIds((current) => {
      if (!current.has(photoId)) {
        return current;
      }

      const next = new Set(current);
      next.delete(photoId);
      return next;
    });
  }

  const stackStyle = {
    "--photo-drag-progress": String(dragProgress),
  } as CSSProperties;

  function getStackCardMotion(stackIndex: number) {
    const progress = dragging ? dragProgress : 0;
    const bottomArcY = 12 + 34 * Math.sin(Math.PI * progress);
    const dragRotate = Math.max(-3.2, Math.min(3.2, dragOffset / 58));

    if (stackIndex === 0) {
      return {
        x: dragOffset,
        y: 12,
        scale: 1.06,
        rotate: dragRotate,
        zIndex: 100,
      };
    }

    if (dragOffset < 0) {
      if (stackIndex === 2) {
        return {
          x: 78 - 54 * progress,
          y: 12,
          scale: 0.86 + 0.08 * progress,
          rotate: 5 - 3.6 * progress,
          zIndex: 20,
        };
      }

      return {
        x: -78 + 156 * progress,
        y: bottomArcY,
        scale: 0.82,
        rotate: -5 + 10 * progress,
        zIndex: 10,
      };
    }

    if (dragOffset > 0) {
      if (stackIndex === 1) {
        return {
          x: -78 + 54 * progress,
          y: 12,
          scale: 0.86 + 0.08 * progress,
          rotate: -5 + 3.6 * progress,
          zIndex: 20,
        };
      }

      return {
        x: 78 - 156 * progress,
        y: bottomArcY,
        scale: 0.82,
        rotate: 5 - 10 * progress,
        zIndex: 10,
      };
    }

    if (stackIndex === 1) {
      return {
        x: -78,
        y: 12,
        scale: 0.86,
        rotate: -5,
        zIndex: 20,
      };
    }

    return {
      x: 78,
      y: 12,
      scale: 0.86,
      rotate: 5,
      zIndex: 10,
    };
  }

  return (
    <section className="today-photos-card today-photos-card-large">
      <header className="today-photos-header">
        <div>
          <p>TODAY ON OUR PLANETS</p>
          <h2>今天的照片</h2>
        </div>

        <button
          type="button"
          className="today-photos-add"
          onClick={openFilePicker}
          aria-label="选择照片"
        >
          ＋
        </button>
      </header>

      <input
        ref={fileInputRef}
        className="today-photos-file-input"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        onChange={handleFileChange}
      />

      {selectedFile && previewUrl ? (
        <div className="today-photo-composer">
          <div className="today-photo-preview">
            <img src={previewUrl} alt="准备上传的照片" />

            <button
              type="button"
              onClick={clearSelection}
              aria-label="取消选择"
            >
              ×
            </button>
          </div>

          <input
            className="today-photo-caption-input"
            type="text"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            maxLength={200}
            placeholder="为这一刻写一句话"
          />

          <button
            type="button"
            className="today-photo-submit"
            disabled={uploading}
            onClick={handleUpload}
          >
            {uploading ? "正在送往小宇宙…" : "发送一段新电波"}
          </button>
        </div>
      ) : photos.length > 0 && activePhoto ? (
        <>
          <div
            className={`today-photo-stack ${
              stackDirection === 1
                ? "today-photo-stack-forward"
                : "today-photo-stack-backward"
            } ${dragging ? "today-photo-stack-dragging" : ""} ${
              finishingSwipe ? "today-photo-stack-finishing" : ""
            } ${resettingStack ? "today-photo-stack-resetting" : ""}`}
            style={stackStyle}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onContextMenu={(event) => {
              event.preventDefault();
            }}
          >
            {[...visiblePhotos].reverse().map(({ photo, stackIndex }) => {
              const isActive = stackIndex === 0;
              const motion = getStackCardMotion(stackIndex);

              return (
                <button
                  type="button"
                  className={`today-photo-stack-card today-photo-stack-card-${stackIndex}`}
                  style={
                    {
                      "--card-x": `${motion.x}px`,
                      "--card-y": `${motion.y}px`,
                      "--card-scale": String(motion.scale),
                      "--card-rotate": `${motion.rotate}deg`,
                      "--card-z": String(motion.zIndex),
                    } as CSSProperties
                  }
                  key={`stack-${stackIndex}`}
                  onClick={(event) => {
                    event.preventDefault();

                    if (!isActive) {
                      pointerMovedRef.current = false;
                      return;
                    }

                    dismissNewPhotoBadge(photo.id);

                    if (!pointerMovedRef.current && !finishingSwipe) {
                      onOpenPhoto(photo);
                    }

                    pointerMovedRef.current = false;
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault();
                  }}
                  aria-label={isActive ? "查看当前照片原图" : "后方照片"}
                  tabIndex={isActive ? 0 : -1}
                >
                  <img
                    src={photo.thumbnailUrl}
                    alt={isActive ? photo.caption || "照片" : ""}
                    loading={
                        isActive || Math.abs(stackIndex) <= 1
                          ? "eager"
                          : "lazy"
                      }
                    decoding="async"
                    draggable={false}
                  />

                  {newIncomingPhotoIds.has(photo.id) && (
                    <span className="today-photo-new-badge">NEW!</span>
                  )}

                  {(unreadCommentCounts[photo.id] ?? 0) > 0 && (
                    <span className="today-photo-comment-unread-badge">
                      {Math.min(unreadCommentCounts[photo.id] ?? 0, 99)}
                    </span>
                  )}

                  {isActive && photo.caption && (
                    <span className="today-photo-stack-overlay">
                      <strong>{photo.caption}</strong>
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {photos[activeIndex] && (
            <p className="today-photo-stack-meta">
              {photoMetaForDisplay(photos[activeIndex])}
            </p>
          )}

          {photos.length > 1 && (
            <div className="today-photo-controls">
              <button
                type="button"
                onClick={showPreviousPhoto}
                aria-label="上一张照片"
              >
                ‹
              </button>

              <div
                className="today-photo-dots"
                aria-label={`第 ${activeIndex + 1} 张，共 ${photos.length} 张`}
              >
                {photos.map((photo, index) => (
                  <button
                    type="button"
                    key={photo.id}
                    className={index === activeIndex ? "is-active" : ""}
                    onClick={() => {
                      setStackDirection(index >= activeIndex ? 1 : -1);
                      setActiveIndex(index);
                    }}
                    aria-label={`查看第 ${index + 1} 张照片`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={showNextPhoto}
                aria-label="下一张照片"
              >
                ›
              </button>
            </div>
          )}
        </>
      ) : (
        <button
          type="button"
          className="today-photo-empty today-photo-empty-large"
          onClick={openFilePicker}
        >
          <span aria-hidden="true">✦</span>

          <strong>留下一张今天的照片</strong>

          <small>上传后将以大图呈现在首页，多张照片可左右滑动。</small>
        </button>
      )}

      {(localError || error) && (
        <p className="today-photos-error" role="alert">
          {localError || error}
        </p>
      )}
    </section>
  );
}
