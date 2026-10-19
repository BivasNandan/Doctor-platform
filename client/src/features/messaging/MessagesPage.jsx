import { ArrowRight, Plus, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Avatar, SectionHeading } from "../../components/ui.jsx";
import { ATTACHMENT_ACCEPT, isDemoMode, MESSAGE_MAX_LENGTH, ROLES } from "../../constants.js";
import { useAuth } from "../../context.jsx";
import { useResource } from "../../hooks.js";
import { adminService, messagingService } from "../../services/index.js";
import { formatDateTime, validateAttachment } from "../../utils.js";

// How often the page quietly checks for new conversations and new messages (paused in hidden tabs).
const CONVERSATIONS_REFRESH_MS = 8_000;
const MESSAGES_REFRESH_MS = 4_000;

// ─── MessagesPage ──────────────────────────────────────────────────────────────────────────

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

// ─── ConversationList ──────────────────────────────────────────────────────────────────────

const ROLE_LABELS = { doctor: "Doctor", patient: "Patient", admin: "Carewell administration" };

function describe(conversation) {
  const who = ROLE_LABELS[conversation.participantRole] ?? "Conversation";
  return conversation.canMessage ? who : `${who} · waiting for an accepted appointment`;
}

/** Administrators pick any doctor to start (or reopen) a conversation. */
function StartConversation({ onStart }) {
  const doctors = useResource(() => adminService.listDoctors(), []);
  const [doctorId, setDoctorId] = useState("");
  const list = doctors.data ?? [];

  return (
    <div className="chat-new">
      <label htmlFor="chat-new-doctor">
        <small>Message a doctor</small>
      </label>
      <select id="chat-new-doctor" value={doctorId} onChange={(event) => setDoctorId(event.target.value)}>
        <option value="">Choose a doctor…</option>
        {list.map((doctor) => (
          <option key={doctor.id} value={doctor.id}>
            {doctor.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="button button-outline"
        disabled={!doctorId}
        onClick={() => {
          onStart(doctorId);
          setDoctorId("");
        }}
      >
        Open conversation
      </button>
    </div>
  );
}

/**
 * @param {{conversations: object[], activeId: string, loading: boolean, onSelect: (id: string) => void,
 *   role?: string, onStart: (doctorId: string) => void}} props
 */
function ConversationList({ conversations, activeId, loading, onSelect, role, onStart }) {
  return (
    <aside className="chat-contacts" aria-label="Conversations">
      <div className="chat-contact-head">
        <strong>Conversations</strong>
        <span>{conversations.length}</span>
      </div>
      {role === ROLES.ADMIN && <StartConversation onStart={onStart} />}
      {loading ? (
        <div className="chat-loading">Loading conversations…</div>
      ) : !conversations.length ? (
        <div className="chat-loading">
          {role === ROLES.PATIENT
            ? "No conversations yet. A thread opens here once a doctor accepts your appointment request."
            : "No conversations yet."}
        </div>
      ) : (
        conversations.map((item) => (
          <button
            type="button"
            className={`chat-contact ${activeId === item.id ? "active" : ""}`}
            key={item.id}
            aria-label={`Open conversation with ${item.participantName}${item.unread ? `, ${item.unread} unread` : ""}`}
            aria-current={activeId === item.id}
            onClick={() => onSelect(item.id)}
          >
            <Avatar src={item.participantImage} name={item.participantName} />
            <span>
              <strong>{item.participantName}</strong>
              <small>{describe(item)}</small>
            </span>
            {item.unread > 0 && activeId !== item.id ? (
              <span className="chat-unread" aria-hidden="true">
                {item.unread > 99 ? "99+" : item.unread}
              </span>
            ) : (
              <small>{formatDateTime(item.updatedAt)}</small>
            )}
          </button>
        ))
      )}
    </aside>
  );
}

// ─── ChatThread ────────────────────────────────────────────────────────────────────────────

function subtitle(conversation) {
  if (!conversation) return "";
  const who = ROLE_LABELS[conversation.participantRole] ?? "";
  return conversation.canMessage ? who : `${who} · appointment acceptance required`;
}

/**
 * Header, message list and composer for one conversation. The list stays scrolled to the newest
 * message, unless you have scrolled up to read older ones.
 * @param {{conversation?: object, messages: object[], loading: boolean, error: string,
 *   onError: (message: string) => void, onSend: (text: string) => Promise<void>,
 *   onSendAttachment: (file: File) => Promise<void>}} props
 */
function ChatThread({ conversation, messages, loading, error, onError, onSend, onSendAttachment }) {
  const listRef = useRef(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    const node = listRef.current;
    if (node && stickToBottom.current) node.scrollTop = node.scrollHeight;
  }, [messages.length, conversation?.id]);

  const trackScroll = (event) => {
    const node = event.currentTarget;
    stickToBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80;
  };

  return (
    <section className="chat-conversation">
      <header>
        {conversation && <Avatar src={conversation.participantImage} name={conversation.participantName} />}
        <span>
          <strong>{conversation?.participantName || "Choose a conversation"}</strong>
          <small>{subtitle(conversation)}</small>
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
      <div className="message-list" aria-live="polite" ref={listRef} onScroll={trackScroll}>
        {messages.map((message) => (
          <div className={`message-bubble ${message.isMine ? "outgoing" : ""}`} key={message.id}>
            {message.body}
            {message.attachmentUrl && (
              <a href={message.attachmentUrl} target="_blank" rel="noreferrer">
                {message.attachmentName || "Open attachment"}
              </a>
            )}
            <small>
              {formatDateTime(message.sentAt)}
              {message.simulated ? " · simulated" : ""}
              {message.isMine && message.readAt ? " · Read" : ""}
            </small>
          </div>
        ))}
        {!messages.length && !loading && (
          <div className="table-empty">
            {conversation ? "No messages yet. Say hello!" : "Choose a conversation."}
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
