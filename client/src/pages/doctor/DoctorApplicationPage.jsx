import { Check, FileText, LogOut, MailCheck, Send, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import CertificateUpload from "../../components/doctor/CertificateUpload.jsx";
import DoctorProfileFields, { validateDoctorProfile } from "../../components/doctors/DoctorProfileFields.jsx";
import {
  Button,
  ErrorState,
  Field,
  IconButton,
  Notice,
  PageLoader,
  SectionHeading,
  StatusPill,
} from "../../components/ui/index.js";
import {
  certificateKindLabel,
  DEMO_VERIFICATION_CODE,
  isDemoMode,
  ONBOARDING_STATUS,
  ONBOARDING_STATUS_LABELS,
  PATHS,
} from "../../constants.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useCatalog } from "../../context/CatalogContext.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useResource } from "../../hooks/useResource.js";
import { doctorPortalService } from "../../services/index.js";
import { formatDay } from "../../utils/dates.js";
import { joinList } from "../../utils/format.js";
import { readDoctorProfileForm } from "../../utils/forms.js";

const RESEND_COOLDOWN_SECONDS = 30;
const EDITABLE = [ONBOARDING_STATUS.IN_PROGRESS, ONBOARDING_STATUS.CHANGES_REQUESTED];

/** One numbered step of the application, ticked when done. */
function Step({ number, title, done, children }) {
  return (
    <section className={`application-step surface ${done ? "application-step-done" : ""}`}>
      <header>
        <span className="application-step-mark" aria-hidden="true">
          {done ? <Check size={14} /> : number}
        </span>
        <h3>
          {title}
          {done && <span className="sr-only"> (done)</span>}
        </h3>
      </header>
      {children}
    </section>
  );
}

/** Step 1: the 6-digit code emailed at registration. */
function EmailStep({ email, onVerified }) {
  const { verifyEmail, resendVerification } = useAuth();
  const { notify } = useToast();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await verifyEmail(code.trim());
      notify("Email confirmed.");
      onVerified();
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
      notify(`A new code was sent to ${email}.`);
    } catch (err) {
      setError(err.message || "We couldn’t send a new code.");
    }
  };

  return (
    <form onSubmit={submit}>
      <p className="privacy-note">We sent a 6-digit code to {email}.</p>
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
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          />
        </Field>
      </div>
      <div className="form-actions">
        <Button variant="outline" onClick={resend} disabled={cooldown > 0}>
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </Button>
        <Button type="submit" disabled={busy || code.length !== 6}>
          {busy ? "Confirming…" : "Confirm email"}
        </Button>
      </div>
    </form>
  );
}

