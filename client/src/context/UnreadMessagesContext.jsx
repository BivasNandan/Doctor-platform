import { createContext, useContext, useMemo } from "react";
import { useResource } from "../hooks/useResource.js";
import { messagingService } from "../services/index.js";
import { useAuth } from "./AuthContext.jsx";
import { useRealtime, useRealtimeEvent } from "./RealtimeContext.jsx";

// Live events update the count at once; polling is the safety net (and the fallback when offline).
const UNREAD_REFRESH_MS = 15_000;
const UNREAD_LIVE_REFRESH_MS = 60_000;

const UnreadMessagesContext = createContext({ count: 0, refresh: () => undefined });

/**
 * How many messages are waiting for the signed-in person, for the badge next to "Messages".
 * One shared count, so the sidebar, the mobile menu and the bottom bar never poll separately.
 */
export function UnreadMessagesProvider({ children }) {
  const { user } = useAuth();
  const { connected } = useRealtime();
  const unread = useResource(() => messagingService.unreadCount(), [user?.id], {
    enabled: Boolean(user),
    refreshMs: connected ? UNREAD_LIVE_REFRESH_MS : UNREAD_REFRESH_MS,
  });
  const { refresh } = unread;
  // A new message, a read receipt or a new conversation changes the count.
  useRealtimeEvent(["message", "read", "conversation"], () => {
    if (user) refresh();
  });

  const count = user ? (unread.data?.count ?? 0) : 0;
  const value = useMemo(() => ({ count, refresh }), [count, refresh]);
  return <UnreadMessagesContext.Provider value={value}>{children}</UnreadMessagesContext.Provider>;
}

export const useUnreadMessages = () => useContext(UnreadMessagesContext);
