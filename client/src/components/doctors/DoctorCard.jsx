import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Check, Clock3, Heart, MapPin, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { doctorProfilePath, isDemoMode, VERIFICATION_STATUS } from "../../constants.js";
import { formatFee } from "../../utils/format.js";
import { useFavorites } from "../../context/FavoritesContext.jsx";
import { Avatar, Button, Pill } from "../ui/index.js";
import DoctorLanguages from "./DoctorLanguages.jsx";

/** Summary card for one doctor in a grid. `onBook` receives the doctor. */
export default function DoctorCard({ doctor, onBook, index }) {
  const reduceMotion = useReducedMotion();
  const { doctorIds, toggle } = useFavorites();
  const isFavorite = doctorIds.includes(doctor.id);
  const verified = doctor.verificationStatus === VERIFICATION_STATUS.VERIFIED;
  return (
    <motion.article
      className="doctor-card surface"
      initial={reduceMotion ? false : { opacity: 0, y: 7 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{
        duration: reduceMotion ? 0 : 0.22,
        delay: reduceMotion ? 0 : Math.min(index * 0.04, 0.12),
        ease: "easeOut",
      }}
    >
      <div className="doctor-photo">
        <Avatar src={doctor.image} name={doctor.name} alt={doctor.name} />
        <button
          aria-label={isFavorite ? `Remove ${doctor.name} from saved doctors` : `Save ${doctor.name}`}
          aria-pressed={isFavorite}
          className={`favorite-button${isFavorite ? " is-favorite" : ""}`}
          onClick={() => toggle(doctor.id)}
          type="button"
        >
          <Heart aria-hidden="true" fill={isFavorite ? "currentColor" : "none"} size={16} />
        </button>
        <span className="availability">
          <i />
          {doctor.availability.includes("Today") ? "Available today" : doctor.nextAvailable}
        </span>
        {isDemoMode && <span className="availability-simulated">Simulated availability</span>}
      </div>
      <div className="doctor-info">
        <div className="doctor-heading">
          <div>
            <Link className="doctor-name" to={doctorProfilePath(doctor.id)}>
              {doctor.name}
            </Link>
            <p>{doctor.specialty}</p>
          </div>
          {doctor.reviewCount > 0 && (
            <span className="rating" title={`${doctor.reviewCount} patient reviews`}>
              <Star size={13} fill="currentColor" /> {Number(doctor.rating).toFixed(1)}{" "}
              <small>({doctor.reviewCount})</small>
            </span>
          )}
        </div>
        <div className="doctor-meta">
          <span>
            <Clock3 size={14} /> {doctor.experienceYears} years experience
          </span>
          <span>
            <MapPin size={14} /> {doctor.location}
          </span>
          <DoctorLanguages languages={doctor.languages} />
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
    </motion.article>
  );
}
