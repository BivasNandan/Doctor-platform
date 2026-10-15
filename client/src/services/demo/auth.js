import { ApiError } from "../http/httpClient.js";
import { ROLES } from "../../constants/roles.js";
import { isAccountRestricted } from "../../constants/statuses.js";
import { DEMO_VERIFICATION_CODE } from "../../constants/demo.js";
import { isValidEmail, isValidPhone } from "../../utils/validation.js";
import { conflict, DEMO_PATIENT, db, findDoctor, invalid, nextId, reply, requireRole } from "./db.js";

const DEMO_DOCTOR_ID = "d1";

/** Keeps the stored patient and the active session in step. */
function savePatient(changes) {
  const session = requireRole(ROLES.PATIENT);
  const stored = db.patients.find((item) => item.id === session.id);
  const updated = { ...session, ...changes };
  if (stored) Object.assign(stored, changes);
  db.session = updated;
  return updated;
}

export const authService = {
  /**
   * Demo sign-in does NOT verify credentials: it signs in a registered patient
   * (matched by email), the fixture patient, the fixture doctor or the
   * administrator, depending on the portal used.
   */
  async login({ email, portal }) {
    let user;
    if (portal === ROLES.PATIENT) {
      const registered = db.patients.find((item) => item.email.toLowerCase() === email.toLowerCase());
      user = registered ? { ...registered } : { ...DEMO_PATIENT, email };
    } else if (portal === ROLES.ADMIN) {
      user = {
        id: "demo-admin",
        role: ROLES.ADMIN,
        name: "Carewell administrator",
        email,
      };
    } else {
      const doctor = findDoctor(DEMO_DOCTOR_ID);
      if (isAccountRestricted(doctor))
        throw new ApiError(
          `This doctor account is ${doctor.accountStatus}. Contact Carewell administration.`,
          { status: 403, code: "ACCOUNT_RESTRICTED" },
        );
      user = {
        id: doctor.id,
        role: ROLES.DOCTOR,
        doctorId: doctor.id,
        name: doctor.name,
        email,
        accountStatus: doctor.accountStatus,
      };
    }
    db.session = user;
    return reply({ user });
  },

  async logout() {
    db.session = null;
    return reply(null);
  },

  async registerDoctor(input) {
    // eslint-disable-next-line no-unused-vars -- the password never enters demo state
    const { password, ...profile } = input;
    if (!profile.name || !profile.email) throw invalid("Name and email are required.");
    const specialty = db.specialties.find((item) => item.id === profile.specialtyId);
    const doctor = {
      ...profile,
      id: nextId("DEMO-DR"),
      specialty: specialty?.name ?? "General practice",
      image: "",
      verificationStatus: "pending",
      publicationStatus: "unpublished",
      accountStatus: "active",
      rating: 0,
      reviewCount: 0,
      availability: [],
      nextAvailable: "To be scheduled",
    };
    db.doctors = [doctor, ...db.doctors];
    const user = {
      id: doctor.id,
      role: ROLES.DOCTOR,
      doctorId: doctor.id,
      name: doctor.name,
      email: doctor.email,
      accountStatus: doctor.accountStatus,
    };
    db.session = user;
    return reply({ user, doctor });
  },

  /** Creates an unverified patient account and signs them in. */
  async registerPatient({ name, email, phone }) {
    const errors = {};
    if (!name?.trim() || name.trim().length < 2) errors.name = "Enter your full name.";
    if (!isValidEmail(email ?? "")) errors.email = "Enter a valid email address.";
    if (!isValidPhone(phone ?? "")) errors.phone = "Enter a valid phone number.";
    if (Object.keys(errors).length) throw invalid("Some of the details are invalid.", errors);
    if (db.patients.some((item) => item.email.toLowerCase() === email.trim().toLowerCase()))
      throw conflict("An account with this email already exists. Try signing in.", "EMAIL_TAKEN");

    const patient = {
      id: nextId("DEMO-PT"),
      role: ROLES.PATIENT,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      emailVerified: false,
    };
    db.patients.push(patient);
    db.session = { ...patient };
    return reply({ user: db.session });
  },

  /** Demo accepts the single code in `constants/demo.js`. */
  async verifyEmail(code) {
    requireRole(ROLES.PATIENT);
    if (String(code).trim() !== DEMO_VERIFICATION_CODE)
      throw invalid("That code isn’t right. Check your email and try again.");
    return reply({ user: savePatient({ emailVerified: true }) });
  },

  async resendVerification() {
    requireRole(ROLES.PATIENT);
    return reply({ sent: true });
  },

  async updateProfile({ name, phone }) {
    requireRole(ROLES.PATIENT);
    if (!name?.trim() || name.trim().length < 2) throw invalid("Enter your full name.");
    if (!isValidPhone(phone ?? "")) throw invalid("Enter a valid phone number.");
    return reply({ user: savePatient({ name: name.trim(), phone: phone.trim() }) });
  },

  async getCurrentUser() {
    return reply(db.session);
  },
};
