import { subscribe } from "../services/realtime.js";

const HEARTBEAT_MS = 20_000;

/**
 * GET /events: the live-update stream for the signed-in person. It stays open; the API writes an
 * event line whenever something they care about changes (see services/realtime.js).
 */
export const streamEvents = (request, response) => {
  response.set({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // tell reverse proxies not to hold the events back
  });
  response.flushHeaders();
  response.write("retry: 3000\n\n");
  response.write(`event: ready\ndata: ${JSON.stringify({ type: "ready" })}\n\n`);

  const unsubscribe = subscribe(request.user.id, response);
  // A comment line every few seconds keeps proxies and browsers from closing an idle stream.
  const heartbeat = setInterval(() => response.write(": ping\n\n"), HEARTBEAT_MS);
  const cleanup = () => {
    clearInterval(heartbeat);
    unsubscribe();
  };
  request.on("close", cleanup);
  response.on("close", cleanup);
};
