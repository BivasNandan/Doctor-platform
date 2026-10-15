import { useState } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { VERIFICATION_STATUS } from "../../../constants/statuses.js";
import { useAction } from "../../../hooks/useAction.js";
import { useResource } from "../../../hooks/useResource.js";
import { adminService } from "../../../services/index.js";
import { Avatar, Button, ErrorState, PageLoader, Pill, SectionHeading, Tabs } from "../../../components/ui";

const TABS = [
  { key: "all", label: "All applications" },
  { key: "pending", label: "Needs review" },
  { key: "reviewed", label: "Reviewed" },
];

const PILL = {
  verified: ["verified", "Reviewed"],
  rejected: ["error", "Changes requested"],
  suspended: ["error", "Suspended"],
  pending: ["pending", "Needs review"],
};

function ReviewActions({ doctor, onDecide }) {
  const { PENDING, VERIFIED, REJECTED, SUSPENDED } = VERIFICATION_STATUS;
  switch (doctor.verificationStatus) {
    case PENDING:
      return (
        <>
          <Button variant="outline" onClick={() => onDecide(doctor, REJECTED)}>
            Request changes
          </Button>
          <Button onClick={() => onDecide(doctor, VERIFIED)}>
            <Check size={15} /> Approve
          </Button>
        </>
      );
    case VERIFIED:
      return (
        <Button variant="outline" onClick={() => onDecide(doctor, SUSPENDED)}>
          Suspend verification
        </Button>
      );
    case SUSPENDED:
      return <Button onClick={() => onDecide(doctor, VERIFIED)}>Restore verification</Button>;
    default:
      return (
        <Button variant="outline" onClick={() => onDecide(doctor, PENDING)}>
          Reopen review
        </Button>
      );
  }
}

export default function VerificationPage() {
  const run = useAction();
  const doctors = useResource(() => adminService.listDoctors(), []);
  const [tab, setTab] = useState("all");

  const decide = async (doctor, status) => {
    const updated = await run(() => adminService.setVerification(doctor.id, status), {
      success: () => `${doctor.name} ${status}.`,
    });
    if (updated) doctors.setData((items) => items.map((item) => (item.id === updated.id ? updated : item)));
  };

  const list = (doctors.data ?? []).filter(
    (doctor) =>
      tab === "all" ||
      (tab === "pending" ? doctor.verificationStatus === "pending" : doctor.verificationStatus !== "pending"),
  );

  return (
    <>
      <SectionHeading
        eyebrow="A LITTLE CARE GOES A LONG WAY"
        title={
          <>
            Review with <em>confidence.</em>
          </>
        }
        description="Review professional information submitted to Carewell before it’s visible to patients."
      />
      <div className="verification-banner">
        <span>
          <ShieldCheck size={20} />
        </span>
        <p>
          Platform verification means professional information has been reviewed according to Carewell’s
          process. It does not imply government certification.
        </p>
      </div>
      <Tabs tabs={TABS} value={tab} onChange={setTab} label="Filter applications" />
      {doctors.error && !doctors.data ? (
        <ErrorState error={doctors.error} onRetry={doctors.reload} />
      ) : !doctors.data ? (
        <PageLoader />
      ) : (
        <div className="verification-list">
          {list.map((doctor) => {
            const [tone, label] = PILL[doctor.verificationStatus] ?? PILL.pending;
            return (
              <article key={doctor.id} className="verification-card surface">
                <Avatar src={doctor.image} name={doctor.name} />
                <div>
                  <span className="eyebrow">PROFESSIONAL PROFILE · {doctor.id.toUpperCase()}</span>
                  <h3>{doctor.name}</h3>
                  <p>
                    {doctor.specialty} · {doctor.experienceYears} years · {doctor.qualifications.join(", ")}
                  </p>
                  <span className="verification-doc">
                    {doctor.certificateFiles?.length
                      ? `${doctor.certificateFiles.length} certificate file(s) supplied`
                      : "Certificate metadata has not been supplied by the service."}
                  </span>
                </div>
                <Pill tone={tone}>{label}</Pill>
                <div className="verification-actions">
                  <ReviewActions doctor={doctor} onDecide={decide} />
                </div>
              </article>
            );
          })}
          {!list.length && <p className="privacy-note">No applications in this view.</p>}
        </div>
      )}
    </>
  );
}
