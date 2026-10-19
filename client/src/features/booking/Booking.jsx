import { ArrowLeft, ArrowRight, Check, MapPin, ShieldCheck, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
  Button,
  ErrorState,
  Field,
  Modal,
  Notice,
  Pill,
  SkeletonGrid,
} from "../../components/ui.jsx";
import { doctorProfilePath, PATHS, RELATIONSHIPS, ROLES, VERIFICATION_STATUS } from "../../constants.js";
import { useAuth, useCatalog, useToast } from "../../context.jsx";
import { useResource } from "../../hooks.js";
import { appointmentService, slotService } from "../../services/index.js";
import { formatFee, localDateKey, validateAppointmentDetails } from "../../utils.js";

// ─── BookingContext ────────────────────────────────────────────────────────────────────────

const BookingContext = createContext(null);

/**
 * Lets any screen start a booking: `const { openBooking } = useBooking()`.
 *
 * Booking needs a verified patient account. Guests are sent to sign in (or sign up)
 * and then returned to the doctor's profile, where the wizard opens automatically
 * (see `DoctorProfilePage`). The dialog is mounted once here so pages stay free of
 * booking state.
 */
export function BookingProvider({ children }) {
  const { user } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);

  const openBooking = useCallback(
    (selected) => {
      const comeBack = { from: { pathname: doctorProfilePath(selected.id) }, resumeBooking: true };
      if (!user) return navigate(PATHS.login, { state: comeBack });
      if (user.role !== ROLES.PATIENT)
        return notify("Booking is for patient accounts. Sign out and sign in as a patient to book.");
      if (!user.emailVerified) return navigate(PATHS.verifyEmail, { state: comeBack });
      return setDoctor(selected);
    },
    [user, navigate, notify],
  );
  const closeBooking = useCallback(() => setDoctor(null), []);
  const value = useMemo(() => ({ openBooking, closeBooking }), [openBooking, closeBooking]);

  return (
    <BookingContext.Provider value={value}>
      {children}
      {doctor && <BookingDialog key={doctor.id} doctor={doctor} onClose={closeBooking} />}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) throw new Error("useBooking must be used inside <BookingProvider>.");
  return context;
}

// ─── BookingDialog ─────────────────────────────────────────────────────────────────────────

const STEPS = ["Doctor", "Clinic", "Date & time", "Details"];
const NEXT_LABELS = { 1: "Choose a clinic", 2: "Choose date & time", 3: "Continue" };

