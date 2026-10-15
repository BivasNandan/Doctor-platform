import { ROLES } from "../../../constants/roles.js";
import { Avatar } from "../../../components/ui";

function describe(conversation) {
  if (conversation.participantRole === ROLES.ADMIN) return "Doctor-to-admin conversation";
  return conversation.canMessage
    ? "Eligible after accepted appointment"
    : "Messaging unavailable until appointment accepted";
}

/**
 * @param {{conversations: object[], activeId: string, loading: boolean, onSelect: (id: string) => void}} props
 */
export default function ConversationList({ conversations, activeId, loading, onSelect }) {
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
