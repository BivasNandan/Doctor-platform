import { Router } from "express";
import { requireRole } from "../middleware/authenticate.js";
import { receiveFile } from "../middleware/upload.js";
import { DOCUMENT_TYPES, MAX_FILE_BYTES } from "../services/files.js";
import * as adminApplications from "../controllers/adminApplications.js";

export const adminApplicationsRouter = Router();
adminApplicationsRouter.use(requireRole("admin"));
adminApplicationsRouter.patch("/doctors/:id/bmdc-check", adminApplications.recordBmdcCheck);
adminApplicationsRouter.post("/doctors/:id/application/approve", adminApplications.approveApplication);
adminApplicationsRouter.post("/doctors/:id/application/request-changes", adminApplications.requestChanges);
adminApplicationsRouter.post("/doctors/:id/application/reject", adminApplications.rejectApplication);
adminApplicationsRouter.post("/doctors/:id/invitation", adminApplications.resendInvitation);
adminApplicationsRouter.post(
  "/doctors/:id/certificates",
  receiveFile({ maxBytes: MAX_FILE_BYTES, types: DOCUMENT_TYPES }),
  adminApplications.uploadCertificate,
);
