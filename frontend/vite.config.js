import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "TaskFlow - Task & Time Manager",
        short_name: "TaskFlow",
        description: "Unified task management and time-block scheduling",
        theme_color: "#0f0f1a",
        background_color: "#0f0f1a",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          {
            src: "pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: { globPatterns: ["**/*.{js,css,html,ico,png,svg}"] },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
        timeout: 30000,
        proxyTimeout: 30000,
        configure: (proxy) => {
          proxy.on("error", (err) => {
            if (err.code === "ECONNABORTED" || err.code === "ECONNRESET") return;
            console.error("API proxy error:", err);
          });
        },
      },
      "/socket.io": {
        target: "http://localhost:5000",
        ws: true,
        changeOrigin: true,
        secure: false,
        timeout: 30000,
        proxyTimeout: 30000,
        configure: (proxy) => {
          proxy.on("error", (err) => {
            if (err.code === "ECONNABORTED" || err.code === "ECONNRESET") return;
            console.error("WS proxy error:", err);
          });
        },
      },
    },
  },
  build: { sourcemap: false, chunkSizeWarningLimit: 800 },
});
