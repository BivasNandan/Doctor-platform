import { ShieldCheck } from "lucide-react";
import { Field } from "../../../components/ui";
import { RELATIONSHIPS } from "../../../constants/booking.js";

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
