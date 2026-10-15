import { http, segment } from "../http/httpClient.js";

const scope = (admin) => (admin ? "/admin" : "/doctor");

/**
 * Availability slots. Doctors manage their own schedule; administrators pass
 * `{ admin: true }` and an explicit doctor id.
 */
export const availabilityService = {
  list: (doctorId, { admin = false } = {}) =>
    http.get(`${scope(admin)}/availability`, {
      query: admin ? { doctorId } : undefined,
    }),
  save: (doctorId, slot, { admin = false } = {}) =>
    http.post(`${scope(admin)}/availability`, admin ? { ...slot, doctorId } : slot),
  update: (id, input, { admin = false } = {}) =>
    http.patch(`${scope(admin)}/availability/${segment(id)}`, input),
  remove: (id, { admin = false } = {}) => http.delete(`${scope(admin)}/availability/${segment(id)}`),
};
