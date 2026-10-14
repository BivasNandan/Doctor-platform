import { ArrowUpRight, Check, Clock3, MapPin } from "lucide-react";
import { Button, Pill } from "./ui.jsx";

export default function DoctorCard({ doctor, onBook, onProfile }) {
  return (
    <article className="doctor-card surface">
      <div className="doctor-photo">
        <img src={doctor.image} alt={doctor.name} />
        <span className="availability">
          <i />
          {doctor.availability.includes("Today")
            ? "Available today"
            : doctor.nextAvailable}
        </span>
      </div>
      <div className="doctor-info">
        <div className="doctor-heading">
          <div>
            <button
              className="doctor-name"
              onClick={() => onProfile(doctor.id)}
            >
              {doctor.name}
            </button>
            <p>{doctor.specialty}</p>
          </div>
        </div>
        <div className="doctor-meta">
          <span>
            <Clock3 size={14} /> {doctor.experienceYears} years experience
          </span>
          <span>
            <MapPin size={14} /> {doctor.location}
          </span>
        </div>
        <div className="tag-row">
          {doctor.verified && (
            <Pill tone="verified">
              <Check size={12} /> Verified
            </Pill>
          )}
          {doctor.languages.slice(0, 2).map((language) => (
            <Pill key={language}>{language}</Pill>
          ))}
        </div>
        <div className="doctor-footer">
          <div>
            <small>CONSULTATION</small>
            <strong>৳{doctor.fee.toLocaleString()}</strong>
          </div>
          <Button type="button" variant="outline" onClick={() => onBook(doctor)}>
            Book visit <ArrowUpRight size={15} />
          </Button>
        </div>
      </div>
    </article>
  );
}
