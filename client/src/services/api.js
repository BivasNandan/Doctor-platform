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

  /**
   * Step 1 of a doctor's application: creates the account, signs them in and emails a 6-digit
   * code. Resolves `{ user, doctor }`; the application continues on the application page.
   */
  registerDoctor: (input) => http.post("/auth/doctor/register", input),

  /** Who an invitation link is for: `{ name, email, expiresAt }` (410 when used up or expired). */
  getInvitation: (token) => http.get("/auth/doctor/invitation", { query: { token } }),

  /** Sets the invited doctor's password and signs them in. Resolves `{ user }`. */
  acceptInvitation: ({ token, password }) => http.post("/auth/doctor/invitation/accept", { token, password }),

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

// ─── reviews and profile photos ────────────────────────────────────────────────────────────

export const reviewService = {
  /** Public. Resolves `{ summary: { average, count, distribution }, items, viewer: { canReview, myReview } }`. */
  list: (doctorId, { limit = 20, offset = 0 } = {}) =>
    http.get(`/doctors/${segment(doctorId)}/reviews`, { query: { limit, offset } }),
  /** A patient with a completed visit rates the doctor once. `{ rating: 1-5, comment? }`. */
  create: (doctorId, input) => http.post(`/doctors/${segment(doctorId)}/reviews`, input),
  update: (id, input) => http.patch(`/reviews/${segment(id)}`, input),
  remove: (id) => http.delete(`/reviews/${segment(id)}`),
};

export const photoService = {
  /** Uploads the signed-in person's profile photo (JPEG, PNG or WebP, up to 2 MB). Resolves `{ user }`. */
  upload(file) {
    const form = new FormData();
    form.append("file", file);
    return http.post("/me/photo", form);
  },
  /** Removes the profile photo. Resolves `{ user }`. */
  remove: () => http.delete("/me/photo"),
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

  /** The doctor's application: status, what is missing, the administration's note, certificates. */
  getApplication: () => http.get("/doctor/application"),
  submitApplication: () => http.post("/doctor/application/submit"),
  /** A rejected doctor starts again (30 days after the decision). */
  reopenApplication: () => http.post("/doctor/application/reopen"),
  /** Uploads a PDF or image; `kind` is "bmdc", "degree" or "other". Resolves the certificate. */
  uploadCertificate: (file, kind) => http.post("/doctor/certificates", certificateForm(file, kind)),
  deleteCertificate: (id) => http.delete(`/doctor/certificates/${segment(id)}`),
};

/** Multipart body for a certificate: the `kind` field comes before the file. */
function certificateForm(file, kind) {
  const form = new FormData();
  form.append("kind", kind);
  form.append("file", file);
  return form;
}

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
  /** Adds a window (e.g. 09:00–10:00); the server cuts it into 10-minute slots and resolves them all. */
  save: (doctorId, slot, { admin = false } = {}) =>
    http.post(`${scope(admin)}/availability`, admin ? { ...slot, doctorId } : slot),
  update: (id, input, { admin = false } = {}) =>
    http.patch(`${scope(admin)}/availability/${segment(id)}`, input),
  remove: (id, { admin = false } = {}) => http.delete(`${scope(admin)}/availability/${segment(id)}`),
};

// ─── messaging ─────────────────────────────────────────────────────────────────────────────

export const messagingService = {
  listConversations: () => http.get("/conversations"),
  /** Number of unread messages, for the navigation badge. */
  unreadCount: () => http.get("/conversations/unread-count"),
  /** Administrators: opens (or returns) the thread with a doctor. */
  startConversation: (doctorId) => http.post("/conversations", { doctorId }),
  listMessages: (conversationId) => http.get(`/conversations/${segment(conversationId)}/messages`),
  sendMessage: (conversationId, body) =>
    http.post(`/conversations/${segment(conversationId)}/messages`, { body }),
  sendAttachment(conversationId, file) {
    const form = new FormData();
    form.append("file", file);
    return http.post(`/conversations/${segment(conversationId)}/attachments`, form);
  },
};

// ─── notifications ─────────────────────────────────────────────────────────────────────────

/** The bell menu of whoever is signed in (patient, doctor or administrator). */
export const notificationService = {
  /** Resolves { items, unreadCount }, newest first. */
  list: ({ limit = 30 } = {}) => http.get("/notifications", { query: { limit } }),
  markRead: (id) => http.post(`/notifications/${segment(id)}/read`),
  markAllRead: () => http.post("/notifications/read-all"),
};

// ─── admin ─────────────────────────────────────────────────────────────────────────────────

/** Administrator-only operations. Every call requires an admin session. */
export const adminService = {
  getSummary: () => http.get("/admin/summary"),

  // Doctors
  listDoctors: () => http.get("/admin/doctors"),
  /** Invites a doctor: creates the account and emails a 48-hour link to set a password. */
  addDoctor: (input) => http.post("/admin/doctors", input),
  resendInvitation: (id) => http.post(`/admin/doctors/${segment(id)}/invitation`),
  /** `result`: "matched" | "not_found" | "mismatch" (a note is required unless matched). */
  recordBmdcCheck: (id, { result, note }) =>
    http.patch(`/admin/doctors/${segment(id)}/bmdc-check`, { result, note }),
  approveApplication: (id) => http.post(`/admin/doctors/${segment(id)}/application/approve`),
  requestApplicationChanges: (id, note) =>
    http.post(`/admin/doctors/${segment(id)}/application/request-changes`, { note }),
  rejectApplication: (id, note) => http.post(`/admin/doctors/${segment(id)}/application/reject`, { note }),
  /** Adds a certificate on the doctor's behalf (e.g. a BMDC certificate handed over in person). */
  uploadDoctorCertificate: (id, file, kind) =>
    http.post(`/admin/doctors/${segment(id)}/certificates`, certificateForm(file, kind)),
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

  // Patients
  listPatients: ({ query, status } = {}) => http.get("/admin/patients", { query: { query, status } }),
  setPatientStatus: (id, status) => http.patch(`/admin/patients/${segment(id)}/status`, { status }),

  // Review moderation
  listReviews: (status) => http.get("/admin/reviews", { query: { status } }),
  setReviewStatus: (id, status) => http.patch(`/admin/reviews/${segment(id)}`, { status }),

  // Support and account review
  listSupportRequests: (status) => http.get("/admin/support-requests", { query: { status } }),
  updateSupportRequest: (id, status) => http.patch(`/admin/support-requests/${segment(id)}`, { status }),
  replyToSupportRequest: (id, input) => http.post(`/admin/support-requests/${segment(id)}/reply`, input),
  listDeactivationRequests: (status = "open") =>
    http.get("/admin/deactivation-requests", { query: { status } }),
  decideDeactivationRequest: (id, decision) =>
    http.post(`/admin/deactivation-requests/${segment(id)}/${decision}`),
};
