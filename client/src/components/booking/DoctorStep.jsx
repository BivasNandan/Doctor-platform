import { Check } from "lucide-react";
import { VERIFICATION_STATUS } from "../../constants.js";
import { Avatar, Pill } from "../ui/index.js";

export default function DoctorStep({ doctor }) {
  return (
    <div className="dialog-body">
      <h2 id="booking-title">
        A good first step
        <br />
        <em>starts with trust.</em>
      </h2>
      <p className="dialog-doctor">Your selected doctor</p>
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
        This is a request, not a confirmed appointment. The clinic will respond to confirm.
      </p>
    </div>
  );
}
