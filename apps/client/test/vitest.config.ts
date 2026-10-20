import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/** jsdom-like environment for the React overlay (Phaser is stubbed in these tests). */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@mir/shared": path.resolve(__dirname, "../../../packages/shared/src/index.ts"),
      "@": path.resolve(__dirname, "../src"),
    },
  },
  test: {
    environment: "happy-dom",
    include: ["apps/client/test/**/*.dom.test.tsx"],
    setupFiles: ["apps/client/test/setup.ts"],
    testTimeout: 30000,
  },
});
