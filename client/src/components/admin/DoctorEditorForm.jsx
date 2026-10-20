import { ArrowRight, X } from "lucide-react";
import { useState } from "react";
import { useCatalog } from "../../context/CatalogContext.jsx";
import { readDoctorProfileForm } from "../../utils/forms.js";
import { isValidEmail } from "../../utils/validation.js";
import DoctorProfileFields, { validateDoctorProfile } from "../doctors/DoctorProfileFields.jsx";
import { Button, Field, Notice } from "../ui/index.js";

/**
 * Admin form to create or edit a doctor profile.
 * @param {{doctor?: object, onSubmit: (profile: object) => Promise<boolean|void>, onCancel: () => void}} props
 *   `onSubmit` may return `false` to keep the form open.
 */
export default function DoctorEditorForm({ doctor, onSubmit, onCancel }) {
  const { specialties, facilities } = useCatalog();
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const profile = readDoctorProfileForm(event.currentTarget);
    const found = validateDoctorProfile(profile);
    // A new doctor gets a login, so an email is required; editing leaves it alone.
    if (!doctor) {
      profile.email = new FormData(event.currentTarget).get("email")?.toString().trim().toLowerCase() ?? "";
      if (!isValidEmail(profile.email)) found.email = "Enter a valid email address.";
    }
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    setFormError("");
    try {
      await onSubmit(profile);
    } catch (error) {
      setFormError(error.message || "Doctor profile could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="admin-form surface" onSubmit={submit} noValidate>
      <div className="panel-heading">
        <h3>{doctor ? `Edit ${doctor.name}` : "Add a doctor profile"}</h3>
        <button type="button" onClick={onCancel} aria-label="Close form">
          <X size={17} />
        </button>
      </div>
      <div className="form-grid">
        {!doctor && (
          <Field label="Login email" error={errors.email}>
            <input name="email" type="email" required autoComplete="off" placeholder="doctor@example.com" />
          </Field>
        )}
        <DoctorProfileFields
          doctor={doctor}
          specialties={specialties}
          facilities={facilities}
          errors={errors}
        />
      </div>
      <Notice error>{formError}</Notice>
      <div className="form-actions">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {doctor ? "Update profile" : "Save profile"} <ArrowRight size={14} />
        </Button>
      </div>
    </form>
  );
}
