import { clock, dateKey, timeLabel } from "../utils/time.js";
import { photoUrl } from "./user.js";

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
      image: photoUrl(appointment.doctor.user) ?? appointment.doctor.image ?? "",
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
