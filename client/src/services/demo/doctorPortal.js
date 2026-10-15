import { ROLES } from "../../constants/roles.js";
import { ACCOUNT_STATUS, isAccountRestricted } from "../../constants/statuses.js";
import { ApiError } from "../http/httpClient.js";
import { transitionAsDoctor } from "./appointments.js";
import { db, findDoctor, hydrate, invalid, notFound, reply, requireRole } from "./db.js";

/** Profile fields whose change sends the profile back to admin review. */
const REVIEW_FIELDS = ["specialtyId", "qualifications", "facilityIds"];

function ownDoctor() {
  const session = requireRole(ROLES.DOCTOR);
  const doctor = findDoctor(session.doctorId);
  if (!doctor) throw notFound("Your doctor profile");
  return doctor;
}

function requireActiveAccount(doctor) {
  if (isAccountRestricted(doctor))
    throw new ApiError(`This account is ${doctor.accountStatus}; changes are unavailable.`, {
      status: 403,
      code: "ACCOUNT_RESTRICTED",
    });
}

export const doctorPortalService = {
  async getProfile() {
    return reply(ownDoctor());
  },

  async updateProfile(input) {
    const doctor = ownDoctor();
    requireActiveAccount(doctor);
    const reviewRequired = REVIEW_FIELDS.some(
      (key) => input[key] !== undefined && JSON.stringify(doctor[key]) !== JSON.stringify(input[key]),
    );
    const specialty = db.specialties.find((item) => item.id === input.specialtyId);
    Object.assign(doctor, input, {
      specialty: specialty?.name ?? doctor.specialty,
      profileReviewRequired: reviewRequired || doctor.profileReviewRequired,
    });
    return reply({ ...doctor, reviewRequired });
  },

  async listAppointments() {
    const doctor = ownDoctor();
    return reply(db.appointments.filter((item) => item.doctorId === doctor.id).map(hydrate));
  },

  async updateAppointmentStatus(id, status) {
    requireActiveAccount(ownDoctor());
    return reply(hydrate(transitionAsDoctor(id, status)));
  },

  async requestDeactivation(reason) {
    const doctor = ownDoctor();
    if (!reason?.trim()) throw invalid("Provide a reason for the deactivation request.");
    doctor.accountStatus = ACCOUNT_STATUS.DEACTIVATION_REQUESTED;
    return reply({ status: ACCOUNT_STATUS.DEACTIVATION_REQUESTED });
  },
};
