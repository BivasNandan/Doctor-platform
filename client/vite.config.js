import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],

    // GitHub Pages serves the app from /Doctor-platform/, Vercel from the root.
    // Override with VITE_BASE_PATH for any other host.
    base: process.env.VERCEL ? "/" : env.VITE_BASE_PATH || "/Doctor-platform/",

    server: {
      // In development the browser talks to /api on the Vite origin and Vite
      // forwards it to the Express server: no CORS setup, cookies stay same-site.
      proxy: {
        "/api": {
          target: env.VITE_DEV_PROXY_TARGET || "http://localhost:3000",
          changeOrigin: true,
        },
      },
    },

    build: {
      // Vite 8's default Lightning CSS minifier can drop the standard
      // backdrop-filter declaration, breaking glass effects in Chromium.
      // Keep CSS unminified until the upstream minifier regression is resolved.
      cssMinify: false,
    },

    test: {
      environment: "jsdom",
      // Tests always run against the in-memory demo backend, whatever .env.local says.
      env: { VITE_CAREWELL_DATA_MODE: "demo" },
      setupFiles: "./src/test/setup.js",
      css: false,
      include: ["src/**/*.test.{js,jsx}"],
      // Test files share the in-memory demo service state; parallel files can reset each other's fixtures.
      fileParallelism: false,
    },
  };
});
