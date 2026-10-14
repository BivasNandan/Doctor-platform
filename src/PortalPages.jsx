import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  LogOut,
  Plus,
  Save,
  ShieldCheck,
} from "lucide-react";
import { careService, serviceMode } from "./data/careService.js";

const localDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function Heading({ title, text }) {
  return (
    <div className="section-heading">
      <div>
        <span className="eyebrow">CAREWELL PORTAL</span>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
    </div>
  );
}
function Notice({ children, error }) {
  return children ? (
    <p
      role={error ? "alert" : "status"}
      className={error ? "form-error" : "privacy-note"}
    >
      {children}
    </p>
  ) : null;
}
export function DoctorAccess({ register = false, onSuccess }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const result = register
        ? await careService.registerDoctor({
            ...data,
            experienceYears: Number(data.experienceYears),
            fee: Number(data.fee),
            qualifications: data.qualifications
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean),
            languages: data.languages
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean),
            facilityIds: data.facilityIds
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean),
          })
        : await careService.login({
            email: data.email,
            password: data.password,
            role: data.role,
          });
      onSuccess(result);
    } catch (err) {
      setError(err.message || "Unable to continue.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Heading
        title={register ? "Doctor registration" : "Sign in to Carewell"}
        text={
          serviceMode === "demo"
            ? "Demo mode: account operations are simulated and do not authenticate identity."
            : "Your account is authenticated by the configured service."
        }
      />
      <form className="admin-form surface" onSubmit={submit}>
        <div className="form-grid">
          {register ? (
            <>
              <label>
                Full name
                <input name="name" required minLength="3" autoComplete="name" />
              </label>
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  minLength="8"
                  required
                  autoComplete="new-password"
                />
              </label>
              <label>
                Phone
                <input name="phone" type="tel" required />
              </label>
              <label>
                Specialty
                <input name="specialty" required />
              </label>
              <label>
                Clinic/facility identifier
                <input name="facilityIds" required placeholder="Clinic ID" />
              </label>
              <label>
                Qualifications (comma separated)
                <input
                  name="qualifications"
                  required
                  placeholder="MBBS, FCPS"
                />
              </label>
              <label>
                Languages (comma separated)
                <input
                  name="languages"
                  required
                  placeholder="Bangla, English"
                />
              </label>
              <label>
                Experience (years)
                <input name="experienceYears" type="number" min="0" required />
              </label>
              <label>
                Consultation fee (৳)
                <input name="fee" type="number" min="0" required />
              </label>
            </>
          ) : (
            <>
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="username"
                />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                />
              </label>
              <label>
                Sign in as
                <select name="role">
                  <option value="doctor">Doctor</option>
                  <option value="admin">Administrator</option>
                </select>
              </label>
            </>
          )}
        </div>
        <Notice error>{error}</Notice>
        <div className="form-actions">
          <button className="button button-primary" disabled={busy}>
            {busy ? "Working…" : register ? "Submit for review" : "Sign in"}{" "}
            <ArrowRight size={15} />
          </button>
        </div>
      </form>
    </>
  );
}
export function DoctorPortal({ user, doctors, facilities = [], onLogout, onDoctorUpdate }) {
  const [ownDoctor, setOwnDoctor] = useState(doctors.find((d) => d.id === user.doctorId));
  const doctor = ownDoctor || doctors.find((d) => d.id === user.doctorId);
  const accountRestricted = ["deactivated", "suspended"].includes(doctor?.accountStatus);
  const [tab, setTab] = useState("profile"),
    [appointments, setAppointments] = useState([]),
    [slots, setSlots] = useState([]),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [editingSlot, setEditingSlot] = useState(null),
    [deactivationReason, setDeactivationReason] = useState(""),
    [deactivationRequested, setDeactivationRequested] = useState(doctor?.accountStatus === "deactivation_requested");
  useEffect(() => {
    careService.getOwnDoctor(user.doctorId).then(setOwnDoctor).catch((e) => setError(e.message));
    careService
      .listDoctorAppointments(user.doctorId)
      .then(setAppointments)
      .catch((e) => setError(e.message));
    careService
      .listAvailability(user.doctorId)
      .then(setSlots)
      .catch((e) => setError(e.message));
  }, [user.doctorId]);
  const mutateStatus = async (id, status) => {
    setError("");
    try {
      const updated = await careService.updateAppointmentStatus(id, status);
      setAppointments((items) => items.map((x) => (x.id === id ? updated : x)));
      setNotice(
        `Request updated to ${updated.status}${updated.simulated ? " (simulated)" : ""}.`,
      );
    } catch (e) {
      setError(e.message);
    }
  };
  const saveProfile = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const d = Object.fromEntries(formData);
    try {
      const updated = await careService.updateOwnDoctor(user.doctorId, {
        ...d,
        fee: Number(d.fee),
        qualifications: d.qualifications.split(",").map((x) => x.trim()),
        languages: d.languages.split(",").map((x) => x.trim()),
        facilityIds: formData.getAll("facilityIds"),
      });
      onDoctorUpdate(updated);
      setOwnDoctor(updated);
      setNotice(
        `${updated.simulated ? "Simulated " : ""}profile update returned by service.${updated.reviewRequired ? " Credential or clinic changes were flagged for review." : " Credential changes may require review."}`,
      );
    } catch (e) {
      setError(e.message);
    }
  };
  const addSlot = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const d = Object.fromEntries(new FormData(form));
    try {
      const slotInput = {
        ...d,
        id: editingSlot?.id,
        status: editingSlot?.status || "available",
        facilityId: doctor?.facilityIds?.[0],
      };
      if (slotInput.startTime >= slotInput.endTime) throw new Error("End time must be after start time.");
      const slot = editingSlot
        ? await careService.updateAvailability(editingSlot.id, slotInput)
        : await careService.saveAvailability(user.doctorId, slotInput);
      setSlots((items) => [...items.filter((item) => item.id !== slot.id), slot]);
      setNotice(`Availability ${slot.simulated ? "simulated " : ""}${editingSlot ? "updated" : "saved"}.`);
      setEditingSlot(null);
      form.reset();
    } catch (err) {
      setError(err.message);
    }
  };
  const editSlot = (slot) => setEditingSlot(slot);
  const blockSlot = async (slot) => {
    try {
      const updated = await careService.updateAvailability(slot.id, { ...slot, status: slot.status === "unavailable" ? "available" : "unavailable" });
      setSlots((items) => items.map((item) => item.id === updated.id ? updated : item));
      setNotice(`Slot marked ${updated.status}${updated.simulated ? " (simulated)" : ""}.`);
    } catch (e) { setError(e.message); }
  };
  const removeSlot = async (slot) => {
    if (!window.confirm(`Remove the ${slot.date} ${slot.startTime} slot?`)) return;
    try { const result = await careService.removeAvailability(slot.id); setSlots((items) => items.filter((item) => item.id !== result.id)); setNotice(`Availability removed${result.simulated ? " (simulated)" : ""}.`); }
    catch (e) { setError(e.message); }
  };
  const deactivate = async (e) => {
    e.preventDefault();
    if (!window.confirm("Submit an account deactivation request?")) return;
    try { const result = await careService.requestAccountDeactivation(user.doctorId, deactivationReason); setDeactivationRequested(true); setNotice(`Deactivation ${result.status}${result.simulated ? " (simulated request)" : ""}. Your session remains active until the service ends it.`); }
    catch (e) { setError(e.message); }
  };
  return (
    <>
      <Heading
        title="Doctor workspace"
        text={`Signed in as ${doctor?.name || "doctor"} · ${serviceMode === "demo" ? "Demo identity; permissions are not enforced here." : "Account-scoped data from service."}${doctor?.accountStatus ? ` · Account ${doctor.accountStatus}` : ""}`}
      />
      {accountRestricted && <Notice error>This account is {doctor.accountStatus}; profile, appointment, and availability changes are unavailable. Sign out or contact administration.</Notice>}
      <div className="appointment-tabs">
        {[
          ["profile", "Profile"],
          ["appointments", "Appointment requests"],
          ["availability", "Availability"],
        ].map(([key, label]) => (
            <button
            className={tab === key ? "active" : ""}
            key={key}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
        <button onClick={onLogout}>
          <LogOut size={14} /> Sign out
        </button>
      </div>
      <Notice>{notice}</Notice>
      <Notice error>{error}</Notice>
      {tab === "profile" && (
        <>
          <form className="admin-form surface" onSubmit={saveProfile}>
          <h2>
            Professional profile{" "}
            <small>
              Verification status: {doctor?.verificationStatus || "unavailable"}{" "}
              · doctor cannot change this status
            </small>
          </h2>
          <fieldset disabled={accountRestricted} className="portal-fieldset">
          <div className="form-grid">
            <label>
              Name
              <input name="name" defaultValue={doctor?.name || ""} required />
            </label>
            <label>
              Specialty
              <input
                name="specialty"
                defaultValue={doctor?.specialty || ""}
                required
              />
            </label>
            <label>
              Qualifications
              <input
                name="qualifications"
                defaultValue={doctor?.qualifications?.join(", ") || ""}
                required
              />
            </label>
            <label>
              Languages
              <input
                name="languages"
                defaultValue={doctor?.languages?.join(", ") || ""}
                required
              />
            </label>
            <label>
              Consultation fee
              <input
                name="fee"
                type="number"
                min="0"
                defaultValue={doctor?.fee || 0}
                required
              />
            </label>
            <label>
              Location
              <input
                name="location"
                defaultValue={doctor?.location || ""}
                required
              />
            </label>
            <label>
              Clinics and hospitals (Ctrl/Cmd-click to choose multiple)
              <select name="facilityIds" multiple defaultValue={doctor?.facilityIds || []}>
                {facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name} · {facility.area}</option>)}
              </select>
            </label>
          </div>
          <div className="form-actions">
            <button className="button button-primary">
              <Save size={15} /> Save profile
            </button>
            <button
              type="button"
              className="button button-outline"
              onClick={onLogout}
            >
              Sign out
            </button>
          </div>
          </fieldset>
        </form>
        {deactivationRequested ? <div className="privacy-note surface" role="status">A deactivation request is pending{serviceMode === "demo" ? " (simulated; not submitted to a server)" : ""}. You may sign out below.</div> : <form className="inline-add-form surface" onSubmit={deactivate}>
          <label>Request account deactivation<input value={deactivationReason} onChange={(e) => setDeactivationReason(e.target.value)} required minLength={8} placeholder="Reason for your request" /></label>
          <button className="button button-outline" type="submit" disabled={accountRestricted}>Request deactivation</button>
        </form>}
        </>
      )}
      {tab === "appointments" && (
        <div className="table-wrap surface">
          <table>
            <thead>
              <tr>
                <th>REQUEST</th>
                <th>PATIENT</th>
                <th>DATE / TIME</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id}>
                  <td>{a.id}</td>
                  <td>{a.patientName}</td>
                  <td>
                    {a.date} · {a.time}
                  </td>
                  <td>{a.status}</td>
                  <td>
                    {a.status === "pending" ? (
                      <>
                        <button
                          className="table-action"
                          disabled={accountRestricted}
                          onClick={() => mutateStatus(a.id, "accepted")}
                        >
                          Accept
                        </button>
                        <button
                          className="table-action"
                          disabled={accountRestricted}
                          onClick={() => mutateStatus(a.id, "rejected")}
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!appointments.length && (
            <div className="table-empty">No appointment requests.</div>
          )}
        </div>
      )}
      {tab === "availability" && (
        <>
          <form key={editingSlot?.id || "new-slot"} className="inline-add-form surface" onSubmit={addSlot}>
            <fieldset disabled={accountRestricted} className="portal-fieldset portal-availability-fields">
            <label>
              Date
              <input
                type="date"
                name="date"
                defaultValue={editingSlot?.date || ""}
                min={localDateKey()}
                required
              />
            </label>
            <label>
              Start
              <input type="time" name="startTime" defaultValue={editingSlot?.startTime || ""} required />
            </label>
            <label>
              End
              <input type="time" name="endTime" defaultValue={editingSlot?.endTime || ""} required />
            </label>
            <button className="button button-primary">
              <Plus size={15} /> {editingSlot ? "Save slot" : "Add slot"}
            </button>
            </fieldset>
          </form>
          <div className="table-wrap surface">
            <table>
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>TIME</th>
                  <th>STATUS</th><th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((s) => (
                  <tr key={s.id}>
                    <td>{s.date}</td>
                    <td>
                      {s.startTime}–{s.endTime}
                    </td>
                    <td>
                      {s.status}
                      {s.simulated ? " (simulated)" : ""}
                    </td>
                    <td><button className="table-action" type="button" disabled={accountRestricted} onClick={() => editSlot(s)}>Edit</button><button className="table-action" type="button" disabled={accountRestricted} onClick={() => blockSlot(s)}>{s.status === "unavailable" ? "Unblock" : "Block"}</button><button className="table-action" type="button" disabled={accountRestricted} onClick={() => removeSlot(s)}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!slots.length && (
              <div className="table-empty">No availability entries.</div>
            )}
          </div>
        </>
      )}
    </>
  );
}
export function PortalAccessNotice({ role, onLogin }) {
  return (
    <div className="surface" style={{ padding: 24 }}>
      <Heading
        title="Sign in required"
        text={`Sign in through the ${role} service to continue. This interface does not authorize access by itself.`}
      />
      <button className="button button-primary" onClick={onLogin}>
        <ShieldCheck size={15} /> Sign in
      </button>
    </div>
  );
}
