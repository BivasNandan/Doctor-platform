#!/usr/bin/env node
// One-command setup for a fresh copy of Carewell:   npm run setup
//
//  1. checks Node.js
//  2. creates .env.local (asks for the values, or keeps the one a teammate sent you)
//  3. installs the packages of server/ and client/
//  4. checks the database and file bucket, creates the tables, seeds the first admin
//  5. points the website at the real API
//
// It is safe to run again: every step skips or repeats harmlessly. Secrets are typed hidden
// and are never printed. Flags: --skip-install (packages already installed), --skip-db (only write the files).
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const flags = new Set(process.argv.slice(2));
const envFile = resolve(root, ".env.local");
const clientEnvFile = resolve(root, "client/.env.local");

const bold = (text) => `\x1b[1m${text}\x1b[0m`;
const green = (text) => `\x1b[32m${text}\x1b[0m`;
const red = (text) => `\x1b[31m${text}\x1b[0m`;
const step = (text) => console.log(`\n${bold(`▶ ${text}`)}`);
const fail = (message) => {
  console.error(`\n${red("✖")} ${message}`);
  process.exit(1);
};

// ── 1. Node.js ────────────────────────────────────────────────────────────────────────────
const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 20 || (major === 20 && minor < 19))
  fail(`Node.js 20.19 or newer is required (you have ${process.versions.node}). Install it from https://nodejs.org and run this again.`);
console.log(bold("Carewell setup"));
console.log(`Node.js ${process.versions.node} ${green("✔")}`);

// ── 2. .env.local ─────────────────────────────────────────────────────────────────────────
const parseEnv = (text) =>
  Object.fromEntries(
    text
      .split(/\r?\n/)
      .filter((line) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line))
      .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1).replace(/^"(.*)"$/, "$1")]),
  );

const isUrl = (protocols) => (value) => {
  try {
    return protocols.includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

/** What `.env.local` needs. `secret` values are typed hidden. */
const QUESTIONS = [
  { key: "DATABASE_URL", ask: "Database URL (Neon: the pooled connection string)", secret: true, check: isUrl(["postgres:", "postgresql:"]), hint: "It starts with postgresql://" },
  { key: "DATABASE_URL_UNPOOLED", ask: "Direct database URL (Enter = same as above)", secret: true, check: isUrl(["postgres:", "postgresql:"]), fallback: (v) => v.DATABASE_URL },
  { key: "AWS_ENDPOINT_URL_S3", ask: "File storage endpoint (Neon Object Storage URL)", check: isUrl(["https:", "http:"]), hint: "It starts with https://" },
  { key: "AWS_ACCESS_KEY_ID", ask: "File storage access key", secret: true, check: (value) => value.length > 3 },
  { key: "AWS_SECRET_ACCESS_KEY", ask: "File storage secret key", secret: true, check: (value) => value.length > 3 },
  { key: "AWS_REGION", ask: "File storage region", fallback: () => "us-east-2" },
  { key: "S3_BUCKET", ask: "File storage bucket", fallback: () => "assets" },
  { key: "SEED_ADMIN_EMAIL", ask: "Administrator email", fallback: () => "admin@carewell.test", check: (value) => /^\S+@\S+\.\S+$/.test(value), hint: "Enter an email address" },
  { key: "SEED_ADMIN_PASSWORD", ask: "Administrator password (at least 10 characters, Enter = make one)", secret: true, fallback: () => randomBytes(12).toString("base64url"), check: (value) => value.length >= 10, hint: "Use at least 10 characters" },
  { key: "SMTP_HOST", ask: "Email server for sending codes (Enter = skip: codes appear in the server window)", fallback: () => "" },
  { key: "SMTP_USER", ask: "Email account", when: (v) => v.SMTP_HOST },
  { key: "SMTP_PASSWORD", ask: "Email app password", secret: true, when: (v) => v.SMTP_HOST },
];

let muted = false;
const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: Boolean(process.stdin.isTTY) });
const writeOut = rl._writeToOutput?.bind(rl);
if (writeOut) rl._writeToOutput = (text) => (muted ? writeOut(text.includes("\n") ? "\n" : "*".repeat(text.length)) : writeOut(text));
const lines = [];
let lineWaiter;
rl.on("line", (line) => (lineWaiter ? lineWaiter(line) : lines.push(line)));
rl.on("close", () => lineWaiter?.(""));

function ask(question, secret) {
  process.stdout.write(`${question}: `);
  muted = Boolean(secret && process.stdin.isTTY);
  return new Promise((done) => {
    const finish = (line) => {
      muted = false;
      lineWaiter = undefined;
      if (!process.stdin.isTTY) process.stdout.write("\n");
      done(line.trim());
    };
    if (lines.length) finish(lines.shift());
    else lineWaiter = finish;
  });
}

