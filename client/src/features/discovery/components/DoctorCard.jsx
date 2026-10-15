import { ArrowUpRight, Check, Clock3, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { VERIFICATION_STATUS } from "../../../constants/statuses.js";
import { doctorProfilePath } from "../../../constants/paths.js";
import { formatFee } from "../../../utils/format.js";
import { Avatar, Button, Pill } from "../../../components/ui";

/** Summary card for one doctor in a grid. `onBook` receives the doctor. */
export default function DoctorCard({ doctor, onBook }) {
  const verified = doctor.verificationStatus === VERIFICATION_STATUS.VERIFIED;
  return (
    <article className="doctor-card surface">
      <div className="doctor-photo">
        <Avatar src={doctor.image} name={doctor.name} alt={doctor.name} />
        <span className="availability">
          <i />
          {doctor.availability.includes("Today") ? "Available today" : doctor.nextAvailable}
        </span>
      </div>
      <div className="doctor-info">
        <div className="doctor-heading">
          <div>
            <Link className="doctor-name" to={doctorProfilePath(doctor.id)}>
              {doctor.name}
            </Link>
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
          {verified && (
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
            <strong>{formatFee(doctor.fee)}</strong>
          </div>
          <Button variant="outline" onClick={() => onBook(doctor)}>
            Book visit <ArrowUpRight size={15} />
          </Button>
        </div>
      </div>
    </article>
  );
}
