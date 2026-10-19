// ─── roles ─────────────────────────────────────────────────────────────────────────────────

export const ROLES = Object.freeze({
  PATIENT: "patient",
  DOCTOR: "doctor",
  ADMIN: "admin",
});

// ─── statuses ──────────────────────────────────────────────────────────────────────────────

/**
 * Domain status vocabularies. These values are part of the API contract:
 * the backend must store and return exactly these strings.
 */

export const APPOINTMENT_STATUS = Object.freeze({
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
});

export const APPOINTMENT_STATUS_LABELS = Object.freeze({
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  cancelled: "Cancelled",
  completed: "Completed",
});

/** Statuses a patient may cancel from. */
export const PATIENT_CANCELLABLE_STATUSES = [APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.ACCEPTED];

/** Transitions a doctor may perform on their own requests. */
export const DOCTOR_APPOINTMENT_TRANSITIONS = Object.freeze({
  pending: ["accepted", "rejected"],
});

/** Transitions an administrator may perform. */
export const ADMIN_APPOINTMENT_TRANSITIONS = Object.freeze({
  pending: ["accepted", "rejected", "cancelled"],
  accepted: ["cancelled", "completed"],
});

export const VERIFICATION_STATUS = Object.freeze({
  PENDING: "pending",
  VERIFIED: "verified",
  REJECTED: "rejected",
  SUSPENDED: "suspended",
});

export const PUBLICATION_STATUS = Object.freeze({
  PUBLISHED: "published",
  UNPUBLISHED: "unpublished",
  INACTIVE: "inactive",
});

export const ACCOUNT_STATUS = Object.freeze({
  ACTIVE: "active",
  SUSPENDED: "suspended",
  DEACTIVATED: "deactivated",
  DEACTIVATION_REQUESTED: "deactivation_requested",
});

export const SLOT_STATUS = Object.freeze({
  AVAILABLE: "available",
  BOOKED: "booked",
  UNAVAILABLE: "unavailable",
});

/** Account states that block every doctor-side mutation. */
export const RESTRICTED_ACCOUNT_STATUSES = [ACCOUNT_STATUS.DEACTIVATED, ACCOUNT_STATUS.SUSPENDED];

export const isAccountRestricted = (doctor) => RESTRICTED_ACCOUNT_STATUSES.includes(doctor?.accountStatus);

/** Public discovery only lists active, non-hidden profiles. */
export const isPubliclyListed = (doctor) =>
  doctor.accountStatus !== ACCOUNT_STATUS.DEACTIVATED &&
  ![PUBLICATION_STATUS.INACTIVE, PUBLICATION_STATUS.UNPUBLISHED].includes(doctor.publicationStatus);

/** Maps a status string to a <Pill> tone. */
export function statusTone(status) {
  switch (status) {
    case "verified":
    case "accepted":
    case "available":
    case "published":
    case "active":
      return "available";
    case "pending":
    case "unpublished":
    case "deactivation_requested":
      return "pending";
    case "rejected":
    case "cancelled":
    case "suspended":
    case "deactivated":
    case "inactive":
      return "error";
    default:
      return "neutral";
  }
}

// ─── booking ───────────────────────────────────────────────────────────────────────────────

/** Who an appointment is for, relative to the account holder who books it. */
export const RELATIONSHIPS = Object.freeze([
  { value: "self", label: "Myself" },
  { value: "child", label: "My child" },
  { value: "parent", label: "My parent" },
  { value: "spouse", label: "My spouse or partner" },
  { value: "sibling", label: "My brother or sister" },
  { value: "other", label: "Another family member" },
]);

export const relationshipLabel = (value) =>
  RELATIONSHIPS.find((item) => item.value === value)?.label ?? "Myself";

const SHORT_TAGS = {
  child: "child",
  parent: "parent",
  spouse: "spouse or partner",
  sibling: "sibling",
  other: "family member",
};

/** "child" for a booking made for the account holder's child; "" for their own booking. */
export const relationshipTag = (value) => SHORT_TAGS[value] ?? "";

// ─── attachments ───────────────────────────────────────────────────────────────────────────

/** Client-side attachment limits. The server MUST re-validate all of them. */
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

export const ATTACHMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export const ATTACHMENT_ACCEPT = "image/*,.pdf";

export const MESSAGE_MAX_LENGTH = 2000;

// ─── paths ─────────────────────────────────────────────────────────────────────────────────

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
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
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

// ─── demo ──────────────────────────────────────────────────────────────────────────────────

/** Values shared by the demo adapter and the demo-mode hints in the UI. */
export const DEMO_VERIFICATION_CODE = "123456";

/** Stands in for the token a real reset email would carry in its link. */
export const DEMO_RESET_TOKEN = "demo-reset-token";

// ─── env ───────────────────────────────────────────────────────────────────────────────────

/**
 * The only module that reads build-time environment variables.
 * Everything here is shipped to the browser: never put secrets in VITE_* variables.
 */
const env = import.meta.env;

export const config = Object.freeze({
  /** "demo" = in-memory fictional data, "api" = real HTTP backend. */
  dataMode: env.VITE_CAREWELL_DATA_MODE === "api" ? "api" : "demo",
  /** Base URL of the REST API, without a trailing slash (e.g. "/api/v1"). */
  apiBaseUrl: (env.VITE_API_BASE_URL ?? "").replace(/\/$/, ""),
  /** Send cookies with API requests (required for cookie-based sessions). */
  sendCredentials: env.VITE_API_SEND_CREDENTIALS !== "false",
});

export const isDemoMode = config.dataMode === "demo";
