import { Router } from "express";
import { requireRole } from "../middleware/authenticate.js";
import * as reviews from "../controllers/reviews.js";

export const reviewsRouter = Router();
const patientOnly = requireRole("patient");
reviewsRouter.get("/doctors/:id/reviews", reviews.listDoctorReviews); // public
reviewsRouter.post("/doctors/:id/reviews", patientOnly, reviews.createReview);
reviewsRouter.patch("/reviews/:id", patientOnly, reviews.updateReview);
reviewsRouter.delete("/reviews/:id", patientOnly, reviews.deleteReview);
