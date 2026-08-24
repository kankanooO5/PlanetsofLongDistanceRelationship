import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "两颗星球",
    short_name: "两颗星球",
    description: "只属于两个人的小宇宙",
    start_url: "/",
    display: "standalone",
    background_color: "#fbfaf8",
    theme_color: "#fbfaf8",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png?v=20260825-1", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png?v=20260825-1", sizes: "512x512", type: "image/png" },
    ],
  };
}
