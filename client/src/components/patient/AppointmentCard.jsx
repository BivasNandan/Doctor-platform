import { ChevronDown, Clock3, MapPin, Printer, Video } from "lucide-react";
import { useState } from "react";
import { APPOINTMENT_STATUS_LABELS, PATIENT_CANCELLABLE_STATUSES, relationshipTag } from "../../constants.js";
import { parseDateKey } from "../../utils/dates.js";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { Avatar, StatusPill } from "../ui/index.js";
import ConsultationPreview from "./ConsultationPreview.jsx";

/**
 * One appointment request in the patient's list.
 * @param {{appointment: object, doctor?: object, facility?: object, onCancel: (id: string) => void}} props
 */
export default function AppointmentCard({ appointment, doctor, facility, onCancel }) {
  const date = parseDateKey(appointment.date);
  const { language, t } = useLanguage();
  const locale = language === "bn" ? "bn-BD" : "en";
  const [previewOpen, setPreviewOpen] = useState(false);
  const printReceipt = (event) => {
    const card = event.currentTarget.closest(".appointment-card");
    card.classList.add("is-printing");
    const cleanup = () => card.classList.remove("is-printing");
    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
    window.setTimeout(cleanup, 1000);
  };
  return (
    <article className="appointment-card surface">
      <div className="appointment-date">
        <strong>{date.toLocaleDateString("en", { day: "2-digit" })}</strong>
        <span>{date.toLocaleDateString("en", { month: "short" })}</span>
        <small>{date.toLocaleDateString("en", { weekday: "short" })}</small>
      </div>
      <Avatar className="appointment-doctor-image" src={doctor?.image} name={doctor?.name ?? "Doctor"} />
      <div className="appointment-detail">
        <h3>{doctor?.name ?? "Doctor unavailable"}</h3>
        <p>
          {doctor?.specialty} · {facility?.name}
        </p>
        {relationshipTag(appointment.relationship) && (
          <p>
            For {appointment.patientName} ({relationshipTag(appointment.relationship)})
          </p>
        )}
        <span>
          <Clock3 size={14} /> {appointment.time} <i /> <MapPin size={14} /> {facility?.area}
          {facility?.city ? `, ${facility.city}` : ""}
        </span>
      </div>
      <StatusPill status={appointment.status} />
      <div className="appointment-actions">
        <button className="text-link" type="button" onClick={printReceipt}>
          <Printer size={14} /> {t("Print receipt")}
        </button>
        {appointment.status === "accepted" && (
          <button className="text-link" type="button" onClick={() => setPreviewOpen(true)}>
            <Video size={14} /> {t("Preview online room")}
          </button>
        )}
        {PATIENT_CANCELLABLE_STATUSES.includes(appointment.status) && (
          <button className="text-link" type="button" onClick={() => onCancel(appointment.id)}>
            {t("Cancel")}
          </button>
        )}
        <details className="appointment-detail-more">
          <summary className="text-link">
            {t("Request details")} <ChevronDown size={14} aria-hidden="true" />
          </summary>
          {/* Opens as a small panel under the row, so the actions never shift. */}
          <div className="appointment-detail-panel">
            <p>
              Reference: {appointment.id}
              {appointment.simulated ? " (simulated)" : ""}
            </p>
            <p>Status: {appointment.status}; a pending request is not a confirmed appointment.</p>
            <p>
              Clinic: {facility?.name || "Unavailable"} · {facility?.address || ""}
            </p>
          </div>
        </details>
      </div>
      <section className="appointment-receipt" aria-label="Printable appointment confirmation">
        <p className="eyebrow">CAREWELL · APPOINTMENT REQUEST</p>
        <h1>{t("Appointment details")}</h1>
        <dl>
          <div>
            <dt>{t("Doctor")}</dt>
            <dd>{doctor?.name ?? "Doctor unavailable"}</dd>
          </div>
          <div>
            <dt>{t("Date")}</dt>
            <dd>{date.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}</dd>
          </div>
          <div>
            <dt>{t("Time")}</dt>
            <dd>{appointment.time}</dd>
          </div>
          <div>
            <dt>{t("Clinic")}</dt>
            <dd>{facility?.name ?? "Unavailable"}</dd>
          </div>
          <div>
            <dt>{t("Booking status")}</dt>
            <dd>{t(APPOINTMENT_STATUS_LABELS[appointment.status] ?? appointment.status)}</dd>
          </div>
          <div>
            <dt>{t("Reference")}</dt>
            <dd>{appointment.id}</dd>
          </div>
        </dl>
        <p>A pending request is not a confirmed appointment. The clinic must accept it first.</p>
      </section>
      {previewOpen && <ConsultationPreview onClose={() => setPreviewOpen(false)} />}
    </article>
  );
}
