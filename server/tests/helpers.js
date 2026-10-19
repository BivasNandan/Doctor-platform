// Test harness: runs the real Express app against a TEMPORARY schema inside the Neon database.
// The schema is created from the real migration files and dropped afterwards, so the real tables
// (and anyone's data) are never touched.
import { randomBytes } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

const serverRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectRoot = resolve(serverRoot, "..");

export async function startTestApp() {
  if (existsSync(resolve(projectRoot, ".env.local"))) dotenv.config({ path: resolve(projectRoot, ".env.local"), quiet: true });
  const direct = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!direct) throw new Error("DATABASE_URL is not set (see the root .env.example).");

  // 1. A throwaway schema built from the migration files, exactly as production gets it.
  const schema = `test_${randomBytes(4).toString("hex")}`;
  const admin = new pg.Client({ connectionString: direct });
  await admin.connect();
  await admin.query(`CREATE SCHEMA "${schema}"`);
  await admin.query(`SET search_path TO "${schema}", public`); // public: the btree_gist extension lives there
  const migrations = resolve(serverRoot, "prisma/migrations");
  for (const name of readdirSync(migrations).filter((entry) => /^\d/.test(entry)).sort())
    await admin.query(readFileSync(resolve(migrations, name, "migration.sql"), "utf8"));

  // 2. Point the app at that schema BEFORE it is imported (config reads the environment once).
  const url = new URL(direct);
  url.searchParams.set("schema", schema);
  process.env.DATABASE_URL = url.toString();
  process.env.NODE_ENV = "test";
  process.env.BCRYPT_COST = "4"; // fast hashing; production uses 12

  const { app } = await import("../src/app.js");
  const { prisma } = await import("../src/config/prisma.js");
  const auth = await import("../src/auth.js");
  const mappers = await import("../src/mappers.js");
  const mail = await import("../src/mail.js");

  const server = await new Promise((done) => {
    const listening = app.listen(0, "127.0.0.1", () => done(listening));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;

  return {
    baseUrl,
    prisma,
    /** Emails the app "sent" (nothing leaves the machine in tests). */
    outbox: mail.outbox,
    resetRateLimits: auth.resetRateLimits,
    hashPassword: auth.hashPassword,
    dhakaNow: mappers.dhakaNow,
    addDays: mappers.addDays,
    client: () => makeClient(baseUrl),
    async stop() {
      await new Promise((done) => server.close(done));
      await prisma.$disconnect();
      await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
      await admin.end();
    },
  };
}

/** A tiny HTTP client that keeps cookies, like a browser tab. */
function makeClient(baseUrl) {
  const jar = new Map();

  async function call(method, path, body, headers = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
        ...(jar.size ? { cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; ") } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(";");
      const [key, ...rest] = pair.split("=");
      const value = rest.join("=");
      if (value) jar.set(key, value);
      else jar.delete(key);
    }
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null, headers: response.headers };
  }

  return {
    get: (path, headers) => call("GET", path, undefined, headers),
    post: (path, body, headers) => call("POST", path, body ?? {}, headers),
    patch: (path, body, headers) => call("PATCH", path, body ?? {}, headers),
    delete: (path, headers) => call("DELETE", path, undefined, headers),
    cookies: () => Object.fromEntries(jar),
    setCookies: (cookies) => Object.entries(cookies).forEach(([k, v]) => jar.set(k, v)),
  };
}
