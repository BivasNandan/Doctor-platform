import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { clearLoginThrottle, throttleLogin } from "../middleware/rateLimit.js";
import { toUser, userDoctorSelect } from "../models/user.js";
import { endSession, spendPasswordTime, startSession, verifyPassword } from "../services/auth.js";
import { ApiError, parse } from "../utils/errors.js";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email.")
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1, "Enter your password."),
  portal: z.enum(["patient", "doctor", "admin"]).optional(),
});

const PORTAL_LABEL = { patient: "patient", doctor: "doctor", admin: "administrator" };

/**
 * POST /auth/login
 * `portal` is only the sign-in page the person used. The account's real role comes from the
 * database, and a mismatch is refused, so a patient cannot enter the admin portal.
 */
export const login = async (request, response) => {
  const { email, password, portal } = parse(loginSchema, request.body);
  const throttleKey = `${request.ip}|${email}`;
  throttleLogin(throttleKey);

  const user = await prisma.user.findUnique({
    where: { email },
    include: { doctor: { select: userDoctorSelect } },
  });
  const passwordOk = user
    ? await verifyPassword(password, user.passwordHash)
    : await spendPasswordTime(password);
  // The same message for "no such account" and "wrong password": never reveal which emails exist.
  if (!user || !passwordOk) throw new ApiError(401, "INVALID_CREDENTIALS", "Wrong email or password.");

  if (["suspended", "deactivated"].includes(user.accountStatus))
    throw new ApiError(
      403,
      "ACCOUNT_RESTRICTED",
      `This account is ${user.accountStatus}. Contact Carewell administration.`,
    );
  if (portal && user.role !== portal)
    throw new ApiError(
      403,
      "WRONG_PORTAL",
      `This account is not authorised for the ${PORTAL_LABEL[portal]} portal.`,
    );

  clearLoginThrottle(throttleKey);
  await startSession(request, response, user.id);
  response.json({ user: toUser(user) });
};

/** POST /auth/logout: revokes the session on the server and clears the cookie. */
export const logout = async (request, response) => {
  await endSession(request, response);
  response.status(204).end();
};

/** GET /auth/me: restores the login after a page reload. 401 means "not signed in". */
export const currentUser = (request, response) => {
  if (!request.user) throw new ApiError(401, "UNAUTHENTICATED", "You are not signed in.");
  response.json({ user: toUser(request.user) });
};
