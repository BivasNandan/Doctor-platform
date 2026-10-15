import { ROLES } from "../../constants/roles.js";
import {
  ACCOUNT_STATUS,
  ADMIN_APPOINTMENT_TRANSITIONS,
  APPOINTMENT_STATUS,
  PUBLICATION_STATUS,
  VERIFICATION_STATUS,
} from "../../constants/statuses.js";
import { localDateKey } from "../../utils/date.js";
import { slugify } from "../../utils/validation.js";
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
import { monthlyAppointmentCounts } from "./fixtures.js";

const admin = () => requireRole(ROLES.ADMIN);

function requireDoctor(id) {
  const doctor = findDoctor(id);
  if (!doctor) throw notFound("This doctor profile");
  return doctor;
}

function requireFacility(id) {
  const facility = db.facilities.find((item) => item.id === id);
  if (!facility) throw notFound("This facility");
  return facility;
}

function monthlySeries() {
  const now = new Date();
  return monthlyAppointmentCounts.map((count, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
    return {
      month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      count,
    };
  });
}

export const adminService = {
  async getSummary() {
    admin();
    const today = localDateKey();
    return reply({
      pendingDoctors: db.doctors.filter((item) => item.verificationStatus === VERIFICATION_STATUS.PENDING)
        .length,
      verifiedDoctors: db.doctors.filter((item) => item.verificationStatus === VERIFICATION_STATUS.VERIFIED)
        .length,
      appointmentsToday: db.appointments.filter((item) => item.date === today).length,
      activeFacilities: db.facilities.filter((item) => item.active !== false).length,
      activeSpecialties: db.specialties.filter((item) => item.active !== false).length,
      monthlyAppointments: monthlySeries(),
    });
  },

  // Doctors ------------------------------------------------------------
  async listDoctors() {
    admin();
    return reply(db.doctors);
  },

  async addDoctor(input) {
    admin();
    if (!input.name || input.name.length < 5) throw invalid("Enter the doctor's full name.");
    if (!Number.isFinite(input.fee) || input.fee < 0) throw invalid("Enter a non-negative consultation fee.");
    if (!input.facilityIds?.length) throw invalid("Choose at least one clinic or hospital.");
    const specialty = db.specialties.find((item) => item.id === input.specialtyId);
    if (!specialty) throw invalid("Choose a specialty.");
    const doctor = {
      ...input,
      id: nextId("DEMO-DR"),
      specialty: specialty.name,
      image: "",
      verificationStatus: VERIFICATION_STATUS.PENDING,
      publicationStatus: PUBLICATION_STATUS.UNPUBLISHED,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
      rating: 0,
      reviewCount: 0,
      availability: [],
      nextAvailable: "To be scheduled",
    };
    db.doctors = [doctor, ...db.doctors];
    return reply(doctor);
  },

  async updateDoctor(id, input) {
    admin();
    const doctor = requireDoctor(id);
    const specialty = db.specialties.find((item) => item.id === input.specialtyId);
    Object.assign(doctor, input, { specialty: specialty?.name ?? doctor.specialty });
    return reply(doctor);
  },

  async deactivateDoctor(id) {
    admin();
    const doctor = requireDoctor(id);
    doctor.accountStatus = ACCOUNT_STATUS.DEACTIVATED;
    doctor.publicationStatus = PUBLICATION_STATUS.INACTIVE;
    return reply(doctor);
  },

  async setVerification(id, status) {
    admin();
    if (!Object.values(VERIFICATION_STATUS).includes(status))
      throw invalid("Unsupported verification state.");
    const doctor = requireDoctor(id);
    doctor.verificationStatus = status;
    doctor.verified = status === VERIFICATION_STATUS.VERIFIED;
    // A profile that is no longer verified must not stay public.
    if (!doctor.verified && doctor.publicationStatus === PUBLICATION_STATUS.PUBLISHED)
      doctor.publicationStatus = PUBLICATION_STATUS.UNPUBLISHED;
    return reply(doctor);
  },

  async setPublication(id, status) {
    admin();
    if (![PUBLICATION_STATUS.PUBLISHED, PUBLICATION_STATUS.UNPUBLISHED].includes(status))
      throw invalid("Unsupported publication state.");
    const doctor = requireDoctor(id);
    if (status === PUBLICATION_STATUS.PUBLISHED && doctor.verificationStatus !== VERIFICATION_STATUS.VERIFIED)
      throw conflict("Only verified profiles can be published.", "NOT_VERIFIED");
    doctor.publicationStatus = status;
    return reply(doctor);
  },

  // Facilities ---------------------------------------------------------
  async listFacilities() {
    admin();
    return reply(db.facilities);
  },

  async addFacility(input) {
    admin();
    if (!input.name || !input.address) throw invalid("Name and address are required.");
    const facility = { image: "", distanceKm: 0, ...input, id: nextId("DEMO-FAC"), active: true };
    db.facilities = [facility, ...db.facilities];
    return reply(facility);
  },

  async updateFacility(id, input) {
    admin();
    return reply(Object.assign(requireFacility(id), input));
  },

  async deactivateFacility(id) {
    admin();
    const facility = requireFacility(id);
    facility.active = false;
    return reply(facility);
  },

  // Specialties --------------------------------------------------------
  async listSpecialties() {
    admin();
    return reply(db.specialties);
  },

  async addSpecialty(input) {
    admin();
    const slug = input.slug || slugify(input.name);
    if (!input.name || !slug) throw invalid("Enter a specialty name.");
    if (db.specialties.some((item) => item.slug === slug))
      throw conflict("A specialty with this name already exists.", "DUPLICATE_SPECIALTY");
    const specialty = { ...input, slug, id: slug, active: true };
    db.specialties = [...db.specialties, specialty];
    return reply(specialty);
  },

  async setSpecialtyActive(id, active) {
    admin();
    const specialty = db.specialties.find((item) => item.id === id);
    if (!specialty) throw notFound("This specialty");
    specialty.active = Boolean(active);
    return reply(specialty);
  },

  // Appointments -------------------------------------------------------
  async listAppointments() {
    admin();
    return reply(db.appointments.map(hydrate));
  },

  async updateAppointmentStatus(id, status) {
    admin();
    const appointment = db.appointments.find((item) => item.id === id);
    if (!appointment) throw notFound("This request");
    if (
      !Object.values(APPOINTMENT_STATUS).includes(status) ||
      !ADMIN_APPOINTMENT_TRANSITIONS[appointment.status]?.includes(status)
    )
      throw conflict(`Cannot change a ${appointment.status} request to ${status}.`, "INVALID_TRANSITION");
    appointment.status = status;
    appointment.simulated = true;
    if (status === APPOINTMENT_STATUS.ACCEPTED) ensureConversation(appointment);
    return reply(hydrate(appointment));
  },
};
