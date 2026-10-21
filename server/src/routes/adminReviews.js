import { Router } from "express";
import { requireRole } from "../middleware/authenticate.js";
import * as adminReviews from "../controllers/adminReviews.js";

export const adminReviewsRouter = Router();
adminReviewsRouter.use(requireRole("admin"));
adminReviewsRouter.get("/reviews", adminReviews.listReviews);
adminReviewsRouter.patch("/reviews/:id", adminReviews.setReviewStatus);