/** Four-step appointment request wizard. Creates a *pending request*, never a confirmed visit. */
function BookingDialog({ doctor, onClose }) {
  const navigate = useNavigate();
  const { notify } = useToast();
  const { facilities } = useCatalog();
  const clinics = facilities.filter((facility) => doctor.facilityIds.includes(facility.id));

  const [step, setStep] = useState(1);
  const [selectedClinicId, setClinicId] = useState("");
  // Fall back to the first clinic so the wizard still works if the catalog loads late.
  const clinicId = selectedClinicId || clinics[0]?.id || "";
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [slotId, setSlotId] = useState(""); // server slot id, when the API provides one
  // The signed-in patient's details pre-fill the form (booking requires an account).
  const { user } = useAuth();
  const [relationship, setRelationship] = useState("self");
  const [details, setDetails] = useState(() => ({
    patientName: user.name ?? "",
    phone: user.phone ?? "",
    email: user.email ?? "",
    reason: "",
  }));
  const [fieldErrors, setFieldErrors] = useState({});
  const [stepError, setStepError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const clinic = clinics.find((item) => item.id === clinicId);
  const fee = doctor.feesByFacility?.[clinicId] ?? doctor.fee;
  const slots = useResource(
    () => slotService.listOpen({ doctorId: doctor.id, facilityId: clinicId, date }),
    [doctor.id, clinicId, date],
    { enabled: Boolean(clinicId && date) },
  );

  const clearTime = () => {
    setTime("");
    setSlotId("");
  };
  const chooseSlot = (slot) => {
    setTime(slot.label);
    setSlotId(slot.id ?? "");
    setStepError("");
  };
  const changeClinic = (id) => {
    setClinicId(id);
    clearTime();
  };
  const changeDate = (key) => {
    setDate(key);
    clearTime();
    setStepError("");
  };
  const changeRelationship = (value) => {
    setRelationship(value);
    // Booking for someone else: don't leave the account holder's name in the patient field.
    setDetails((current) => ({
      ...current,
      patientName:
        value === "self" ? user.name : current.patientName === user.name ? "" : current.patientName,
    }));
    setFieldErrors((current) => ({ ...current, patientName: undefined }));
  };
  const changeDetail = (field, value) => {
    setDetails((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const goNext = () => {
    if (step === 2 && !clinicId) return setStepError("Please choose a clinic to continue.");
    if (step === 3 && (!date || !time)) return setStepError("Choose a date and time to continue.");
    setStepError("");
    setStep((current) => current + 1);
  };
  const goBack = () => {
    setStepError("");
    setStep((current) => current - 1);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (step < 4) return goNext();
    const errors = validateAppointmentDetails(details);
    setFieldErrors(errors);
    if (Object.keys(errors).length) return undefined;

    setSubmitting(true);
    setStepError("");
    try {
      const appointment = await appointmentService.submit({
        doctorId: doctor.id,
        facilityId: clinicId,
        date,
        time,
        ...(slotId ? { slotId } : {}),
        relationship,
        ...Object.fromEntries(Object.entries(details).map(([key, value]) => [key, value.trim()])),
      });
      notify(
        `${appointment.simulated ? "Simulated request submitted" : "Request submitted"} for ${doctor.name} at ${clinic?.name}, ${date} · ${time}. Status: ${appointment.status}. Reference ${appointment.id}`,
      );
      onClose();
      navigate(PATHS.appointments);
    } catch (error) {
      setStepError(error.message || "Request could not be submitted. Please try again.");
      if (error.status === 409) {
        // The time was taken meanwhile: send the patient back to pick another.
        clearTime();
        setStep(3);
        slots.reload();
      }
    } finally {
      setSubmitting(false);
    }
    return undefined;
  };

  return (
    <Modal
      as="form"
      labelledBy="booking-title"
      onClose={onClose}
      className="booking-dialog surface"
      onSubmit={submit}
      noValidate
    >
      <div className="dialog-header">
        <span className="eyebrow">LET’S MAKE THIS HAPPEN</span>
        <button type="button" onClick={onClose} aria-label="Close booking dialog">
          <X size={19} />
        </button>
      </div>
      <ol className="dialog-progress" aria-label="Booking progress">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={step >= index + 1 ? "active" : ""}
            aria-current={step === index + 1 ? "step" : undefined}
          >
            <i>{step > index + 1 ? <Check size={12} /> : `0${index + 1}`}</i>
            <small>{label}</small>
            {index < STEPS.length - 1 && <b />}
          </li>
        ))}
      </ol>

      {step === 1 && <DoctorStep doctor={doctor} />}
      {step === 2 &&
        (clinics.length ? (
          <ClinicStep doctor={doctor} clinics={clinics} clinicId={clinicId} onChange={changeClinic} />
        ) : (
          <div className="dialog-body">
            <Notice error>This doctor has no clinic available for booking right now.</Notice>
          </div>
        ))}
      {step === 3 && (
        <ScheduleStep date={date} time={time} onDate={changeDate} onTime={chooseSlot} slots={slots} />
      )}
      {step === 4 && (
        <DetailsStep
          doctor={doctor}
          clinic={clinic}
          date={date}
          time={time}
          relationship={relationship}
          onRelationship={changeRelationship}
          values={details}
          errors={fieldErrors}
          onChange={changeDetail}
        />
      )}
      <Notice error>{stepError}</Notice>

      <div className="dialog-footer">
        <span>
          <small>CONSULTATION FEE</small>
          <strong>{formatFee(fee)}</strong>
        </span>
        {step > 1 && (
          <Button variant="outline" onClick={goBack} disabled={submitting}>
            <ArrowLeft size={14} /> Back
          </Button>
        )}
        {step < 4 ? (
          <Button type="submit" disabled={step === 2 && !clinics.length}>
            {NEXT_LABELS[step]} <ArrowRight size={15} />
          </Button>
        ) : (
          <Button type="submit" disabled={submitting}>
            {submitting ? "Sending…" : "Request appointment"} <Check size={15} />
          </Button>
        )}
      </div>
    </Modal>
  );
}

// ─── DoctorStep ────────────────────────────────────────────────────────────────────────────

function DoctorStep({ doctor }) {
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

// ─── ClinicStep ────────────────────────────────────────────────────────────────────────────

function ClinicStep({ doctor, clinics, clinicId, onChange }) {
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

// ─── ScheduleStep ──────────────────────────────────────────────────────────────────────────

/** The next seven calendar days, starting today. */
function upcomingDates(count = 7) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return {
      key: localDateKey(date),
      day: date.toLocaleDateString("en", { weekday: "short" }),
      date: date.toLocaleDateString("en", { day: "2-digit" }),
    };
  });
}

