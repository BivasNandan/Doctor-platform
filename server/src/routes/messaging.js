import { Router } from "express";
import { requireRole } from "../middleware/authenticate.js";
import { receiveFile } from "../middleware/upload.js";
import { ATTACHMENT_TYPES, MAX_FILE_BYTES } from "../services/files.js";
import * as messaging from "../controllers/messaging.js";

export const messagingRouter = Router();
const signedIn = requireRole("patient", "doctor", "admin");
messagingRouter.use(["/conversations", "/attachments"], signedIn);
messagingRouter.get("/conversations", messaging.listConversations);
messagingRouter.get("/conversations/unread-count", messaging.getUnreadCount);
messagingRouter.post("/conversations", requireRole("admin"), messaging.startConversation);
messagingRouter.get("/conversations/:id/messages", messaging.listMessages);
messagingRouter.post("/conversations/:id/messages", messaging.sendMessage);
messagingRouter.post(
  "/conversations/:id/attachments",
  receiveFile({ maxBytes: MAX_FILE_BYTES, types: ATTACHMENT_TYPES }),
  messaging.sendAttachment,
);
messagingRouter.get("/attachments/:id", messaging.downloadAttachment);
