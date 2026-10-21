import { Router } from "express";
import { requireRole } from "../middleware/authenticate.js";
import * as adminPatients from "../controllers/adminPatients.js";

export const adminPatientsRouter = Router();
adminPatientsRouter.use(requireRole("admin"));
adminPatientsRouter.get("/patients", adminPatients.listPatients);
adminPatientsRouter.patch("/patients/:id/status", adminPatients.setPatientStatus);
