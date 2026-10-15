import { clockLabelToMinutes, localDateKey } from "../../utils/date.js";
import { APPOINTMENT_STATUS, isPubliclyListed } from "../../constants/statuses.js";
import { db, findDoctor, invalid, nextId, notFound, reply } from "./db.js";
import { demoSlotTimes } from "./fixtures.js";

const includes = (haystack, needle) => haystack.toLowerCase().includes(needle.toLowerCase());

export const doctorService = {
  async list(filters = {}) {
    const facilityText = (doctor) =>
      db.facilities
        .filter((facility) => doctor.facilityIds.includes(facility.id))
        .map((facility) => `${facility.name} ${facility.area} ${facility.city}`)
        .join(" ");

    const matches = db.doctors.filter(isPubliclyListed).filter((doctor) => {
      const search = (filters.query ?? "").trim();
      return (
        (!filters.specialty || doctor.specialtyId === filters.specialty) &&
        (!filters.location ||
          includes(doctor.location, filters.location) ||
          includes(facilityText(doctor), filters.location)) &&
        (!filters.clinic || includes(facilityText(doctor), filters.clinic)) &&
        (!filters.verified || doctor.verificationStatus === "verified") &&
        (!filters.language ||
          doctor.languages.some((language) => language.toLowerCase() === filters.language.toLowerCase())) &&
        (!filters.available || doctor.availability.some((bucket) => includes(bucket, filters.available))) &&
        (!filters.maxFee || doctor.fee <= Number(filters.maxFee)) &&
        (!search ||
          includes(`${doctor.name} ${doctor.specialty} ${doctor.location} ${facilityText(doctor)}`, search))
      );
    });
    return reply(matches);
  },

  async get(id) {
    const doctor = findDoctor(id);
    if (!doctor || !isPubliclyListed(doctor)) throw notFound("This doctor profile");
    return reply(doctor);
  },
};

export const facilityService = {
  async list(kind = "all") {
    return reply(
      db.facilities.filter(
        (facility) => facility.active !== false && (kind === "all" || facility.type === kind),
      ),
    );
  },
};

export const specialtyService = {
  async list() {
    return reply(db.specialties.filter((item) => item.active !== false));
  },
};

export const slotService = {
  /** Demo schedule: a fixed clinic session minus accepted bookings and past times. */
  async listOpen({ doctorId, facilityId, date }) {
    const doctor = findDoctor(doctorId);
    if (!doctor || !doctor.facilityIds.includes(facilityId))
      throw notFound("This clinic for the selected doctor");
    const now = new Date();
    const today = localDateKey(now);
    const booked = new Set(
      db.appointments
        .filter(
          (item) =>
            item.doctorId === doctorId &&
            item.facilityId === facilityId &&
            item.date === date &&
            item.status === APPOINTMENT_STATUS.ACCEPTED,
        )
        .map((item) => item.time),
    );
    return reply(
      demoSlotTimes.map((label) => ({
        label,
        status: booked.has(label)
          ? "booked"
          : date < today ||
              (date === today && clockLabelToMinutes(label) <= now.getHours() * 60 + now.getMinutes())
            ? "passed"
            : "available",
      })),
    );
  },
};

export const supportService = {
  async submit({ message, email }) {
    if (!message?.trim() || message.trim().length < 8)
      throw invalid("Tell us a little more so we can help (at least 8 characters).");
    const request = {
      id: nextId("DEMO-SUP"),
      message: message.trim(),
      email: email ?? "",
      status: "received",
      simulated: true,
    };
    db.supportRequests.push(request);
    return reply(request);
  },
};
