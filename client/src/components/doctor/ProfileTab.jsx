import { Save } from "lucide-react";
import { useState } from "react";
import { isDemoMode } from "../../constants.js";
import { useCatalog } from "../../context/CatalogContext.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";
import { doctorPortalService } from "../../services/index.js";
import { readDoctorProfileForm } from "../../utils/forms.js";
import ProfilePhotoEditor from "../account/ProfilePhotoEditor.jsx";
import DoctorProfileFields, { validateDoctorProfile } from "../doctors/DoctorProfileFields.jsx";
import { Button, Field, Notice, StatusPill } from "../ui/index.js";

/**
 * Own-profile editor plus the account-deactivation request.
 * @param {{doctor: object, restricted: boolean, onSaved: (doctor: object) => void,
 *   onNotice: (message: string) => void}} props
 */
export default function ProfileTab({ doctor, restricted, onSaved, onNotice }) {
  const { specialties, facilities } = useCatalog();
  const confirm = useConfirm();
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState("");
  const [deactivationError, setDeactivationError] = useState("");
  const requested = doctor.accountStatus === "deactivation_requested";

  const save = async (event) => {
    event.preventDefault();
    const profile = readDoctorProfileForm(event.currentTarget);
    const found = validateDoctorProfile(profile);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    setFormError("");
    try {
      const updated = await doctorPortalService.updateProfile(profile);
      onSaved(updated);
      onNotice(
        `${updated.simulated || isDemoMode ? "Simulated profile update saved." : "Profile saved."}${
          updated.reviewRequired ? " Credential or clinic changes were flagged for review." : ""
        }`,
      );
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const requestDeactivation = async (event) => {
    event.preventDefault();
    const confirmed = await confirm({
      title: "Request account deactivation?",
      message: "An administrator will review your request. Your session stays active until they act on it.",
      confirmLabel: "Submit request",
    });
    if (!confirmed) return;
    setDeactivationError("");
    try {
      await doctorPortalService.requestDeactivation(reason.trim());
      onSaved({ ...doctor, accountStatus: "deactivation_requested" });
      onNotice(`Deactivation request submitted${isDemoMode ? " (simulated)" : ""}.`);
    } catch (error) {
      setDeactivationError(error.message);
    }
  };

  return (
    <>
      <div className="admin-form surface">
        <ProfilePhotoEditor onChanged={(updated) => onSaved({ ...doctor, image: updated.photoUrl ?? "" })} />
      </div>
      <form className="admin-form surface" onSubmit={save} noValidate>
        <h2>
          Professional profile{" "}
          <small>
            Verification: <StatusPill status={doctor.verificationStatus} /> · doctors cannot change this
            status
          </small>
        </h2>
        <fieldset className="fieldset-reset" disabled={restricted}>
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
            <Button type="submit" disabled={saving}>
              <Save size={15} /> {saving ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </fieldset>
      </form>
      {requested ? (
        <div className="privacy-note surface" role="status">
          A deactivation request is pending{isDemoMode ? " (simulated; not submitted to a server)" : ""}. You
          may sign out below.
        </div>
      ) : (
        <form className="inline-add-form surface" onSubmit={requestDeactivation}>
          <Field label="Request account deactivation" error={deactivationError}>
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              required
              minLength={8}
              placeholder="Reason for your request"
              disabled={restricted}
            />
          </Field>
          <Button variant="outline" type="submit" disabled={restricted}>
            Request deactivation
          </Button>
        </form>
      )}
    </>
  );
}
