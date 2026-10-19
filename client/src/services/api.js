import { ApiError, http, segment } from "./httpClient.js";

// ─── auth ──────────────────────────────────────────────────────────────────────────────────

export const authService = {
  /**
   * @param {{email: string, password: string, portal: 'doctor'|'admin'}} credentials
   *   `portal` only says which sign-in page was used. The server decides the
   *   role from the account and must reject a mismatch.
   * @returns {Promise<{user: import('../types.js').AuthenticatedUser}>}
   */
  login: (credentials) => http.post("/auth/login", credentials),

  logout: () => http.post("/auth/logout"),

  /** Registers a doctor (pending verification) and signs them in. */
  registerDoctor: (input) => http.post("/auth/doctor/register", input),

  /** Creates a patient account and signs them in (email not yet verified). */
  registerPatient: (input) => http.post("/auth/patient/register", input),

  /** Confirms the emailed code. Resolves `{ user }` with `emailVerified: true`. */
  verifyEmail: (code) => http.post("/auth/verify-email", { code }),

  /** Emails a fresh verification code. */
  resendVerification: () => http.post("/auth/verify-email/resend"),

  /**
   * Emails a password-reset link. Always resolves the same way, whether or not the
   * email belongs to an account, so the form cannot be used to discover accounts.
   */
  requestPasswordReset: (email) => http.post("/auth/forgot-password", { email }),

  /** Sets a new password using the token from the emailed link. */
  resetPassword: ({ token, password }) => http.post("/auth/reset-password", { token, password }),

  /** Updates the signed-in patient's name and phone. Resolves `{ user }`. */
  updateProfile: (input) => http.patch("/auth/me", input),

  /** Changes the signed-in user's password; their other devices are signed out. */
  changePassword: (input) => http.post("/auth/change-password", input),

  /** Restores the session after a page reload. Resolves null when signed out. */
  async getCurrentUser() {
    try {
      const result = await http.get("/auth/me");
      return result?.user ?? null;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
  },
};

// ─── catalog ───────────────────────────────────────────────────────────────────────────────

export const doctorService = {
  /** Public, published doctors matching the filters. */
  list: (filters, options) => http.get("/doctors", { query: filters, ...options }),
  get: (id) => http.get(`/doctors/${segment(id)}`),
};

export const facilityService = {
  /** Public, active clinics and hospitals. */
  list: (kind = "all") => http.get("/clinics", { query: { type: kind === "all" ? "" : kind } }),
};

export const specialtyService = {
  /** Public, active specialties. */
  list: () => http.get("/specialties"),
};

export const slotService = {
  /** Bookable times for one doctor, clinic and day. */
  listOpen: ({ doctorId, facilityId, date }) =>
    http.get(`/doctors/${segment(doctorId)}/slots`, {
      query: { facilityId, date },
    }),
};

export const supportService = {
  submit: (input) => http.post("/support-requests", input),
};

// ─── appointments ──────────────────────────────────────────────────────────────────────────

/** Patient-facing appointment requests. */
export const appointmentService = {
  /** Requests belonging to the caller. */
  list: () => http.get("/appointments"),
  submit: (payload) => http.post("/appointment-requests", payload),
  cancel: (id) => http.patch(`/appointment-requests/${segment(id)}`, { status: "cancelled" }),
};

// ─── doctorPortal ──────────────────────────────────────────────────────────────────────────

/** Operations a signed-in doctor performs on their own account. */
export const doctorPortalService = {
  getProfile: () => http.get("/doctor/profile"),
  updateProfile: (input) => http.patch("/doctor/profile", input),
  listAppointments: () => http.get("/doctor/appointments"),
  updateAppointmentStatus: (id, status) => http.patch(`/doctor/appointments/${segment(id)}`, { status }),
  requestDeactivation: (reason) => http.post("/doctor/account/deactivation-requests", { reason }),
};

// ─── availability ──────────────────────────────────────────────────────────────────────────

const scope = (admin) => (admin ? "/admin" : "/doctor");

/**
 * Availability slots. Doctors manage their own schedule; administrators pass
 * `{ admin: true }` and an explicit doctor id.
 */
export const availabilityService = {
  list: (doctorId, { admin = false } = {}) =>
    http.get(`${scope(admin)}/availability`, {
      query: admin ? { doctorId } : undefined,
    }),
  save: (doctorId, slot, { admin = false } = {}) =>
    http.post(`${scope(admin)}/availability`, admin ? { ...slot, doctorId } : slot),
  update: (id, input, { admin = false } = {}) =>
    http.patch(`${scope(admin)}/availability/${segment(id)}`, input),
  remove: (id, { admin = false } = {}) => http.delete(`${scope(admin)}/availability/${segment(id)}`),
};

// ─── messaging ─────────────────────────────────────────────────────────────────────────────

export const messagingService = {
  listConversations: () => http.get("/conversations"),
  listMessages: (conversationId) => http.get(`/conversations/${segment(conversationId)}/messages`),
  sendMessage: (conversationId, body) =>
    http.post(`/conversations/${segment(conversationId)}/messages`, { body }),
  sendAttachment(conversationId, file) {
    const form = new FormData();
    form.append("file", file);
    return http.post(`/conversations/${segment(conversationId)}/attachments`, form);
  },
};

// ─── admin ─────────────────────────────────────────────────────────────────────────────────

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
