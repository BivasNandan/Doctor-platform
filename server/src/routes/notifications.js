import { Router } from "express";
import { z } from "zod";
import { requireRole } from "../auth.js";
import { prisma } from "../config/prisma.js";
import { notFound, parse, uuid } from "../http.js";

/** Each signed-in person's own notifications (the bell menu). Mounted at the API root. */
export const notificationsRouter = Router();
notificationsRouter.use("/notifications", requireRole("patient", "doctor", "admin"));

const toNotification = (row) => ({
  id: row.id,
  kind: row.kind,
  title: row.title,
  body: row.body,
  link: row.link ?? undefined,
  read: Boolean(row.readAt),
  createdAt: row.createdAt.toISOString(),
});

const unreadCount = (userId) => prisma.notification.count({ where: { userId, readAt: null } });

/** GET /notifications?limit=30&unread=true → { items, unreadCount }, newest first. */
notificationsRouter.get("/notifications", async (request, response) => {
  const { limit, unread } = parse(
    z.object({
      limit: z.coerce.number().int().min(1).max(100).default(30),
      unread: z.enum(["true", "false"]).default("false"),
    }),
    request.query,
  );
  const userId = request.user.id;
  const [rows, count] = await Promise.all([
    prisma.notification.findMany({
      where: { userId, ...(unread === "true" ? { readAt: null } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    unreadCount(userId),
  ]);
  response.json({ items: rows.map(toNotification), unreadCount: count });
});

notificationsRouter.get("/notifications/unread-count", async (request, response) => {
  response.json({ count: await unreadCount(request.user.id) });
});

/** POST /notifications/read-all */
notificationsRouter.post("/notifications/read-all", async (request, response) => {
  const result = await prisma.notification.updateMany({ where: { userId: request.user.id, readAt: null }, data: { readAt: new Date() } });
  response.json({ updated: result.count });
});

/** POST /notifications/:id/read: someone else's notification answers 404 like a missing one. */
notificationsRouter.post("/notifications/:id/read", async (request, response) => {
  const id = uuid(request.params.id, "This notification");
  const row = await prisma.notification.findFirst({ where: { id, userId: request.user.id } });
  if (!row) throw notFound("This notification");
  const updated = row.readAt ? row : await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  response.json(toNotification(updated));
});
