"use client";

import { useEffect, useRef } from "react";

import type { AlbumPhoto } from "../types/album";
import { formatLocalDateTime } from "../../../lib/utils/date";

type AlbumTabProps = {
  photos: AlbumPhoto[];
  loading?: boolean;
  onOpenPhoto: (photo: AlbumPhoto) => void;
  loadThumbnail: (photoId: string) => Promise<void>;
  loadMorePhotos: () => Promise<void>;
  hasMorePhotos: boolean;
  loadingMorePhotos: boolean;
};

type AlbumCardProps = {
  photo: AlbumPhoto;
  originalIndex: number;
  onOpenPhoto: (photo: AlbumPhoto) => void;
  loadThumbnail: (photoId: string) => Promise<void>;
};

function AlbumCard({
  photo,
  originalIndex,
  onOpenPhoto,
  loadThumbnail,
}: AlbumCardProps) {
  const cardRef = useRef<HTMLElement | null>(null);

  const thumbnailUrl =
    photo.thumbnailUrl?.startsWith("blob:")
      ? photo.thumbnailUrl
      : undefined;

  useEffect(() => {
    if (thumbnailUrl) {
      return;
    }

    const card = cardRef.current;

    if (!card) {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      void loadThumbnail(photo.id);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (!entry?.isIntersecting) {
          return;
        }

        void loadThumbnail(photo.id);
        observer.disconnect();
      },
      {
        // 提前约 600px 加载，避免滑到照片时才出现空白。
        rootMargin: "600px 0px",
        threshold: 0.01,
      },
    );

    observer.observe(card);

    return () => {
      observer.disconnect();
    };
  }, [loadThumbnail, photo.id, thumbnailUrl]);

  return (
    <article
      ref={cardRef}
      className={`album-card ${
        photo.height &&
        photo.width &&
        photo.height > photo.width
          ? "album-card-tall"
          : ""
      }`}
    >
      <button
        type="button"
        className="album-image-wrap"
        style={{
          aspectRatio:
            photo.width && photo.height
              ? `${photo.width} / ${photo.height}`
              : undefined,
          backgroundImage: thumbnailUrl
            ? `url(${thumbnailUrl})`
            : undefined,
        }}
        onClick={() => onOpenPhoto(photo)}
        aria-label="查看照片原图"
      >
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            loading={originalIndex < 2 ? "eager" : "lazy"}
            fetchPriority={
              originalIndex < 2 ? "high" : "auto"
            }
            decoding="async"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <span
            className="album-image-placeholder"
            aria-hidden="true"
          />
        )}
      </button>

      <div className="album-card-copy">
        {photo.caption && <p>{photo.caption}</p>}

        <time dateTime={photo.takenAt}>
          {formatLocalDateTime(photo.createdAt)}
        </time>
      </div>
    </article>
  );
}

export function AlbumTab({
  photos,
  loading = false,
  onOpenPhoto,
  loadThumbnail,
  loadMorePhotos,
  hasMorePhotos,
  loadingMorePhotos,
}: AlbumTabProps) {
  const loadMoreRef = useRef<HTMLDivElement | null>(
    null,
  );

  useEffect(() => {
    if (
      !hasMorePhotos ||
      loadingMorePhotos
    ) {
      return;
    }

    const sentinel = loadMoreRef.current;

    if (!sentinel) {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      void loadMorePhotos();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMorePhotos();
        }
      },
      {
        // 接近底部前提前请求下一页。
        rootMargin: "800px 0px",
        threshold: 0,
      },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [
    hasMorePhotos,
    loadingMorePhotos,
    loadMorePhotos,
  ]);

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">
            OUR LITTLE UNIVERSE
          </p>

          <h1>相簿</h1>

          <p className="tab-header-description">
            收藏我们在不同星球上，共同经历的每一个瞬间。
          </p>
        </div>
      </header>

      <section className="content album-page">
        <div className="album-summary">
          <span>{photos.length} 张照片</span>
          <span aria-hidden="true">·</span>
          <span>两颗星球的共同记忆</span>
        </div>

        {loading ? (
          <div className="album-loading">
            <span />
            <p>正在整理相簿…</p>
          </div>
        ) : photos.length === 0 ? (
          <div className="album-empty">
            <div
              className="album-empty-illustration"
              aria-hidden="true"
            >
              <span className="album-empty-planet album-empty-planet-a" />
              <span className="album-empty-planet album-empty-planet-b" />
            </div>

            <h2>相簿还是空的</h2>

            <p>
              在首页上传第一张照片，留下属于你们的第一颗记忆星星。
            </p>
          </div>
        ) : (
          <>
            <div className="album-grid">
              {[0, 1].map((columnIndex) => (
                <div
                  className="album-masonry-column"
                  key={`album-column-${columnIndex}`}
                >
                  {photos
                    .filter(
                      (_, index) =>
                        index % 2 === columnIndex,
                    )
                    .map(
                      (
                        photo,
                        columnPhotoIndex,
                      ) => {
                        const originalIndex =
                          columnPhotoIndex * 2 +
                          columnIndex;

                        return (
                          <AlbumCard
                            key={photo.id}
                            photo={photo}
                            originalIndex={
                              originalIndex
                            }
                            onOpenPhoto={
                              onOpenPhoto
                            }
                            loadThumbnail={
                              loadThumbnail
                            }
                          />
                        );
                      },
                    )}
                </div>
              ))}
            </div>

            {hasMorePhotos && (
              <div
                ref={loadMoreRef}
                className="album-load-more-sentinel"
                style={{ height: 1 }}
                aria-hidden="true"
              />
            )}
          </>
        )}
      </section>
    </>
  );
}
