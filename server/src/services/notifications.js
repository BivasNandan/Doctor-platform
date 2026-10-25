import { prisma } from "../config/prisma.js";
import { publish } from "./realtime.js";

/**
 * In-app notifications: one line in somebody's bell menu. Routes call `notify` after something
 * happened that another person should know about ("your appointment was accepted").
 *
 * A notification must never break the action that caused it, so failures are logged, not thrown.
 * `link` is an in-app route the client opens when the line is clicked.
 */
export const LINKS = {
  appointments: "/appointments",
  messages: "/messages",
  profile: "/profile",
  doctorDashboard: "/doctor/dashboard",
  doctorApplication: "/doctor/application",
  adminDoctors: "/admin/doctors",
  adminSupport: "/admin/support",
  adminDeactivations: "/admin/deactivation-requests",
  adminVerification: "/admin/verification",
  adminAppointments: "/admin/appointments",
};

const PREVIEW = 90;
export const preview = (text) => {
  const clean = String(text ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return clean.length > PREVIEW ? `${clean.slice(0, PREVIEW - 1)}…` : clean;
};

/**
 * Notifies one or more users.
 * @param {string|string[]|null|undefined} userIds
 * @param {{kind: string, title: string, body?: string, link?: string, groupKey?: string}} content
 *   With `groupKey`, an existing UNREAD notification with the same key is refreshed instead of
 *   adding another line (used for chat messages, so ten messages are one entry).
 */
export async function notify(userIds, { kind, title, body = "", link, groupKey }) {
  const ids = [...new Set([userIds].flat().filter(Boolean))];
  try {
    for (const userId of ids) {
      if (groupKey) {
        const existing = await prisma.notification.findFirst({
          where: { userId, groupKey, readAt: null },
          select: { id: true },
        });
        if (existing) {
          await prisma.notification.update({
            where: { id: existing.id },
            data: { title, body, link, createdAt: new Date() },
          });
          continue;
        }
      }
      await prisma.notification.create({ data: { userId, kind, title, body, link, groupKey } });
    }
    publish(ids, { type: "notification" }); // their bell refreshes at once
  } catch (error) {
    console.error(`[notifications] could not notify (${kind}): ${error.message}`);
  }
}

/** Notifies every active administrator. */
export async function notifyAdmins(content) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: "admin", accountStatus: "active" },
      select: { id: true },
    });
    await notify(
      admins.map((admin) => admin.id),
      content,
    );
  } catch (error) {
    console.error(`[notifications] could not notify administrators: ${error.message}`);
  }
}

/** Notifies the login account behind a doctor profile id. */
export async function notifyDoctor(doctorId, content) {
  try {
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId }, select: { userId: true } });
    if (doctor) await notify(doctor.userId, content);
  } catch (error) {
    console.error(`[notifications] could not notify doctor: ${error.message}`);
  }
}

/** Marks the user's unread notifications with this group key as read (they opened the chat). */
export async function markGroupRead(userId, groupKey) {
  await prisma.notification.updateMany({
    where: { userId, groupKey, readAt: null },
    data: { readAt: new Date() },
  });
}
