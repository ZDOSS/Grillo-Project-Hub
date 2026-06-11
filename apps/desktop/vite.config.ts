import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@gph/core": fileURLToPath(new URL("../../packages/core/src", import.meta.url)),
      "@gph/ui": fileURLToPath(new URL("../../packages/ui/src", import.meta.url))
    }
  },
  server: {
    port: 5174,
    strictPort: true,
    host: false
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    target: "es2022"
  },
  clearScreen: false
});
