import { MessageSquareText } from "lucide-react";
import { useState } from "react";
import SupportRequestCard from "../../components/admin/SupportRequestCard.jsx";
import { EmptyState, ErrorState, PageLoader, SectionHeading, Tabs } from "../../components/ui/index.js";
import { useAction } from "../../hooks/useAction.js";
import { useResource } from "../../hooks/useResource.js";
import { adminService } from "../../services/index.js";

const FILTERS = [
  { key: "", label: "All requests" },
  { key: "received", label: "New" },
  { key: "in_progress", label: "In progress" },
  { key: "resolved", label: "Resolved" },
];

export default function SupportRequestsPage() {
  const run = useAction();
  const [filter, setFilter] = useState("");
  const requests = useResource(() => adminService.listSupportRequests(filter || undefined), [filter]);
  const rows = requests.data ?? [];

  const updateStatus = async (request, status) => {
    const updated = await run(() => adminService.updateSupportRequest(request.id, status), {
      success: `Request marked ${status.replace("_", " ")}.`,
    });
    if (updated) {
      requests.setData((items) =>
        filter && filter !== updated.status
          ? items.filter((item) => item.id !== updated.id)
          : items.map((item) => (item.id === updated.id ? updated : item)),
      );
    }
  };

  const sendReply = async (request, message) => {
    const updated = await run(() => adminService.replyToSupportRequest(request.id, { message }), {
      success: "Reply sent and request resolved.",
    });
    if (updated) {
      requests.setData((items) =>
        filter && filter !== updated.status
          ? items.filter((item) => item.id !== updated.id)
          : items.map((item) => (item.id === updated.id ? updated : item)),
      );
      return true;
    }
    return false;
  };

  return (
    <>
      <SectionHeading
        eyebrow="A HUMAN RESPONSE, WHEN IT MATTERS"
        title={
          <>
            Support, handled with <em>care.</em>
          </>
        }
        description="Review incoming questions, keep their status up to date, and reply by email."
      />
      <Tabs tabs={FILTERS} value={filter} onChange={setFilter} label="Filter support requests" />
      {requests.error && !requests.data ? (
        <ErrorState error={requests.error} onRetry={requests.reload} />
      ) : !requests.data ? (
        <PageLoader label="Loading support requests…" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={MessageSquareText}
          title="No requests in this view"
          description="New messages from the help form will appear here."
        />
      ) : (
        <div className="verification-list">
          {rows.map((request) => (
            <SupportRequestCard
              key={request.id}
              request={request}
              onStatusChange={updateStatus}
              onReply={sendReply}
            />
          ))}
        </div>
      )}
    </>
  );
}
