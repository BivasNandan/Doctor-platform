import { Router } from "express";
import { z } from "zod";
import { DOCTOR_TRANSITIONS, changeAppointmentStatus } from "../appointments.js";
import { requireRole } from "../auth.js";
import { createSlot, createSlotSchema, listSlots, removeSlot, updateSlot, updateSlotSchema } from "../availability.js";
import { prisma } from "../config/prisma.js";
import { saveDoctorProfile, profileSchema } from "../doctorProfile.js";
import { ApiError, notFound, parse, uuid } from "../http.js";
import { appointmentInclude, doctorInclude, findDoctor, toAppointment } from "../mappers.js";

/**
 * The doctor's own workspace. Which doctor is decided by the signed-in account, never by an id
 * in the URL or body, so a doctor cannot read or change another doctor's data.
 */
export const doctorRouter = Router();
doctorRouter.use(requireRole("doctor"));

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
    throw new ApiError(403, "ACCOUNT_RESTRICTED", `This account is ${request.user.accountStatus}; changes are unavailable.`);
}

// ── Profile ───────────────────────────────────────────────────────────────────────────────
doctorRouter.get("/profile", async (request, response) => {
  response.json(await findDoctor(ownDoctorId(request)));
});

/**
 * PATCH /doctor/profile. Changing the specialty, qualifications or clinics sends the profile back
 * to administrator review: `profileReviewRequired` is set and `reviewRequired: true` is returned.
 */
doctorRouter.patch("/profile", async (request, response) => {
  assertCanChange(request);
  const id = ownDoctorId(request);
  const data = parse(profileSchema, request.body);
  const doctor = await prisma.doctor.findUnique({ where: { id }, include: doctorInclude });

  const changed = await saveDoctorProfile(doctor, data);
  const reviewRequired = changed.length > 0;
  if (reviewRequired) await prisma.doctor.update({ where: { id }, data: { profileReviewRequired: true } });
  response.json({ ...(await findDoctor(id)), reviewRequired });
});

// ── Appointment requests for this doctor ──────────────────────────────────────────────────
doctorRouter.get("/appointments", async (request, response) => {
  const appointments = await prisma.appointment.findMany({
    where: { doctorId: ownDoctorId(request) },
    include: appointmentInclude,
    orderBy: { createdAt: "desc" },
  });
  response.json(appointments.map(toAppointment));
});

/** PATCH /doctor/appointments/:id { status: "accepted" | "rejected" }: only pending requests. */
doctorRouter.patch("/appointments/:id", async (request, response) => {
  assertCanChange(request);
  const id = uuid(request.params.id, "This request");
  const { status } = parse(z.object({ status: z.enum(["accepted", "rejected"], { error: "Choose accepted or rejected." }) }), request.body);
  const appointment = await prisma.appointment.findFirst({ where: { id, doctorId: ownDoctorId(request) } });
  if (!appointment) throw notFound("This request");
  response.json(await changeAppointmentStatus(appointment, status, DOCTOR_TRANSITIONS));
});

// ── Availability ──────────────────────────────────────────────────────────────────────────
doctorRouter.get("/availability", async (request, response) => {
  response.json(await listSlots(ownDoctorId(request)));
});

doctorRouter.post("/availability", async (request, response) => {
  assertCanChange(request);
  response.status(201).json(await createSlot(ownDoctorId(request), parse(createSlotSchema, request.body)));
});

doctorRouter.patch("/availability/:id", async (request, response) => {
  assertCanChange(request);
  const { after } = await updateSlot(uuid(request.params.id, "This availability slot"), parse(updateSlotSchema, request.body), ownDoctorId(request));
  response.json(after);
});

doctorRouter.delete("/availability/:id", async (request, response) => {
  assertCanChange(request);
  await removeSlot(uuid(request.params.id, "This availability slot"), ownDoctorId(request));
  response.status(204).end();
});
