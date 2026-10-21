import {
  ACCOUNT_STATUS,
  ADMIN_APPOINTMENT_TRANSITIONS,
  APPOINTMENT_STATUS,
  DEMO_RESET_TOKEN,
  DEMO_VERIFICATION_CODE,
  DOCTOR_APPOINTMENT_TRANSITIONS,
  isAccountRestricted,
  isPubliclyListed,
  MESSAGE_MAX_LENGTH,
  PATIENT_CANCELLABLE_STATUSES,
  PUBLICATION_STATUS,
  RELATIONSHIPS,
  ROLES,
  SLOT_STATUS,
  VERIFICATION_STATUS,
} from "../constants.js";
import {
  demoSlotTimes,
  doctors,
  facilities,
  initialAppointments,
  initialConversations,
  initialMessages,
  monthlyAppointmentCounts,
  specialties,
} from "./demoData.js";
import { ApiError } from "./httpClient.js";
import { clockLabelToMinutes, localDateKey } from "../utils/dates.js";
import { slugify } from "../utils/format.js";
import { isValidEmail, isValidPhone } from "../utils/validation.js";

// ─── db ────────────────────────────────────────────────────────────────────────────────────

/** Simulated network latency. Zero under test so suites stay fast. */
export const demoConfig = {
  latencyMs: import.meta.env.MODE === "test" ? 0 : 120,
};

const clone = (value) => structuredClone(value);

/** The pre-verified patient that owns the fixture appointments and conversations. */
export const DEMO_PATIENT = Object.freeze({
  id: "demo-patient",
  role: "patient",
  name: "Demo patient",
  email: "demo.patient@example.test",
  phone: "+8801700000000",
  emailVerified: true,
});

function createDb() {
  return {
    doctors: clone(doctors).map((doctor) => ({
      ...doctor,
      accountStatus: "active",
    })),
    facilities: clone(facilities).map((facility) => ({ ...facility, active: true })),
    specialties: clone(specialties).map((item) => ({ ...item, active: true })),
    patients: [clone(DEMO_PATIENT)],
    appointments: clone(initialAppointments).map((item) => ({
      ...item,
      patientUserId: DEMO_PATIENT.id,
      relationship: "self",
    })),
    conversations: [
      ...clone(initialConversations).map((item) => ({ ...item, patientUserId: DEMO_PATIENT.id })),
      {
        id: "c-admin",
        participantId: "admin",
        participantRole: "admin",
        participantName: "Carewell administration",
        participantImage: "",
        updatedAt: "Demo",
        unread: 0,
      },
    ],
    messages: {
      ...clone(initialMessages),
      "c-admin": [
        {
          id: "m-admin",
          conversationId: "c-admin",
          sender: "admin",
          body: "This is a simulated doctor-to-admin channel.",
          sentAt: "Demo",
          simulated: true,
        },
      ],
    },
    availability: [
      {
        id: "slot-demo-1",
        doctorId: "d1",
        facilityId: "f1",
        date: localDateKey(),
        startTime: "09:00",
        endTime: "09:30",
        status: "available",
        simulated: true,
      },
    ],
    reviews: [],
    supportRequests: [],
    deactivationRequests: [],
    notifications: [
      {
        role: "patient",
        kind: "account",
        title: "Welcome to Carewell",
        body: "Demo mode: events like booking or messaging add notifications here.",
        link: "/discover",
      },
      {
        role: "doctor",
        kind: "appointment",
        title: "New appointment request",
        body: "A demo patient asked for the next free time.",
        link: "/doctor/dashboard",
      },
      {
        role: "admin",
        kind: "doctor",
        title: "New doctor awaiting verification",
        body: "A demo doctor registered and is waiting for review.",
        link: "/admin/verification",
      },
    ].map((item, index) => ({
      ...item,
      id: `demo-note-${index}`,
      read: false,
      createdAt: new Date().toISOString(),
    })),
    /** The signed-in demo identity (null = signed out / patient browsing). */
    session: null,
  };
}

