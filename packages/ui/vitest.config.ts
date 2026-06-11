import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["./src/test-setup.ts"]
  },
  resolve: {
    alias: {
      "@gph/core": fileURLToPath(new URL("../../packages/core/src", import.meta.url)),
      "@gph/ui": fileURLToPath(new URL("./src", import.meta.url))
    }
  }
});
