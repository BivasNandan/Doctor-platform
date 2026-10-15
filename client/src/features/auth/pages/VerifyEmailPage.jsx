import { useEffect, useState } from "react";
import { MailCheck } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { isDemoMode } from "../../../config/env.js";
import { DEMO_VERIFICATION_CODE } from "../../../constants/demo.js";
import { PATHS } from "../../../constants/paths.js";
import { ROLES } from "../../../constants/roles.js";
import { useAuth } from "../../../context/AuthContext.jsx";
import { useToast } from "../../../context/ToastContext.jsx";
import { Button, Field, Notice, SectionHeading } from "../../../components/ui";

const RESEND_COOLDOWN_SECONDS = 30;

/** Asks a newly registered patient for the code emailed to them. */
export default function VerifyEmailPage() {
  const { user, isLoading, verifyEmail, resendVerification, logout } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  if (isLoading) return null;
  if (user?.role !== ROLES.PATIENT) return <Navigate to={PATHS.login} replace state={location.state} />;

  const resume = location.state?.resumeBooking;
  const destination = location.state?.from?.pathname ?? PATHS.discover;
  if (user.emailVerified)
    return <Navigate to={destination} replace state={resume ? { resumeBooking: true } : undefined} />;

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await verifyEmail(code.trim());
      notify("Email verified. Welcome to Carewell!");
      navigate(destination, { replace: true, state: resume ? { resumeBooking: true } : undefined });
    } catch (err) {
      setError(err.message || "We couldn’t verify that code.");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError("");
    try {
      await resendVerification();
      setCooldown(RESEND_COOLDOWN_SECONDS);
      notify(`A new code was sent to ${user.email}.`);
    } catch (err) {
      setError(err.message || "We couldn’t send a new code.");
    }
  };

  const signOut = async () => {
    await logout().catch(() => undefined);
    navigate(PATHS.discover);
  };

  return (
    <>
      <SectionHeading
        eyebrow="ONE LAST STEP"
        title="Verify your email"
        description={`We sent a 6-digit code to ${user.email}. Enter it to activate your account.`}
      />
      <form className="admin-form surface" onSubmit={submit}>
        {isDemoMode && (
          <Notice>
            <MailCheck size={14} /> Demo mode: no email is sent. Use the code {DEMO_VERIFICATION_CODE}.
          </Notice>
        )}
        <div className="form-grid">
          <Field label="Verification code" error={error}>
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            />
          </Field>
        </div>
        <div className="form-actions">
          <Button variant="outline" onClick={signOut}>
            Use a different account
          </Button>
          <Button variant="outline" onClick={resend} disabled={cooldown > 0}>
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
          </Button>
          <Button type="submit" disabled={busy || code.length !== 6}>
            {busy ? "Verifying…" : "Verify email"}
          </Button>
        </div>
      </form>
    </>
  );
}
