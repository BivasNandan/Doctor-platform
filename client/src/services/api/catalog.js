import { http, segment } from "../http/httpClient.js";

export const doctorService = {
  /** Public, published doctors matching the filters. */
  list: (filters, options) => http.get("/doctors", { query: filters, ...options }),
  get: (id) => http.get(`/doctors/${segment(id)}`),
};

export const facilityService = {
  /** Public, active clinics and hospitals. */
  list: (kind = "all") => http.get("/clinics", { query: { type: kind === "all" ? "" : kind } }),
};

export const specialtyService = {
  /** Public, active specialties. */
  list: () => http.get("/specialties"),
};

export const slotService = {
  /** Bookable times for one doctor, clinic and day. */
  listOpen: ({ doctorId, facilityId, date }) =>
    http.get(`/doctors/${segment(doctorId)}/slots`, {
      query: { facilityId, date },
    }),
};

export const supportService = {
  submit: (input) => http.post("/support-requests", input),
};
