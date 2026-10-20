import { useEffect, useState } from "react";
import ChatThread from "../components/messaging/ChatThread.jsx";
import ConversationList from "../components/messaging/ConversationList.jsx";
import { SectionHeading } from "../components/ui/index.js";
import { ROLES } from "../constants.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useResource } from "../hooks/useResource.js";
import { messagingService } from "../services/index.js";

// How often the page quietly checks for new conversations and new messages (paused in hidden tabs).
const CONVERSATIONS_REFRESH_MS = 8_000;

const MESSAGES_REFRESH_MS = 4_000;

export default function MessagesPage() {
  const { user } = useAuth();
  const conversations = useResource(() => messagingService.listConversations(), [], {
    refreshMs: CONVERSATIONS_REFRESH_MS,
  });
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");

  const items = conversations.data ?? [];
  const activeId = selectedId || items[0]?.id || "";
  const current = items.find((item) => item.id === activeId);

  const thread = useResource(() => messagingService.listMessages(activeId), [activeId], {
    enabled: Boolean(activeId),
    refreshMs: MESSAGES_REFRESH_MS,
  });
  // Messages of the conversation that was open a moment ago must not flash in the new one.
  const messages = (thread.data ?? []).filter((message) => message.conversationId === activeId);

  // Surface load failures in the same banner as send failures.
  useEffect(() => {
    setError(thread.error?.message ?? conversations.error?.message ?? "");
  }, [thread.error, conversations.error, activeId]);

  // Opening a conversation marks it read on the server; refresh the list so its badge goes away.
  const reloadConversations = conversations.reload;
  useEffect(() => {
    if (activeId && thread.data) reloadConversations();
  }, [activeId, thread.data?.length, reloadConversations]); // eslint-disable-line react-hooks/exhaustive-deps

  const append = (message) => message && thread.setData((list) => [...(list ?? []), message]);

  const startConversation = async (doctorId) => {
    setError("");
    try {
      const started = await messagingService.startConversation(doctorId);
      await conversations.reload();
      setSelectedId(started.id);
    } catch (err) {
      setError(err.message || "The conversation could not be opened.");
    }
  };

  return (
    <>
      <SectionHeading
        eyebrow="A THOUGHTFUL FOLLOW-UP"
        title={
          <>
            A little more <em>conversation.</em>
          </>
        }
        description={
          user?.role === ROLES.ADMIN
            ? "Message any doctor. New messages appear here automatically."
            : user?.role === ROLES.DOCTOR
              ? "Talk to your patients and to the Carewell administration. New messages appear here automatically."
              : "Message your doctor once they accept your appointment request. New messages appear here automatically."
        }
      />
      <div className="chat-panel surface">
        <ConversationList
          conversations={items}
          activeId={activeId}
          loading={conversations.loading && !conversations.data}
          onSelect={setSelectedId}
          role={user?.role}
          onStart={startConversation}
        />
        <ChatThread
          conversation={current}
          messages={messages}
          loading={thread.loading && !messages.length}
          error={error}
          onError={setError}
          onSend={async (text) => append(await messagingService.sendMessage(activeId, text))}
          onSendAttachment={async (file) => append(await messagingService.sendAttachment(activeId, file))}
        />
      </div>
    </>
  );
}
