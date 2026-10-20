import { CircleCheck } from "lucide-react";
import { useState } from "react";
import { EmptyState, ErrorState, PageLoader, SectionHeading, Tabs } from "../../components/ui.jsx";
import { useAction, useConfirm } from "../../context.jsx";
import { useResource } from "../../hooks.js";
import { adminService } from "../../services/index.js";
import DeactivationRequestCard from "./components/DeactivationRequestCard.jsx";

const FILTERS = [
  { key: "open", label: "Needs review" },
  { key: "approved", label: "Approved" },
  { key: "declined", label: "Declined" },
];

export default function DeactivationRequestsPage() {
  const run = useAction();
  const confirm = useConfirm();
  const [filter, setFilter] = useState("open");
  const requests = useResource(() => adminService.listDeactivationRequests(filter), [filter]);
  const rows = requests.data ?? [];

  const decide = async (request, decision) => {
    const approving = decision === "approve";
    const accepted = await confirm({
      title: approving ? "Approve account deactivation?" : "Decline deactivation request?",
      message: approving
        ? `${request.doctorName} will lose account access and their profile will be removed from the directory.`
        : `${request.doctorName} will keep an active account and profile.`,
      confirmLabel: approving ? "Approve deactivation" : "Decline request",
    });
    if (!accepted) return;
    const updated = await run(() => adminService.decideDeactivationRequest(request.id, decision), {
      success: approving ? "Account deactivation approved." : "Deactivation request declined.",
    });
    if (updated) requests.setData((items) => items.filter((item) => item.id !== updated.id));
  };

  return (
    <>
      <SectionHeading
        eyebrow="DOCTOR ACCOUNT REVIEW"
        title={
          <>
            Deactivation, reviewed with <em>care.</em>
          </>
        }
        description="Review each doctor’s request before changing access to their account and public profile."
      />
      <Tabs tabs={FILTERS} value={filter} onChange={setFilter} label="Filter deactivation requests" />
      {requests.error && !requests.data ? (
        <ErrorState error={requests.error} onRetry={requests.reload} />
      ) : !requests.data ? (
        <PageLoader label="Loading deactivation requests…" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={CircleCheck}
          title={filter === "open" ? "You’re all caught up" : `No ${filter} requests`}
          description={
            filter === "open"
              ? "There are no doctor account requests waiting for review."
              : "Requests with this decision will appear here."
          }
        />
      ) : (
        <div className="verification-list">
          {rows.map((request) => (
            <DeactivationRequestCard key={request.id} request={request} onDecision={decide} />
          ))}
        </div>
      )}
    </>
  );
}
