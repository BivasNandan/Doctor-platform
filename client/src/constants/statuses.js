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
