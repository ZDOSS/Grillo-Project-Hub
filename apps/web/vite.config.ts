import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  // For GitHub Pages deployment under /Grillo-Project-Hub/ (project site).
  // Set GITHUB_PAGES=true in the deploy workflow so the built assets use the correct subpath.
  base: process.env.GITHUB_PAGES ? '/Grillo-Project-Hub/' : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "Grillo Project Hub",
        short_name: "GPH",
        description: "A free, open source, hybrid project management suite.",
        start_url: "/",
        display: "standalone",
        background_color: "#f7f5f0",
        theme_color: "#4f8a55",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest,woff2}"]
      }
    })
  ],
  resolve: {
    alias: {
      "@gph/core": fileURLToPath(new URL("../../packages/core/src", import.meta.url)),
      "@gph/ui": fileURLToPath(new URL("../../packages/ui/src", import.meta.url))
    }
  },
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: "dist",
    sourcemap: true
  }
});
