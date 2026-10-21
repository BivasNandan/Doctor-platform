import * as api from "./api.js";
import * as demo from "./demoBackend.js";
import { config } from "../constants.js";

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
  reviewService,
  photoService,
  appointmentService,
  doctorPortalService,
  availabilityService,
  messagingService,
  notificationService,
  adminService,
} = adapter;

export { ApiError, setUnauthorizedHandler } from "./httpClient.js";
