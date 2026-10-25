import { Router } from "express";
import { requireRole } from "../middleware/authenticate.js";
import * as applications from "../controllers/applications.js";

export const applicationsRouter = Router();
const doctorOnly = requireRole("doctor");
applicationsRouter.get("/doctor/application", doctorOnly, applications.getApplication);
applicationsRouter.post("/doctor/application/submit", doctorOnly, applications.submitApplication);
applicationsRouter.post("/doctor/application/reopen", doctorOnly, applications.reopenApplication);
applicationsRouter.get("/auth/doctor/invitation", applications.getInvitation);
applicationsRouter.post("/auth/doctor/invitation/accept", applications.acceptInvitation);
