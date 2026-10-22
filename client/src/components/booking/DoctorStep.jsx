import { Check } from "lucide-react";
import { VERIFICATION_STATUS } from "../../constants.js";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { Avatar, Pill } from "../ui/index.js";

export default function DoctorStep({ doctor }) {
  const { t } = useLanguage();
  return (
    <div className="dialog-body">
      <h2 id="booking-title">
        {t("A good first step")}
        <br />
        <em>{t("starts with trust.")}</em>
      </h2>
      <p className="dialog-doctor">{t("Your selected doctor")}</p>
      <div className="booking-clinic">
        <Avatar className="appointment-doctor-image" src={doctor.image} name={doctor.name} />
        <span>
          <strong>{doctor.name}</strong>
          <small>
            {doctor.specialty} · {doctor.experienceYears} years · {doctor.qualifications.join(", ")}
          </small>
        </span>
        {doctor.verificationStatus === VERIFICATION_STATUS.VERIFIED && (
          <Pill tone="verified">
            <Check size={12} /> Verified
          </Pill>
        )}
      </div>
      <p className="privacy-note">
        {t("This is a request, not a confirmed appointment. The clinic will respond to confirm.")}
      </p>
    </div>
  );
}
