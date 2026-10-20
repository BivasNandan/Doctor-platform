import { ROLES } from "../../constants.js";
import { formatDateTime } from "../../utils/dates.js";
import { Avatar } from "../ui/index.js";
import { ROLE_LABELS } from "./roleLabels.js";
import StartConversation from "./StartConversation.jsx";

function describe(conversation) {
  const who = ROLE_LABELS[conversation.participantRole] ?? "Conversation";
  return conversation.canMessage ? who : `${who} · waiting for an accepted appointment`;
}

/**
 * @param {{conversations: object[], activeId: string, loading: boolean, onSelect: (id: string) => void,
 *   role?: string, onStart: (doctorId: string) => void}} props
 */
export default function ConversationList({ conversations, activeId, loading, onSelect, role, onStart }) {
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
