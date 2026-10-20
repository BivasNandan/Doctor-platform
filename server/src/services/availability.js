import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { slotInclude, toSlot } from "../models/appointment.js";
import { ApiError, conflict, isForeignKeyViolation, notFound } from "../utils/errors.js";
import { dhakaNow, minutesOf, toDbDate, toDbTime } from "../utils/time.js";

// Availability slots, shared by the administrator routes (any doctor) and the doctor workspace
// (own schedule only). Routes pass `doctorId` to restrict access to one doctor's slots.

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.")
  .refine((value) => !Number.isNaN(Date.parse(value)), "Not a real date.");
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm.");

export const slotFields = {
  facilityId: z.string().uuid("Choose a clinic."),
  date: day,
  startTime: hhmm,
  endTime: hhmm,
  status: z.enum(["available", "unavailable"]).default("available"),
};
export const createSlotSchema = z.object(slotFields);
export const updateSlotSchema = z.object(slotFields).partial();

/** A slot can only be at a clinic where the doctor practises. */
export async function assertDoctorAtClinic(doctorId, clinicId) {
  const link = await prisma.doctorClinic.findUnique({ where: { doctorId_clinicId: { doctorId, clinicId } } });
  if (!link)
    throw new ApiError(422, "VALIDATION_FAILED", "The doctor does not practise at that clinic.", {
      facilityId: "Choose a clinic where this doctor practises.",
    });
}

export function assertValidSlot({ date, startTime, endTime }) {
  if (minutesOf(startTime) >= minutesOf(endTime))
    throw new ApiError(422, "VALIDATION_FAILED", "End time must be after start time.", {
      endTime: "End time must be after start time.",
    });
  if (date < dhakaNow().date)
    throw new ApiError(422, "VALIDATION_FAILED", "Availability cannot be added in the past.", {
      date: "Choose today or a later date.",
    });
}

/** All slots of one doctor, earliest first. */
export async function listSlots(doctorId) {
  const slots = await prisma.availabilitySlot.findMany({
    where: { doctorId },
    include: slotInclude,
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
  return slots.map(toSlot);
}

export async function createSlot(doctorId, data) {
  assertValidSlot(data);
  await assertDoctorAtClinic(doctorId, data.facilityId);
  const slot = await prisma.availabilitySlot.create({
    data: {
      doctorId,
      clinicId: data.facilityId,
      date: toDbDate(data.date),
      startTime: toDbTime(data.startTime),
      endTime: toDbTime(data.endTime),
      status: data.status,
    },
    include: slotInclude,
  });
  return toSlot(slot);
}

/** The slot, or 404. When `doctorId` is given, another doctor's slot also answers 404. */
async function findSlot(id, doctorId) {
  const slot = await prisma.availabilitySlot.findUnique({ where: { id }, include: slotInclude });
  if (!slot || (doctorId && slot.doctorId !== doctorId)) throw notFound("This availability slot");
  return slot;
}

/** Applies a partial change. Resolves `{ before, after }` (both in API shape) for audit logs. */
export async function updateSlot(id, changes, doctorId) {
  const current = await findSlot(id, doctorId);
  const before = toSlot(current);

  const next = {
    facilityId: changes.facilityId ?? before.facilityId,
    date: changes.date ?? before.date,
    startTime: changes.startTime ?? before.startTime,
    endTime: changes.endTime ?? before.endTime,
  };
  // Blocking or unblocking a slot is always allowed; moving it must still be a valid future time.
  const moved = ["facilityId", "date", "startTime", "endTime"].some((key) => next[key] !== before[key]);
  if (moved) assertValidSlot(next);
  if (next.facilityId !== before.facilityId) await assertDoctorAtClinic(current.doctorId, next.facilityId);

  try {
    const slot = await prisma.availabilitySlot.update({
      where: { id },
      data: {
        clinicId: next.facilityId,
        date: toDbDate(next.date),
        startTime: toDbTime(next.startTime),
        endTime: toDbTime(next.endTime),
        ...(changes.status ? { status: changes.status } : {}),
      },
      include: slotInclude,
    });
    return { before, after: toSlot(slot) };
  } catch (error) {
    // Requests already point at this slot: it cannot move to another clinic, only be blocked.
    if (isForeignKeyViolation(error))
      throw conflict(
        "SLOT_IN_USE",
        "This slot has appointment requests, so it cannot move to another clinic. Block it instead.",
      );
    throw error;
  }
}

export async function removeSlot(id, doctorId) {
  await findSlot(id, doctorId);
  try {
    await prisma.availabilitySlot.delete({ where: { id } });
  } catch (error) {
    if (isForeignKeyViolation(error))
      throw conflict(
        "SLOT_IN_USE",
        "This slot has appointment requests, so it cannot be removed. Block it instead.",
      );
    throw error;
  }
}
