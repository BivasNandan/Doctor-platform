import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { config } from "../constants.js";
import { useAuth } from "./AuthContext.jsx";

const RealtimeContext = createContext({ connected: false, subscribe: () => () => undefined });

const EVENT_TYPES = ["message", "read", "notification", "conversation"];

/**
 * Keeps one Server-Sent Events connection open for the signed-in person and hands each event
 * (`message`, `read`, `notification`, `conversation`) to whoever subscribed. The browser reconnects
 * by itself; pages that use `useLiveRefresh` fall back to their normal polling while it is down.
 * Demo mode and browsers without EventSource simply stay "not connected".
 */
export function RealtimeProvider({ children }) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const listeners = useRef(new Set());
  const userId = user?.id;

  useEffect(() => {
    if (!userId || config.dataMode !== "api" || typeof EventSource === "undefined") return undefined;
    const source = new EventSource(`${config.apiBaseUrl}/events`, {
      withCredentials: config.sendCredentials,
    });
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    const deliver = (message) => {
      let event;
      try {
        event = JSON.parse(message.data);
      } catch {
        return;
      }
      listeners.current.forEach((listener) => listener(event));
    };
    EVENT_TYPES.forEach((type) => source.addEventListener(type, deliver));
    return () => {
      source.close();
      setConnected(false);
    };
  }, [userId]);

  const subscribe = useCallback((listener) => {
    listeners.current.add(listener);
    return () => listeners.current.delete(listener);
  }, []);
  const value = useMemo(() => ({ connected, subscribe }), [connected, subscribe]);
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export const useRealtime = () => useContext(RealtimeContext);

/**
 * Calls `handler(event)` for live events of the given types.
 * @param {string[]} types
 * @param {(event: {type: string, conversationId?: string}) => void} handler
 */
export function useRealtimeEvent(types, handler) {
  const { subscribe } = useRealtime();
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });
  const key = types.join(",");
  useEffect(
    () =>
      subscribe((event) => {
        if (key.split(",").includes(event.type)) handlerRef.current(event);
      }),
    [subscribe, key],
  );
}
