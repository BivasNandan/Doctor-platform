import { useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { useCatalog } from "../../../context/CatalogContext.jsx";
import { readDoctorProfileForm } from "../../../utils/forms.js";
import { Button, Notice } from "../../../components/ui";
import DoctorProfileFields from "../../doctors/components/DoctorProfileFields.jsx";
import { validateDoctorProfile } from "../../doctors/validateDoctorProfile.js";

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
