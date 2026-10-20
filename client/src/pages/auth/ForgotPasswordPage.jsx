import { ArrowRight, MailCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Field, Notice, SectionHeading } from "../../components/ui/index.js";
import { DEMO_RESET_TOKEN, isDemoMode, PATHS } from "../../constants.js";
import { authService } from "../../services/index.js";
import { isValidEmail } from "../../utils/validation.js";

const RESEND_COOLDOWN_SECONDS = 30;

/**
 * Step 1 of a password reset: ask for the account email. The confirmation is the
 * same whether or not an account exists, so this page cannot be used to find out
 * who has an account.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const send = async (address) => {
    setBusy(true);
    setError("");
    try {
      await authService.requestPasswordReset(address);
      setSentTo(address);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err.message || "We couldn’t send the reset link. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    const address = email.trim();
    if (!isValidEmail(address)) {
      setError("Enter a valid email address.");
      return;
    }
    send(address);
  };

  if (sentTo)
    return (
      <>
        <SectionHeading
          eyebrow="CHECK YOUR INBOX"
          title="Reset link sent"
          description={`If an account exists for ${sentTo}, we’ve emailed a link to choose a new password. It expires after a short time.`}
        />
        <div className="admin-form surface">
          {isDemoMode && (
            <Notice>
              <MailCheck size={14} /> Demo mode: no email is sent.{" "}
              <Link to={`${PATHS.resetPassword}?token=${DEMO_RESET_TOKEN}`}>Open the demo reset link</Link>
            </Notice>
          )}
          <p className="privacy-note">
            Can’t find it? Check your spam folder, or make sure you used the email you signed up with.
          </p>
          <Notice error>{error}</Notice>
          <div className="form-actions">
            <Link className="button button-outline" to={PATHS.login}>
              Back to sign in
            </Link>
            <Button variant="outline" disabled={busy || cooldown > 0} onClick={() => send(sentTo)}>
              {cooldown > 0 ? `Send again in ${cooldown}s` : "Send again"}
            </Button>
          </div>
        </div>
      </>
    );

  return (
    <>
      <SectionHeading
        eyebrow="FORGOT YOUR PASSWORD?"
        title="Reset your password"
        description="Enter the email you signed up with and we’ll send you a link to choose a new password."
      />
      <form className="admin-form surface" onSubmit={submit} noValidate>
        <div className="form-grid">
          <Field label="Email" error={error}>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError("");
              }}
            />
          </Field>
        </div>
        <div className="form-actions">
          <Link className="button button-outline" to={PATHS.login}>
            Back to sign in
          </Link>
          <Button type="submit" disabled={busy}>
            {busy ? "Sending…" : "Send reset link"} <ArrowRight size={15} />
          </Button>
        </div>
      </form>
    </>
  );
}
