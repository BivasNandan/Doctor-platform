import { Check, Save } from "lucide-react";
import { useState } from "react";
import ProfilePhotoEditor from "../../components/account/ProfilePhotoEditor.jsx";
import ChangePasswordForm from "../../components/patient/ChangePasswordForm.jsx";
import { Button, Field, Notice, Pill, SectionHeading } from "../../components/ui/index.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { isValidPhone, PHONE_PATTERN } from "../../utils/validation.js";

/** The signed-in patient's own account details. Email is fixed; name and phone are editable. */
export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input = { name: String(data.get("name")).trim(), phone: String(data.get("phone")).trim() };
    const found = {};
    if (input.name.length < 2) found.name = "Enter your full name.";
    if (!isValidPhone(input.phone)) found.phone = "Enter a valid phone number.";
    setErrors(found);
    setMessage("");
    if (Object.keys(found).length) return;

    setBusy(true);
    setFormError("");
    try {
      await updateProfile(input);
      setMessage("Your details were saved.");
    } catch (error) {
      setFormError(error.message || "Your details could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SectionHeading
        eyebrow="YOUR ACCOUNT"
        title={
          <>
            Your <em>profile.</em>
          </>
        }
        description="These details pre-fill your appointment requests. You can change them for each booking."
      />
      <div className="admin-form surface">
        <ProfilePhotoEditor />
      </div>
      <form className="admin-form surface" onSubmit={submit} noValidate>
        <div className="form-grid">
          <Field label="Full name" error={errors.name}>
            <input name="name" required defaultValue={user.name} autoComplete="name" />
          </Field>
          <Field label="Phone number" error={errors.phone}>
            <input name="phone" type="tel" required pattern={PHONE_PATTERN} defaultValue={user.phone ?? ""} />
          </Field>
          <Field label="Email" hint="Your email is your sign-in and can’t be changed here.">
            <input value={user.email} readOnly />
          </Field>
        </div>
        <p className="privacy-note">
          <Pill tone="verified">
            <Check size={12} /> Email verified
          </Pill>
        </p>
        <Notice error>{formError}</Notice>
        <Notice>{message}</Notice>
        <div className="form-actions">
          <Button type="submit" disabled={busy}>
            <Save size={15} /> {busy ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
      <ChangePasswordForm />
    </>
  );
}
