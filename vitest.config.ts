import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@mir/shared": path.resolve(__dirname, "packages/shared/src/index.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["packages/**/*.test.ts", "apps/server/**/*.test.ts", "apps/client/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
