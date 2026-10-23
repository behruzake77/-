import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: __dirname,
  publicDir: "public",
  plugins: [react()],
  resolve: {
    alias: {
      "@mir/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: process.env.MIR_API ?? "http://127.0.0.1:8787",
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    allowedHosts: true,
  },
  build: {
    outDir: path.resolve(__dirname, "../../dist/client"),
    emptyOutDir: true,
    target: "es2020",
    sourcemap: false,
    chunkSizeWarningLimit: 1600,
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ["phaser"],
          three: ["three"],
          react: ["react", "react-dom"],
        },
      },
    },
  },
});
