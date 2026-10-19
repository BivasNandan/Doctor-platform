import { LogOut, Save } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  DataTable,
  ErrorState,
  Field,
  Notice,
  PageLoader,
  SectionHeading,
  StatusPill,
  Tabs,
} from "../../components/ui.jsx";
import { isAccountRestricted, isDemoMode, PATHS, relationshipTag } from "../../constants.js";
import { useAuth, useCatalog, useConfirm } from "../../context.jsx";
import { useResource } from "../../hooks.js";
import { doctorPortalService } from "../../services/index.js";
import { readDoctorProfileForm } from "../../utils.js";
import { AvailabilityManager } from "../availability/Availability.jsx";
import DoctorProfileFields, { validateDoctorProfile } from "../doctors/DoctorProfileFields.jsx";

// ─── DoctorDashboardPage ───────────────────────────────────────────────────────────────────

const TABS = [
  { key: "profile", label: "Profile" },
  { key: "appointments", label: "Appointment requests" },
  { key: "availability", label: "Availability" },
];

export default function DoctorDashboardPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("profile");
  const [notice, setNotice] = useState("");
  const profile = useResource(() => doctorPortalService.getProfile(), []);
  const doctor = profile.data;
  const restricted = isAccountRestricted(doctor);

  const signOut = async () => {
    await logout().catch(() => undefined);
    navigate(PATHS.doctorLogin);
  };

  if (profile.error && !doctor) return <ErrorState error={profile.error} onRetry={profile.reload} />;
  if (!doctor) return <PageLoader label="Loading your workspace…" />;

  return (
    <>
      <SectionHeading
        eyebrow="CAREWELL PORTAL"
        title="Doctor workspace"
        description={`Signed in as ${doctor.name} · ${
          isDemoMode
            ? "Demo identity; permissions are not enforced here."
            : "Account-scoped data from the service."
        }${doctor.accountStatus ? ` · Account ${doctor.accountStatus.replaceAll("_", " ")}` : ""}`}
      />
      {restricted && (
        <Notice error>
          This account is {doctor.accountStatus}; profile, appointment, and availability changes are
          unavailable. Sign out or contact administration.
        </Notice>
      )}
      <Tabs
        tabs={TABS}
        value={tab}
        onChange={(key) => {
          setTab(key);
          setNotice("");
        }}
        label="Doctor workspace sections"
      >
        <button type="button" onClick={signOut}>
          <LogOut size={14} /> Sign out
        </button>
      </Tabs>
      <Notice>{notice}</Notice>
      {tab === "profile" && (
        <ProfileTab
          doctor={doctor}
          restricted={restricted}
          onSaved={(updated) => profile.setData(updated)}
          onNotice={setNotice}
        />
      )}
      {tab === "appointments" && <RequestsTab restricted={restricted} />}
      {tab === "availability" && <AvailabilityManager doctor={doctor} disabled={restricted} />}
    </>
  );
}

// ─── ProfileTab ────────────────────────────────────────────────────────────────────────────

/**
 * Own-profile editor plus the account-deactivation request.
 * @param {{doctor: object, restricted: boolean, onSaved: (doctor: object) => void,
 *   onNotice: (message: string) => void}} props
 */
function ProfileTab({ doctor, restricted, onSaved, onNotice }) {
  const { specialties, facilities } = useCatalog();
  const confirm = useConfirm();
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState("");
  const [deactivationError, setDeactivationError] = useState("");
  const requested = doctor.accountStatus === "deactivation_requested";

  const save = async (event) => {
    event.preventDefault();
    const profile = readDoctorProfileForm(event.currentTarget);
    const found = validateDoctorProfile(profile);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    setFormError("");
    try {
      const updated = await doctorPortalService.updateProfile(profile);
      onSaved(updated);
      onNotice(
        `${updated.simulated || isDemoMode ? "Simulated profile update saved." : "Profile saved."}${
          updated.reviewRequired ? " Credential or clinic changes were flagged for review." : ""
        }`,
      );
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const requestDeactivation = async (event) => {
    event.preventDefault();
    const confirmed = await confirm({
      title: "Request account deactivation?",
      message: "An administrator will review your request. Your session stays active until they act on it.",
      confirmLabel: "Submit request",
    });
    if (!confirmed) return;
    setDeactivationError("");
    try {
      await doctorPortalService.requestDeactivation(reason.trim());
      onSaved({ ...doctor, accountStatus: "deactivation_requested" });
      onNotice(`Deactivation request submitted${isDemoMode ? " (simulated)" : ""}.`);
    } catch (error) {
      setDeactivationError(error.message);
    }
  };

  return (
    <>
      <form className="admin-form surface" onSubmit={save} noValidate>
        <h2>
          Professional profile{" "}
          <small>
            Verification: <StatusPill status={doctor.verificationStatus} /> · doctors cannot change this
            status
          </small>
        </h2>
        <fieldset className="fieldset-reset" disabled={restricted}>
          <div className="form-grid">
            <DoctorProfileFields
              doctor={doctor}
              specialties={specialties}
              facilities={facilities}
              errors={errors}
            />
          </div>
          <Notice error>{formError}</Notice>
          <div className="form-actions">
            <Button type="submit" disabled={saving}>
              <Save size={15} /> {saving ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </fieldset>
      </form>
      {requested ? (
        <div className="privacy-note surface" role="status">
          A deactivation request is pending{isDemoMode ? " (simulated; not submitted to a server)" : ""}. You
          may sign out below.
        </div>
      ) : (
        <form className="inline-add-form surface" onSubmit={requestDeactivation}>
          <Field label="Request account deactivation" error={deactivationError}>
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              required
              minLength={8}
              placeholder="Reason for your request"
              disabled={restricted}
            />
          </Field>
          <Button variant="outline" type="submit" disabled={restricted}>
            Request deactivation
          </Button>
        </form>
      )}
    </>
  );
}

// ─── RequestsTab ───────────────────────────────────────────────────────────────────────────

/** Appointment requests addressed to the signed-in doctor. */
function RequestsTab({ restricted }) {
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
