import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../config/env.js", () => ({
  config: { dataMode: "api", apiBaseUrl: "/api/v1", sendCredentials: true },
  isDemoMode: false,
}));

// The shared test setup already loaded the real client; load a fresh copy that sees the mock.
vi.resetModules();
const { ApiError, http, request, setUnauthorizedHandler } = await import("./httpClient.js");

const respond = (status, body) =>
  Promise.resolve({ status, ok: status >= 200 && status < 300, json: () => Promise.resolve(body) });

describe("httpClient", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
    setUnauthorizedHandler(null);
  });
  afterEach(() => vi.restoreAllMocks());

  it("drops empty query values and sends cookies", async () => {
    fetch.mockReturnValue(respond(200, []));
    await http.get("/doctors", {
      query: { query: "", specialty: "cardiology", verified: false, maxFee: 1500 },
    });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe("/api/v1/doctors?specialty=cardiology&maxFee=1500");
    expect(options.credentials).toBe("include");
    expect(options.method).toBe("GET");
  });

  it("sends JSON bodies with a content type", async () => {
    fetch.mockReturnValue(respond(201, { id: "1" }));
    await http.post("/appointment-requests", { doctorId: "d1" });
    const [, options] = fetch.mock.calls[0];
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(options.body).toBe('{"doctorId":"d1"}');
  });

  it("leaves multipart bodies to the browser", async () => {
    fetch.mockReturnValue(respond(201, {}));
    const form = new FormData();
    form.append("file", new Blob(["x"]), "x.txt");
    await http.post("/conversations/c1/attachments", form);
    const [, options] = fetch.mock.calls[0];
    expect(options.headers["Content-Type"]).toBeUndefined();
    expect(options.body).toBe(form);
  });

  it("returns null for 204 responses", async () => {
    fetch.mockReturnValue(Promise.resolve({ status: 204, ok: true }));
    await expect(http.delete("/doctor/availability/s1")).resolves.toBeNull();
  });

  it("surfaces server error codes, messages and field details", async () => {
    fetch.mockReturnValue(
      respond(409, { code: "APPOINTMENT_CONFLICT", message: "This time is no longer available." }),
    );
    const error = await request("/appointment-requests", { method: "POST", body: {} }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 409,
      code: "APPOINTMENT_CONFLICT",
      message: "This time is no longer available.",
    });

    fetch.mockReturnValue(
      respond(422, { code: "VALIDATION_FAILED", message: "Invalid", details: { email: "Required" } }),
    );
    const invalid = await http.post("/x", {}).catch((e) => e);
    expect(invalid.details).toEqual({ email: "Required" });
  });

  it("falls back to friendly messages when the body has none", async () => {
    fetch.mockReturnValue(respond(403, null));
    await expect(http.get("/admin/doctors")).rejects.toThrow(/permission/);
    fetch.mockReturnValue(respond(500, null));
    await expect(http.get("/doctors")).rejects.toThrow("Request failed (500).");
  });

  it("notifies the app when a protected request returns 401", async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    fetch.mockReturnValue(respond(401, null));
    await expect(http.get("/doctor/profile")).rejects.toThrow(/session has expired/);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("treats a 401 from login or session restore as a normal answer", async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    fetch.mockReturnValue(respond(401, { code: "INVALID_CREDENTIALS", message: "Wrong email or password." }));
    await expect(http.post("/auth/login", {})).rejects.toThrow("Wrong email or password.");
    await expect(http.get("/auth/me")).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("reports network failures with a stable code", async () => {
    fetch.mockRejectedValue(new TypeError("Failed to fetch"));
    const error = await http.get("/doctors").catch((e) => e);
    expect(error).toMatchObject({ code: "NETWORK_ERROR" });
  });
});
