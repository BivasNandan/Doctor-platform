import { ArrowRight, MailCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button, EmptyState, Field, Notice, SectionHeading } from "../../components/ui.jsx";
import { DEMO_RESET_TOKEN, isDemoMode, PATHS } from "../../constants.js";
import { authService } from "../../services/index.js";
import { isValidEmail } from "../../utils.js";

// ─── ForgotPasswordPage ────────────────────────────────────────────────────────────────────

const RESEND_COOLDOWN_SECONDS = 30;

/**
 * Step 1 of a password reset: ask for the account email. The confirmation is the
 * same whether or not an account exists, so this page cannot be used to find out
 * who has an account.
 */
export function ForgotPasswordPage() {
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

// ─── ResetPasswordPage ─────────────────────────────────────────────────────────────────────

/**
 * Step 2 of a password reset: the page the emailed link opens (`#/reset-password?token=…`).
 * The token is single-use and validated by the server, never by this page.
 */
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [linkProblem, setLinkProblem] = useState(false);
  const [busy, setBusy] = useState(false);

  const requestNewLink = (
    <Link className="button button-primary" to={PATHS.forgotPassword}>
      Request a new link
    </Link>
  );

  if (!token)
    return (
      <EmptyState
        title="This link is incomplete"
        description="Open the reset link from your email again, or request a new one."
        action={requestNewLink}
      />
    );

  const submit = async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password"));
    const found = {};
    if (password.length < 8) found.password = "Use at least 8 characters.";
    if (password !== String(data.get("confirm"))) found.confirm = "The passwords don’t match.";
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    setFormError("");
    try {
      await authService.resetPassword({ token, password });
      navigate(PATHS.login, {
        replace: true,
        state: { notice: "Your password was updated. Sign in with your new password." },
      });
    } catch (error) {
      // 410 / 404 mean the link is used up or expired; anything else is a retryable problem.
      if (error.status === 410 || error.status === 404) setLinkProblem(true);
      else setFormError(error.message || "Your password could not be updated.");
    } finally {
      setBusy(false);
    }
  };

  if (linkProblem)
    return (
      <EmptyState
        title="This link has expired"
        description="Reset links work once and expire quickly. Request a new one to continue."
        action={requestNewLink}
      />
    );

  return (
    <>
      <SectionHeading
        eyebrow="ALMOST DONE"
        title="Choose a new password"
        description="Pick something you don’t use anywhere else. You’ll sign in with it straight away."
      />
      <form className="admin-form surface" onSubmit={submit} noValidate>
        <div className="form-grid">
          <Field label="New password" error={errors.password} hint="At least 8 characters.">
            <input name="password" type="password" required minLength={8} autoComplete="new-password" />
          </Field>
          <Field label="Confirm new password" error={errors.confirm}>
            <input name="confirm" type="password" required autoComplete="new-password" />
          </Field>
        </div>
        <Notice error>{formError}</Notice>
        <div className="form-actions">
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Update password"} <ArrowRight size={15} />
          </Button>
        </div>
      </form>
    </>
  );
}
