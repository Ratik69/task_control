import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Контроль задач",
    short_name: "Задачи",
    description: "Ежедневные задачи ресторана с фото-проверкой",
    start_url: "/",
    display: "standalone",
    background_color: "#F6F5F2",
    theme_color: "#1F6F5C",
    lang: "ru",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
