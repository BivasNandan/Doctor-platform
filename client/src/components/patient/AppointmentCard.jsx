import { Clock3, MapPin } from "lucide-react";
import { PATIENT_CANCELLABLE_STATUSES, relationshipTag } from "../../constants.js";
import { parseDateKey } from "../../utils/dates.js";
import { Avatar, StatusPill } from "../ui/index.js";

/**
 * One appointment request in the patient's list.
 * @param {{appointment: object, doctor?: object, facility?: object, onCancel: (id: string) => void}} props
 */
export default function AppointmentCard({ appointment, doctor, facility, onCancel }) {
  const date = parseDateKey(appointment.date);
  return (
    <article className="appointment-card surface">
      <div className="appointment-date">
        <strong>{date.toLocaleDateString("en", { day: "2-digit" })}</strong>
        <span>{date.toLocaleDateString("en", { month: "short", weekday: "short" })}</span>
      </div>
      <Avatar className="appointment-doctor-image" src={doctor?.image} name={doctor?.name ?? "Doctor"} />
      <div className="appointment-detail">
        <h3>{doctor?.name ?? "Doctor unavailable"}</h3>
        <p>
          {doctor?.specialty} · {facility?.name}
        </p>
        {relationshipTag(appointment.relationship) && (
          <p>
            For {appointment.patientName} ({relationshipTag(appointment.relationship)})
          </p>
        )}
        <span>
          <Clock3 size={14} /> {appointment.time} <i /> <MapPin size={14} /> {facility?.area}
          {facility?.city ? `, ${facility.city}` : ""}
        </span>
      </div>
      <StatusPill status={appointment.status} />
      <div className="appointment-actions">
        {PATIENT_CANCELLABLE_STATUSES.includes(appointment.status) && (
          <button className="text-link" type="button" onClick={() => onCancel(appointment.id)}>
            Cancel
          </button>
        )}
        <details className="appointment-detail-more">
          <summary>Request details</summary>
          <p>
            Reference: {appointment.id}
            {appointment.simulated ? " (simulated)" : ""}
          </p>
          <p>Status: {appointment.status}; a pending request is not a confirmed appointment.</p>
          <p>
            Clinic: {facility?.name || "Unavailable"} · {facility?.address || ""}
          </p>
        </details>
      </div>
    </article>
  );
}
