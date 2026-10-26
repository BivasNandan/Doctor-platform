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

/** Transitions a doctor may perform on their own requests (completing only once the visit time has started). */
export const DOCTOR_APPOINTMENT_TRANSITIONS = Object.freeze({
  pending: ["accepted", "rejected"],
  accepted: ["completed"],
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

/**
 * Where a doctor is in joining Carewell. Appointments and availability open only when `approved`.
 * invited → in_progress → submitted → approved (or changes_requested → submitted, or rejected).
 */
export const ONBOARDING_STATUS = Object.freeze({
  INVITED: "invited",
  IN_PROGRESS: "in_progress",
  SUBMITTED: "submitted",
  CHANGES_REQUESTED: "changes_requested",
  REJECTED: "rejected",
  APPROVED: "approved",
});

export const ONBOARDING_STATUS_LABELS = Object.freeze({
  invited: "Invited",
  in_progress: "In progress",
  submitted: "Waiting for review",
  changes_requested: "Changes requested",
  rejected: "Not approved",
  approved: "Approved",
});

/** The administrator's comparison of the BMDC certificate with the BMDC register. */
export const BMDC_CHECK = Object.freeze({
  UNCHECKED: "unchecked",
  MATCHED: "matched",
  NOT_FOUND: "not_found",
  MISMATCH: "mismatch",
});

export const BMDC_CHECK_LABELS = Object.freeze({
  unchecked: "Not checked yet",
  matched: "Matched",
  not_found: "Not found",
  mismatch: "Details don’t match",
});

export const CERTIFICATE_KINDS = Object.freeze([
  { value: "bmdc", label: "BMDC registration certificate" },
  { value: "degree", label: "Degree certificate" },
  { value: "other", label: "Other document" },
]);

export const certificateKindLabel = (value) =>
  CERTIFICATE_KINDS.find((item) => item.value === value)?.label ?? "Document";

/** BMDC's public register search, opened by administrators to check a certificate by hand. */
export const BMDC_SEARCH_URL = "https://verify.bmdc.org.bd/";

/** Days after a rejection before a doctor may apply again (the server enforces it). */
export const REAPPLY_DAYS = 30;

/** Length of one bookable time. A doctor's availability window is cut into back-to-back slots of this size. */
export const SLOT_MINUTES = 10;

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
    case "approved":
    case "matched":
    case "accepted":
    case "available":
    case "published":
    case "active":
      return "available";
    case "pending":
    case "unpublished":
    case "deactivation_requested":
    case "invited":
    case "in_progress":
    case "submitted":
    case "changes_requested":
    case "unchecked":
      return "pending";
    case "rejected":
    case "not_found":
    case "mismatch":
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
  /** "Join as a doctor": linked from the footer and the doctor sign-in page, not the navigation. */
  doctorRegister: "/doctor/register",
  doctorApplication: "/doctor/application",
  /** Opened from the invitation email (`?token=…`). */
  doctorInvitation: "/doctor/invitation",
  doctorDashboard: "/doctor/dashboard",

  /** Unlisted on purpose: set by VITE_ADMIN_LOGIN_PATH. Null when unset (administrator sign-in is off). */
  adminLogin: adminLoginPath(import.meta.env.VITE_ADMIN_LOGIN_PATH),
  admin: "/admin",
  adminDoctors: "/admin/doctors",
  adminVerification: "/admin/verification",
  adminFacilities: "/admin/facilities",
  adminAppointments: "/admin/appointments",
  adminPatients: "/admin/patients",
  adminReviews: "/admin/reviews",
  adminSpecialties: "/admin/specialties",
  adminAvailability: "/admin/availability",
  adminSupport: "/admin/support",
  adminDeactivationRequests: "/admin/deactivation-requests",
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

/**
 * Normalises VITE_ADMIN_LOGIN_PATH ("staff-x7k2/" → "/staff-x7k2"). A whole pasted link works too:
 * only the route after "#" counts ("http://localhost:5173/Doctor-platform/#/staff-x7k2" → "/staff-x7k2").
 * Hiding the address keeps the administrator sign-in out of sight; it is not a security boundary
 * (the value ships in the bundle).
 */
export function adminLoginPath(value) {
  const text = String(value ?? "").trim();
  const route = text.includes("#") ? text.slice(text.indexOf("#") + 1) : text;
  const path = route.replace(/^\/*/, "/").replace(/\/+$/, "");
  return path ? path : null;
}