/**
 * @param {{date: string, time: string, onDate: (key: string) => void,
 *   onTime: (slot: import('../../types.js').OpenSlot) => void,
 *   slots: {data?: import('../../types.js').OpenSlot[], loading: boolean, error: Error|null, reload: () => void}}} props
 */
function ScheduleStep({ date, time, onDate, onTime, slots }) {
  const dates = upcomingDates();
  return (
    <div className="dialog-body">
      <h2 id="booking-title">
        Pick a day that
        <br />
        <em>works for you.</em>
      </h2>
      <p className="dialog-doctor">Times are shown in the clinic’s local time (BST, UTC+6)</p>
      <div className="date-list" role="group" aria-label="Choose a date">
        {dates.map(({ key, day, date: dayOfMonth }) => (
          <button
            type="button"
            key={key}
            aria-pressed={date === key}
            className={date === key ? "date-selected" : ""}
            onClick={() => onDate(key)}
          >
            <small>{day}</small>
            <strong>{dayOfMonth}</strong>
          </button>
        ))}
      </div>
      {!date && <p className="privacy-note">Choose a date to see available times.</p>}
      {date && slots.loading && <SkeletonGrid count={2} />}
      {date && !slots.loading && slots.error && (
        <ErrorState error={slots.error} onRetry={slots.reload} title="Times couldn’t be loaded" />
      )}
      {date && !slots.loading && !slots.error && slots.data && (
        <div className="time-list" role="group" aria-label="Choose a time">
          {slots.data.map((slot) => {
            const unavailable = slot.status !== "available";
            return (
              <button
                type="button"
                key={slot.label}
                disabled={unavailable}
                aria-pressed={time === slot.label}
                className={`${time === slot.label ? "time-selected" : ""} ${unavailable ? "time-disabled" : ""}`}
                onClick={() => onTime(slot)}
              >
                {slot.label}
                {time === slot.label && <Check size={13} />}
                {slot.status === "booked" && <small>Booked</small>}
                {slot.status === "passed" && <small>Passed</small>}
              </button>
            );
          })}
          {!slots.data.length && <p className="privacy-note">No times are available on this day.</p>}
        </div>
      )}
    </div>
  );
}

// ─── DetailsStep ───────────────────────────────────────────────────────────────────────────

/**
 * Patient details. The account holder can book for themselves or a family member:
 * the contact phone and email stay the account holder's so the clinic can reach them.
 *
 * @param {{doctor: object, clinic?: object, date: string, time: string,
 *   relationship: string, onRelationship: (value: string) => void,
 *   values: Record<string, string>, errors: Record<string, string>,
 *   onChange: (field: string, value: string) => void}} props
 */
function DetailsStep({ doctor, clinic, date, time, relationship, onRelationship, values, errors, onChange }) {
  const bind = (name) => ({
    name,
    value: values[name],
    onChange: (event) => onChange(name, event.target.value),
  });
  const forSelf = relationship === "self";
  return (
    <div className="dialog-body">
      <h2 id="booking-title">
        A few details,
        <br />
        <em>then you’re set.</em>
      </h2>
      <p className="dialog-doctor">
        {doctor.name} · {clinic?.name} · {date} at {time}
      </p>
      <div className="patient-form-grid">
        <Field label="Who is this appointment for?" className="field-wide">
          <select value={relationship} onChange={(event) => onRelationship(event.target.value)}>
            {RELATIONSHIPS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Patient name" error={errors.patientName}>
          <input
            {...bind("patientName")}
            autoComplete={forSelf ? "name" : "off"}
            placeholder={forSelf ? "Your full name" : "The patient’s full name"}
          />
        </Field>
        <Field label="Phone number" error={errors.phone}>
          <input {...bind("phone")} type="tel" autoComplete="tel" placeholder="+880 1XXX XXXXXX" />
        </Field>
        <Field label="Email address" error={errors.email}>
          <input {...bind("email")} type="email" autoComplete="email" placeholder="you@example.com" />
        </Field>
        <Field label="Reason for visit" error={errors.reason}>
          <textarea {...bind("reason")} placeholder="A brief note to help your doctor prepare" />
        </Field>
      </div>
      {!forSelf && (
        <p className="privacy-note">
          Phone and email are where the clinic will reach you about this appointment.
        </p>
      )}
      <p className="privacy-note">
        <ShieldCheck size={14} /> Your details are only used to prepare this appointment.
      </p>
    </div>
  );
}
