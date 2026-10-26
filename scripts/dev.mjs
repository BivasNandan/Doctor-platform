#!/usr/bin/env node
// Starts the API (server/) and the website (client/) together:   npm run dev
// Output is labelled [api] and [web]. Press Ctrl+C once to stop both.
// The website opens in your browser by itself when it is ready (use `npm run dev -- --no-open` to skip that).
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (!existsSync(resolve(root, ".env.local"))) {
  console.error("No .env.local found. Run `npm run setup` first.");
  process.exit(1);
}
for (const folder of ["server", "client"]) {
  if (!existsSync(resolve(root, folder, "node_modules"))) {
    console.error(`${folder}/ has no packages yet. Run \`npm run setup\` first.`);
    process.exit(1);
  }
}

const children = [];
const noOpen = process.argv.includes("--no-open");
let opened = false;

/** Opens the website in the default browser, once, when Vite reports its address. */
function openBrowser(url) {
  if (opened || noOpen) return;
  opened = true;
  const [command, args] =
    process.platform === "win32"
      ? ["cmd", ["/c", "start", "", url]]
      : process.platform === "darwin"
        ? ["open", [url]]
        : ["xdg-open", [url]];
  spawn(command, args, { stdio: "ignore", detached: true }).on("error", () => {
    console.log(`Open ${url} in your browser.`);
  });
}

/**
 * Resolves once the API answers (or after a minute), so the page never opens before the API is up.
 * Asking for the specialties also opens the first database connection, which is the slow part.
 */
async function waitForApi() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch("http://localhost:3000/api/v1/specialties")).ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((done) => setTimeout(done, 500));
  }
}

function start(label, color, folder) {
  const child = spawn("npm", ["run", "dev"], {
    cwd: resolve(root, folder),
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, FORCE_COLOR: "1" },
  });
  const prefix = `\x1b[${color}m[${label}]\x1b[0m `;
  for (const stream of [child.stdout, child.stderr])
    createInterface({ input: stream }).on("line", (line) => {
      console.log(prefix + line);
      // Vite prints "Local:   http://localhost:5173/Doctor-platform/" when it is ready.
      const address = label === "web" && line.replace(/\x1b\[[0-9;]*m/g, "").match(/Local:\s+(https?:\/\/\S+)/);
      if (address) waitForApi().then(() => openBrowser(address[1]));
    });
  child.on("exit", (code) => {
    console.log(`${prefix}stopped (exit code ${code})`);
    stop();
  });
  children.push(child);
}

let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (process.platform === "win32") spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    else child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(0), 500);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

start("api", "36", "server");
start("web", "35", "client");
console.log("Starting the API on http://localhost:3000 and the website on http://localhost:5173/Doctor-platform/ …");
