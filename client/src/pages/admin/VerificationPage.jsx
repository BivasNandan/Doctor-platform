import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import ApplicationReviewCard from "../../components/admin/ApplicationReviewCard.jsx";
import { ErrorState, PageLoader, SectionHeading, Tabs } from "../../components/ui/index.js";
import { ONBOARDING_STATUS } from "../../constants.js";
import { useAction } from "../../hooks/useAction.js";
import { useResource } from "../../hooks/useResource.js";
import { adminService } from "../../services/index.js";

const { INVITED, IN_PROGRESS, SUBMITTED, CHANGES_REQUESTED, REJECTED, APPROVED } = ONBOARDING_STATUS;

const TABS = [
  { key: "review", label: "Needs review", statuses: [SUBMITTED] },
  { key: "progress", label: "In progress", statuses: [INVITED, IN_PROGRESS, CHANGES_REQUESTED] },
  { key: "decided", label: "Decided", statuses: [APPROVED, REJECTED] },
  { key: "all", label: "All doctors" },
];

const DECISIONS = {
  approve: [(doctor) => adminService.approveApplication(doctor.id), (doctor) => `${doctor.name} approved.`],
  changes: [
    (doctor, note) => adminService.requestApplicationChanges(doctor.id, note),
    (doctor) => `Changes requested from ${doctor.name}.`,
  ],
  reject: [
    (doctor, note) => adminService.rejectApplication(doctor.id, note),
    (doctor) => `${doctor.name}'s application was rejected.`,
  ],
};

export default function VerificationPage() {
  const run = useAction();
  const doctors = useResource(() => adminService.listDoctors(), []);
  const [tab, setTab] = useState("review");

  // Some endpoints return the plain doctor without review details: keep what we already had.
  const merge = (updated) => {
    if (updated)
      doctors.setData((items) =>
        items.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
      );
    return Boolean(updated);
  };

  const check = async (doctor, input) =>
    merge(await run(() => adminService.recordBmdcCheck(doctor.id, input), { success: "BMDC check saved." }));

  const decide = async (doctor, decision, note) => {
    const [action, message] = DECISIONS[decision];
    return merge(await run(() => action(doctor, note), { success: () => message(doctor) }));
  };

  const resend = async (doctor) =>
    merge(
      await run(() => adminService.resendInvitation(doctor.id), {
        success: `A new invitation link was sent to ${doctor.email ?? doctor.name}.`,
      }),
    );

  // Errors are thrown on purpose: the upload form shows them.
  const upload = async (doctor, file, kind) =>
    merge(await adminService.uploadDoctorCertificate(doctor.id, file, kind));

  const verify = async (doctor, status) =>
    merge(
      await run(() => adminService.setVerification(doctor.id, status), {
        success: () => `${doctor.name} ${status}.`,
      }),
    );

  const statuses = TABS.find((item) => item.key === tab)?.statuses;
  const list = (doctors.data ?? []).filter(
    (doctor) => !statuses || statuses.includes(doctor.application?.status ?? APPROVED),
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
        description="Check each doctor’s BMDC registration certificate against the BMDC register before approving them."
      />
      <div className="verification-banner">
        <span>
          <ShieldCheck size={20} />
        </span>
        <p>
          BMDC has no automatic check: open the certificate, search the BMDC register for the same
          registration number, and record what you found. Approval needs a matched check, and every check and
          decision is recorded with your name.
        </p>
      </div>
      <Tabs tabs={TABS} value={tab} onChange={setTab} label="Filter applications" />
      {doctors.error && !doctors.data ? (
        <ErrorState error={doctors.error} onRetry={doctors.reload} />
      ) : !doctors.data ? (
        <PageLoader />
      ) : (
        <div className="verification-list">
          {list.map((doctor) => (
            <ApplicationReviewCard
              key={doctor.id}
              doctor={doctor}
              onCheck={check}
              onDecide={decide}
              onResend={resend}
              onUpload={upload}
              onVerification={verify}
            />
          ))}
          {!list.length && <p className="privacy-note">No applications in this view.</p>}
        </div>
      )}
    </>
  );
}
