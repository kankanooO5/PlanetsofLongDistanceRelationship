"use client";

import { AlbumTab } from "../../album/components/AlbumTab";
import type { AlbumPhoto } from "../../album/types/album";

type MemoriesTabProps = {
  photos: AlbumPhoto[];
  loading: boolean;
  onOpenPhoto: (
    photo: AlbumPhoto,
  ) => void;
  loadThumbnail: (
    photoId: string,
  ) => Promise<void>;
  loadMorePhotos: () => Promise<void>;
  hasMorePhotos: boolean;
  loadingMorePhotos: boolean;
};

export function MemoriesTab({
  photos,
  loading,
  onOpenPhoto,
  loadThumbnail,
  loadMorePhotos,
  hasMorePhotos,
  loadingMorePhotos,
}: MemoriesTabProps) {
  return (
    <AlbumTab
      photos={photos}
      loading={loading}
      onOpenPhoto={onOpenPhoto}
      loadThumbnail={loadThumbnail}
      loadMorePhotos={loadMorePhotos}
      hasMorePhotos={hasMorePhotos}
      loadingMorePhotos={loadingMorePhotos}
    />
  );
}
