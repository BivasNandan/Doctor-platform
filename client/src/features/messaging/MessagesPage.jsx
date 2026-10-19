import { ArrowRight, Plus, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar, SectionHeading } from "../../components/ui.jsx";
import { ATTACHMENT_ACCEPT, isDemoMode, MESSAGE_MAX_LENGTH, ROLES } from "../../constants.js";
import { useResource } from "../../hooks.js";
import { messagingService } from "../../services/index.js";
import { validateAttachment } from "../../utils.js";

// ─── MessagesPage ──────────────────────────────────────────────────────────────────────────

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

// ─── ConversationList ──────────────────────────────────────────────────────────────────────

function describe(conversation) {
  if (conversation.participantRole === ROLES.ADMIN) return "Doctor-to-admin conversation";
  return conversation.canMessage
    ? "Eligible after accepted appointment"
    : "Messaging unavailable until appointment accepted";
}

/**
 * @param {{conversations: object[], activeId: string, loading: boolean, onSelect: (id: string) => void}} props
 */
function ConversationList({ conversations, activeId, loading, onSelect }) {
  return (
    <aside className="chat-contacts" aria-label="Conversations">
      <div className="chat-contact-head">
        <strong>Conversations</strong>
        <span>{conversations.length}</span>
      </div>
      {loading ? (
        <div className="chat-loading">Loading conversations…</div>
      ) : !conversations.length ? (
        <div className="chat-loading">
          No conversations yet. A thread opens here once a doctor accepts your appointment request.
        </div>
      ) : (
        conversations.map((item) => (
          <button
            type="button"
            className={`chat-contact ${activeId === item.id ? "active" : ""}`}
            key={item.id}
            aria-label={`Open conversation with ${item.participantName}`}
            aria-current={activeId === item.id}
            onClick={() => onSelect(item.id)}
          >
            <Avatar src={item.participantImage} name={item.participantName} />
            <span>
              <strong>{item.participantName}</strong>
              <small>{describe(item)}</small>
            </span>
            <small>{item.updatedAt}</small>
          </button>
        ))
      )}
    </aside>
  );
}

// ─── ChatThread ────────────────────────────────────────────────────────────────────────────

function presenceLabel(conversation) {
  if (conversation?.online === true) return "Online · status supplied by service";
  if (conversation?.online === false) return "Offline · status supplied by service";
  return conversation?.canMessage
    ? "Eligible conversation · presence not supplied"
    : "Appointment acceptance required";
}

/**
 * Header, message list and composer for one conversation.
 * @param {{conversation?: object, messages: object[], loading: boolean, error: string,
 *   onError: (message: string) => void, onSend: (text: string) => Promise<void>,
 *   onSendAttachment: (file: File) => Promise<void>}} props
 */
function ChatThread({ conversation, messages, loading, error, onError, onSend, onSendAttachment }) {
  return (
    <section className="chat-conversation">
      <header>
        {conversation && <Avatar src={conversation.participantImage} name={conversation.participantName} />}
        <span>
          <strong>{conversation?.participantName || "Choose a conversation"}</strong>
          <small>{presenceLabel(conversation)}</small>
        </span>
      </header>
      <div className="chat-notice">
        <ShieldCheck size={14} /> Do not use this service for urgent medical concerns.
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="message-list" aria-live="polite">
        {messages.map((message) => (
          <div className={`message-bubble ${message.isMine ? "outgoing" : ""}`} key={message.id}>
            {message.body}
            {message.attachmentUrl && (
              <a href={message.attachmentUrl} target="_blank" rel="noreferrer">
                {message.attachmentName || "Open attachment"}
              </a>
            )}
            <small>
              {message.sentAt}
              {message.simulated ? " · simulated" : ""}
              {message.readAt ? ` · read ${message.readAt}` : ""}
            </small>
          </div>
        ))}
        {!messages.length && !loading && (
          <div className="table-empty">
            {conversation ? "No message history available." : "Choose a conversation."}
          </div>
        )}
      </div>
      <MessageComposer
        disabled={!conversation?.canMessage}
        onSend={onSend}
        onSendAttachment={onSendAttachment}
        onError={onError}
      />
      {isDemoMode && (
        <small className="demo-caption">
          Demo messages are local simulations; no real delivery or read receipts.
        </small>
      )}
    </section>
  );
}

// ─── MessageComposer ───────────────────────────────────────────────────────────────────────

/**
 * Text box, attachment picker and send button.
 * `onSend(text)` / `onSendAttachment(file)` return promises; `onError(message)` reports problems.
 */
function MessageComposer({ disabled, onSend, onSendAttachment, onError }) {
  const [draft, setDraft] = useState("");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!file?.type.startsWith("image/")) {
      setPreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const run = async (action) => {
    setSending(true);
    onError("");
    try {
      await action();
    } catch (error) {
      onError(error.message || "Message was not sent.");
    } finally {
      setSending(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    run(async () => {
      await onSend(text);
      setDraft("");
    });
  };

  const pick = (event) => {
    const chosen = event.target.files?.[0];
    event.target.value = "";
    if (!chosen) return;
    const problem = validateAttachment(chosen);
    if (problem) onError(problem);
    else {
      onError("");
      setFile(chosen);
    }
  };

  const sendFile = () =>
    run(async () => {
      await onSendAttachment(file);
      setFile(null);
    });

  return (
    <>
      {file && (
        <div className="attachment-preview" role="status">
          {previewUrl && <img src={previewUrl} alt="Selected attachment preview" />}
          <span>
            {file.name} · {(file.size / 1024).toFixed(0)} KB
          </span>
          <button type="button" onClick={() => setFile(null)}>
            Remove
          </button>
          <button type="button" disabled={sending} onClick={sendFile}>
            {sending ? "Uploading…" : "Send attachment"}
          </button>
        </div>
      )}
      <form className="message-compose" onSubmit={submit}>
        <input
          placeholder="Write a message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          aria-label="Message"
          maxLength={MESSAGE_MAX_LENGTH}
          disabled={disabled || sending}
        />
        <label className="icon-button" aria-label="Choose attachment" title="Choose attachment">
          <Plus size={16} />
          <input
            type="file"
            accept={ATTACHMENT_ACCEPT}
            onChange={pick}
            disabled={disabled}
            className="sr-only"
          />
        </label>
        <button type="submit" aria-label="Send message" disabled={disabled || sending || !draft.trim()}>
          <ArrowRight size={17} />
        </button>
      </form>
    </>
  );
}
