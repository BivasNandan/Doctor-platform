import { ApiError } from "../http/httpClient.js";
import { localDateKey } from "../../utils/date.js";
import {
  doctors,
  facilities,
  specialties,
  initialAppointments,
  initialConversations,
  initialMessages,
} from "./fixtures.js";

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
    supportRequests: [],
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
