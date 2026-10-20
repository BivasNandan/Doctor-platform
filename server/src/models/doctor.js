import { prisma } from "../config/prisma.js";
import { addDays, clock, dateKey, dhakaNow, minutesOf, timeLabel, weekday } from "../utils/time.js";

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
    feesByFacility: Object.fromEntries(
      doctor.clinics.filter((c) => c.fee != null).map((c) => [c.clinicId, c.fee]),
    ),
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
