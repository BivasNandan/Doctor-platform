import { Router } from "express";
import { requireRole } from "../middleware/authenticate.js";
import * as doctor from "../controllers/doctor.js";

export const doctorRouter = Router();
doctorRouter.use(requireRole("doctor"));
doctorRouter.get("/profile", doctor.getProfile);
doctorRouter.patch("/profile", doctor.updateProfile);
doctorRouter.get("/appointments", doctor.listAppointments);
doctorRouter.patch("/appointments/:id", doctor.updateAppointmentStatus);
doctorRouter.get("/availability", doctor.listAvailability);
doctorRouter.post("/availability", doctor.createAvailability);
doctorRouter.patch("/availability/:id", doctor.updateAvailability);
doctorRouter.delete("/availability/:id", doctor.deleteAvailability);
