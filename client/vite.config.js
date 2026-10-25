import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // The administrator sign-in address lives in the project-root .env.local, beside the server's
  // settings. Only this one key is read from there: the secrets in that file never reach the bundle.
  const rootEnv = loadEnv(mode, projectRoot, "VITE_ADMIN_LOGIN_PATH");
  if (rootEnv.VITE_ADMIN_LOGIN_PATH) process.env.VITE_ADMIN_LOGIN_PATH = rootEnv.VITE_ADMIN_LOGIN_PATH;

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
      env: { VITE_CAREWELL_DATA_MODE: "demo", VITE_ADMIN_LOGIN_PATH: "/staff-test-sign-in" },
      setupFiles: "./src/test/setup.js",
      css: false,
      include: ["src/**/*.test.{js,jsx}"],
    },
  };
});
