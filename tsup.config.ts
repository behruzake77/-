import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "apps/server/src/index.ts" },
  outDir: "dist/server",
  format: ["esm"],
  target: "node22",
  platform: "node",
  sourcemap: true,
  clean: true,
  // Node dependencies stay external so native/ESM packages keep their own runtime.
  skipNodeModulesBundle: true,
  // The shared package is consumed as TypeScript source and must be bundled.
  noExternal: ["@mir/shared"],
});
