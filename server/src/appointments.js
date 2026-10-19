import { prisma } from "./config/prisma.js";
import { conflict } from "./http.js";
import { appointmentInclude, toAppointment } from "./mappers.js";

// Who may move an appointment request from which status to which. `completed` is only ever set by
// an administrator; a doctor accepts or rejects, and a patient cancels.
export const ADMIN_TRANSITIONS = {
  pending: ["accepted", "rejected", "cancelled"],
  accepted: ["cancelled", "completed"],
};
export const DOCTOR_TRANSITIONS = { pending: ["accepted", "rejected"] };
export const PATIENT_TRANSITIONS = { pending: ["cancelled"], accepted: ["cancelled"] };

/**
 * Moves `appointment` (a database row) to `status` if `allowed` permits it, in one batched
 * transaction. Accepting also opens the message thread between that patient and doctor. The
 * database refuses a second accepted request for one slot, which surfaces as
 * 409 APPOINTMENT_CONFLICT. Resolves the updated request in API shape.
 */
export async function changeAppointmentStatus(appointment, status, allowed) {
  if (!allowed[appointment.status]?.includes(status))
    throw conflict("INVALID_TRANSITION", `A ${appointment.status} request cannot be changed to ${status}.`);

  const { id, doctorId, patientId } = appointment;
  const [updated] = await prisma.$transaction([
    prisma.appointment.update({ where: { id }, data: { status }, include: appointmentInclude }),
    ...(status === "accepted"
      ? [
          prisma.conversation.upsert({
            where: { doctorId_patientId: { doctorId, patientId } },
            update: {},
            create: { kind: "patient_doctor", doctorId, patientId },
          }),
        ]
      : []),
  ]);
  return toAppointment(updated);
}
