"use client";

import type { AlbumPhoto } from "../types/album";

type AlbumTabProps = {
  photos: AlbumPhoto[];
  loading?: boolean;
  onOpenPhoto: (photo: AlbumPhoto) => void;
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

export function AlbumTab({
  photos,
  loading = false,
  onOpenPhoto,
}: AlbumTabProps) {
  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">OUR LITTLE UNIVERSE</p>

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
            <div className="album-empty-illustration" aria-hidden="true">
              <span className="album-empty-planet album-empty-planet-a" />
              <span className="album-empty-planet album-empty-planet-b" />
            </div>

            <h2>相簿还是空的</h2>

            <p>在首页上传第一张照片，留下属于你们的第一颗记忆星星。</p>
          </div>
        ) : (
          <div className="album-grid">
            {[0, 1].map((columnIndex) => (
              <div
                className="album-masonry-column"
                key={`album-column-${columnIndex}`}
              >
                {photos
                  .filter((_, index) => index % 2 === columnIndex)
                  .map((photo, columnPhotoIndex) => {
                    const originalIndex = columnPhotoIndex * 2 + columnIndex;

                    return (
                      <article
                        className={`album-card ${
                          photo.height &&
                          photo.width &&
                          photo.height > photo.width
                            ? "album-card-tall"
                            : ""
                        }`}
                        key={photo.id}
                      >
                        <button
                          type="button"
                          className="album-image-wrap"
                          style={{
                            aspectRatio:
                              photo.width && photo.height
                                ? `${photo.width} / ${photo.height}`
                                : undefined,
                            backgroundImage: `url(${photo.thumbnailUrl})`,
                          }}
                          onClick={() => onOpenPhoto(photo)}
                          aria-label="查看照片原图"
                        >
                          <img
                            src={photo.thumbnailUrl}
                            alt=""
                            loading={originalIndex < 2 ? "eager" : "lazy"}
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        </button>

                        <div className="album-card-copy">
                          {photo.caption && <p>{photo.caption}</p>}

                          <time dateTime={photo.takenAt}>
                            {formatPhotoDate(photo.takenAt)}
                          </time>
                        </div>
                      </article>
                    );
                  })}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
