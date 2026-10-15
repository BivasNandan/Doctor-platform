import { localDateKey } from "../../utils/date.js";
import { isValidEmail, isValidPhone } from "../../utils/validation.js";
import {
  APPOINTMENT_STATUS,
  DOCTOR_APPOINTMENT_TRANSITIONS,
  PATIENT_CANCELLABLE_STATUSES,
  isPubliclyListed,
} from "../../constants/statuses.js";
import { RELATIONSHIPS } from "../../constants/booking.js";
import { ROLES } from "../../constants/roles.js";
import { ApiError } from "../http/httpClient.js";
import {
  conflict,
  db,
  ensureConversation,
  findDoctor,
  hydrate,
  invalid,
  nextId,
  notFound,
  reply,
  requireRole,
} from "./db.js";

const RELATIONSHIP_VALUES = RELATIONSHIPS.map((item) => item.value);

export const appointmentService = {
  /** The signed-in patient's own requests (including ones made for family). */
  async list() {
    const patient = requireRole(ROLES.PATIENT);
    return reply(db.appointments.filter((item) => item.patientUserId === patient.id).map(hydrate));
  },

  async submit(payload) {
    const patient = requireRole(ROLES.PATIENT);
    if (!patient.emailVerified)
      throw new ApiError("Verify your email address before booking.", {
        status: 403,
        code: "EMAIL_NOT_VERIFIED",
      });
    const doctor = findDoctor(payload.doctorId);
    if (!doctor || !isPubliclyListed(doctor)) throw notFound("This doctor profile");
    if (!doctor.facilityIds.includes(payload.facilityId))
      throw invalid("The doctor does not practise at the selected clinic.");
    if (!payload.date || payload.date < localDateKey())
      throw invalid("Choose a date that is today or later.");
    const relationship = payload.relationship ?? "self";
    if (!RELATIONSHIP_VALUES.includes(relationship)) throw invalid("Choose who the appointment is for.");
    if (
      !payload.time ||
      !payload.patientName?.trim() ||
      !payload.reason?.trim() ||
      !isValidPhone(payload.phone ?? "") ||
      !isValidEmail(payload.email ?? "")
    )
      throw invalid("Please complete each field with valid details.");
    const taken = db.appointments.some(
      (item) =>
        item.doctorId === payload.doctorId &&
        item.facilityId === payload.facilityId &&
        item.date === payload.date &&
        item.time === payload.time &&
        item.status === APPOINTMENT_STATUS.ACCEPTED,
    );
    if (taken) throw conflict("This time is no longer available.", "APPOINTMENT_CONFLICT");

    const request = {
      id: nextId("DEMO"),
      patientUserId: patient.id,
      relationship,
      doctorId: payload.doctorId,
      facilityId: payload.facilityId,
      date: payload.date,
      time: payload.time,
      patientName: payload.patientName.trim(),
      phone: payload.phone.trim(),
      email: payload.email.trim(),
      reason: payload.reason.trim(),
      status: APPOINTMENT_STATUS.PENDING,
      simulated: true,
    };
    db.appointments = [request, ...db.appointments];
    return reply(hydrate(request));
  },

  async cancel(id) {
    const patient = requireRole(ROLES.PATIENT);
    const appointment = db.appointments.find((item) => item.id === id && item.patientUserId === patient.id);
    if (!appointment) throw notFound("This request");
    if (!PATIENT_CANCELLABLE_STATUSES.includes(appointment.status))
      throw conflict("This request can no longer be cancelled.", "INVALID_TRANSITION");
    appointment.status = APPOINTMENT_STATUS.CANCELLED;
    appointment.simulated = true;
    return reply(hydrate(appointment));
  },
};

/** Used by the doctor portal service. */
export function transitionAsDoctor(id, status) {
  const session = requireRole(ROLES.DOCTOR);
  const appointment = db.appointments.find((item) => item.id === id && item.doctorId === session.doctorId);
  if (!appointment) throw notFound("This request");
  if (!DOCTOR_APPOINTMENT_TRANSITIONS[appointment.status]?.includes(status))
    throw conflict("Only pending requests can be accepted or rejected.", "INVALID_TRANSITION");
  appointment.status = status;
  if (status === APPOINTMENT_STATUS.ACCEPTED) ensureConversation(appointment);
  return appointment;
}
