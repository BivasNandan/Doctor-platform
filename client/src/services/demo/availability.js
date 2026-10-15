import { ROLES } from "../../constants/roles.js";
import { SLOT_STATUS, isAccountRestricted } from "../../constants/statuses.js";
import { localDateKey } from "../../utils/date.js";
import { ApiError } from "../http/httpClient.js";
import { conflict, db, findDoctor, invalid, nextId, notFound, reply, requireRole } from "./db.js";

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
