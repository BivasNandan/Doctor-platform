import { ShieldCheck } from "lucide-react";
import { isDemoMode } from "../../../config/env.js";
import { Avatar } from "../../../components/ui";
import MessageComposer from "./MessageComposer.jsx";

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
export default function ChatThread({
  conversation,
  messages,
  loading,
  error,
  onError,
  onSend,
  onSendAttachment,
}) {
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