/** Step 2: the profile patients will see, editable while the application is open. */
function ProfileStep({ doctor, editable, onSaved }) {
  const { specialties, facilities } = useCatalog();
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async (event) => {
    event.preventDefault();
    const profile = readDoctorProfileForm(event.currentTarget);
    const found = validateDoctorProfile(profile);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    setFormError("");
    try {
      onSaved(await doctorPortalService.updateProfile(profile));
      setEditing(false);
    } catch (err) {
      setFormError(err.message || "Your profile could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  if (editing)
    return (
      <form onSubmit={save} noValidate>
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
          <Button variant="outline" onClick={() => setEditing(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </form>
    );

  return (
    <>
      <p className="application-summary">
        <strong>{doctor.name}</strong> · {doctor.specialty} · {doctor.experienceYears} years ·{" "}
        {joinList(doctor.qualifications)} · {doctor.location}
      </p>
      {editable && (
        <div className="form-actions">
          <Button variant="outline" onClick={() => setEditing(true)}>
            Edit profile
          </Button>
        </div>
      )}
    </>
  );
}

/** Step 3: the BMDC registration certificate (required) and any other documents. */
function CertificatesStep({ certificates, editable, onChanged }) {
  const confirm = useConfirm();
  const { notify } = useToast();

  const remove = async (certificate) => {
    const confirmed = await confirm({
      title: `Remove ${certificate.fileName}?`,
      message: "You can upload it again afterwards.",
      confirmLabel: "Remove",
    });
    if (!confirmed) return;
    try {
      await doctorPortalService.deleteCertificate(certificate.id);
      onChanged();
    } catch (err) {
      notify(err.message || "The file could not be removed.");
    }
  };

  return (
    <>
      <p className="privacy-note">
        Upload your <strong>BMDC registration certificate</strong>. The administration compares it with the
        BMDC register before approving you. Degree certificates are welcome too.
      </p>
      {certificates.length > 0 && (
        <ul className="certificate-list">
          {certificates.map((certificate) => (
            <li key={certificate.id}>
              <FileText size={15} aria-hidden="true" />
              <span>
                <strong>{certificate.fileName}</strong>
                <small>{certificateKindLabel(certificate.kind)}</small>
              </span>
              {editable && (
                <IconButton label={`Remove ${certificate.fileName}`} onClick={() => remove(certificate)}>
                  <Trash2 size={14} />
                </IconButton>
              )}
            </li>
          ))}
        </ul>
      )}
      {editable && (
        <CertificateUpload
          defaultKind={certificates.some((item) => item.kind === "bmdc") ? "degree" : "bmdc"}
          onUpload={async (file, kind) => {
            await doctorPortalService.uploadCertificate(file, kind);
            onChanged();
          }}
        />
      )}
    </>
  );
}

/** Where the application stands, in words. */
function StatusBanner({ application }) {
  switch (application.status) {
    case ONBOARDING_STATUS.SUBMITTED:
      return (
        <Notice>
          Submitted on {formatDay(application.submittedAt)}. The administration is checking your BMDC
          certificate with the BMDC register. We’ll email you when there’s a decision.
        </Notice>
      );
    case ONBOARDING_STATUS.CHANGES_REQUESTED:
      return (
        <div className="application-note" role="status">
          <strong>The administration asked for changes:</strong>
          <p>{application.note}</p>
          <small>Make the changes below, then submit again.</small>
        </div>
      );
    case ONBOARDING_STATUS.REJECTED:
      return (
        <div className="application-note application-note-error" role="status">
          <strong>Your application was not approved.</strong>
          {application.note && <p>{application.note}</p>}
          <small>You can apply again from {formatDay(application.reapplyAt)}.</small>
        </div>
      );
    default:
      return null;
  }
}

/**
 * A doctor's application to join Carewell, step by step: confirm email → profile → BMDC
 * certificate → submit. Approved doctors go on to the workspace.
 */
export default function DoctorApplicationPage() {
  const { user, logout } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const application = useResource(() => doctorPortalService.getApplication(), []);
  const profile = useResource(() => doctorPortalService.getProfile(), []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if ((application.error && !application.data) || (profile.error && !profile.data))
    return (
      <ErrorState
        error={application.error ?? profile.error}
        onRetry={() => {
          application.reload();
          profile.reload();
        }}
      />
    );
  if (!application.data || !profile.data) return <PageLoader label="Loading your application…" />;

  const current = application.data;
  if (current.status === ONBOARDING_STATUS.APPROVED) return <Navigate to={PATHS.doctorDashboard} replace />;
  const editable = EDITABLE.includes(current.status);
  const canReopen =
    current.status === ONBOARDING_STATUS.REJECTED && new Date(current.reapplyAt) <= new Date();

  const act = async (action, success) => {
    setSubmitting(true);
    setError("");
    try {
      application.setData(await action());
      notify(success);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const signOut = async () => {
    await logout().catch(() => undefined);
    navigate(PATHS.doctorLogin);
  };

  return (
    <>
      <SectionHeading
        eyebrow="JOIN CAREWELL"
        title="Your doctor application"
        description="Four steps, in order. Your profile becomes visible to patients only after the administration checks your BMDC registration and approves you."
        action={<StatusPill status={current.status} label={ONBOARDING_STATUS_LABELS[current.status]} />}
      />
      <StatusBanner application={current} />
      <div className="application-steps">
        <Step number={1} title="Confirm your email" done={current.emailVerified}>
          {!current.emailVerified && <EmailStep email={user?.email ?? ""} onVerified={application.reload} />}
        </Step>
        <Step number={2} title="Your professional profile" done>
          <ProfileStep doctor={profile.data} editable={editable} onSaved={profile.setData} />
        </Step>
        <Step number={3} title="BMDC registration certificate" done={current.hasBmdcCertificate}>
          <CertificatesStep
            certificates={current.certificates}
            editable={editable}
            onChanged={application.reload}
          />
        </Step>
        <Step
          number={4}
          title="Submit for review"
          done={
            ![ONBOARDING_STATUS.IN_PROGRESS, ONBOARDING_STATUS.CHANGES_REQUESTED].includes(current.status)
          }
        >
          {editable && (
            <>
              {!current.canSubmit && (
                <p className="privacy-note">
                  {!current.emailVerified
                    ? "Confirm your email first."
                    : "Upload your BMDC registration certificate first."}
                </p>
              )}
              <div className="form-actions">
                <Button
                  disabled={!current.canSubmit || submitting}
                  onClick={() =>
                    act(
                      doctorPortalService.submitApplication,
                      "Application submitted. We’ll email you the decision.",
                    )
                  }
                >
                  <Send size={14} /> {submitting ? "Submitting…" : "Submit application"}
                </Button>
              </div>
            </>
          )}
          {canReopen && (
            <div className="form-actions">
              <Button
                disabled={submitting}
                onClick={() => act(doctorPortalService.reopenApplication, "Your new application is open.")}
              >
                Start a new application
              </Button>
            </div>
          )}
        </Step>
      </div>
      <Notice error>{error}</Notice>
      <div className="form-actions">
        <Link className="button button-outline" to={PATHS.messages}>
          Message the administration
        </Link>
        <Button variant="outline" onClick={signOut}>
          <LogOut size={14} /> Sign out
        </Button>
      </div>
    </>
  );
}
