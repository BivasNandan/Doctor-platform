import { useState } from "react";
import {
  DataTable,
  ErrorState,
  ListToolbar,
  PageLoader,
  Pill,
  SectionHeading,
  StatusPill,
} from "../../components/ui/index.js";
import {
  ADMIN_APPOINTMENT_TRANSITIONS,
  APPOINTMENT_STATUS,
  APPOINTMENT_STATUS_LABELS,
  relationshipTag,
} from "../../constants.js";
import { useAction } from "../../hooks/useAction.js";
import { useResource } from "../../hooks/useResource.js";
import { adminService } from "../../services/index.js";

const STATUS_OPTIONS = Object.values(APPOINTMENT_STATUS);

export default function AppointmentManagementPage() {
  const run = useAction();
  const appointments = useResource(() => adminService.listAppointments(), []);
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");

  const change = async (item, next) => {
    const updated = await run(() => adminService.updateAppointmentStatus(item.id, next), {
      success: (result) => `Appointment marked ${result.status}${result.simulated ? " (simulated)" : ""}.`,
    });
    if (updated)
      appointments.setData((items) => items.map((entry) => (entry.id === updated.id ? updated : entry)));
  };

  const all = appointments.data ?? [];
  const list = all.filter(
    (item) =>
      (status === "all" || item.status === status) &&
      `${item.patientName} ${item.doctor?.name ?? ""}`.toLowerCase().includes(query.toLowerCase()),
  );
  const upcoming = all.filter((item) => item.status === APPOINTMENT_STATUS.ACCEPTED).length;

  const columns = [
    {
      key: "patient",
      header: "PATIENT",
      render: (item) => (
        <div className="table-person">
          <span className="review-avatar">{item.patientName.slice(0, 1)}</span>
          <span>
            <strong>{item.patientName}</strong>
            <small>
              {relationshipTag(item.relationship)
                ? `${item.phone} · ${relationshipTag(item.relationship)}`
                : item.phone}
            </small>
          </span>
        </div>
      ),
    },
    { key: "doctor", header: "DOCTOR", render: (item) => item.doctor?.name ?? "Doctor unavailable" },
    { key: "facility", header: "FACILITY", render: (item) => item.facility?.name ?? "Facility unavailable" },
    { key: "when", header: "DATE & TIME", render: (item) => `${item.date} · ${item.time}` },
    { key: "status", header: "STATUS", render: (item) => <StatusPill status={item.status} /> },
    {
      key: "update",
      header: "UPDATE",
      render: (item) => {
        const allowed = ADMIN_APPOINTMENT_TRANSITIONS[item.status] ?? [];
        return (
          <select
            aria-label={`Update ${item.patientName} appointment`}
            value={item.status}
            disabled={!allowed.length}
            onChange={(event) => change(item, event.target.value)}
          >
            {STATUS_OPTIONS.filter((option) => option === item.status || allowed.includes(option)).map(
              (option) => (
                <option key={option} value={option}>
                  {APPOINTMENT_STATUS_LABELS[option]}
                </option>
              ),
            )}
          </select>
        );
      },
    },
  ];

  return (
    <>
      <SectionHeading
        eyebrow="A CLEAR VIEW OF EVERY VISIT"
        title={
          <>
            Appointment <em>management.</em>
          </>
        }
        description="Keep patient visits organized and make status updates with care."
        action={
          <Pill tone="available">
            <i /> {upcoming} accepted
          </Pill>
        }
      />
      <div className="results-toolbar admin-appointment-toolbar">
        <span>Manage visit requests and appointment status.</span>
        <label>
          Show{" "}
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {APPOINTMENT_STATUS_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ListToolbar
        placeholder="Search patient or doctor…"
        value={query}
        onChange={setQuery}
        count={list.length}
        noun="appointments"
      />
      {appointments.error && !appointments.data ? (
        <ErrorState error={appointments.error} onRetry={appointments.reload} />
      ) : !appointments.data ? (
        <PageLoader />
      ) : (
        <DataTable
          columns={columns}
          rows={list}
          getRowKey={(item) => item.id}
          emptyMessage="No appointments match those filters."
        />
      )}
    </>
  );
}
