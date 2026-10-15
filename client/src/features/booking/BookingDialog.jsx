import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PATHS } from "../../constants/paths.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useCatalog } from "../../context/CatalogContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useResource } from "../../hooks/useResource.js";
import { appointmentService, slotService } from "../../services/index.js";
import { formatFee } from "../../utils/format.js";
import { validateAppointmentDetails } from "../../utils/validation.js";
import { Button, Modal, Notice } from "../../components/ui";
import ClinicStep from "./steps/ClinicStep.jsx";
import DetailsStep from "./steps/DetailsStep.jsx";
import DoctorStep from "./steps/DoctorStep.jsx";
import ScheduleStep from "./steps/ScheduleStep.jsx";

const STEPS = ["Doctor", "Clinic", "Date & time", "Details"];
const NEXT_LABELS = { 1: "Choose a clinic", 2: "Choose date & time", 3: "Continue" };

/** Four-step appointment request wizard. Creates a *pending request*, never a confirmed visit. */
export default function BookingDialog({ doctor, onClose }) {
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
