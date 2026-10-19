import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { ApiError } from "./http.js";

// ── Passwords ──────────────────────────────────────────────────────────────────────────
export const hashPassword = (password) => bcrypt.hash(password, env.bcryptCost);
export const verifyPassword = (password, hash) => bcrypt.compare(password, hash);

// Compared against when the email is unknown, so "no such account" takes as long as "wrong
// password" and the response time cannot be used to discover which emails have accounts.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", env.bcryptCost);
export const spendPasswordTime = (password) => bcrypt.compare(password, DUMMY_HASH);

/** A password nobody knows, for accounts created by an administrator (they set their own later). */
export const unusablePasswordHash = () => hashPassword(randomBytes(32).toString("base64url"));

// ── Sessions (a random token in an HttpOnly cookie; only its hash is stored) ───────────────
export const SESSION_COOKIE = "carewell_session";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sessionMs = () => env.sessionDays * 24 * 60 * 60 * 1000;

const cookieOptions = () => ({
  httpOnly: true, // not readable by page scripts
  sameSite: "lax", // not sent on cross-site POSTs
  secure: env.isProduction, // HTTPS only in production
  path: "/",
});

export async function startSession(request, response, userId) {
  const token = randomBytes(32).toString("base64url");
  await prisma.session.create({
    data: {
      userId,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + sessionMs()),
      userAgent: request.get("user-agent")?.slice(0, 255),
      ipAddress: request.ip,
    },
  });
  response.cookie(SESSION_COOKIE, token, { ...cookieOptions(), maxAge: sessionMs() });
}

export async function endSession(request, response) {
  const token = readCookie(request, SESSION_COOKIE);
  if (token) await prisma.session.updateMany({ where: { tokenHash: sha256(token), revokedAt: null }, data: { revokedAt: new Date() } });
  response.clearCookie(SESSION_COOKIE, cookieOptions());
}

/** Signs a user out everywhere (used when an account is deactivated). */
export const revokeAllSessions = (userId) =>
  prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });

/** Signs a user out everywhere except the session they are using right now. */
export const revokeOtherSessions = (userId, keepSessionId) =>
  prisma.session.updateMany({
    where: { userId, revokedAt: null, id: { not: keepSessionId } },
    data: { revokedAt: new Date() },
  });

function readCookie(request, name) {
  const header = request.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

const BLOCKED = new Set(["suspended", "deactivated"]);

/** Looks up the session cookie and sets `request.user` (or leaves it undefined for guests). */
export async function authenticate(request, response, next) {
  const token = readCookie(request, SESSION_COOKIE);
  if (token) {
    const session = await prisma.session.findUnique({
      where: { tokenHash: sha256(token) },
      include: { user: { include: { doctor: { select: { id: true } } } } },
    });
    const valid = session && !session.revokedAt && session.expiresAt > new Date() && !BLOCKED.has(session.user.accountStatus);
    if (valid) {
      request.user = session.user;
      request.sessionId = session.id;
      // Record activity at most every 5 minutes, not on every request.
      if (!session.lastUsedAt || Date.now() - session.lastUsedAt.getTime() > 5 * 60 * 1000)
        prisma.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
    }
  }
  next();
}

export function requireRole(...roles) {
  return (request, response, next) => {
    if (!request.user)
      return next(new ApiError(401, "UNAUTHENTICATED", "Your session has expired. Sign in again to continue."));
    if (!roles.includes(request.user.role))
      return next(new ApiError(403, "FORBIDDEN", "You do not have permission to perform this action."));
    return next();
  };
}

// ── CSRF: only accept state-changing requests from our own front end ──────────────────────
// Browsers always send an Origin header on cross-site POST/PATCH/DELETE. Requests without one
// (curl, server-to-server) cannot carry a victim's cookie, so they are allowed.
export function checkOrigin(request, response, next) {
  const safeMethod = ["GET", "HEAD", "OPTIONS"].includes(request.method);
  const origin = request.get("origin");
  if (safeMethod || !origin || env.clientOrigins.includes(origin)) return next();
  return next(new ApiError(403, "FORBIDDEN_ORIGIN", "This request did not come from the Carewell website."));
}

// ── Login throttling (in memory: fine for one server process; use Redis if you scale out) ──
const attempts = new Map(); // key -> { count, resetAt }
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;

export function throttleLogin(key) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  entry.count += 1;
  if (entry.count > MAX_ATTEMPTS)
    throw new ApiError(429, "RATE_LIMITED", "Too many sign-in attempts. Please wait a few minutes and try again.");
}

export const clearLoginThrottle = (key) => attempts.delete(key);

// General-purpose limiter for other endpoints (sign-up, emailing codes). Same in-memory caveat.
const counters = new Map(); // key -> { count, resetAt }

/** Forgets all rate-limit counters. Tests use it so one test's requests do not count against the next. */
export function resetRateLimits() {
  counters.clear();
  attempts.clear();
}

/** Allows `max` calls per `windowMs` for `key`; the next one throws 429 with `message`. */
export function rateLimit(key, max, windowMs, message = "Too many requests. Please wait a moment and try again.") {
  const now = Date.now();
  const entry = counters.get(key);
  if (!entry || entry.resetAt < now) {
    counters.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  entry.count += 1;
  if (entry.count > max) throw new ApiError(429, "RATE_LIMITED", message);
}
