import { useState } from "react";
import {
  Avatar,
  DataTable,
  ErrorState,
  ListToolbar,
  PageLoader,
  SectionHeading,
  StatusPill,
  Tabs,
} from "../../components/ui/index.js";
import { useConfirm } from "../../context/ConfirmContext.jsx";
import { useAction } from "../../hooks/useAction.js";
import { useDebouncedValue } from "../../hooks/useDebouncedValue.js";
import { useResource } from "../../hooks/useResource.js";
import { adminService } from "../../services/index.js";
import { formatDateTime } from "../../utils/dates.js";

const FILTERS = [
  { key: "", label: "All patients" },
  { key: "active", label: "Active" },
  { key: "suspended", label: "Suspended" },
];

/** Every patient account: search, filter and suspend or restore access. */
export default function PatientManagementPage() {
  const run = useAction();
  const confirm = useConfirm();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const search = useDebouncedValue(query.trim());
  const patients = useResource(
    () => adminService.listPatients({ query: search, status: status || undefined }),
    [search, status],
  );
  const rows = patients.data ?? [];

  const change = async (patient, next) => {
    if (next === "suspended") {
      const confirmed = await confirm({
        title: `Suspend ${patient.name}?`,
        message:
          "They are signed out everywhere and cannot sign in until you restore the account. Their appointments and messages are kept.",
        confirmLabel: "Suspend",
      });
      if (!confirmed) return;
    }
    const updated = await run(() => adminService.setPatientStatus(patient.id, next), {
      success: () =>
        next === "suspended" ? `${patient.name} was suspended.` : `${patient.name} was restored.`,
    });
    if (updated)
      patients.setData((items) =>
        status && status !== updated.accountStatus
          ? items.filter((item) => item.id !== updated.id)
          : items.map((item) => (item.id === updated.id ? updated : item)),
      );
  };

  const columns = [
    {
      key: "patient",
      header: "PATIENT",
      render: (patient) => (
        <div className="table-person">
          <Avatar src={patient.photoUrl} name={patient.name} />
          <span>
            <strong>{patient.name}</strong>
            <small>{patient.email}</small>
          </span>
        </div>
      ),
    },
    { key: "phone", header: "PHONE", render: (patient) => patient.phone || "—" },
    { key: "visits", header: "APPOINTMENTS", render: (patient) => patient.appointmentCount },
    {
      key: "joined",
      header: "JOINED",
      render: (patient) => (patient.createdAt ? formatDateTime(patient.createdAt) : "—"),
    },
    {
      key: "status",
      header: "STATUS",
      render: (patient) => <StatusPill status={patient.accountStatus} />,
    },
    {
      key: "action",
      header: "ACTION",
      render: (patient) =>
        patient.accountStatus === "suspended" ? (
          <button className="table-action" type="button" onClick={() => change(patient, "active")}>
            Restore
          </button>
        ) : (
          <button
            className="table-action table-action-danger"
            type="button"
            onClick={() => change(patient, "suspended")}
          >
            Suspend
          </button>
        ),
    },
  ];

  return (
    <>
      <SectionHeading
        eyebrow="PATIENT ACCOUNTS"
        title={
          <>
            Patients, in <em>good standing.</em>
          </>
        }
        description="Find a patient, see how active they are, and suspend an account that breaks the rules. Suspending signs them out; nothing is deleted."
      />
      <Tabs tabs={FILTERS} value={status} onChange={setStatus} label="Filter patients" />
      <ListToolbar
        placeholder="Search by name, email or phone"
        value={query}
        onChange={setQuery}
        count={rows.length}
        noun={rows.length === 1 ? "patient" : "patients"}
      />
      {patients.error && !patients.data ? (
        <ErrorState error={patients.error} onRetry={patients.reload} />
      ) : !patients.data ? (
        <PageLoader label="Loading patients…" />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(patient) => patient.id}
          emptyMessage="No patients match this view."
        />
      )}
    </>
  );
}
