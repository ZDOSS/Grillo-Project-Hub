import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"]
  },
  resolve: {
    alias: {
      "@gph/core": fileURLToPath(new URL("../../packages/core/src", import.meta.url)),
      "@gph/ui": fileURLToPath(new URL("../../packages/ui/src", import.meta.url))
    }
  }
});
