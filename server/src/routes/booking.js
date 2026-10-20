import { Router } from "express";
import { requireRole } from "../middleware/authenticate.js";
import * as booking from "../controllers/booking.js";

export const bookingRouter = Router();
const patientOnly = requireRole("patient");
bookingRouter.get("/doctors/:id/slots", booking.listOpenSlots);
bookingRouter.post("/appointment-requests", patientOnly, booking.createAppointmentRequest);
bookingRouter.get("/appointments", patientOnly, booking.listMyAppointments);
bookingRouter.patch("/appointment-requests/:id", patientOnly, booking.cancelAppointmentRequest);
