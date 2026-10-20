import { Router } from "express";
import { requireRole } from "../middleware/authenticate.js";
import * as adminReview from "../controllers/adminReview.js";

export const adminReviewRouter = Router();
adminReviewRouter.use(requireRole("admin"));
adminReviewRouter.get("/doctors", adminReview.listDoctorsWithCertificates);
adminReviewRouter.get("/doctors/:id/certificates/:fileId", adminReview.downloadCertificate);
adminReviewRouter.get("/deactivation-requests", adminReview.listDeactivationRequests);
adminReviewRouter.post("/deactivation-requests/:id/approve", adminReview.approveDeactivation);
adminReviewRouter.post("/deactivation-requests/:id/decline", adminReview.declineDeactivation);
adminReviewRouter.get("/support-requests", adminReview.listSupportRequests);
adminReviewRouter.patch("/support-requests/:id", adminReview.updateSupportRequest);
adminReviewRouter.post("/support-requests/:id/reply", adminReview.replyToSupportRequest);
