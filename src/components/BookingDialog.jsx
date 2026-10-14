import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button, Pill } from "./ui.jsx";
import { localDateKey } from "../utils/date.js";

function BookingDialog({
  doctor,
  facilities,
  selectedDate,
  setSelectedDate,
  selectedTime,
  setSelectedTime,
  onClose,
  onSubmit,
}) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [clinicId, setClinicId] = useState(doctor.facilityIds[0]);
  const clinicOptions = facilities.filter((facility) =>
    doctor.facilityIds.includes(facility.id),
  );
  const clinic = clinicOptions.find((item) => item.id === clinicId);
  const clinicFee = clinic ? doctor.feesByFacility?.[clinic.id] ?? doctor.fee : doctor.fee;
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  const handleSubmit = (event) => {
    event.preventDefault();
    if (
      !selectedDate ||
      selectedDate < localDateKey()
    ) {
      setError("Choose a valid date that is today or later.");
      return;
    }
    onSubmit(event, {
      clinicId,
      date: selectedDate,
      selectedDate,
      selectedTime,
    });
  };
  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return {
      key: localDateKey(date),
      day: date.toLocaleDateString("en", { weekday: "short" }),
      date: date.toLocaleDateString("en", { day: "2-digit" }),
    };
  });
  const times = ["4:30 PM", "5:30 PM", "6:00 PM", "6:30 PM"];
  return (
    <div
      className="dialog-scrim"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        className="booking-dialog surface"
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-title"
      >
        <div className="dialog-header">
          <span className="eyebrow">LET’S MAKE THIS HAPPEN</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close booking dialog"
          >
            <X size={19} />
          </button>
        </div>
        <div className="dialog-progress">
          {["Doctor", "Clinic", "Date & time", "Details"].map((label, i) => (
            <span className={step >= i + 1 ? "active" : ""} key={label}>
              <i>{step > i + 1 ? <Check size={12} /> : `0${i + 1}`}</i>
              <small>{label}</small>
              {i < 3 && <b />}
            </span>
          ))}
        </div>
        {step === 1 && (
          <div className="dialog-body">
            <h2 id="booking-title">
              A good first step
              <br />
              <em>starts with trust.</em>
            </h2>
            <p className="dialog-doctor">Your selected doctor</p>
            <div className="booking-clinic">
              <img
                className="appointment-doctor-image"
                src={doctor.image}
                alt=""
              />
              <span>
                <strong>{doctor.name}</strong>
                <small>
                  {doctor.specialty} · {doctor.experienceYears} years ·{" "}
                  {doctor.qualifications.join(", ")}
                </small>
              </span>
              {doctor.verificationStatus === "verified" && (
                <Pill tone="verified">
                  <Check size={12} /> Verified
                </Pill>
              )}
            </div>
            <p className="privacy-note">
              Availability is simulated in this MVP; request is not a confirmed
              appointment.
            </p>
          </div>
        )}
        {step === 2 && (
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
                  {clinic
                    ? `${clinic.address}, ${clinic.area}, ${clinic.city}`
                    : "Select a clinic to continue"}
                </small>
              </span>
            </div>
            <label className="filter-label">
              Available clinics
              <select
                value={clinicId}
                onChange={(e) => setClinicId(e.target.value)}
              >
                {clinicOptions.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        {step === 3 && (
          <div className="dialog-body">
            <h2 id="booking-title">
              Pick a day that
              <br />
              <em>works for you.</em>
            </h2>
            <p className="dialog-doctor">
              Simulated availability · All times in BST (UTC+6)
            </p>
            <div className="date-list">
              {dates.map(({ key, day, date }) => (
                <button
                  type="button"
                  key={key}
                  className={selectedDate === key ? "date-selected" : ""}
                  onClick={() => setSelectedDate(key)}
                >
                  <small>{day}</small>
                  <strong>{date}</strong>
                </button>
              ))}
            </div>
            <div className="time-list">
              {times.map((time) => (
                <button
                  type="button"
                  key={time}
                  disabled={time === "6:30 PM"}
                  className={`${selectedTime === time ? "time-selected" : ""} ${time === "6:30 PM" ? "time-disabled" : ""}`}
                  onClick={() => setSelectedTime(time)}
                >
                  {time}
                  {selectedTime === time && <Check size={13} />}
                  {time === "6:30 PM" && <small>Booked</small>}
                </button>
              ))}
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="dialog-body">
            <h2 id="booking-title">
              A few details,
              <br />
              <em>then you’re set.</em>
            </h2>
            <p className="dialog-doctor">
              {doctor.name} · {clinic?.name} · {selectedDate} at {selectedTime}
            </p>
            <div className="patient-form-grid">
              <label>
                Patient name
                <input
                  name="patientName"
                  required
                  minLength="2"
                  placeholder="Your full name"
                />
              </label>
              <label>
                Phone number
                <input
                  name="phone"
                  type="tel"
                  required
                  pattern="\+?[0-9\s-]{8,18}"
                  placeholder="+880 1XXX XXXXXX"
                />
              </label>
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                />
              </label>
              <label>
                Reason for visit
                <textarea
                  name="reason"
                  required
                  minLength="5"
                  placeholder="A brief note to help your doctor prepare"
                />
              </label>
            </div>
            {error && <span className="form-error">{error}</span>}
            <p className="privacy-note">
              <ShieldCheck size={14} /> Your details are only used to prepare
              this appointment.
            </p>
          </div>
        )}
        <div className="dialog-footer">
          <span>
            <small>CONSULTATION FEE</small>
            <strong>৳{clinicFee.toLocaleString()}</strong>
          </span>
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep((current) => current - 1)}
            >
              <ArrowLeft size={14} /> Back
            </Button>
          )}
          {step < 4 ? (
            <Button
              type="button"
              onClick={() => {
                if (step === 3 && (!selectedDate || !selectedTime)) {
                  setError("Choose a date and time to continue.");
                  return;
                }
                if (step === 2 && !clinicId) {
                  setError("Please choose a clinic to continue.");
                  return;
                }
                setError("");
                setStep((current) => current + 1);
              }}
            >
              {step === 1
                ? "Choose a clinic"
                : step === 2
                  ? "Choose date & time"
                  : "Continue"}{" "}
              <ArrowRight size={15} />
            </Button>
          ) : (
            <Button type="submit">
              Request appointment <Check size={15} />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

export default BookingDialog;
