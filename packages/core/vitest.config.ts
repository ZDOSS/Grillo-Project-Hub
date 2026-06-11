import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"]
  },
  resolve: {
    alias: {
      "@gph/core": new URL("./src/index.ts", import.meta.url).pathname
    }
  }
});
