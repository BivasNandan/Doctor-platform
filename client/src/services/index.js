import { config } from "../constants.js";

import * as api from "./api.js";
import * as demo from "./demoBackend.js";

/**
 * The service layer is the ONLY place that knows whether data comes from the
 * API or from in-memory demo fixtures. UI code imports from here and never
 * calls fetch directly.
 */
const adapter = config.dataMode === "api" ? api : demo;

export const {
  authService,
  doctorService,
  facilityService,
  specialtyService,
  slotService,
  supportService,
  appointmentService,
  doctorPortalService,
  availabilityService,
  messagingService,
  adminService,
} = adapter;

export { ApiError, setUnauthorizedHandler } from "./httpClient.js";
