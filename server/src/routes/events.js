import { Router } from "express";
import { requireRole } from "../middleware/authenticate.js";
import * as events from "../controllers/events.js";

export const eventsRouter = Router();
eventsRouter.get("/events", requireRole("patient", "doctor", "admin"), events.streamEvents);
