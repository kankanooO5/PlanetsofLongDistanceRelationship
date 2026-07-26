"use client";

import { AlbumTab } from "../../album/components/AlbumTab";
import type { AlbumPhoto } from "../../album/types/album";

type MemoriesTabProps = {
  photos: AlbumPhoto[];
  loading: boolean;
  onOpenPhoto: (
    photo: AlbumPhoto,
  ) => void;
};

export function MemoriesTab({
  photos,
  loading,
  onOpenPhoto,
}: MemoriesTabProps) {
  return (
    <AlbumTab
      photos={photos}
      loading={loading}
      onOpenPhoto={onOpenPhoto}
    />
  );
}