/** Mutable in-memory state. Always access as `db.<table>` (never destructure). */
export let db = createDb();

/** Restores the pristine fixtures. Used by tests. */
export function resetDemoDb() {
  db = createDb();
}

let sequence = 0;
export const nextId = (prefix = "DEMO") =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}${(sequence += 1)}`;

/** Resolves with a defensive copy after the simulated latency. */
export async function reply(value) {
  if (demoConfig.latencyMs > 0) await new Promise((resolve) => setTimeout(resolve, demoConfig.latencyMs));
  return value === undefined ? value : clone(value);
}

/** Adds a notification for everybody signed in under `role` (the demo has one person per role). */
export function pushNotification(role, { kind, title, body = "", link }) {
  db.notifications.unshift({
    id: nextId("DEMO-NOTE"),
    role,
    kind,
    title,
    body,
    link,
    read: false,
    createdAt: new Date().toISOString(),
  });
}

/** Mirrors the server's 401/403 checks so the UI never relies on lax demo rules. */
export function requireRole(...roles) {
  if (!db.session)
    throw new ApiError("Your session has expired. Sign in again to continue.", {
      status: 401,
      code: "UNAUTHENTICATED",
    });
  if (!roles.includes(db.session.role))
    throw new ApiError("You do not have permission to perform this action.", {
      status: 403,
      code: "FORBIDDEN",
    });
  return db.session;
}

export const notFound = (what) => new ApiError(`${what} is unavailable.`, { status: 404, code: "NOT_FOUND" });

export const invalid = (message, details) =>
  new ApiError(message, { status: 422, code: "VALIDATION_FAILED", details });

export const conflict = (message, code = "CONFLICT") => new ApiError(message, { status: 409, code });

export const findDoctor = (id) => db.doctors.find((doctor) => doctor.id === id);

/** Opens a patient ↔ doctor thread the first time a request is accepted. */
export function ensureConversation(appointment) {
  if (!appointment.patientUserId) return;
  const exists = db.conversations.some(
    (item) =>
      item.participantRole === "doctor" &&
      item.participantId === appointment.doctorId &&
      item.patientUserId === appointment.patientUserId,
  );
  if (exists) return;
  const doctor = findDoctor(appointment.doctorId);
  const id = nextId("DEMO-CONV");
  db.conversations.push({
    id,
    participantId: doctor.id,
    participantRole: "doctor",
    participantName: doctor.name,
    participantImage: doctor.image,
    updatedAt: "Just now",
    unread: 0,
    patientUserId: appointment.patientUserId,
  });
  db.messages[id] = [];
}

/** Embeds doctor and clinic summaries, as the API's SQL join would. */
export function hydrate(appointment) {
  const doctor = findDoctor(appointment.doctorId);
  const facility = db.facilities.find((item) => item.id === appointment.facilityId);
  return {
    ...appointment,
    doctor: doctor && {
      id: doctor.id,
      name: doctor.name,
      specialty: doctor.specialty,
      image: doctor.image,
    },
    facility: facility && {
      id: facility.id,
      name: facility.name,
      address: facility.address,
      area: facility.area,
      city: facility.city,
    },
  };
}

// ─── catalog ───────────────────────────────────────────────────────────────────────────────

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
      createdAt: new Date().toISOString(),
      simulated: true,
    };
    db.supportRequests.push(request);
    pushNotification("admin", {
      kind: "support",
      title: "New support request",
      body: request.message.slice(0, 90),
      link: "/admin",
    });
    return reply(request);
  },
};

// ─── auth ──────────────────────────────────────────────────────────────────────────────────

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
      if (registered && isAccountRestricted(registered))
        throw new ApiError(`This account is ${registered.accountStatus}. Contact Carewell administration.`, {
          status: 403,
          code: "ACCOUNT_RESTRICTED",
        });
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

  /** Same answer for every well-formed email, like the real endpoint should give. */
  async requestPasswordReset(email) {
    if (!isValidEmail(email ?? "")) throw invalid("Enter a valid email address.");
    return reply({ sent: true });
  },

  /** Demo accepts the single token in `constants/demo.js`. The password is never stored. */
  async resetPassword({ token, password }) {
    if (token !== DEMO_RESET_TOKEN)
      throw new ApiError("This reset link is invalid or has expired. Request a new one.", {
        status: 410,
        code: "RESET_TOKEN_INVALID",
      });
    if ((password ?? "").length < 8) throw invalid("Use at least 8 characters.");
    return reply({ reset: true });
  },

  async updateProfile({ name, phone }) {
    requireRole(ROLES.PATIENT);
    if (!name?.trim() || name.trim().length < 2) throw invalid("Enter your full name.");
    if (!isValidPhone(phone ?? "")) throw invalid("Enter a valid phone number.");
    return reply({ user: savePatient({ name: name.trim(), phone: phone.trim() }) });
  },

  /** Demo accounts have no stored password, so only the form rules are checked. */
  async changePassword({ currentPassword, newPassword }) {
    requireRole(ROLES.PATIENT);
    if (!currentPassword)
      throw invalid("Enter your current password.", { currentPassword: "Enter your current password." });
    if ((newPassword ?? "").length < 8)
      throw invalid("Use at least 8 characters.", { newPassword: "Use at least 8 characters." });
    return reply({ changed: true });
  },

  async getCurrentUser() {
    return reply(db.session);
  },
};

// ─── appointments ──────────────────────────────────────────────────────────────────────────

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
    pushNotification("doctor", {
      kind: "appointment",
      title: "New appointment request",
      body: `${request.patientName} asked for ${request.date} at ${request.time}.`,
      link: "/doctor/dashboard",
    });
    pushNotification("patient", {
      kind: "appointment",
      title: "Appointment request sent",
      body: "Your request is waiting for an answer.",
      link: "/appointments",
    });
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
    pushNotification("doctor", {
      kind: "appointment",
      title: "Appointment cancelled by the patient",
      body: `${appointment.patientName} cancelled ${appointment.date} at ${appointment.time}.`,
      link: "/doctor/dashboard",
    });
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
  pushNotification("patient", {
    kind: "appointment",
    title: status === APPOINTMENT_STATUS.ACCEPTED ? "Appointment accepted" : "Appointment not accepted",
    body:
      status === APPOINTMENT_STATUS.ACCEPTED
        ? "Your doctor accepted the request. You can now send a message."
        : "The doctor could not accept this time. You can choose another.",
    link: status === APPOINTMENT_STATUS.ACCEPTED ? "/messages" : "/appointments",
  });
  return appointment;
}

// ─── notifications ─────────────────────────────────────────────────────────────────────────

export const notificationService = {
  async list({ limit = 30 } = {}) {
    const viewer = requireRole(ROLES.PATIENT, ROLES.DOCTOR, ROLES.ADMIN);
    const mine = db.notifications.filter((item) => item.role === viewer.role);
    return reply({
      items: mine.slice(0, limit).map(({ role, ...item }) => item), // eslint-disable-line no-unused-vars
      unreadCount: mine.filter((item) => !item.read).length,
    });
  },

  async markRead(id) {
    const viewer = requireRole(ROLES.PATIENT, ROLES.DOCTOR, ROLES.ADMIN);
    const item = db.notifications.find((entry) => entry.id === id && entry.role === viewer.role);
    if (!item) throw notFound("This notification");
    item.read = true;
    return reply(item);
  },

  async markAllRead() {
    const viewer = requireRole(ROLES.PATIENT, ROLES.DOCTOR, ROLES.ADMIN);
    const unread = db.notifications.filter((item) => item.role === viewer.role && !item.read);
    unread.forEach((item) => (item.read = true));
    return reply({ updated: unread.length });
  },
};

// ─── doctorPortal ──────────────────────────────────────────────────────────────────────────

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
    const request = {
      id: nextId("DEMO-DEA"),
      doctorId: doctor.id,
      doctorName: doctor.name,
      doctorEmail: doctor.email ?? "",
      reason: reason.trim(),
      status: "open",
      createdAt: new Date().toISOString(),
      simulated: true,
    };
    db.deactivationRequests.unshift(request);
    pushNotification("admin", {
      kind: "doctor",
      title: "Deactivation request",
      body: `${doctor.name} asked to deactivate their account.`,
      link: "/admin/doctors",
    });
    return reply({ status: ACCOUNT_STATUS.DEACTIVATION_REQUESTED });
  },
};

// ─── availability ──────────────────────────────────────────────────────────────────────────

/** Resolves which doctor the caller may manage: doctors → self, admins → any. */
function resolveDoctorId(doctorId, { admin }) {
  const session = requireRole(admin ? ROLES.ADMIN : ROLES.DOCTOR);
  const id = admin ? doctorId : session.doctorId;
  const doctor = findDoctor(id);
  if (!doctor) throw notFound("This doctor profile");
  if (!admin && isAccountRestricted(doctor))
    throw new ApiError(`This account is ${doctor.accountStatus}.`, {
      status: 403,
      code: "ACCOUNT_RESTRICTED",
    });
  return id;
}

function validateSlot(doctorId, slot) {
  const doctor = findDoctor(doctorId);
  if (!slot.date || !slot.startTime || !slot.endTime || slot.startTime >= slot.endTime)
    throw invalid("Choose a valid date and an end time after the start time.");
  if (slot.date < localDateKey()) throw invalid("Availability cannot be added in the past.");
  if (!doctor.facilityIds.includes(slot.facilityId))
    throw invalid("Choose a clinic the doctor is associated with.");
  const overlaps = db.availability.some(
    (current) =>
      current.doctorId === doctorId &&
      current.facilityId === slot.facilityId &&
      current.date === slot.date &&
      current.id !== slot.id &&
      current.status !== SLOT_STATUS.UNAVAILABLE &&
      slot.startTime < current.endTime &&
      slot.endTime > current.startTime,
  );
  if (overlaps) throw conflict("This slot overlaps existing availability.", "SLOT_OVERLAP");
}

const findOwned = (id, doctorId) => {
  const slot = db.availability.find((item) => item.id === id && item.doctorId === doctorId);
  if (!slot) throw notFound("This availability slot");
  return slot;
};

export const availabilityService = {
  async list(doctorId, { admin = false } = {}) {
    const id = resolveDoctorId(doctorId, { admin });
    return reply(db.availability.filter((slot) => slot.doctorId === id));
  },

  async save(doctorId, slot, { admin = false } = {}) {
    const id = resolveDoctorId(doctorId, { admin });
    const saved = {
      ...slot,
      id: nextId("DEMO-SLOT"),
      doctorId: id,
      status: slot.status || SLOT_STATUS.AVAILABLE,
      simulated: true,
    };
    validateSlot(id, saved);
    db.availability = [...db.availability, saved];
    return reply(saved);
  },

  async update(slotId, input, { admin = false } = {}) {
    const session = requireRole(admin ? ROLES.ADMIN : ROLES.DOCTOR);
    const current = db.availability.find((item) => item.id === slotId);
    if (!current) throw notFound("This availability slot");
    const id = resolveDoctorId(admin ? current.doctorId : session.doctorId, { admin });
    findOwned(slotId, id);
    const next = { ...current, ...input, id: slotId, doctorId: id, simulated: true };
    const timingChanged = ["date", "startTime", "endTime", "facilityId"].some(
      (key) => input[key] !== undefined && input[key] !== current[key],
    );
    // Blocking a slot never needs re-validation; moving or re-opening one does.
    if (timingChanged || next.status === SLOT_STATUS.AVAILABLE) validateSlot(id, next);
    db.availability = db.availability.map((item) => (item.id === slotId ? next : item));
    return reply(next);
  },

  async remove(slotId, { admin = false } = {}) {
    const session = requireRole(admin ? ROLES.ADMIN : ROLES.DOCTOR);
    const current = db.availability.find((item) => item.id === slotId);
    if (!current) throw notFound("This availability slot");
    if (!admin && current.doctorId !== session.doctorId) throw notFound("This availability slot");
    db.availability = db.availability.filter((item) => item.id !== slotId);
    return reply({ id: slotId, removed: true });
  },
};

// ─── messaging ─────────────────────────────────────────────────────────────────────────────

const requireViewer = () => requireRole(ROLES.PATIENT, ROLES.DOCTOR, ROLES.ADMIN);

/** Threads this viewer may see. Patients only ever see their own. */
function visibleConversations(viewer) {
  const adminThread = db.conversations.find((item) => item.id === "c-admin");
  if (viewer.role === ROLES.DOCTOR) return [adminThread];
  if (viewer.role === ROLES.ADMIN) {
    const doctor = findDoctor("d1");
    return [
      {
        ...adminThread,
        participantId: doctor.id,
        participantRole: ROLES.DOCTOR,
        participantName: doctor.name,
        participantImage: doctor.image,
      },
    ];
  }
  return db.conversations.filter(
    (item) => item.participantRole === ROLES.DOCTOR && item.patientUserId === viewer.id,
  );
}

/** Admin ↔ doctor threads are always open; patient threads need an accepted request. */
function canMessage(conversation, viewer) {
  if (viewer.role !== ROLES.PATIENT) return true;
  return db.appointments.some(
    (item) =>
      item.patientUserId === viewer.id &&
      item.doctorId === conversation.participantId &&
      item.status === APPOINTMENT_STATUS.ACCEPTED,
  );
}

function requireConversation(id, viewer) {
  const conversation = visibleConversations(viewer).find((item) => item.id === id);
  if (!conversation) throw notFound("This conversation");
  return conversation;
}

const notEligible = () =>
  new ApiError("Messaging is available only after the doctor accepts an appointment request.", {
    status: 403,
    code: "MESSAGING_NOT_ELIGIBLE",
  });

export const messagingService = {
  async listConversations() {
    const viewer = requireViewer();
    return reply(
      visibleConversations(viewer).map((conversation) => ({
        ...conversation,
        canMessage: canMessage(conversation, viewer),
      })),
    );
  },

  async listMessages(conversationId) {
    const viewer = requireViewer();
    const conversation = requireConversation(conversationId, viewer);
    if (!canMessage(conversation, viewer)) throw notEligible();
    return reply(
      (db.messages[conversationId] ?? []).map((message) => ({
        ...message,
        isMine: message.sender === viewer.role,
      })),
    );
  },

  async sendMessage(conversationId, body) {
    const viewer = requireViewer();
    const conversation = requireConversation(conversationId, viewer);
    if (!canMessage(conversation, viewer)) throw notEligible();
    const text = body?.trim() ?? "";
    if (!text || text.length > MESSAGE_MAX_LENGTH)
      throw invalid(`Enter a message of 1 to ${MESSAGE_MAX_LENGTH.toLocaleString()} characters.`);
    const message = {
      id: nextId("DEMO-MSG"),
      conversationId,
      sender: viewer.role,
      isMine: true,
      body: text,
      sentAt: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      simulated: true,
    };
    db.messages[conversationId] = [...(db.messages[conversationId] ?? []), message];
    // The person on the other side of the conversation gets a notification.
    const other =
      viewer.role === ROLES.ADMIN
        ? ROLES.DOCTOR
        : viewer.role === ROLES.PATIENT
          ? ROLES.DOCTOR
          : conversation.participantRole === ROLES.ADMIN
            ? ROLES.ADMIN
            : ROLES.PATIENT;
    pushNotification(other, {
      kind: "message",
      title: `New message from ${viewer.name ?? viewer.role}`,
      body: text.slice(0, 90),
      link: "/messages",
    });
    return reply(message);
  },

  async unreadCount() {
    requireViewer();
    return reply({ count: 0 });
  },

  /** Administrators: the demo has a single doctor↔administration thread. */
  async startConversation() {
    const viewer = requireRole(ROLES.ADMIN);
    return reply({ ...visibleConversations(viewer)[0], canMessage: true });
  },

  async sendAttachment() {
    requireViewer();
    throw new ApiError("Attachment upload is unavailable in demo mode. No file was sent.", {
      status: 501,
      code: "NOT_IMPLEMENTED",
    });
  },
};

// ─── reviews and profile photos ────────────────────────────────────────────────────────────

const REVIEW_COMMENT_MAX = 1000;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PHOTO_MAX_BYTES = 2 * 1024 * 1024;

/** "Nadia Rahman" -> "Nadia R.", as the API shows reviewers. */
function reviewerName(name = "") {
  const [first = "", ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toUpperCase()}.` : first || "A patient";
}

