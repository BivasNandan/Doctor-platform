import { useEffect, useState } from "react";
import ChatThread from "../components/messaging/ChatThread.jsx";
import ConversationList from "../components/messaging/ConversationList.jsx";
import { SectionHeading } from "../components/ui/index.js";
import { ROLES } from "../constants.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useRealtime, useRealtimeEvent } from "../context/RealtimeContext.jsx";
import { useResource } from "../hooks/useResource.js";
import { messagingService } from "../services/index.js";

// How often the page quietly checks for new conversations and new messages (paused in hidden tabs).
const CONVERSATIONS_REFRESH_MS = 8_000;

const MESSAGES_REFRESH_MS = 4_000;

// While the live connection is up, new messages arrive as events and polling only guards against a missed one.
const LIVE_REFRESH_MS = 30_000;

/** The list with `message` added once (a pushed copy and the send response can both arrive). */
const withMessage = (list, message) =>
  (list ?? []).some((item) => item.id === message.id) ? list : [...(list ?? []), message];

export default function MessagesPage() {
  const { user } = useAuth();
  const { connected } = useRealtime();
  const conversations = useResource(() => messagingService.listConversations(), [], {
    refreshMs: connected ? LIVE_REFRESH_MS : CONVERSATIONS_REFRESH_MS,
  });
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");

  const items = conversations.data ?? [];
  const activeId = selectedId || items[0]?.id || "";
  const current = items.find((item) => item.id === activeId);

  const thread = useResource(() => messagingService.listMessages(activeId), [activeId], {
    enabled: Boolean(activeId),
    refreshMs: connected ? LIVE_REFRESH_MS : MESSAGES_REFRESH_MS,
  });
  // A new message, a read receipt or a new conversation: update the list, and the open thread if it is concerned.
  useRealtimeEvent(["message", "read", "conversation"], (event) => {
    conversations.refresh();
    if (!activeId || event.type === "conversation" || event.conversationId !== activeId) return;
    // Show a pushed message at once; the refresh below confirms it and marks it read (the conversation is open).
    if (event.type === "message" && event.message) thread.setData((list) => withMessage(list, event.message));
    // The other side opened the conversation: flip "Sent" to "Read" without waiting for the server.
    if (event.type === "read" && event.readerRole !== user.role)
      thread.setData((list) =>
        (list ?? []).map((item) =>
          item.isMine && !item.readAt ? { ...item, readAt: new Date().toISOString() } : item,
        ),
      );
    thread.refresh();
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

  const append = (message) => message && thread.setData((list) => withMessage(list, message));

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
