import { ArrowLeft, ArrowUpRight, Check, MapPin, ShieldCheck } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Avatar,
  Button,
  EmptyState,
  ErrorState,
  FacilityImage,
  PageLoader,
  Pill,
} from "../../components/ui.jsx";
import { PATHS, ROLES, VERIFICATION_STATUS } from "../../constants.js";
import { useAuth, useCatalog } from "../../context.jsx";
import { useDocumentTitle, useResource } from "../../hooks.js";
import { doctorService } from "../../services/index.js";
import { formatFee } from "../../utils.js";
import { useBooking } from "../booking/Booking.jsx";

const directionsUrl = (place) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${place.address}, ${place.area}, ${place.city}`,
  )}`;

export default function DoctorProfilePage() {
  const { doctorId } = useParams();
  const { facilities } = useCatalog();
  const { openBooking } = useBooking();
  const { data, loading, error, reload } = useResource(() => doctorService.get(doctorId), [doctorId]);
  // Ignore a previously loaded profile while navigating between doctors.
  const doctor = data?.id === doctorId ? data : undefined;
  useDocumentTitle(doctor?.name);

  // Returning from sign-in / email verification: reopen the booking for this doctor.
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const resumed = useRef(false);
  useEffect(() => {
    const ready = user?.role === ROLES.PATIENT && user.emailVerified;
    if (!doctor || resumed.current || !location.state?.resumeBooking || !ready) return;
    resumed.current = true;
    navigate(location.pathname, { replace: true, state: null });
    openBooking(doctor);
  }, [doctor, user, location, navigate, openBooking]);

  if (loading && !doctor) return <PageLoader label="Loading profile…" />;
  if (error?.status === 404 || (!loading && !doctor && !error))
    return (
      <EmptyState
        title="Doctor profile unavailable"
        description="This profile may have moved or is not published."
        action={
          <Link className="button button-primary" to={PATHS.doctors}>
            Back to doctors
          </Link>
        }
      />
    );
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const clinics = facilities.filter((item) => doctor.facilityIds.includes(item.id));
  const feeAt = (clinic) => doctor.feesByFacility?.[clinic.id] ?? doctor.fee;
  const primaryClinic = clinics[0];
  const verified = doctor.verificationStatus === VERIFICATION_STATUS.VERIFIED;

  return (
    <>
      <Link className="back-link" to={PATHS.doctors}>
        <ArrowLeft size={15} /> Back to doctors
      </Link>
      <div className="profile-layout">
        <div className="profile-main">
          <section className="profile-hero surface">
            <Avatar src={doctor.image} name={doctor.name} alt={doctor.name} />
            <div>
              <div className="profile-eyebrow">
                {verified ? (
                  <Pill tone="verified">
                    <Check size={12} /> Verified
                  </Pill>
                ) : (
                  <Pill tone="pending">{doctor.verificationStatus || "Verification status unavailable"}</Pill>
                )}
              </div>
              <h1>{doctor.name}</h1>
              <p className="profile-specialty">
                {doctor.specialty} · {doctor.experienceYears} years experience
              </p>
              <p className="profile-location">
                <MapPin size={16} /> {doctor.location}
              </p>
              <div className="tag-row">
                {doctor.qualifications.map((qualification) => (
                  <Pill key={qualification}>{qualification}</Pill>
                ))}
              </div>
            </div>
          </section>
          <section className="profile-section surface">
            <span className="eyebrow">QUALIFICATIONS &amp; EXPERIENCE</span>
            <h2>Training you can trust.</h2>
            <div className="qualification-list">
              {doctor.qualifications.map((qualification) => (
                <div key={qualification}>
                  <span className="qual-icon">
                    <Check size={15} />
                  </span>
                  <span>
                    <strong>{qualification}</strong>
                    <small>Qualification</small>
                  </span>
                </div>
              ))}
            </div>
          </section>
          <section className="profile-section surface">
            <span className="eyebrow">CLINIC</span>
            <h2>Where you’ll be seen.</h2>
            {clinics.map((place) => (
              <div className="profile-clinic" key={place.id}>
                <FacilityImage src={place.image} />
                <div>
                  <strong>{place.name}</strong>
                  <span>
                    {place.address}, {place.area}, {place.city}
                  </span>
                  <span>Consultation fee: {formatFee(feeAt(place))}</span>
                  {place.distanceKm != null && (
                    <Pill tone="available">
                      <MapPin size={12} /> {place.distanceKm} km away
                    </Pill>
                  )}
                </div>
                <a
                  className="button button-outline"
                  href={directionsUrl(place)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Directions <ArrowUpRight size={14} />
                </a>
              </div>
            ))}
          </section>
        </div>
        <aside className="booking-sticky surface">
          <span className="eyebrow">NEXT AVAILABLE</span>
          <h3>{doctor.nextAvailable}</h3>
          {primaryClinic && <p>at {primaryClinic.name}</p>}
          <div className="booking-price">
            <span>Consultation fee</span>
            <strong>{formatFee(primaryClinic ? feeAt(primaryClinic) : doctor.fee)}</strong>
          </div>
          <Button onClick={() => openBooking(doctor)}>
            Book an appointment <ArrowUpRight size={16} />
          </Button>
          <p className="booking-assurance">
            <ShieldCheck size={14} /> A request is not confirmed until the clinic responds.
          </p>
        </aside>
      </div>
    </>
  );
}