async function createEnvFile() {
  console.log("\nI need a few values. Ask your team lead if you do not have them (never post them in a public place).");
  console.log("Secrets are typed hidden. Press Enter to accept a default shown in the question.\n");
  const answers = {};
  for (const item of QUESTIONS) {
    if (item.when && !item.when(answers)) continue;
    for (;;) {
      const typed = await ask(item.ask, item.secret);
      const value = typed || item.fallback?.(answers) || "";
      if (!value && !item.fallback) {
        console.log(red("  This value is required."));
        continue;
      }
      if (value && item.check && !item.check(value)) {
        console.log(red(`  ${item.hint ?? "That does not look right."}`));
        continue;
      }
      answers[item.key] = value;
      break;
    }
  }
  const text = [
    "# Created by `npm run setup`. This file holds secrets: it is ignored by Git, never commit or post it.",
    `DATABASE_URL=${answers.DATABASE_URL}`,
    `DATABASE_URL_UNPOOLED=${answers.DATABASE_URL_UNPOOLED}`,
    `AWS_ENDPOINT_URL_S3=${answers.AWS_ENDPOINT_URL_S3}`,
    `AWS_ACCESS_KEY_ID=${answers.AWS_ACCESS_KEY_ID}`,
    `AWS_SECRET_ACCESS_KEY=${answers.AWS_SECRET_ACCESS_KEY}`,
    `AWS_REGION=${answers.AWS_REGION}`,
    `S3_BUCKET=${answers.S3_BUCKET}`,
    "PORT=3000",
    "CLIENT_ORIGINS=http://localhost:5173,http://127.0.0.1:5173",
    "APP_URL=http://localhost:5173/Doctor-platform/",
    "SESSION_DAYS=7",
    "BCRYPT_COST=12",
    "",
    `SEED_ADMIN_EMAIL=${answers.SEED_ADMIN_EMAIL}`,
    `SEED_ADMIN_PASSWORD=${answers.SEED_ADMIN_PASSWORD}`,
    ...(answers.SMTP_HOST
      ? ["", `SMTP_HOST=${answers.SMTP_HOST}`, "SMTP_PORT=465", `SMTP_USER=${answers.SMTP_USER}`, `SMTP_PASSWORD=${answers.SMTP_PASSWORD}`, `MAIL_FROM="Carewell <${answers.SMTP_USER}>"`]
      : []),
    "",
  ].join("\n");
  writeFileSync(envFile, text, { mode: 0o600 });
  console.log(`\n${green("✔")} Wrote .env.local`);
}

step("Settings (.env.local)");
if (existsSync(envFile)) {
  console.log(`.env.local already exists ${green("✔")}  (delete it and run setup again to start over)`);
} else {
  await createEnvFile();
}
const env = parseEnv(readFileSync(envFile, "utf8"));
const missing = ["DATABASE_URL", "AWS_ENDPOINT_URL_S3", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION", "SEED_ADMIN_PASSWORD"].filter((key) => !env[key]);
if (missing.length) {
  rl.close();
  fail(`.env.local is missing: ${missing.join(", ")}. Add them (see .env.example) or delete the file and run setup again.`);
}
if (env.SEED_ADMIN_PASSWORD.length < 10) {
  rl.close();
  fail("SEED_ADMIN_PASSWORD in .env.local must be at least 10 characters.");
}
rl.close();

// ── 3-5. Install, database, website ───────────────────────────────────────────────────────
function run(label, command, args, cwd) {
  step(label);
  return new Promise((done) => {
    const child = spawn(command, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
    child.on("error", (error) => fail(`${label} could not start: ${error.message}`));
    child.on("exit", (code) => (code === 0 ? done() : fail(`${label} failed (exit code ${code}). Fix the problem above and run \`npm run setup\` again.`)));
  });
}

if (!flags.has("--skip-install")) {
  await run("Installing server packages", "npm", ["install", "--no-audit", "--no-fund"], resolve(root, "server"));
  await run("Installing website packages", "npm", ["install", "--no-audit", "--no-fund"], resolve(root, "client"));
}

if (!flags.has("--skip-db")) {
  await run("Checking the database and the file storage", "npm", ["run", "verify:services"], resolve(root, "server"));
  await run("Preparing the database client", "npx", ["prisma", "generate"], resolve(root, "server"));
  await run("Creating the database tables (safe to repeat)", "npx", ["prisma", "migrate", "deploy"], resolve(root, "server"));
  await run("Creating the administrator, specialties and clinics (safe to repeat)", "npm", ["run", "seed"], resolve(root, "server"));
}

step("Pointing the website at the real API");
if (existsSync(clientEnvFile)) {
  const current = parseEnv(readFileSync(clientEnvFile, "utf8")).VITE_CAREWELL_DATA_MODE;
  if (current === "api") console.log(`client/.env.local already uses the real API ${green("✔")}`);
  else {
    renameSync(clientEnvFile, `${clientEnvFile}.backup`);
    writeFileSync(clientEnvFile, "VITE_CAREWELL_DATA_MODE=api\nVITE_API_BASE_URL=/api/v1\n");
    console.log(`${green("✔")} Switched client/.env.local to the real API (old file saved as client/.env.local.backup)`);
  }
} else {
  writeFileSync(clientEnvFile, "VITE_CAREWELL_DATA_MODE=api\nVITE_API_BASE_URL=/api/v1\n");
  console.log(`${green("✔")} Wrote client/.env.local`);
}

console.log(`
${green("✔ Setup finished.")}

  Start everything:   ${bold("npm run dev")}
  Then open:          ${bold("http://localhost:5173/Doctor-platform/")}
  Sign in as admin:   ${bold(env.SEED_ADMIN_EMAIL ?? "admin@carewell.test")}  with the administrator password in .env.local (SEED_ADMIN_PASSWORD)
`);
