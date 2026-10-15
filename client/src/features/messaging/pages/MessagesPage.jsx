import { useEffect, useState } from "react";
import { useResource } from "../../../hooks/useResource.js";
import { messagingService } from "../../../services/index.js";
import { SectionHeading } from "../../../components/ui";
import ChatThread from "../components/ChatThread.jsx";
import ConversationList from "../components/ConversationList.jsx";

export default function MessagesPage() {
  const conversations = useResource(() => messagingService.listConversations(), []);
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");

  const items = conversations.data ?? [];
  const activeId = selectedId || items[0]?.id || "";
  const current = items.find((item) => item.id === activeId);

  const thread = useResource(() => messagingService.listMessages(activeId), [activeId], {
    enabled: Boolean(activeId),
  });

  // Surface load failures in the same banner as send failures.
  useEffect(() => {
    setError(thread.error?.message ?? conversations.error?.message ?? "");
  }, [thread.error, conversations.error, activeId]);

  const append = (message) => message && thread.setData((list) => [...(list ?? []), message]);

  return (
    <>
      <SectionHeading
        eyebrow="A THOUGHTFUL FOLLOW-UP"
        title={
          <>
            A little more <em>conversation.</em>
          </>
        }
        description="Patient-to-doctor messaging requires an accepted appointment. Delivery depends on connected messaging services."
      />
      <div className="chat-panel surface">
        <ConversationList
          conversations={items}
          activeId={activeId}
          loading={conversations.loading && !conversations.data}
          onSelect={setSelectedId}
        />
        <ChatThread
          conversation={current}
          messages={thread.data ?? []}
          loading={thread.loading}
          error={error}
          onError={setError}
          onSend={async (text) => append(await messagingService.sendMessage(activeId, text))}
          onSendAttachment={async (file) => append(await messagingService.sendAttachment(activeId, file))}
        />
      </div>
    </>
  );
}
