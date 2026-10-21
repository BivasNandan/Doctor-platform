/**
 * Live updates: every signed-in browser keeps one Server-Sent Events connection open, and the API
 * pushes a small event the moment something happens (a message, a notification, a read receipt).
 * The page then reloads just that piece of data, so people see changes instantly without polling.
 *
 * The registry lives in this process's memory, which is right for a single server. Running several
 * servers would need a shared channel (for example Redis) behind `publish`.
 */
const MAX_CONNECTIONS_PER_USER = 5;
const clients = new Map(); // userId -> Set of open responses

/** Registers an open event stream for a user; returns the function that removes it. */
export function subscribe(userId, response) {
  const open = clients.get(userId) ?? new Set();
  while (open.size >= MAX_CONNECTIONS_PER_USER) {
    const oldest = open.values().next().value;
    open.delete(oldest);
    oldest.end(); // a forgotten tab must not use up the connections
  }
  open.add(response);
  clients.set(userId, open);
  return () => {
    open.delete(response);
    if (!open.size) clients.delete(userId);
  };
}

/** Pushes `{ type, ...data }` to every open connection of the given users. Never throws. */
export function publish(userIds, event) {
  const frame = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
  for (const userId of new Set([userIds].flat().filter(Boolean))) {
    for (const response of clients.get(userId) ?? []) {
      try {
        response.write(frame);
      } catch {
        // the connection is already gone; its close handler removes it
      }
    }
  }
}

export const connectionCount = (userId) => clients.get(userId)?.size ?? 0;
