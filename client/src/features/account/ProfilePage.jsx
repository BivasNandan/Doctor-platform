import { Check, KeyRound, Save } from "lucide-react";
import { useState } from "react";
import { Button, Field, Notice, Pill, SectionHeading } from "../../components/ui.jsx";
import { useAuth } from "../../context.jsx";
import { authService } from "../../services/index.js";
import { isValidPhone, PHONE_PATTERN } from "../../utils.js";

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

// ─── ChangePasswordForm ────────────────────────────────────────────────────────────────────

/** Lets a signed-in patient replace their password. Other devices are signed out by the server. */
function ChangePasswordForm() {
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const input = {
      currentPassword: String(data.get("currentPassword")),
      newPassword: String(data.get("newPassword")),
    };
    const found = {};
    if (!input.currentPassword) found.currentPassword = "Enter your current password.";
    if (input.newPassword.length < 8) found.newPassword = "Use at least 8 characters.";
    if (input.newPassword !== String(data.get("confirm"))) found.confirm = "The passwords don’t match.";
    setErrors(found);
    setMessage("");
    if (Object.keys(found).length) return;

    setBusy(true);
    setFormError("");
    try {
      await authService.changePassword(input);
      form.reset();
      setMessage("Your password was changed. Other devices were signed out.");
    } catch (error) {
      setFormError(error.message || "Your password could not be changed.");
      if (error.details) setErrors(error.details);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="admin-form surface" onSubmit={submit} noValidate>
      <h3>Change password</h3>
      <div className="form-grid">
        <Field label="Current password" error={errors.currentPassword}>
          <input name="currentPassword" type="password" required autoComplete="current-password" />
        </Field>
        <Field label="New password" error={errors.newPassword} hint="At least 8 characters.">
          <input name="newPassword" type="password" required minLength={8} autoComplete="new-password" />
        </Field>
        <Field label="Confirm new password" error={errors.confirm}>
          <input name="confirm" type="password" required autoComplete="new-password" />
        </Field>
      </div>
      <Notice error>{formError}</Notice>
      <Notice>{message}</Notice>
      <div className="form-actions">
        <Button type="submit" disabled={busy}>
          <KeyRound size={15} /> {busy ? "Changing…" : "Change password"}
        </Button>
      </div>
    </form>
  );
}
