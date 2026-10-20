import { MapPin } from "lucide-react";

export default function ClinicStep({ doctor, clinics, clinicId, onChange }) {
  const clinic = clinics.find((item) => item.id === clinicId);
  return (
    <div className="dialog-body">
      <h2 id="booking-title">
        Choose a place
        <br />
        <em>that feels right.</em>
      </h2>
      <p className="dialog-doctor">Appointment with {doctor.name}</p>
      <div className="booking-clinic">
        <MapPin size={18} />
        <span>
          <strong>{clinic?.name || "Choose a clinic"}</strong>
          <small>
            {clinic ? `${clinic.address}, ${clinic.area}, ${clinic.city}` : "Select a clinic to continue"}
          </small>
        </span>
      </div>
      <label className="filter-label">
        Available clinics
        <select value={clinicId} onChange={(event) => onChange(event.target.value)}>
          {clinics.map((item) => (
            <option value={item.id} key={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