const visibleReviews = (doctorId) =>
  db.reviews.filter((item) => item.doctorId === doctorId && item.status === "visible");

const averageOf = (reviews) =>
  reviews.length
    ? Math.round((reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length) * 10) / 10
    : 0;

/** Keeps the doctor's public average and count in step with their visible reviews. */
function refreshRating(doctorId) {
  const doctor = findDoctor(doctorId);
  if (!doctor) return;
  const visible = visibleReviews(doctorId);
  doctor.reviewCount = visible.length;
  doctor.rating = averageOf(visible);
}

const hasCompletedVisit = (patientId, doctorId) =>
  db.appointments.some(
    (item) =>
      item.patientUserId === patientId &&
      item.doctorId === doctorId &&
      item.status === APPOINTMENT_STATUS.COMPLETED,
  );

function reviewInput({ rating, comment }, { partial = false } = {}) {
  const found = {};
  const out = {};
  if (!partial || rating !== undefined) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) found.rating = "Choose a rating from 1 to 5.";
    else out.rating = rating;
  }
  if (!partial || comment !== undefined) {
    const text = String(comment ?? "").trim();
    if (text.length > REVIEW_COMMENT_MAX) found.comment = "Please keep the review under 1,000 characters.";
    else out.comment = text;
  }
  if (Object.keys(found).length) throw invalid(Object.values(found)[0], found);
  return out;
}

