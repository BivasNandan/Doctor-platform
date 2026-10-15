import { http, segment } from "../http/httpClient.js";

/** Patient-facing appointment requests. */
export const appointmentService = {
  /** Requests belonging to the caller. */
  list: () => http.get("/appointments"),
  submit: (payload) => http.post("/appointment-requests", payload),
  cancel: (id) => http.patch(`/appointment-requests/${segment(id)}`, { status: "cancelled" }),
};
