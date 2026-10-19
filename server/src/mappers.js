import { prisma } from "./config/prisma.js";

// Database rows → the JSON shapes in docs/API_CONTRACT.md (and client/src/types.js).
// Anything derived (next available time, "booked" state) is computed here, never stored.

// ── Dates and times (the clinics are all in Dhaka: UTC+6, no daylight saving) ──────────────
const dhakaClock = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Dhaka",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Today's date and the minute of the day in Dhaka. */
export function dhakaNow() {
  const parts = Object.fromEntries(dhakaClock.formatToParts(new Date()).map((p) => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

export function addDays(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** @db.Date column value → "YYYY-MM-DD". */
export const dateKey = (value) => value.toISOString().slice(0, 10);
/** @db.Time column value → "HH:mm". */
export const clock = (value) => value.toISOString().slice(11, 16);
/** "YYYY-MM-DD" → value for a @db.Date column. */
export const toDbDate = (key) => new Date(`${key}T00:00:00Z`);
/** "HH:mm" → value for a @db.Time column. */
export const toDbTime = (hhmm) => new Date(`1970-01-01T${hhmm}:00Z`);
export const minutesOf = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** "17:30" → "5:30 PM". */
export function timeLabel(hhmm) {
  const hours = Number(hhmm.slice(0, 2));
  return `${hours % 12 || 12}:${hhmm.slice(3, 5)} ${hours >= 12 ? "PM" : "AM"}`;
}

const weekday = (key) => new Date(`${key}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });

// ── Simple shapes ──────────────────────────────────────────────────────────────────────────
export function toUser(user) {
  return {
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    phone: user.phone ?? undefined,
    doctorId: user.doctor?.id,
    accountStatus: user.accountStatus,
    emailVerified: Boolean(user.emailVerifiedAt),
  };
}

export const toFacility = (clinic) => ({
  id: clinic.id,
  name: clinic.name,
  type: clinic.type,
  address: clinic.address,
  area: clinic.area,
  city: clinic.city,
  phone: clinic.phone,
  openingHours: clinic.openingHours ?? undefined,
  image: clinic.image ?? "",
  active: clinic.active,
});

/** The specialty's id IS its slug, exactly as the frontend uses it. */
export const toSpecialty = (specialty) => ({
  id: specialty.id,
  name: specialty.name,
  slug: specialty.id,
  description: specialty.description,
  active: specialty.active,
});

// ── Doctors ────────────────────────────────────────────────────────────────────────────────
export const doctorInclude = { user: true, specialty: true, clinics: true };

/**
 * Next free slot and the Today / Tomorrow / This week buckets, derived from future slots that
 * are available and not already taken by an accepted appointment.
 */
export async function loadAvailability(doctorIds) {
  const result = new Map(doctorIds.map((id) => [id, { nextAvailable: "To be scheduled", availability: [] }]));
  if (!doctorIds.length) return result;

  const now = dhakaNow();
  const slots = await prisma.availabilitySlot.findMany({
    where: {
      doctorId: { in: doctorIds },
      status: "available",
      date: { gte: new Date(`${now.date}T00:00:00Z`), lte: new Date(`${addDays(now.date, 6)}T00:00:00Z`) },
      appointments: { none: { status: "accepted" } },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  const tomorrow = addDays(now.date, 1);
  for (const slot of slots) {
    const day = dateKey(slot.date);
    const start = clock(slot.startTime);
    if (day === now.date && minutesOf(start) <= now.minutes) continue; // already started
    const entry = result.get(slot.doctorId);
    if (entry.nextAvailable === "To be scheduled")
      entry.nextAvailable = `${day === now.date ? "Today" : day === tomorrow ? "Tomorrow" : weekday(day)}, ${timeLabel(start)}`;
    const buckets = new Set(entry.availability);
    if (day === now.date) buckets.add("Today");
    if (day === tomorrow) buckets.add("Tomorrow");
    buckets.add("This week");
    entry.availability = ["Today", "Tomorrow", "This week"].filter((b) => buckets.has(b));
  }
  return result;
}

export function toDoctor(doctor, availability = { nextAvailable: "To be scheduled", availability: [] }) {
  return {
    id: doctor.id,
    name: doctor.user.name,
    email: doctor.user.email,
    specialtyId: doctor.specialtyId,
    specialty: doctor.specialty.name,
    image: doctor.image ?? "",
    qualifications: doctor.qualifications,
    experienceYears: doctor.experienceYears,
    fee: doctor.fee,
    feesByFacility: Object.fromEntries(doctor.clinics.filter((c) => c.fee != null).map((c) => [c.clinicId, c.fee])),
    verificationStatus: doctor.verificationStatus,
    publicationStatus: doctor.publicationStatus,
    accountStatus: doctor.user.accountStatus,
    profileReviewRequired: doctor.profileReviewRequired,
    location: doctor.location,
    facilityIds: doctor.clinics.map((c) => c.clinicId),
    nextAvailable: availability.nextAvailable,
    availability: availability.availability,
  };
}

/** Loads doctors (with everything the contract needs) and maps them. */
export async function findDoctors(args = {}) {
  const doctors = await prisma.doctor.findMany({
    ...args,
    include: doctorInclude,
    orderBy: args.orderBy ?? [{ createdAt: "desc" }],
  });
  const availability = await loadAvailability(doctors.map((d) => d.id));
  return doctors.map((doctor) => toDoctor(doctor, availability.get(doctor.id)));
}

export async function findDoctor(id) {
  const [doctor] = await findDoctors({ where: { id } });
  return doctor ?? null;
}

// ── Availability slots and appointments ────────────────────────────────────────────────────
/** `booked` is derived: a slot with an accepted appointment is booked, whatever the doctor set. */
export function toSlot(slot) {
  const booked = slot.appointments?.some((a) => a.status === "accepted");
  return {
    id: slot.id,
    doctorId: slot.doctorId,
    facilityId: slot.clinicId,
    date: dateKey(slot.date),
    startTime: clock(slot.startTime),
    endTime: clock(slot.endTime),
    status: booked ? "booked" : slot.status,
  };
}

export const slotInclude = { appointments: { select: { status: true } } };

export const appointmentInclude = {
  slot: true,
  clinic: true,
  doctor: { include: { user: true, specialty: true } },
};

export function toAppointment(appointment) {
  return {
    id: appointment.id,
    doctorId: appointment.doctorId,
    facilityId: appointment.clinicId,
    date: dateKey(appointment.slot.date),
    time: timeLabel(clock(appointment.slot.startTime)),
    patientName: appointment.patientName,
    phone: appointment.phone,
    email: appointment.email,
    reason: appointment.reason,
    relationship: appointment.relationship,
    status: appointment.status,
    doctor: {
      id: appointment.doctor.id,
      name: appointment.doctor.user.name,
      specialty: appointment.doctor.specialty.name,
      image: appointment.doctor.image ?? "",
    },
    facility: {
      id: appointment.clinic.id,
      name: appointment.clinic.name,
      address: appointment.clinic.address,
      area: appointment.clinic.area,
      city: appointment.clinic.city,
    },
  };
}
