import { ArrowRight, Clock3, MapPin, Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
  Button,
  EmptyState,
  ErrorState,
  PageLoader,
  SectionHeading,
  StatusPill,
  Tabs,
} from "../../components/ui.jsx";
import {
  APPOINTMENT_STATUS_LABELS,
  PATHS,
  PATIENT_CANCELLABLE_STATUSES,
  relationshipTag,
} from "../../constants.js";
import { useCatalog, useConfirm, useToast } from "../../context.jsx";
import { useResource } from "../../hooks.js";
import { appointmentService } from "../../services/index.js";
import { parseDateKey } from "../../utils.js";

// ─── AppointmentsPage ──────────────────────────────────────────────────────────────────────

const TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: APPOINTMENT_STATUS_LABELS.pending },
  { key: "accepted", label: APPOINTMENT_STATUS_LABELS.accepted },
  { key: "rejected", label: APPOINTMENT_STATUS_LABELS.rejected },
  { key: "cancelled", label: APPOINTMENT_STATUS_LABELS.cancelled },
  { key: "completed", label: "History" },
];

export default function AppointmentsPage() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const confirm = useConfirm();
  const { facilities } = useCatalog();
  const [tab, setTab] = useState("all");
  const appointments = useResource(() => appointmentService.list(), []);

  const cancel = async (id) => {
    const confirmed = await confirm({
      title: "Cancel this request?",
      message: "The clinic will be told the request was cancelled.",
      confirmLabel: "Cancel request",
      cancelLabel: "Keep it",
    });
    if (!confirmed) return;
    try {
      const updated = await appointmentService.cancel(id);
      appointments.setData((items) => items.map((item) => (item.id === id ? updated : item)));
      notify(`Request ${updated.id} marked ${updated.status}${updated.simulated ? " (simulated)" : ""}.`);
    } catch (error) {
      notify(error.message);
    }
  };

  const visible = (appointments.data ?? []).filter((item) => tab === "all" || item.status === tab);
  const findFacility = (item) =>
    item.facility ?? facilities.find((facility) => facility.id === item.facilityId);

  return (
    <>
      <SectionHeading
        eyebrow="YOUR CARE, ALL IN ONE PLACE"
        title={
          <>
            Appointments <em>made simple.</em>
          </>
        }
        description="Keep track of what’s coming up and revisit where you’ve been."
        action={
          <Button onClick={() => navigate(PATHS.doctors)}>
            <Plus size={15} /> Book a visit
          </Button>
        }
      />
      <Tabs tabs={TABS} value={tab} onChange={setTab} label="Filter appointments" />
      {appointments.loading && !appointments.data ? (
        <PageLoader />
      ) : appointments.error && !appointments.data ? (
        <ErrorState error={appointments.error} onRetry={appointments.reload} />
      ) : visible.length ? (
        <div className="appointment-list">
          {visible.map((item) => (
            <AppointmentCard
              key={item.id}
              appointment={item}
              doctor={item.doctor}
              facility={findFacility(item)}
              onCancel={cancel}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nothing on the calendar yet"
          description="When you book a visit, you’ll find the details here."
          action={
            <Button onClick={() => navigate(PATHS.doctors)}>
              Find a doctor <ArrowRight size={15} />
            </Button>
          }
        />
      )}
    </>
  );
}

// ─── AppointmentCard ───────────────────────────────────────────────────────────────────────

/**
 * One appointment request in the patient's list.
 * @param {{appointment: object, doctor?: object, facility?: object, onCancel: (id: string) => void}} props
 */
function AppointmentCard({ appointment, doctor, facility, onCancel }) {
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
