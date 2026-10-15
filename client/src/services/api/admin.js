import { http, segment } from "../http/httpClient.js";

/** Administrator-only operations. Every call requires an admin session. */
export const adminService = {
  getSummary: () => http.get("/admin/summary"),

  // Doctors
  listDoctors: () => http.get("/admin/doctors"),
  addDoctor: (input) => http.post("/admin/doctors", input),
  updateDoctor: (id, input) => http.patch(`/admin/doctors/${segment(id)}`, input),
  deactivateDoctor: (id) => http.post(`/admin/doctors/${segment(id)}/deactivation`),
  setVerification: (id, status) => http.patch(`/admin/doctors/${segment(id)}/verification`, { status }),
  setPublication: (id, status) => http.patch(`/admin/doctors/${segment(id)}/publication`, { status }),

  // Clinics and hospitals
  listFacilities: () => http.get("/admin/clinics"),
  addFacility: (input) => http.post("/admin/clinics", input),
  updateFacility: (id, input) => http.patch(`/admin/clinics/${segment(id)}`, input),
  deactivateFacility: (id) => http.post(`/admin/clinics/${segment(id)}/deactivation`),

  // Specialties
  listSpecialties: () => http.get("/admin/specialties"),
  addSpecialty: (input) => http.post("/admin/specialties", input),
  setSpecialtyActive: (id, active) => http.patch(`/admin/specialties/${segment(id)}`, { active }),

  // Appointments
  listAppointments: () => http.get("/admin/appointments"),
  updateAppointmentStatus: (id, status) => http.patch(`/admin/appointments/${segment(id)}`, { status }),
};