const toReview = (review, viewerId) => ({
  id: review.id,
  rating: review.rating,
  comment: review.comment,
  author: reviewerName(review.patientName),
  createdAt: review.createdAt,
  updatedAt: review.updatedAt,
  ...(review.patientId === viewerId ? { mine: true } : {}),
});

export const reviewService = {
  async list(doctorId, { limit = 20, offset = 0 } = {}) {
    const doctor = findDoctor(doctorId);
    if (!doctor || !isPubliclyListed(doctor)) throw notFound("This doctor profile");
    const viewer = db.session?.role === ROLES.PATIENT ? db.session : null;
    const visible = visibleReviews(doctorId);
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    visible.forEach((item) => (distribution[item.rating] += 1));
    const mine =
      viewer && db.reviews.find((item) => item.doctorId === doctorId && item.patientId === viewer.id);
    return reply({
      summary: { average: averageOf(visible), count: visible.length, distribution },
      items: [...visible]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(offset, offset + limit)
        .map((item) => toReview(item, viewer?.id)),
      viewer: {
        canReview: Boolean(viewer && !mine && hasCompletedVisit(viewer.id, doctorId)),
        myReview: mine ? toReview(mine, viewer.id) : null,
      },
    });
  },

  async create(doctorId, input) {
    const patient = requireRole(ROLES.PATIENT);
    const doctor = findDoctor(doctorId);
    if (!doctor || !isPubliclyListed(doctor)) throw notFound("This doctor profile");
    const data = reviewInput(input);
    if (!hasCompletedVisit(patient.id, doctorId))
      throw new ApiError("You can review a doctor after a completed visit with them.", {
        status: 403,
        code: "REVIEW_NOT_ELIGIBLE",
      });
    if (db.reviews.some((item) => item.doctorId === doctorId && item.patientId === patient.id))
      throw conflict(
        "You have already reviewed this doctor. You can edit your review instead.",
        "ALREADY_REVIEWED",
      );
    const now = new Date().toISOString();
    const review = {
      id: nextId("DEMO-REV"),
      doctorId,
      patientId: patient.id,
      patientName: patient.name,
      patientEmail: patient.email,
      ...data,
      status: "visible",
      createdAt: now,
      updatedAt: now,
    };
    db.reviews.unshift(review);
    refreshRating(doctorId);
    pushNotification("doctor", {
      kind: "doctor",
      title: `New ${data.rating}-star review`,
      body: `${patient.name.split(" ")[0]} rated you ${data.rating} out of 5.`,
      link: "/doctor/dashboard",
    });
    return reply(toReview(review, patient.id));
  },

  async update(id, input) {
    const patient = requireRole(ROLES.PATIENT);
    const review = db.reviews.find((item) => item.id === id && item.patientId === patient.id);
    if (!review) throw notFound("This review");
    const data = reviewInput(input, { partial: true });
    if (!Object.keys(data).length) throw invalid("Nothing to change.");
    Object.assign(review, data, { updatedAt: new Date().toISOString() });
    refreshRating(review.doctorId);
    return reply(toReview(review, patient.id));
  },

  async remove(id) {
    const patient = requireRole(ROLES.PATIENT);
    const review = db.reviews.find((item) => item.id === id && item.patientId === patient.id);
    if (!review) throw notFound("This review");
    db.reviews = db.reviews.filter((item) => item !== review);
    refreshRating(review.doctorId);
    return reply(null);
  },
};

