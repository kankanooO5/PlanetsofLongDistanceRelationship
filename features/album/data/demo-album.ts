import type { AlbumPhoto } from "../types/album";

export const DEMO_ALBUM_PHOTOS: AlbumPhoto[] = [
  {
    id: "demo-1",
    imageUrl: "/album/demo-1.svg",
    caption: "我们的小宇宙，从这里开始。",
    takenAt: "2025-05-23",
    createdAt: "2025-05-23T00:00:00.000Z",
    width: 900,
    height: 1200,
  },
  {
    id: "demo-2",
    imageUrl: "/album/demo-2.svg",
    caption: "在不同的城市，看见同一片天空。",
    takenAt: "2025-08-31",
    createdAt: "2025-08-31T00:00:00.000Z",
    width: 1200,
    height: 900,
  },
  {
    id: "demo-3",
    imageUrl: "/album/demo-3.svg",
    caption: "普通的一天，也值得被好好收藏。",
    takenAt: "2026-01-01",
    createdAt: "2026-01-01T00:00:00.000Z",
    width: 900,
    height: 1100,
  },
];
