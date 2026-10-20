import { ArrowRight, Clock3, MapPin } from "lucide-react";
import { Avatar, Button, FacilityImage, Pill } from "../ui/index.js";

/**
 * Clinic or hospital card. `doctors` are the specialists practising there;
 * `actions` renders trailing footer buttons (admin edit, "view doctors", …).
 */
export default function FacilityCard({ facility, doctors = [], onViewDoctors, actions, status }) {
  return (
    <article className="facility-card surface">
      <div className="facility-image">
        <FacilityImage src={facility.image} alt={facility.name} />
        <Pill>{facility.type === "hospital" ? "Hospital" : "Clinic"}</Pill>
        {facility.distanceKm != null && (
          <span className="distance-pill">
            <MapPin size={12} /> {facility.distanceKm} km
          </span>
        )}
      </div>
      <div className="facility-body">
        <h3>{facility.name}</h3>
        <p>
          <MapPin size={14} /> {facility.address}, {facility.area}, {facility.city}
        </p>
        <span className="facility-phone">{facility.phone}</span>
        {onViewDoctors && (
          <div className="facility-doctors">
            {doctors.slice(0, 3).map((doctor) => (
              <Avatar
                key={doctor.id}
                src={doctor.image}
                name={doctor.name}
                alt={doctor.name}
                title={doctor.name}
              />
            ))}
            <button type="button" onClick={onViewDoctors}>
              View specialists <ArrowRight size={13} />
            </button>
          </div>
        )}
        <div className="facility-footer">
          <span>
            {status ??
              (facility.openingHours && (
                <>
                  <Clock3 size={14} /> {facility.openingHours}
                </>
              ))}
          </span>
          {actions ??
            (onViewDoctors && (
              <Button variant="outline" onClick={onViewDoctors}>
                View doctors
              </Button>
            ))}
        </div>
      </div>
    </article>
  );
}
