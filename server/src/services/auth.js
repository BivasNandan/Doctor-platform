import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";

export const hashPassword = (password) => bcrypt.hash(password, env.bcryptCost);

export const verifyPassword = (password, hash) => bcrypt.compare(password, hash);

// Compared against when the email is unknown, so "no such account" takes as long as "wrong
// password" and the response time cannot be used to discover which emails have accounts.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", env.bcryptCost);

export const spendPasswordTime = (password) => bcrypt.compare(password, DUMMY_HASH);

/** A password nobody knows, for accounts created by an administrator (they set their own later). */
export const unusablePasswordHash = () => hashPassword(randomBytes(32).toString("base64url"));

export const SESSION_COOKIE = "carewell_session";

export const sha256 = (value) => createHash("sha256").update(value).digest("hex");

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
  if (token)
    await prisma.session.updateMany({
      where: { tokenHash: sha256(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
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

export function readCookie(request, name) {
  const header = request.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}
