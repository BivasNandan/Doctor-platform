import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { notifyAdmins, preview } from "../services/notifications.js";
import { parse } from "../utils/errors.js";

/** The "Assistance" form: anyone can write to the Carewell team, signed in or not. */

const schema = z.object({
  message: z
    .string()
    .trim()
    .min(8, "Tell us a little more so we can help (at least 8 characters).")
    .max(2000, "Please keep it under 2,000 characters."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Enter a valid email address."))
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

/** POST /support-requests { message, email? } → 201 { id, status: "received" }. Administrators handle them in /admin/support-requests. */
export const createSupportRequest = async (request, response) => {
  rateLimit(
    `support:${request.ip}`,
    5,
    15 * 60 * 1000,
    "You have sent several messages. Please wait a few minutes before sending another.",
  );
  const { message, email } = parse(schema, request.body);

  const created = await prisma.supportRequest.create({
    data: {
      message,
      userId: request.user?.id,
      // A signed-in person is reachable at their account email even if they leave the field empty.
      email: email ?? request.user?.email,
    },
  });
  await notifyAdmins({
    kind: "support",
    title: "New support request",
    body: preview(message),
    link: "/admin",
  });
  response.status(201).json({ id: created.id, status: created.status });
};
