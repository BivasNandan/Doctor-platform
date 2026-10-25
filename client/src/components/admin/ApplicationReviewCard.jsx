import { Check, ExternalLink, FileText, Mail, Send, X } from "lucide-react";
import { useState } from "react";
import {
  BMDC_CHECK,
  BMDC_CHECK_LABELS,
  BMDC_SEARCH_URL,
  certificateKindLabel,
  isDemoMode,
  ONBOARDING_STATUS,
  ONBOARDING_STATUS_LABELS,
  PATHS,
} from "../../constants.js";
import { formatDay } from "../../utils/dates.js";
import CertificateUpload from "../doctor/CertificateUpload.jsx";
import { Avatar, Button, Field, Notice, StatusPill } from "../ui/index.js";
import ReviewActions from "./ReviewActions.jsx";

const CHECK_RESULTS = [BMDC_CHECK.MATCHED, BMDC_CHECK.NOT_FOUND, BMDC_CHECK.MISMATCH];

/** The certificates a doctor supplied, each openable in a new tab when the service gives a URL. */
function CertificateFiles({ files }) {
  if (!files.length) return <p className="privacy-note">No certificates uploaded yet.</p>;
  return (
    <ul className="certificate-list">
      {files.map((file) => (
        <li key={file.id}>
          <FileText size={15} aria-hidden="true" />
          <span>
            <strong>{file.fileName}</strong>
            <small>{certificateKindLabel(file.kind)}</small>
          </span>
          {file.url && (
            <a className="text-link" href={file.url} target="_blank" rel="noreferrer">
              Open
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Compare the BMDC certificate with the BMDC register by hand, then record the result. */
function BmdcCheckPanel({ doctor, onCheck }) {
  const check = doctor.application?.bmdcCheck ?? { result: BMDC_CHECK.UNCHECKED };
  const hasBmdc = (doctor.certificateFiles ?? []).some((file) => file.kind === "bmdc");
  const [result, setResult] = useState(
    check.result === BMDC_CHECK.UNCHECKED ? BMDC_CHECK.MATCHED : check.result,
  );
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    await onCheck(doctor, { result, note: note.trim() || undefined });
    setBusy(false);
  };

  return (
    <form className="review-panel" onSubmit={save}>
      <div className="review-panel-heading">
        <strong>BMDC check</strong>
        <StatusPill status={check.result} label={BMDC_CHECK_LABELS[check.result]} />
      </div>
      {check.checkedAt && (
        <p className="privacy-note">
          Checked by {check.checkedBy ?? "an administrator"} on {formatDay(check.checkedAt)}
          {check.note ? ` · “${check.note}”` : ""}
        </p>
      )}
      {hasBmdc ? (
        <>
          <p className="privacy-note">
            Open the BMDC certificate above, search the BMDC register for the same registration number and
            compare the name and qualifications.{" "}
            <a className="text-link" href={BMDC_SEARCH_URL} target="_blank" rel="noreferrer">
              Search the BMDC register <ExternalLink size={12} aria-hidden="true" />
            </a>
          </p>
          <div className="form-grid">
            <Field label="Result">
              <select value={result} onChange={(event) => setResult(event.target.value)}>
                {CHECK_RESULTS.map((value) => (
                  <option key={value} value={value}>
                    {BMDC_CHECK_LABELS[value]}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Note for the record"
              hint={
                result === BMDC_CHECK.MATCHED
                  ? "Optional. Not shown to the doctor."
                  : "Required: what did not match?"
              }
            >
              <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} />
            </Field>
          </div>
          <div className="form-actions">
            <Button type="submit" variant="outline" disabled={busy}>
              Save BMDC check
            </Button>
          </div>
        </>
      ) : (
        <p className="privacy-note">There is no BMDC registration certificate to check yet.</p>
      )}
    </form>
  );
}

/** Approve, ask for changes or reject a submitted application. A note is required except to approve. */
function DecisionPanel({ doctor, onDecide }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const status = doctor.application?.status;
  const matched = doctor.application?.bmdcCheck?.result === BMDC_CHECK.MATCHED;
  const submitted = status === ONBOARDING_STATUS.SUBMITTED;
  const hasNote = note.trim().length >= 5;

  const decide = async (decision) => {
    setBusy(true);
    const done = await onDecide(doctor, decision, note.trim());
    setBusy(false);
    if (done) setNote("");
  };

  return (
    <div className="review-panel">
      <div className="review-panel-heading">
        <strong>Decision</strong>
      </div>
      <div className="form-grid">
        <Field
          label="Message to the doctor"
          hint="Required to ask for changes or to reject. Sent by email and shown on their application."
          className="field-wide"
        >
          <textarea
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={2000}
          />
        </Field>
      </div>
      {submitted && !matched && <Notice>Approving needs a matched BMDC check. Record it above first.</Notice>}
      <div className="form-actions">
        {submitted && (
          <Button variant="outline" disabled={busy || !hasNote} onClick={() => decide("changes")}>
            Request changes
          </Button>
        )}
        <Button variant="outline" disabled={busy || !hasNote} onClick={() => decide("reject")}>
          <X size={14} /> Reject
        </Button>
        {submitted && (
          <Button disabled={busy || !matched} onClick={() => decide("approve")}>
            <Check size={14} /> Approve
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * One doctor on the Verification screen: their application, certificates, the BMDC check and the
 * decision. Approved doctors keep the older verify / suspend switch.
 */
export default function ApplicationReviewCard({
  doctor,
  onCheck,
  onDecide,
  onResend,
  onUpload,
  onVerification,
}) {
  const [adding, setAdding] = useState(false);
  const application = doctor.application ?? {};
  const status = application.status ?? ONBOARDING_STATUS.APPROVED;
  const reviewing = [ONBOARDING_STATUS.SUBMITTED, ONBOARDING_STATUS.CHANGES_REQUESTED].includes(status);
  const invitationLink =
    doctor.simulatedInvitationToken && `#${PATHS.doctorInvitation}?token=${doctor.simulatedInvitationToken}`;

  return (
    <article className="verification-card application-card surface">
      <Avatar src={doctor.image} name={doctor.name} />
      <div>
        <span className="eyebrow">{doctor.email ?? "DOCTOR APPLICATION"}</span>
        <h3>{doctor.name}</h3>
        <p>
          {doctor.specialty} · {doctor.experienceYears} years · {doctor.qualifications.join(", ")}
        </p>
        <p>
          {status === ONBOARDING_STATUS.INVITED && application.invitationExpiresAt
            ? `Invitation link valid until ${formatDay(application.invitationExpiresAt)}`
            : application.submittedAt
              ? `Submitted ${formatDay(application.submittedAt)}`
              : application.emailVerified === false
                ? "Email not confirmed yet"
                : ""}
          {application.note && status !== ONBOARDING_STATUS.APPROVED
            ? ` · Last message: “${application.note}”`
            : ""}
        </p>
      </div>
      <StatusPill status={status} label={ONBOARDING_STATUS_LABELS[status]} />

      <div className="application-card-body">
        <CertificateFiles files={doctor.certificateFiles ?? []} />
        {status !== ONBOARDING_STATUS.APPROVED && <BmdcCheckPanel doctor={doctor} onCheck={onCheck} />}
        {reviewing && <DecisionPanel doctor={doctor} onDecide={onDecide} />}

        {status === ONBOARDING_STATUS.INVITED && (
          <div className="form-actions">
            {isDemoMode && invitationLink && (
              <a className="button button-outline" href={invitationLink}>
                Open invitation (demo)
              </a>
            )}
            <Button variant="outline" onClick={() => onResend(doctor)}>
              <Mail size={14} /> Resend invitation
            </Button>
          </div>
        )}

        {status !== ONBOARDING_STATUS.APPROVED &&
          (adding ? (
            <CertificateUpload
              onUpload={async (file, kind) => {
                if (await onUpload(doctor, file, kind)) setAdding(false);
              }}
            />
          ) : (
            <div className="form-actions">
              <Button variant="outline" onClick={() => setAdding(true)}>
                <Send size={14} /> Add a certificate for this doctor
              </Button>
            </div>
          ))}

        {status === ONBOARDING_STATUS.APPROVED && (
          <div className="verification-actions">
            <ReviewActions doctor={doctor} onDecide={onVerification} />
          </div>
        )}
      </div>
    </article>
  );
}
