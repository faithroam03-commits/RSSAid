import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Random Link",
    short_name: "Random Link",
    description: "登録したURLをランダム表示するアプリ",
    start_url: "/",
    display: "standalone",
background_color: "#ffffff",
theme_color: "#ffffff",

icons: [
  {
    src: "/icon-192.png",
    sizes: "192x192",
    type: "image/png",
    purpose: "any",
  },
  {
    src: "/icon-512.png",
    sizes: "512x512",
    type: "image/png",
    purpose: "any",
  },
  {
    src: "/icon-512-2.png",
    sizes: "512x512",
    type: "image/png",
    purpose: "maskable",
  },
],
    share_target: {
      action: "/register",
      method: "GET",
      params: {
        title: "title",
        text: "text",
        url: "url",
      },
    },
  };
}