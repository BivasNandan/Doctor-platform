import { ShieldCheck } from "lucide-react";
import { RELATIONSHIPS } from "../../constants.js";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { Field } from "../ui/index.js";

/**
 * Patient details. The account holder can book for themselves or a family member:
 * the contact phone and email stay the account holder's so the clinic can reach them.
 *
 * @param {{doctor: object, clinic?: object, date: string, time: string,
 *   relationship: string, onRelationship: (value: string) => void,
 *   values: Record<string, string>, errors: Record<string, string>,
 *   onChange: (field: string, value: string) => void}} props
 */
export default function DetailsStep({
  doctor,
  clinic,
  date,
  time,
  relationship,
  onRelationship,
  values,
  errors,
  onChange,
}) {
  const { t } = useLanguage();
  const bind = (name) => ({
    name,
    value: values[name],
    onChange: (event) => onChange(name, event.target.value),
  });
  const forSelf = relationship === "self";
  return (
    <div className="dialog-body">
      <h2 id="booking-title">
        {t("A few details,")}
        <br />
        <em>{t("then you’re set.")}</em>
      </h2>
      <p className="dialog-doctor">
        {doctor.name} · {clinic?.name} · {date} at {time}
      </p>
      <p className="availability-disclosure">
        {t("Submitting this request does not confirm an appointment. It remains pending until accepted.")}
      </p>
      <div className="patient-form-grid">
        <Field label={t("Who is this appointment for?")} className="field-wide">
          <select value={relationship} onChange={(event) => onRelationship(event.target.value)}>
            {RELATIONSHIPS.map((item) => (
              <option key={item.value} value={item.value}>
                {t(item.label)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("Patient name")} error={errors.patientName}>
          <input
            {...bind("patientName")}
            autoComplete={forSelf ? "name" : "off"}
            placeholder={t(forSelf ? "Your full name" : "The patient’s full name")}
          />
        </Field>
        <Field label={t("Phone number")} error={errors.phone}>
          <input {...bind("phone")} type="tel" autoComplete="tel" placeholder="+880 1XXX XXXXXX" />
        </Field>
        <Field label={t("Email address")} error={errors.email}>
          <input {...bind("email")} type="email" autoComplete="email" placeholder="you@example.com" />
        </Field>
        <Field label={t("Reason for visit")} error={errors.reason}>
          <textarea {...bind("reason")} placeholder={t("A brief note to help your doctor prepare")} />
        </Field>
      </div>
      {!forSelf && (
        <p className="privacy-note">
          {t("Phone and email are where the clinic will reach you about this appointment.")}
        </p>
      )}
      <p className="privacy-note">
        <ShieldCheck size={14} /> {t("Your details are only used to prepare this appointment.")}
      </p>
    </div>
  );
}