/** The picture as a data: URL, so the demo can show it without a server. */
async function readAsDataUrl(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return `data:${file.type};base64,${btoa(binary)}`;
}

/** Stores the photo on whoever is signed in and returns the updated user. */
function applyPhoto(photoUrl) {
  const session = requireViewer();
  if (session.role === ROLES.PATIENT) return savePatient({ photoUrl });
  if (session.role === ROLES.DOCTOR) {
    const doctor = findDoctor(session.doctorId);
    if (doctor) doctor.image = photoUrl ?? "";
  }
  db.session = { ...session, photoUrl };
  return db.session;
}

export const photoService = {
  async upload(file) {
    requireViewer();
    if (!file || !PHOTO_TYPES.includes(file.type))
      throw invalid("Choose a JPEG, PNG or WebP picture.", { file: "Unsupported file type." });
    if (file.size > PHOTO_MAX_BYTES)
      throw new ApiError("The file is larger than 2 MB.", { status: 413, code: "FILE_TOO_LARGE" });
    const dataUrl = await readAsDataUrl(file);
    return reply({ user: applyPhoto(dataUrl) });
  },

  async remove() {
    requireViewer();
    return reply({ user: applyPhoto(undefined) });
  },
};

// ─── admin ─────────────────────────────────────────────────────────────────────────────────

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

