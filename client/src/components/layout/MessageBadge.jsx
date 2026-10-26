import { useUnreadMessages } from "../../context/UnreadMessagesContext.jsx";

/** Unread-message counter shown next to "Messages" (nothing when there are none). */
export default function MessageBadge({ className = "" }) {
  const { count } = useUnreadMessages();
  if (!count) return null;
  return (
    <span
      className={`nav-badge ${className}`.trim()}
      aria-label={`${count} unread ${count === 1 ? "message" : "messages"}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
