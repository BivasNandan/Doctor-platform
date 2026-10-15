/**
 * The only module that reads build-time environment variables.
 * Everything here is shipped to the browser: never put secrets in VITE_* variables.
 */
const env = import.meta.env;

export const config = Object.freeze({
  /** "demo" = in-memory fictional data, "api" = real HTTP backend. */
  dataMode: env.VITE_CAREWELL_DATA_MODE === "api" ? "api" : "demo",
  /** Base URL of the REST API, without a trailing slash (e.g. "/api/v1"). */
  apiBaseUrl: (env.VITE_API_BASE_URL ?? "").replace(/\/$/, ""),
  /** Send cookies with API requests (required for cookie-based sessions). */
  sendCredentials: env.VITE_API_SEND_CREDENTIALS !== "false",
});

export const isDemoMode = config.dataMode === "demo";
