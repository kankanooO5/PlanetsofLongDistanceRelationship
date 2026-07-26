"use client";

import { AlbumTab } from "../../album/components/AlbumTab";
import { DEMO_ALBUM_PHOTOS } from "../../album/data/demo-album";

export function MemoriesTab() {
  return (
    <AlbumTab
      photos={DEMO_ALBUM_PHOTOS}
      onAddPhoto={() => {
        window.alert("照片上传功能将在下一步接入");
      }}
    />
  );
}
