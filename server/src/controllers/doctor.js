import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { appointmentInclude, toAppointment } from "../models/appointment.js";
import { doctorInclude, findDoctor } from "../models/doctor.js";
import { changeAppointmentStatus, DOCTOR_TRANSITIONS } from "../services/appointments.js";
import {
  createSlots,
  createSlotSchema,
  listSlots,
  removeSlot,
  updateSlot,
  updateSlotSchema,
} from "../services/availability.js";
import { assertApplicationOpen } from "../services/applications.js";
import { profileSchema, saveDoctorProfile } from "../services/doctorProfile.js";
import { LINKS, notifyAdmins } from "../services/notifications.js";
import { ApiError, notFound, parse, uuid } from "../utils/errors.js";

/**
 * The doctor's own workspace. Which doctor is decided by the signed-in account, never by an id
 * in the URL or body, so a doctor cannot read or change another doctor's data.
 */

/** The signed-in doctor's id, or 404 when the account has no profile. */
function ownDoctorId(request) {
  const id = request.user.doctor?.id;
  if (!id) throw notFound("Your doctor profile");
  return id;
}

/**
 * Suspended and deactivated accounts cannot change anything. (Their sessions are normally
 * already ended, so this is a second line of defence.)
 */
function assertCanChange(request) {
  if (["suspended", "deactivated"].includes(request.user.accountStatus))
    throw new ApiError(
      403,
      "ACCOUNT_RESTRICTED",
      `This account is ${request.user.accountStatus}; changes are unavailable.`,
    );
}

// ── Profile ───────────────────────────────────────────────────────────────────────────────
export const getProfile = async (request, response) => {
  response.json(await findDoctor(ownDoctorId(request)));
};

/**
 * PATCH /doctor/profile. Changing the specialty, qualifications or clinics sends the profile back
 * to administrator review: `profileReviewRequired` is set and `reviewRequired: true` is returned.
 */
export const updateProfile = async (request, response) => {
  assertCanChange(request);
  const id = ownDoctorId(request);
  const data = parse(profileSchema, request.body);
  const doctor = await prisma.doctor.findUnique({ where: { id }, include: doctorInclude });
  assertApplicationOpen(doctor);

  const changed = await saveDoctorProfile(doctor, data);
  // Before approval the whole profile is reviewed with the application anyway.
  const reviewRequired = changed.length > 0 && doctor.onboardingStatus === "approved";
  if (reviewRequired) {
    await prisma.doctor.update({ where: { id }, data: { profileReviewRequired: true } });
    const names = { specialtyId: "specialty", qualifications: "qualifications", facilityIds: "clinics" };
    await notifyAdmins({
      kind: "doctor",
      title: "A doctor profile needs review",
      body: `${data.name} changed their ${changed.map((field) => names[field]).join(", ")}.`,
      link: LINKS.adminVerification,
      groupKey: `review:${id}`,
    });
  }
  response.json({ ...(await findDoctor(id)), reviewRequired });
};

// ── Appointment requests for this doctor ──────────────────────────────────────────────────
export const listAppointments = async (request, response) => {
  const appointments = await prisma.appointment.findMany({
    where: { doctorId: ownDoctorId(request) },
    include: appointmentInclude,
    orderBy: { createdAt: "desc" },
  });
  response.json(appointments.map(toAppointment));
};

/** PATCH /doctor/appointments/:id { status: "accepted" | "rejected" }: only pending requests. */
export const updateAppointmentStatus = async (request, response) => {
  assertCanChange(request);
  const id = uuid(request.params.id, "This request");
  const { status } = parse(
    z.object({ status: z.enum(["accepted", "rejected"], { error: "Choose accepted or rejected." }) }),
    request.body,
  );
  const appointment = await prisma.appointment.findFirst({ where: { id, doctorId: ownDoctorId(request) } });
  if (!appointment) throw notFound("This request");
  response.json(await changeAppointmentStatus(appointment, status, DOCTOR_TRANSITIONS, "doctor"));
};

// ── Availability ──────────────────────────────────────────────────────────────────────────
export const listAvailability = async (request, response) => {
  response.json(await listSlots(ownDoctorId(request)));
};

export const createAvailability = async (request, response) => {
  assertCanChange(request);
  // One window becomes back-to-back 10-minute slots; all of them are returned.
  response.status(201).json(await createSlots(ownDoctorId(request), parse(createSlotSchema, request.body)));
};

export const updateAvailability = async (request, response) => {
  assertCanChange(request);
  const { after } = await updateSlot(
    uuid(request.params.id, "This availability slot"),
    parse(updateSlotSchema, request.body),
    ownDoctorId(request),
  );
  response.json(after);
};

export const deleteAvailability = async (request, response) => {
  assertCanChange(request);
  await removeSlot(uuid(request.params.id, "This availability slot"), ownDoctorId(request));
  response.status(204).end();
};
