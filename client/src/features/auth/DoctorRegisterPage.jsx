import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Field, Notice, SectionHeading } from "../../components/ui.jsx";
import { isDemoMode, PATHS } from "../../constants.js";
import { useAuth, useCatalog, useToast } from "../../context.jsx";
import { isValidEmail, isValidPhone, PHONE_PATTERN, readDoctorProfileForm } from "../../utils.js";
import DoctorProfileFields, { validateDoctorProfile } from "../doctors/DoctorProfileFields.jsx";

export default function DoctorRegisterPage() {
  const { registerDoctor } = useAuth();
  const { specialties, facilities } = useCatalog();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const account = {
      email: String(data.get("email")).trim(),
      password: String(data.get("password")),
      phone: String(data.get("phone")).trim(),
    };
    const profile = readDoctorProfileForm(form);

    const found = validateDoctorProfile(profile);
    if (!isValidEmail(account.email)) found.email = "Enter a valid email address.";
    if (!isValidPhone(account.phone)) found.phone = "Enter a valid phone number.";
    if (account.password.length < 8) found.password = "Use at least 8 characters.";
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    setFormError("");
    try {
      await registerDoctor({ ...account, ...profile });
      notify("Registration submitted for verification.");
      navigate(PATHS.doctorDashboard, { replace: true });
    } catch (error) {
      setFormError(error.message || "Registration could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SectionHeading
        eyebrow="CAREWELL PORTAL"
        title="Doctor registration"
        description={
          isDemoMode
            ? "Demo mode: registration is simulated and creates no real account."
            : "Your profile is reviewed by our team before it becomes visible to patients."
        }
      />
      <form className="admin-form surface" onSubmit={submit} noValidate>
        <div className="form-grid">
          <Field label="Email" error={errors.email}>
            <input name="email" type="email" required autoComplete="email" />
          </Field>
          <Field label="Password" error={errors.password} hint="At least 8 characters.">
            <input name="password" type="password" minLength={8} required autoComplete="new-password" />
          </Field>
          <Field label="Phone" error={errors.phone}>
            <input name="phone" type="tel" required pattern={PHONE_PATTERN} autoComplete="tel" />
          </Field>
          <DoctorProfileFields specialties={specialties} facilities={facilities} errors={errors} />
        </div>
        <Notice error>{formError}</Notice>
        <div className="form-actions">
          <Link className="button button-outline" to={PATHS.doctorLogin}>
            I already have an account
          </Link>
          <Button type="submit" disabled={busy}>
            {busy ? "Submitting…" : "Submit for review"} <ArrowRight size={15} />
          </Button>
        </div>
      </form>
    </>
  );
}
