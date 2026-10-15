import { http, segment } from "../http/httpClient.js";

/** Operations a signed-in doctor performs on their own account. */
export const doctorPortalService = {
  getProfile: () => http.get("/doctor/profile"),
  updateProfile: (input) => http.patch("/doctor/profile", input),
  listAppointments: () => http.get("/doctor/appointments"),
  updateAppointmentStatus: (id, status) => http.patch(`/doctor/appointments/${segment(id)}`, { status }),
  requestDeactivation: (reason) => http.post("/doctor/account/deactivation-requests", { reason }),
};
