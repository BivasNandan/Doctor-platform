import { UserRound } from "lucide-react";
import { useState } from "react";
import { Avatar, Button, Pill } from "../../../components/ui.jsx";

function formatDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function decisionLabel(status) {
  if (status === "open") return "Needs review";
  return status === "approved" ? "Approved" : "Declined";
}

export default function DeactivationRequestCard({ request, onDecision }) {
  const [busy, setBusy] = useState(false);
  const tone = request.status === "open" ? "pending" : request.status === "approved" ? "error" : "neutral";

  const decide = async (decision) => {
    setBusy(true);
    try {
      await onDecision(request, decision);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="verification-card surface review-request-card">
      <Avatar src={request.doctorImage} name={request.doctorName} alt="" />
      <div className="review-request-main">
        <div className="review-request-heading">
          <div>
            <span className="eyebrow">SUBMITTED {formatDate(request.createdAt)}</span>
            <h3>{request.doctorName}</h3>
          </div>
          <Pill tone={tone}>{decisionLabel(request.status)}</Pill>
        </div>
        {request.doctorEmail ? (
          <a className="review-request-email" href={`mailto:${request.doctorEmail}`}>
            <UserRound size={14} /> {request.doctorEmail}
          </a>
        ) : (
          <span className="review-request-email">Doctor email unavailable</span>
        )}
        <p className="review-request-reason">{request.reason}</p>
      </div>
      {request.status === "open" && (
        <div className="review-request-actions">
          <Button variant="outline" disabled={busy} onClick={() => decide("decline")}>
            {busy ? "Please wait…" : "Decline"}
          </Button>
          <Button disabled={busy} onClick={() => decide("approve")}>
            {busy ? "Please wait…" : "Approve deactivation"}
          </Button>
        </div>
      )}
    </article>
  );
}
