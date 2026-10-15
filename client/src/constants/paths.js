/** Single source of truth for client-side URLs (hash routes). */
export const PATHS = Object.freeze({
  discover: "/discover",
  doctors: "/doctors",
  facilities: "/facilities",
  appointments: "/appointments",
  messages: "/messages",
  assistance: "/assistance",

  login: "/login",
  signup: "/signup",
  verifyEmail: "/verify-email",
  profile: "/profile",

  doctorLogin: "/doctor/login",
  doctorRegister: "/doctor/register",
  doctorDashboard: "/doctor/dashboard",

  adminLogin: "/admin/login",
  admin: "/admin",
  adminDoctors: "/admin/doctors",
  adminVerification: "/admin/verification",
  adminFacilities: "/admin/facilities",
  adminAppointments: "/admin/appointments",
  adminSpecialties: "/admin/specialties",
  adminAvailability: "/admin/availability",
});

export const doctorProfilePath = (id) => `/doctors/${encodeURIComponent(id)}`;

/** Builds a directory URL carrying search filters in the query string. */
export function doctorsSearchPath(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== "" && value !== false && value != null) params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `${PATHS.doctors}?${query}` : PATHS.doctors;
}
