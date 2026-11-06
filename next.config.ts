import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Разрешаем открывать сайт с телефона по адресу в локальной сети (только для разработки)
  allowedDevOrigins: ["10.*.*.*", "192.168.*.*", "172.*.*.*"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