const toAdminPatient = (patient) => ({
  id: patient.id,
  name: patient.name,
  email: patient.email,
  phone: patient.phone,
  accountStatus: patient.accountStatus ?? "active",
  emailVerified: Boolean(patient.emailVerified),
  photoUrl: patient.photoUrl,
  appointmentCount: db.appointments.filter((entry) => entry.patientUserId === patient.id).length,
  createdAt: patient.createdAt ?? new Date(0).toISOString(),
});

const toModerationReview = (review) => ({
  id: review.id,
  doctorId: review.doctorId,
  doctorName: findDoctor(review.doctorId)?.name ?? "",
  patientName: review.patientName,
  patientEmail: review.patientEmail,
  rating: review.rating,
  comment: review.comment,
  status: review.status,
  createdAt: review.createdAt,
});

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
    pushNotification("patient", {
      kind: "appointment",
      title: `Appointment ${status}`,
      body: "The administration updated your request.",
      link: "/appointments",
    });
    pushNotification("doctor", {
      kind: "appointment",
      title: `Appointment ${status} by the administration`,
      body: `${appointment.patientName}, ${appointment.date} at ${appointment.time}.`,
      link: "/doctor/dashboard",
    });
    return reply(hydrate(appointment));
  },

  // Patients -----------------------------------------------------------
  async listPatients({ query, status } = {}) {
    admin();
    const needle = (query ?? "").trim().toLowerCase();
    return reply(
      db.patients
        .filter((item) => !status || (item.accountStatus ?? "active") === status)
        .filter(
          (item) =>
            !needle || `${item.name} ${item.email} ${item.phone ?? ""}`.toLowerCase().includes(needle),
        )
        .map((item) => toAdminPatient(item)),
    );
  },

  async setPatientStatus(id, status) {
    admin();
    if (!["active", "suspended"].includes(status)) throw invalid("Choose active or suspended.");
    const patient = db.patients.find((item) => item.id === id);
    if (!patient) throw notFound("This patient");
    patient.accountStatus = status;
    return reply(toAdminPatient(patient));
  },

  // Review moderation --------------------------------------------------
  async listReviews(status) {
    admin();
    return reply(db.reviews.filter((item) => !status || item.status === status).map(toModerationReview));
  },

  async setReviewStatus(id, status) {
    admin();
    if (!["visible", "hidden"].includes(status)) throw invalid("Choose visible or hidden.");
    const review = db.reviews.find((item) => item.id === id);
    if (!review) throw notFound("This review");
    review.status = status;
    refreshRating(review.doctorId);
    return reply(toModerationReview(review));
  },

  // Support and account review ----------------------------------------
  async listSupportRequests(status) {
    admin();
    return reply(db.supportRequests.filter((item) => !status || item.status === status));
  },

  async updateSupportRequest(id, status) {
    admin();
    if (!["received", "in_progress", "resolved"].includes(status))
      throw invalid("Unsupported support request status.");
    const request = db.supportRequests.find((item) => item.id === id);
    if (!request) throw notFound("This support request");
    request.status = status;
    return reply(request);
  },

  async replyToSupportRequest(id, { message, resolve = true }) {
    admin();
    const request = db.supportRequests.find((item) => item.id === id);
    if (!request) throw notFound("This support request");
    if (!request.email) throw invalid("This person did not leave an email address to reply to.");
    if (!message?.trim()) throw invalid("Write a reply.");
    request.status = resolve ? "resolved" : "in_progress";
    request.lastReply = message.trim();
    return reply(request);
  },

  async listDeactivationRequests(status = "open") {
    admin();
    return reply(db.deactivationRequests.filter((item) => item.status === status));
  },

  async decideDeactivationRequest(id, decision) {
    admin();
    if (!["approve", "decline"].includes(decision)) throw invalid("Choose approve or decline.");
    const request = db.deactivationRequests.find((item) => item.id === id);
    if (!request) throw notFound("This deactivation request");
    if (request.status !== "open")
      throw conflict("This request has already been decided.", "ALREADY_DECIDED");
    request.status = decision === "approve" ? "approved" : "declined";
    request.decidedAt = new Date().toISOString();
    const doctor = requireDoctor(request.doctorId);
    doctor.accountStatus = decision === "approve" ? ACCOUNT_STATUS.DEACTIVATED : ACCOUNT_STATUS.ACTIVE;
    if (decision === "approve") doctor.publicationStatus = PUBLICATION_STATUS.INACTIVE;
    return reply(request);
  },
};
