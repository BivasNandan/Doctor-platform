import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Hospital,
  ListFilter,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  X,
} from "lucide-react";
import { careService, serviceMode } from "../data/careService.js";
import { adminSummary } from "../data/mockData.js";
import { Button, Pill, SectionHeading } from "../components/ui.jsx";
import { localDateKey } from "../utils/date.js";

function AdminOverview({ onRoute }) {
  const max = Math.max(...adminSummary.monthlyAppointments);
  return (
    <>
      <SectionHeading
        eyebrow="THE CAREWELL PULSE"
        title={
          <>
            A calmer way to <em>care for care.</em>
          </>
        }
        description="A clear view of what’s happening across your health network today."
        action={
          <Pill tone="available">
            <i /> Systems operating normally
          </Pill>
        }
      />
      <div className="admin-stats">
        {[
          [
            "Appointments today",
            adminSummary.appointmentsToday,
            "+12% this week",
            CalendarDays,
          ],
          [
            "Verified doctors",
            adminSummary.totalDoctors,
            "Across 24 specialties",
            Stethoscope,
          ],
          [
            "Awaiting review",
            adminSummary.pendingDoctors,
            "Needs your attention",
            ShieldCheck,
          ],
          [
            "Active facilities",
            adminSummary.activeFacilities,
            "Across Dhaka",
            Hospital,
          ],
        ].map(([title, value, sub, Icon], i) => (
          <article className="metric-card surface" key={title}>
            <div>
              <span>{title}</span>
              <Icon size={17} />
            </div>
            <strong>{value}</strong>
            <small className={i === 2 ? "warning-copy" : ""}>{sub}</small>
          </article>
        ))}
      </div>
      <div className="admin-grid">
        <section className="admin-panel surface">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">APPOINTMENT ACTIVITY</span>
              <h3>A steady rhythm of care.</h3>
            </div>
            <select aria-label="Chart period">
              <option>Last 12 months</option>
              <option>Last 30 days</option>
            </select>
          </div>
          <div className="chart-legend">
            <span>
              <i /> Completed visits
            </span>
            <strong>
              1,042 <small>+8.4%</small>
            </strong>
          </div>
          <div className="bar-chart" aria-label="Monthly appointments chart">
            {adminSummary.monthlyAppointments.map((value, index) => (
              <div key={index}>
                <i
                  style={{ height: `${(value / max) * 100}%` }}
                  title={`${value} appointments`}
                />
                <small>
                  {
                    [
                      "N",
                      "D",
                      "J",
                      "F",
                      "M",
                      "A",
                      "M",
                      "J",
                      "J",
                      "A",
                      "S",
                      "O",
                    ][index]
                  }
                </small>
              </div>
            ))}
          </div>
        </section>
        <section className="admin-panel surface">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">NEEDS YOUR EYE</span>
              <h3>For review.</h3>
            </div>
            <button
              className="text-link"
              onClick={() => onRoute("verification")}
            >
              View all <ArrowRight size={14} />
            </button>
          </div>
          {["Dr. Mahmud Hasan", "Dr. Nadia Karim", "Dr. Saif Uddin"].map(
            (name, i) => (
              <div className="review-queue" key={name}>
                <span className="review-avatar">{name.split(" ")[1][0]}</span>
                <span>
                  <strong>{name}</strong>
                  <small>
                    {["Neurology", "Gynecology", "Cardiology"][i]} · Submitted{" "}
                    {i + 1}d ago
                  </small>
                </span>
                <Pill tone="pending">Pending</Pill>
              </div>
            ),
          )}
          <Button variant="outline" onClick={() => onRoute("verification")}>
            Review all applications <ArrowRight size={14} />
          </Button>
        </section>
      </div>
      <div className="admin-shortcuts">
        <span className="eyebrow">QUICK ACTIONS</span>
        <div>
          {[
            ["admin-doctors", "Doctor management", Stethoscope],
            ["verification", "Verification review", ShieldCheck],
            ["admin-facilities", "Facility management", Hospital],
            ["admin-appointments", "Appointment management", CalendarDays],
            ["specialties", "Manage specialties", ListFilter],
            ["availability", "Update availability", Clock3],
          ].map(([to, label, Icon]) => (
            <button key={to} onClick={() => onRoute(to)}>
              <Icon size={17} />
              <span>{label}</span>
              <ArrowUpRight size={14} />
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function DoctorManagement({ doctors, facilities, onAdd, onVerify, onUpdate, onDeactivate, onPublicationChange }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const list = doctors.filter((d) =>
    `${d.name} ${d.specialty}`.toLowerCase().includes(query.toLowerCase()),
  );
  const submit = async (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = data.get("name").trim();
    const fee = Number(data.get("fee"));
    const specialty = data.get("specialty");
    const specialtyId = {
      Cardiologist: "cardiology",
      Dermatologist: "dermatology",
      Pediatrician: "pediatrics",
      "Dental Surgeon": "dentistry",
      Neurologist: "neurology",
      Gynecologist: "gynecology",
    }[specialty];
    if (name.length < 5 || !Number.isFinite(fee) || fee < 0) { setError("Enter a valid name and non-negative consultation fee."); return; }
    const profile = {
      name,
      specialtyId,
      specialty,
      image:
        "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=700&q=80",
      qualifications: data
        .get("qualifications")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
      experienceYears: Number(data.get("experienceYears")),
      languages: ["Bangla", "English"],
      fee,
      location: data.get("location"),
      facilityIds: data.getAll("facilityIds"),
    };
    try {
      if (editing) await onUpdate(editing, profile);
      else await onAdd(profile);
      setShowForm(false);
      setEditing(null);
      setError("");
    } catch (err) { setError(err.message || "Doctor profile could not be saved."); }
  };
  return (
    <>
      <SectionHeading
        eyebrow="THE PEOPLE BEHIND GREAT CARE"
        title={
          <>
            Doctor <em>management.</em>
          </>
        }
        description="Thoughtfully manage professional profiles and their visibility."
        action={
          <Button onClick={() => { setEditing(null); setError(""); setShowForm(!showForm); }}>
            <Plus size={15} /> Add doctor
          </Button>
        }
      />
      {showForm && (
        <form className="admin-form surface" onSubmit={submit}>
          <div className="panel-heading">
            <h3>{editing ? `Edit ${editing.name}` : "Add a doctor profile"}</h3>
            <button type="button" onClick={() => setShowForm(false)}>
              <X size={17} />
            </button>
          </div>
          <div className="form-grid">
            <label>
              Doctor name
              <input
                name="name"
                required
                minLength="5"
                placeholder="Dr. First Last"
                defaultValue={editing?.name || ""}
              />
            </label>
            <label>
              Specialty
              <select name="specialty" defaultValue={editing?.specialty || "Cardiologist"}>
                <option>Cardiologist</option>
                <option>Dermatologist</option>
                <option>Pediatrician</option>
                <option>Dental Surgeon</option>
                <option>Neurologist</option>
                <option>Gynecologist</option>
              </select>
            </label>
            <label>
              Qualifications
              <input name="qualifications" required placeholder="MBBS, FCPS" defaultValue={editing?.qualifications?.join(", ") || ""} />
            </label>
            <label>
              Experience (years)
              <input
                name="experienceYears"
                required
                type="number"
                min="0"
                max="60"
                defaultValue={editing?.experienceYears || 0}
              />
            </label>
            <label>
              Consultation fee (৳)
              <input name="fee" required type="number" min="0" defaultValue={editing?.fee || 0} />
            </label>
            <label>
              Location
              <input name="location" required placeholder="Dhanmondi, Dhaka" defaultValue={editing?.location || ""} />
            </label>
          </div>
          <div className="form-actions">
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editing ? "Update profile" : "Save profile"} <ArrowRight size={14} />
            </Button>
          </div>
        </form>
      )}
      <div className="table-toolbar surface">
        <div>
          <Search size={16} />
          <input
            placeholder="Search doctors…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Pill>{list.length} profiles</Pill>
      </div>
      <div className="table-wrap surface">
        <table>
          <thead>
            <tr>
              <th>DOCTOR</th>
              <th>SPECIALTY</th>
              <th>LOCATION</th>
              <th>FEE</th>
              <th>STATUS</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {list.map((doctor) => (
              <tr key={doctor.id}>
                <td>
                  <div className="table-person">
                    <img src={doctor.image} alt="" />
                    <span>
                      <strong>{doctor.name}</strong>
                      <small>{doctor.qualifications.join(", ")}</small>
                    </span>
                  </div>
                </td>
                <td>{doctor.specialty}</td>
                <td>{doctor.location}</td>
                <td>৳{doctor.fee.toLocaleString()}</td>
                <td>
                  <Pill tone={doctor.verificationStatus === "verified" ? "verified" : "pending"}>
                    {doctor.verificationStatus || "Verification unavailable"} · {doctor.publicationStatus || "publication status unavailable"}
                  </Pill>
                </td>
                <td>
                  <button className="table-action" onClick={() => { setEditing(doctor); setShowForm(true); }}>Edit</button>
                  {doctor.verificationStatus === "pending" && <button className="table-action" onClick={() => onVerify(doctor, "verified")}>Approve</button>}
                  {doctor.verificationStatus === "verified" && <button className="table-action" onClick={() => onVerify(doctor, "suspended")}>Suspend verification</button>}
                  {doctor.verificationStatus === "verified" && <button className="table-action" onClick={() => onPublicationChange(doctor, doctor.publicationStatus === "published" ? "unpublished" : "published")}>{doctor.publicationStatus === "published" ? "Unpublish" : "Publish"}</button>}
                  {!doctor.accountStatus || doctor.accountStatus === "active" ? <button className="table-action" onClick={() => onDeactivate(doctor)}>Deactivate</button> : <span>{doctor.accountStatus}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && (
          <div className="table-empty">
            No doctor profiles match your search.
          </div>
        )}
      </div>
    </>
  );
}

function VerificationPage({ doctors, onVerify }) {
  const [selected, setSelected] = useState("all");
  const list = doctors.filter(
    (d) =>
      selected === "all" ||
      (selected === "pending"
        ? d.verificationStatus === "pending"
        : d.verificationStatus !== "pending"),
  );
  return (
    <>
      <SectionHeading
        eyebrow="A LITTLE CARE GOES A LONG WAY"
        title={
          <>
            Review with <em>confidence.</em>
          </>
        }
        description="Review professional information submitted to Carewell before it’s visible to patients."
      />
      <div className="verification-banner">
        <span>
          <ShieldCheck size={20} />
        </span>
        <p>
          Platform verification means professional information has been reviewed
          according to Carewell’s process. It does not imply government
          certification.
        </p>
      </div>
      <div className="appointment-tabs">
        {[
          ["all", "All applications"],
          ["pending", "Needs review"],
          ["verified", "Reviewed"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={selected === key ? "active" : ""}
            onClick={() => setSelected(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="verification-list">
        {list.map((doctor) => (
          <article key={doctor.id} className="verification-card surface">
            <img src={doctor.image} alt="" />
            <div>
              <span className="eyebrow">
                PROFESSIONAL PROFILE · {doctor.id.toUpperCase()}
              </span>
              <h3>{doctor.name}</h3>
              <p>
                {doctor.specialty} · {doctor.experienceYears} years ·{" "}
                {doctor.qualifications.join(", ")}
              </p>
              <span className="verification-doc">
                {doctor.certificateFiles?.length ? `${doctor.certificateFiles.length} certificate file(s) supplied` : "Certificate metadata has not been supplied by the service."}
              </span>
            </div>
            <Pill
              tone={
                doctor.verificationStatus === "verified"
                  ? "verified"
                  : doctor.verificationStatus === "rejected"
                    ? "error"
                    : "pending"
              }
            >
              {doctor.verificationStatus === "verified"
                ? "Reviewed"
                : doctor.verificationStatus === "rejected"
                  ? "Changes requested"
                  : "Needs review"}
            </Pill>
            <div className="verification-actions">
              {doctor.verificationStatus === "pending" ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => onVerify(doctor, "rejected")}
                  >
                    Request changes
                  </Button>
                  <Button onClick={() => onVerify(doctor, "verified")}>
                    <Check size={15} /> Approve
                  </Button>
                </>
              ) : doctor.verificationStatus === "verified" ? <Button variant="outline" onClick={() => onVerify(doctor, "suspended")}>Suspend verification</Button> : doctor.verificationStatus === "suspended" ? <Button onClick={() => onVerify(doctor, "verified")}>Restore verification</Button> : <Button variant="outline" onClick={() => onVerify(doctor, "pending")}>Reopen review</Button>}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function SpecialtiesPage({ specialties, onAdd, onToggle }) {
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const add = async (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = data.get("name").trim();
    if (
      name.length < 3 ||
      specialties.some((s) => s.name.toLowerCase() === name.toLowerCase())
    ) {
      setError("Enter a unique specialty name with at least 3 characters.");
      return;
    }
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    await onAdd({ name, slug, description: data.get("description") });
    setShowForm(false);
    setError("");
  };
  return (
    <>
      <SectionHeading
        eyebrow="CARE, ORGANIZED THOUGHTFULLY"
        title={
          <>
            Specialties, made <em>clear.</em>
          </>
        }
        description="Help patients find the right kind of care, without the guesswork."
        action={
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus size={15} /> Add specialty
          </Button>
        }
      />
      {showForm && (
        <form className="inline-add-form surface" onSubmit={add}>
          <label>
            Specialty name
            <input name="name" required placeholder="e.g. Endocrinology" />
          </label>
          <label>
            Short description
            <input
              name="description"
              required
              placeholder="e.g. Hormones & metabolism"
            />
          </label>
          <Button>
            Add to directory <ArrowRight size={14} />
          </Button>
          {error && <span className="form-error">{error}</span>}
        </form>
      )}
      <div className="specialty-grid">
        {specialties.map((specialty, index) => (
          <article className="specialty-card surface" key={specialty.id}>
            <span className={`specialty-icon specialty-icon-${index % 4}`}>
              <Stethoscope size={19} />
            </span>
            <div>
              <h3>{specialty.name}</h3>
              <p>{specialty.description}</p>
            </div>
            <Pill tone={specialty.active === false ? "neutral" : "verified"}>{specialty.active === false ? "Inactive" : "Active"}</Pill>
            <Button type="button" variant="outline" onClick={() => onToggle(specialty)}>{specialty.active === false ? "Activate" : "Deactivate"}</Button>
          </article>
        ))}
      </div>
      <div className="empty-admin surface">
        <Sparkles size={18} />
        <span>
          <strong>Thoughtfully curated</strong>
          <small>
            Every specialty is reviewed to help patients navigate care
            confidently.
          </small>
        </span>
        <Pill tone="verified">
          <Check size={12} /> Active
        </Pill>
      </div>
    </>
  );
}

function AvailabilityPage({ doctors, admin = false }) {
  const [doctorId, setDoctorId] = useState(doctors[0]?.id || "");
  const [slots, setSlots] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const doctor = doctors.find((item) => item.id === doctorId);
  useEffect(() => {
    if (!doctorId) return;
    careService.listAvailability(doctorId, admin).then(setSlots).catch((err) => setError(err.message));
  }, [doctorId, admin]);
  const save = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    if (data.startTime >= data.endTime) { setError("End time must be after start time."); return; }
    if (data.date < localDateKey()) { setError("Past availability dates cannot be saved."); return; }
    setError("");
    try {
      const payload = { ...data, status: editing?.status || "available" };
      const saved = editing
        ? await careService.updateAvailability(editing.id, payload, admin)
        : await careService.saveAvailability(doctorId, payload, admin);
      setSlots((items) => [...items.filter((item) => item.id !== saved.id), saved]);
      setEditing(null);
      setNotice(`Slot ${editing ? "updated" : "created"}${saved.simulated ? " (simulated)" : ""}.`);
      form.reset();
    } catch (err) { setError(err.message || "Availability could not be saved."); }
  };
  const toggleBlocked = async (slot) => {
    setError("");
    try {
      const updated = await careService.updateAvailability(slot.id, { ...slot, status: slot.status === "unavailable" ? "available" : "unavailable" }, admin);
      setSlots((items) => items.map((item) => item.id === slot.id ? updated : item));
      setNotice(`Slot marked ${updated.status}${updated.simulated ? " (simulated)" : ""}.`);
    } catch (err) { setError(err.message); }
  };
  const remove = async (slot) => {
    if (!window.confirm(`Remove ${slot.date} ${slot.startTime}–${slot.endTime}?`)) return;
    try {
      const result = await careService.removeAvailability(slot.id, admin);
      setSlots((items) => items.filter((item) => item.id !== slot.id));
      setNotice(`Slot removed${result?.simulated ? " (simulated)" : ""}.`);
    } catch (err) { setError(err.message); }
  };
  return <>
    <SectionHeading eyebrow={admin ? "ADMINISTRATION" : "YOUR PRACTICE"} title={<>Availability <em>management.</em></>} description={admin ? "Configure a doctor’s clinic schedule. Backend access controls remain authoritative." : "Create, update, block, and remove your appointment slots."} />
    {error && <p className="form-error" role="alert">{error}</p>}{notice && <p className="privacy-note" role="status">{notice}</p>}
    <div className="availability-layout">
      <aside className="availability-doctors surface"><span className="eyebrow">CHOOSE A DOCTOR</span>{doctors.map((item) => <button type="button" key={item.id} className={doctorId === item.id ? "active" : ""} onClick={() => setDoctorId(item.id)}><img src={item.image} alt=""/><span><strong>{item.name}</strong><small>{item.specialty}</small></span></button>)}</aside>
      <section className="availability-editor surface"><div className="panel-heading"><div><span className="eyebrow">{admin ? "ADMIN SCHEDULE" : "DOCTOR SCHEDULE"}</span><h3>{doctor?.name || "No doctor selected"}</h3></div></div>
        {!doctor && <div className="table-empty">No doctor profiles are available.</div>}
        {doctor && <form key={editing?.id || "new-slot"} className="inline-add-form" onSubmit={save}>
          <label>Clinic<select name="facilityId" defaultValue={editing?.facilityId || doctor.facilityIds?.[0] || ""} required>{doctor.facilityIds?.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
          <label>Date<input type="date" name="date" min={localDateKey()} defaultValue={editing?.date || ""} required /></label>
          <label>Start<input type="time" name="startTime" defaultValue={editing?.startTime || ""} required /></label>
          <label>End<input type="time" name="endTime" defaultValue={editing?.endTime || ""} required /></label>
          <Button type="submit"><Check size={14}/>{editing ? "Save changes" : "Create slot"}</Button>{editing && <Button type="button" variant="outline" onClick={() => setEditing(null)}>Stop editing</Button>}
        </form>}
        <div className="table-wrap"><table><thead><tr><th>DATE</th><th>CLINIC</th><th>TIME</th><th>STATE</th><th>ACTIONS</th></tr></thead><tbody>{slots.map((slot) => <tr key={slot.id}><td>{slot.date}</td><td>{slot.facilityId}</td><td>{slot.startTime}–{slot.endTime}</td><td>{slot.status}{slot.simulated ? " · simulated" : ""}</td><td><button className="table-action" onClick={() => setEditing(slot)}>Edit</button><button className="table-action" onClick={() => toggleBlocked(slot)}>{slot.status === "unavailable" ? "Unblock" : "Block"}</button><button className="table-action" onClick={() => remove(slot)}>Remove</button></td></tr>)}</tbody></table>{!slots.length && <div className="table-empty">No availability entries.</div>}</div>
      </section>
    </div>
  </>;
}

function FacilityManagement({ facilities, onSave, onDeactivate }) {
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const list = facilities.filter((item) =>
    `${item.name} ${item.area}`.toLowerCase().includes(query.toLowerCase()),
  );
  const submit = async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = data.get("name").trim();
    const address = data.get("address").trim();
    if (name.length < 4 || address.length < 5) return;
    await onSave(editing?.id, {
      name,
      type: data.get("type"),
      address,
      area: data.get("area").trim(),
      city: "Dhaka",
      phone: data.get("phone").trim(),
    });
    setShowForm(false);
    setEditing(null);
  };
  const editFacility = (facility) => {
    setEditing(facility);
    setShowForm(true);
  };
  return (
    <>
      <SectionHeading
        eyebrow="PLACES THAT MAKE CARE POSSIBLE"
        title={
          <>
            Facility <em>management.</em>
          </>
        }
        description="Keep clinic and hospital information clear, current, and easy to find."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setShowForm((value) => !value);
            }}
          >
            <Plus size={15} /> Add facility
          </Button>
        }
      />
      {showForm && (
        <form className="admin-form surface" onSubmit={submit}>
          <div className="panel-heading">
            <h3>{editing ? "Edit facility details" : "Add a facility"}</h3>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditing(null);
              }}
              aria-label="Close"
            >
              <X size={17} />
            </button>
          </div>
          <div className="form-grid">
            <label>
              Facility name
              <input
                name="name"
                required
                minLength="4"
                defaultValue={editing?.name || ""}
                placeholder="Clinic or hospital name"
              />
            </label>
            <label>
              Facility type
              <select name="type" defaultValue={editing?.type || "clinic"}>
                <option value="clinic">Clinic</option>
                <option value="hospital">Hospital</option>
              </select>
            </label>
            <label>
              Street address
              <input
                name="address"
                required
                minLength="5"
                defaultValue={editing?.address || ""}
                placeholder="House, road, block"
              />
            </label>
            <label>
              Area
              <input
                name="area"
                required
                defaultValue={editing?.area || ""}
                placeholder="Dhanmondi"
              />
            </label>
            <label>
              Contact phone
              <input
                name="phone"
                required
                type="tel"
                pattern="\+?[0-9\s-]{8,18}"
                defaultValue={editing?.phone || ""}
                placeholder="+880 2 XXXX XXXX"
              />
            </label>
          <label>
            Associated clinics and hospitals (Ctrl/Cmd-click for multiple)
            <select name="facilityIds" multiple required defaultValue={editing?.facilityIds || []}>
              {facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name} · {facility.area}</option>)}
            </select>
          </label>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-actions">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setEditing(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editing ? "Save changes" : "Save facility"}{" "}
              <ArrowRight size={14} />
            </Button>
          </div>
        </form>
      )}
      <div className="table-toolbar surface">
        <div>
          <Search size={16} />
          <input
            placeholder="Search facilities…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Pill>{list.length} facilities</Pill>
      </div>
      <div className="facility-grid">
        {list.map((facility) => (
          <article className="facility-card surface" key={facility.id}>
            <div className="facility-image">
              <img src={facility.image} alt="" />
              <Pill>{facility.type}</Pill>
            </div>
            <div className="facility-body">
              <h3>{facility.name}</h3>
              <p>
                <MapPin size={14} /> {facility.address}, {facility.area},{" "}
                {facility.city}
              </p>
              <span className="facility-phone">{facility.phone}</span>
              <div className="facility-footer">
                <span>
                  {facility.active === false ? "Inactive" : <><CheckCircle2 size={14} /> Visible in discovery</>}
                </span>
                <Button
                  variant="outline"
                  onClick={() => editFacility(facility)}
                >
                  Edit details
                </Button>
                {facility.active !== false && <Button variant="outline" onClick={() => onDeactivate(facility)}>Deactivate</Button>}
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function AppointmentManagement({
  appointments,
  doctors,
  facilities,
  onStatus,
}) {
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const list = appointments.filter(
    (item) =>
      (status === "all" || item.status === status) &&
      `${item.patientName} ${doctors.find((d) => d.id === item.doctorId)?.name || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
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
            <i />{" "}
            {
              appointments.filter((item) =>
                ["confirmed", "upcoming"].includes(item.status),
              ).length
            }{" "}
            upcoming
          </Pill>
        }
      />
      <div className="results-toolbar admin-appointment-toolbar">
        <span>Manage visit requests and appointment status.</span>
        <label>
          Show{" "}
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      </div>
      <div className="table-toolbar surface">
        <div>
          <Search size={16} />
          <input
            placeholder="Search patient or doctor…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Pill>{list.length} appointments</Pill>
      </div>
      <div className="table-wrap surface">
        <table>
          <thead>
            <tr>
              <th>PATIENT</th>
              <th>DOCTOR</th>
              <th>FACILITY</th>
              <th>DATE &amp; TIME</th>
              <th>STATUS</th>
              <th>UPDATE</th>
            </tr>
          </thead>
          <tbody>
            {list.map((item) => {
              const doctor = doctors.find((d) => d.id === item.doctorId);
              const facility = facilities.find((f) => f.id === item.facilityId);
              return (
                <tr key={item.id}>
                  <td>
                    <div className="table-person">
                      <span className="review-avatar">
                        {item.patientName.slice(0, 1)}
                      </span>
                      <span>
                        <strong>{item.patientName}</strong>
                        <small>{item.phone}</small>
                      </span>
                    </div>
                  </td>
                  <td>{doctor?.name || "Doctor"}</td>
                  <td>{facility?.name || "Carewell clinic"}</td>
                  <td>
                    {item.date} · {item.time}
                  </td>
                  <td>
                    <Pill
                      tone={
                        item.status === "cancelled"
                          ? "error"
                          : item.status === "completed"
                            ? "neutral"
                            : "available"
                      }
                    >
                      {item.status}
                    </Pill>
                  </td>
                  <td>
                    <select
                      aria-label={`Update ${item.patientName} appointment`}
                      value={item.status}
                      onChange={(e) => onStatus(item.id, e.target.value)}
                    >
                      <option value="pending">Pending</option>
                      <option value="accepted">Accepted</option>
                      <option value="rejected">Rejected</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!list.length && (
          <div className="table-empty">
            No appointments match those filters.
          </div>
        )}
      </div>
    </>
  );
}

export {
  AdminOverview,
  DoctorManagement,
  VerificationPage,
  SpecialtiesPage,
  AvailabilityPage,
  FacilityManagement,
  AppointmentManagement,
};
