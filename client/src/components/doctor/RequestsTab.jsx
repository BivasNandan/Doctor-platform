import { useState } from "react";
import { relationshipTag } from "../../constants.js";
import { clockLabelToMinutes, localDateKey } from "../../utils/dates.js";
import { useResource } from "../../hooks/useResource.js";
import { doctorPortalService } from "../../services/index.js";
import { DataTable, ErrorState, Notice, StatusPill } from "../ui/index.js";

/** True once the visit's start time has come (the server checks the same thing). */
function visitStarted(item, now = new Date()) {
  const today = localDateKey(now);
  if (item.date !== today) return item.date < today;
  return clockLabelToMinutes(item.time) <= now.getHours() * 60 + now.getMinutes();
}

/** Appointment requests addressed to the signed-in doctor. */
export default function RequestsTab({ restricted }) {
  const requests = useResource(() => doctorPortalService.listAppointments(), []);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const decide = async (id, status) => {
    setError("");
    setNotice("");
    try {
      const updated = await doctorPortalService.updateAppointmentStatus(id, status);
      requests.setData((items) => items.map((item) => (item.id === id ? updated : item)));
      setNotice(`Request updated to ${updated.status}${updated.simulated ? " (simulated)" : ""}.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const columns = [
    { key: "id", header: "REQUEST", render: (item) => item.id },
    {
      key: "patient",
      header: "PATIENT",
      render: (item) =>
        relationshipTag(item.relationship)
          ? `${item.patientName} (${relationshipTag(item.relationship)})`
          : item.patientName,
    },
    { key: "when", header: "DATE / TIME", render: (item) => `${item.date} · ${item.time}` },
    { key: "status", header: "STATUS", render: (item) => <StatusPill status={item.status} /> },
    {
      key: "action",
      header: "ACTION",
      render: (item) =>
        item.status === "pending" ? (
          <>
            <button
              className="table-action"
              type="button"
              disabled={restricted}
              onClick={() => decide(item.id, "accepted")}
            >
              Accept
            </button>
            <button
              className="table-action"
              type="button"
              disabled={restricted}
              onClick={() => decide(item.id, "rejected")}
            >
              Reject
            </button>
          </>
        ) : item.status === "accepted" ? (
          <button
            className="table-action"
            type="button"
            disabled={restricted || !visitStarted(item)}
            title={visitStarted(item) ? undefined : "Available once the appointment time has started"}
            onClick={() => decide(item.id, "completed")}
          >
            Mark completed
          </button>
        ) : (
          "—"
        ),
    },
  ];

  if (requests.error && !requests.data)
    return <ErrorState error={requests.error} onRetry={requests.reload} />;
  return (
    <>
      <Notice error>{error}</Notice>
      <Notice>{notice}</Notice>
      <DataTable
        columns={columns}
        rows={requests.data ?? []}
        getRowKey={(item) => item.id}
        emptyMessage={requests.loading ? "Loading requests…" : "No appointment requests."}
      />
    </>
  );
}
