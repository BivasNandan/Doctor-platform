import { Router } from "express";
import { requireRole } from "../middleware/authenticate.js";
import * as notifications from "../controllers/notifications.js";

export const notificationsRouter = Router();
notificationsRouter.use("/notifications", requireRole("patient", "doctor", "admin"));
notificationsRouter.get("/notifications", notifications.listNotifications);
notificationsRouter.get("/notifications/unread-count", notifications.getUnreadCount);
notificationsRouter.post("/notifications/read-all", notifications.markAllRead);
notificationsRouter.post("/notifications/:id/read", notifications.markRead);
