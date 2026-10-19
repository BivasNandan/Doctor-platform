import { CheckboxGroup, Field } from "../../components/ui.jsx";
import { joinList } from "../../utils.js";

// ─── DoctorProfileFields ───────────────────────────────────────────────────────────────────

/**
 * Shared doctor-profile inputs (registration, doctor self-service, admin editor).
 * Render inside a `.form-grid`; read the result with `readDoctorProfileForm(form)`.
 *
 * @param {{doctor?: object, specialties: object[], facilities: object[],
 *   errors?: Record<string, string>, disabled?: boolean}} props
 */
export default function DoctorProfileFields({ doctor, specialties, facilities, errors = {}, disabled }) {
  return (
    <>
      <Field label="Full name" error={errors.name}>
        <input
          name="name"
          required
          minLength={5}
          autoComplete="name"
          placeholder="Dr. First Last"
          defaultValue={doctor?.name ?? ""}
          disabled={disabled}
        />
      </Field>
      <Field label="Specialty" error={errors.specialtyId}>
        <select name="specialtyId" required defaultValue={doctor?.specialtyId ?? ""} disabled={disabled}>
          <option value="" disabled>
            Choose a specialty
          </option>
          {specialties.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Qualifications (comma separated)" error={errors.qualifications}>
        <input
          name="qualifications"
          required
          placeholder="MBBS, FCPS"
          defaultValue={joinList(doctor?.qualifications)}
          disabled={disabled}
        />
      </Field>
      <Field label="Experience (years)" error={errors.experienceYears}>
        <input
          name="experienceYears"
          type="number"
          required
          min={0}
          max={60}
          defaultValue={doctor?.experienceYears ?? 0}
          disabled={disabled}
        />
      </Field>
      <Field label="Consultation fee (৳)" error={errors.fee}>
        <input
          name="fee"
          type="number"
          required
          min={0}
          defaultValue={doctor?.fee ?? 0}
          disabled={disabled}
        />
      </Field>
      <Field label="Practice location" error={errors.location}>
        <input
          name="location"
          required
          placeholder="Dhanmondi, Dhaka"
          defaultValue={doctor?.location ?? ""}
          disabled={disabled}
        />
      </Field>
      <CheckboxGroup
        legend="Clinics and hospitals"
        name="facilityIds"
        options={facilities.map((facility) => ({
          value: facility.id,
          label: `${facility.name} · ${facility.area}`,
        }))}
        defaultValue={doctor?.facilityIds ?? []}
        disabled={disabled}
        error={errors.facilityIds}
      />
    </>
  );
}

// ─── validateDoctorProfile ─────────────────────────────────────────────────────────────────

/**
 * Client-side checks shared by every screen that edits a doctor profile.
 * The server must validate the same rules.
 * @param {ReturnType<typeof import('../../utils.js').readDoctorProfileForm>} profile
 * @returns {Record<string, string>}
 */
export function validateDoctorProfile(profile) {
  const errors = {};
  if (profile.name.length < 5) errors.name = "Enter the doctor's full name.";
  if (!profile.specialtyId) errors.specialtyId = "Choose a specialty.";
  if (!profile.qualifications.length) errors.qualifications = "Add at least one qualification.";
  if (!Number.isFinite(profile.fee) || profile.fee < 0) errors.fee = "Enter a non-negative fee.";
  if (!Number.isFinite(profile.experienceYears) || profile.experienceYears < 0)
    errors.experienceYears = "Enter the years of experience.";
  if (!profile.location) errors.location = "Enter the practice location.";
  if (!profile.facilityIds.length) errors.facilityIds = "Choose at least one clinic or hospital.";
  return errors;
}
