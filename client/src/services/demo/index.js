/**
 * In-memory adapters used when VITE_CAREWELL_DATA_MODE=demo. Every export
 * mirrors the same-named export in ../api. State resets on page reload.
 */
export { authService } from "./auth.js";
export { doctorService, facilityService, specialtyService, slotService, supportService } from "./catalog.js";
export { appointmentService } from "./appointments.js";
export { doctorPortalService } from "./doctorPortal.js";
export { availabilityService } from "./availability.js";
export { messagingService } from "./messaging.js";
export { adminService } from "./admin.js";
