import { ArrowRight, ArrowUpRight, Check, Clock3, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Avatar,
  Button,
  EmptyState,
  ErrorState,
  FacilityImage,
  Pill,
  SkeletonGrid,
} from "../../components/ui.jsx";
import { doctorProfilePath, VERIFICATION_STATUS } from "../../constants.js";
import { formatFee } from "../../utils.js";

// ─── DoctorCard ────────────────────────────────────────────────────────────────────────────

/** Summary card for one doctor in a grid. `onBook` receives the doctor. */
function DoctorCard({ doctor, onBook }) {
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
          {doctor.qualifications.slice(0, 2).map((qualification) => (
            <Pill key={qualification}>{qualification}</Pill>
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

// ─── DoctorGrid ────────────────────────────────────────────────────────────────────────────

/**
 * Doctor results with loading, error and empty states.
 * @param {{doctors?: object[], loading: boolean, error?: Error|null, onRetry?: () => void,
 *   onBook: (doctor: object) => void, emptyTitle?: string, emptyDescription?: string,
 *   emptyAction?: import('react').ReactNode, className?: string, skeletons?: number}} props
 */
export function DoctorGrid({
  doctors,
  loading,
  error,
  onRetry,
  onBook,
  emptyTitle = "No doctors to show",
  emptyDescription = "Try searching for another specialty or location.",
  emptyAction,
  className = "",
  skeletons = 3,
}) {
  if (error && !doctors?.length) return <ErrorState error={error} onRetry={onRetry} />;
  if (loading && !doctors?.length) return <SkeletonGrid count={skeletons} />;
  if (!doctors?.length)
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  return (
    <div className={`doctor-grid ${className}`.trim()} aria-busy={loading}>
      {doctors.map((doctor) => (
        <DoctorCard key={doctor.id} doctor={doctor} onBook={onBook} />
      ))}
    </div>
  );
}

// ─── FacilityCard ──────────────────────────────────────────────────────────────────────────

/**
 * Clinic or hospital card. `doctors` are the specialists practising there;
 * `actions` renders trailing footer buttons (admin edit, "view doctors", …).
 */
export function FacilityCard({ facility, doctors = [], onViewDoctors, actions, status }) {
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
