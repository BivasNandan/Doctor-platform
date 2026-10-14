import {
  doctors,
  facilities,
  specialties,
  initialAppointments,
  initialConversations,
  initialMessages,
} from "./mockData.js";

/** The UI consumes this contract in both modes. Set VITE_CAREWELL_DATA_MODE=api to use the proposed API. */
const apiBase = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const apiMode = import.meta.env.VITE_CAREWELL_DATA_MODE === "api";
async function request(path, options = {}) {
  if (!apiBase)
    throw new Error(
      "Backend is selected but VITE_API_BASE_URL is not configured.",
    );
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (response.status === 401)
    throw new Error("Your session has expired. Sign in again to continue.");
  if (response.status === 403)
    throw new Error("You do not have permission to perform this action.");
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `Request failed (${response.status}).`);
  }
  return response.status === 204 ? null : response.json();
}
const queryString = (filters) => {
  const params = new URLSearchParams();
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value !== "" && value !== false && value != null)
      params.set(key, String(value));
  });
  return params.size ? `?${params}` : "";
};
const localDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const pause = () => new Promise((resolve) => window.setTimeout(resolve, 120));
let appointments = initialAppointments.map((item) => ({
  ...item,
  status: ["confirmed", "upcoming"].includes(item.status) ? "accepted" : item.status,
}));
appointments.push({ id: "DEMO-REQ-1", doctorId: "d1", facilityId: "f1", date: "2026-10-20", time: "11:00 AM", patientName: "Demo patient", phone: "Not displayed", email: "", reason: "Fictional demo request", status: "pending", simulated: true });
let facilitiesState = [...facilities],
  specialtiesState = [...specialties],
  doctorsState = [...doctors];
let conversations = [...initialConversations, { id: "c-admin", participantId: "admin", participantRole: "admin", participantName: "Carewell administration", participantImage: "", updatedAt: "Demo", unread: 0 }],
  messages = { ...structuredClone(initialMessages), "c-admin": [{ id: "m-admin", conversationId: "c-admin", sender: "admin", body: "This is a simulated doctor-to-admin channel.", sentAt: "Demo", simulated: true }] };
let availability = [];
let activeRole = "patient";
const demo = {
  async listDoctors(filters = {}) {
    await pause();
    const search = (filters.query || "").toLowerCase();
    return doctorsState.filter((doctor) => doctor.accountStatus !== "deactivated" && !["inactive", "unpublished"].includes(doctor.publicationStatus)).filter(
      (d) =>
        (!filters.specialty || d.specialtyId === filters.specialty) &&
        (!filters.location ||
          d.location.toLowerCase().includes(filters.location.toLowerCase()) ||
          facilitiesState.some(
            (f) =>
              d.facilityIds.includes(f.id) &&
              `${f.name} ${f.area} ${f.city}`
                .toLowerCase()
                .includes(filters.location.toLowerCase()),
          )) &&
        (!filters.clinic ||
          d.facilityIds.some((id) =>
            facilitiesState
              .find((f) => f.id === id)
              ?.name.toLowerCase()
              .includes(filters.clinic.toLowerCase()),
          )) &&
        (!filters.verified || d.verificationStatus === "verified") &&
        (!filters.language ||
          d.languages.some(
            (l) => l.toLowerCase() === filters.language.toLowerCase(),
          )) &&
        (!filters.available ||
          d.availability.some((day) =>
            day.toLowerCase().includes(filters.available.toLowerCase()),
          )) &&
        (!filters.maxFee || d.fee <= Number(filters.maxFee)) &&
        (!search ||
          `${d.name} ${d.specialty} ${d.location} ${d.facilityIds.map((id) => facilitiesState.find((f) => f.id === id)?.name).join(" ")}`
            .toLowerCase()
            .includes(search)),
    );
  },
  async getDoctor(id) {
    await pause();
    return doctorsState.find((d) => d.id === id) || null;
  },
  async getOwnDoctor(id) { await pause(); return doctorsState.find((doctor) => doctor.id === id) || null; },
  async listAdminDoctors() { await pause(); return [...doctorsState]; },
  async listFacilities(kind = "all") {
    await pause();
    return kind === "all"
      ? [...facilitiesState]
      : facilitiesState.filter((f) => f.type === kind);
  },
  async listSpecialties() {
    await pause();
    return [...specialtiesState];
  },
  async listAppointments() {
    await pause();
    return [...appointments];
  },
  async cancelAppointment(id) {
    await pause();
    const appointment = appointments.find((item) => item.id === id);
    if (!appointment || !["pending", "accepted"].includes(appointment.status)) throw new Error("This request can no longer be cancelled.");
    appointments = appointments.map((item) => item.id === id ? { ...item, status: "cancelled", simulated: true } : item);
    return appointments.find((item) => item.id === id);
  },
  async submitAppointment(payload) {
    await pause();
    const item = {
      ...payload,
      id: `DEMO-${Date.now()}`,
      status: "pending",
      simulated: true,
    };
    appointments = [item, ...appointments];
    return item;
  },
  async listConversations() {
    await pause();
    const adminChannel = conversations.find((c) => c.id === "c-admin");
    const adminAsDoctor = doctorsState.find((d) => d.id === "d1");
    const visible = activeRole === "doctor"
      ? [adminChannel]
      : activeRole === "admin"
        ? [{ ...adminChannel, participantId: "d1", participantRole: "doctor", participantName: adminAsDoctor?.name || "Doctor", participantImage: adminAsDoctor?.image || "" }]
        : conversations.filter((c) => c.participantRole !== "admin");
    return visible.map((c) => ({
      ...c,
      canMessage: c.participantRole === "admin" ? ["doctor", "admin"].includes(activeRole) : appointments.some(
        (a) => a.doctorId === c.participantId && a.status === "accepted",
      ),
    }));
  },
  async listMessages(id) {
    await pause();
    const conversation = conversations.find((item) => item.id === id);
    if (!conversation) throw new Error("Conversation is unavailable.");
    if (conversation.participantRole !== "admin" && activeRole === "patient" && !appointments.some((a) => a.doctorId === conversation.participantId && a.status === "accepted"))
      throw new Error("Messaging is available only after the doctor accepts an appointment request.");
    return (messages[id] || []).map((message) => ({ ...message, isMine: message.sender === activeRole }));
  },
  async sendMessage(id, body) {
    await pause();
    const c = conversations.find((item) => item.id === id);
    if (!c) throw new Error("Conversation is unavailable.");
    if (c.participantRole === "admin" && !["doctor", "admin"].includes(activeRole)) throw new Error("Only a doctor account can message administrators.");
    if (c.participantRole !== "admin" && (
      !appointments.some(
        (a) => a.doctorId === c.participantId && a.status === "accepted",
      )
    ))
      throw new Error(
        "Messaging is available after an appointment request is accepted.",
      );
    if (!body.trim() || body.length > 2000)
      throw new Error("Enter a message of 1 to 2,000 characters.");
    const m = {
      id: `DEMO-${Date.now()}`,
      conversationId: id,
      sender: activeRole === "doctor" ? "doctor" : activeRole === "admin" ? "admin" : "patient",
      isMine: true,
      body,
      sentAt: new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      }),
      simulated: true,
    };
    messages[id] = [...(messages[id] || []), m];
    return m;
  },
  async sendAttachment() {
    throw new Error(
      "Attachment upload is unavailable in demo mode. No file was sent.",
    );
  },
  async updateDoctorStatus(id, status) {
    if (!["pending", "verified", "rejected", "suspended"].includes(status))
      throw new Error("Unsupported verification state.");
    await pause();
    doctorsState = doctorsState.map((d) =>
      d.id === id
        ? {
            ...d,
            verificationStatus: status === "approved" ? "verified" : status,
            verified: status === "approved" || status === "verified",
          }
        : d,
    );
    const updated = doctorsState.find((d) => d.id === id);
    return { ...updated, simulated: true };
  },
  async setDoctorPublicationStatus(id, status) {
    if (!['published', 'unpublished'].includes(status)) throw new Error("Unsupported publication state.");
    const doctor = doctorsState.find((item) => item.id === id);
    if (!doctor) throw new Error("Doctor profile is unavailable.");
    if (status === "published" && doctor.verificationStatus !== "verified") throw new Error("Only verified profiles can be published.");
    await pause();
    doctorsState = doctorsState.map((item) => item.id === id ? { ...item, publicationStatus: status } : item);
    return { ...doctorsState.find((item) => item.id === id), simulated: true };
  },
  async addDoctor(input) {
    await pause();
    const d = {
      ...input,
      id: `DEMO-${Date.now()}`,
      verified: false,
      verificationStatus: "pending",
      publicationStatus: "unpublished",
      rating: 0,
      reviewCount: 0,
      availability: [],
      nextAvailable: "To be scheduled",
    };
    doctorsState = [d, ...doctorsState];
    activeRole = "doctor";
    return { ...d, simulated: true };
  },
  async addFacility(input) {
    await pause();
    const f = {
      ...input,
      id: `DEMO-${Date.now()}`,
      distanceKm: 0,
      city: "Dhaka",
      image: "",
    };
    facilitiesState = [f, ...facilitiesState];
    return { ...f, simulated: true };
  },
  async updateFacility(id, input) {
    await pause();
    facilitiesState = facilitiesState.map((f) =>
      f.id === id ? { ...f, ...input } : f,
    );
    return { ...facilitiesState.find((f) => f.id === id), simulated: true };
  },
  async deactivateFacility(id) { await pause(); facilitiesState = facilitiesState.map((item) => item.id === id ? { ...item, active: false } : item); return { ...facilitiesState.find((item) => item.id === id), simulated: true }; },
  async addSpecialty(input) {
    await pause();
    const s = { ...input, id: input.slug };
    specialtiesState = [...specialtiesState, s];
    return { ...s, simulated: true };
  },
  async setSpecialtyActive(id, active) { await pause(); specialtiesState = specialtiesState.map((item) => item.id === id ? { ...item, active } : item); return { ...specialtiesState.find((item) => item.id === id), simulated: true }; },
  async registerDoctor(input) {
    await pause();
    const { password, ...profile } = input;
    activeRole = "doctor";
    const d = {
      ...profile,
      id: `DEMO-${Date.now()}`,
      verified: false,
      verificationStatus: "pending",
      publicationStatus: "unpublished",
      availability: [],
      nextAvailable: "To be scheduled",
    };
    doctorsState = [d, ...doctorsState];
    return {
      user: { id: d.id, role: "doctor", doctorId: d.id },
      doctor: d,
      simulated: true,
    };
  },
  async login(payload) {
    await pause();
    activeRole = payload.role || "patient";
    const doctor = doctorsState.find((item) => item.id === "d1");
    if (activeRole === "doctor" && ["deactivated", "suspended"].includes(doctor?.accountStatus))
      throw new Error(`This doctor account is ${doctor.accountStatus}. Contact Carewell administration.`);
    const user =
      payload.role === "admin"
        ? { id: "demo-admin", role: "admin" }
        : { id: "d1", role: "doctor", doctorId: "d1", accountStatus: doctor?.accountStatus || "active" };
    return { user, simulated: true };
  },
  async logout() {
    await pause();
    activeRole = "patient";
    return { ok: true, simulated: true };
  },
  async updateOwnDoctor(id, input) {
    await pause();
    const current = doctorsState.find((doctor) => doctor.id === id);
    const reviewRequired = Boolean(current && ["specialty", "qualifications", "facilityIds"].some((key) => JSON.stringify(current[key]) !== JSON.stringify(input[key])));
    doctorsState = doctorsState.map((d) =>
      d.id === id ? { ...d, ...input, profileReviewRequired: reviewRequired } : d,
    );
    return { ...doctorsState.find((d) => d.id === id), reviewRequired, simulated: true };
  },
  async listDoctorAppointments(doctorId) {
    await pause();
    return appointments.filter((a) => a.doctorId === doctorId);
  },
  async updateAppointmentStatus(id, status) {
    if (!["accepted", "rejected", "cancelled"].includes(status))
      throw new Error("Invalid appointment status transition.");
    await pause();
    const item = appointments.find((a) => a.id === id);
    if (!item || item.status !== "pending")
      throw new Error("Only pending requests can be accepted or rejected.");
    appointments = appointments.map((a) =>
      a.id === id ? { ...a, status } : a,
    );
    return appointments.find((a) => a.id === id);
  },
  async updateAdminAppointmentStatus(id, status) {
    const allowed = { pending: ["accepted", "rejected", "cancelled"], accepted: ["cancelled", "completed"] };
    await pause();
    const appointment = appointments.find((item) => item.id === id);
    if (!appointment || !allowed[appointment.status]?.includes(status)) throw new Error(`Cannot change ${appointment?.status || "missing"} request to ${status}.`);
    appointments = appointments.map((item) => item.id === id ? { ...item, status, simulated: true } : item);
    return appointments.find((item) => item.id === id);
  },
  async listAvailability(doctorId) {
    await pause();
    if (!availability.some((slot) => slot.doctorId === doctorId)) availability.push({
        id: "demo-slot",
        doctorId,
        facilityId: "f1",
        date: localDateKey(),
        startTime: "09:00",
        endTime: "09:30",
        status: "available",
        simulated: true,
      });
    return availability.filter((slot) => slot.doctorId === doctorId);
  },
  async saveAvailability(doctorId, slot) {
    if (!slot.date || !slot.startTime || !slot.endTime || slot.startTime >= slot.endTime)
      throw new Error("Choose a valid date and an end time after the start time.");
    if (slot.date < localDateKey())
      throw new Error("Availability cannot be added in the past.");
    if (availability.some((current) => current.doctorId === doctorId && current.facilityId === slot.facilityId && current.date === slot.date && current.id !== slot.id && current.status !== "unavailable" && slot.startTime < current.endTime && slot.endTime > current.startTime))
      throw new Error("This slot overlaps existing availability.");
    await pause();
    const saved = {
      ...slot,
      id: slot.id || `DEMO-${Date.now()}`,
      doctorId,
      status: slot.status || "available",
      simulated: true,
    };
    availability = [...availability.filter((current) => current.id !== saved.id), saved];
    return saved;
  },
  async removeAvailability(id) { await pause(); availability = availability.filter((slot) => slot.id !== id); return { id, removed: true, simulated: true }; },
  async updateAvailability(id, input) { const current = availability.find((slot) => slot.id === id); if (!current) throw new Error("Availability slot is no longer available."); return this.saveAvailability(current.doctorId, { ...current, ...input, id }); },
  async requestAccountDeactivation(id, reason) { if (!reason.trim()) throw new Error("Provide a reason for the deactivation request."); await pause(); doctorsState = doctorsState.map((doctor) => doctor.id === id ? { ...doctor, accountStatus: "deactivation_requested" } : doctor); return { status: "deactivation_requested", simulated: true }; },
  async updateDoctor(id, input) { await pause(); doctorsState = doctorsState.map((doctor) => doctor.id === id ? { ...doctor, ...input } : doctor); return doctorsState.find((doctor) => doctor.id === id); },
  async deactivateDoctor(id) { await pause(); doctorsState = doctorsState.map((doctor) => doctor.id === id ? { ...doctor, accountStatus: "deactivated", publicationStatus: "inactive" } : doctor); return doctorsState.find((doctor) => doctor.id === id); },
};
const api = {
  listDoctors: (filters) => request(`/doctors${queryString(filters)}`),
  getDoctor: (id) => request(`/doctors/${encodeURIComponent(id)}`),
  getOwnDoctor: () => request("/doctor/profile"),
  listAdminDoctors: () => request("/admin/doctors"),
  listFacilities: (kind = "all") =>
    request(`/clinics${queryString({ type: kind === "all" ? "" : kind })}`),
  listSpecialties: () => request("/specialties"),
  listAppointments: () => request("/appointments"),
  cancelAppointment: (id) => request(`/appointment-requests/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status: "cancelled" }) }),
  submitAppointment: (payload) =>
    request("/appointment-requests", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  listConversations: () => request("/conversations"),
  listMessages: (id) =>
    request(`/conversations/${encodeURIComponent(id)}/messages`),
  sendMessage: (id, body) =>
    request(`/conversations/${encodeURIComponent(id)}/messages`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
  sendAttachment: async (id, file) => {
    const form = new FormData();
    form.append("file", file);
    const response = await fetch(
      `${apiBase}/conversations/${encodeURIComponent(id)}/attachments`,
      { method: "POST", body: form },
    );
    if (response.status === 401) throw new Error("Your session has expired.");
    if (response.status === 403)
      throw new Error("You do not have permission to send an attachment.");
    if (!response.ok)
      throw new Error(`Attachment upload failed (${response.status}).`);
    return response.json();
  },
  updateDoctorStatus: (id, status) =>
    request(`/admin/doctors/${encodeURIComponent(id)}/verification`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  setDoctorPublicationStatus: (id, status) => request(`/admin/doctors/${encodeURIComponent(id)}/publication`, { method: "PATCH", body: JSON.stringify({ status }) }),
  addDoctor: (input) =>
    request("/admin/doctors", { method: "POST", body: JSON.stringify(input) }),
  addFacility: (input) =>
    request("/admin/clinics", { method: "POST", body: JSON.stringify(input) }),
  updateFacility: (id, input) =>
    request(`/admin/clinics/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deactivateFacility: (id) => request(`/admin/clinics/${encodeURIComponent(id)}/deactivation`, { method: "POST" }),
  addSpecialty: (input) =>
    request("/admin/specialties", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  setSpecialtyActive: (id, active) => request(`/admin/specialties/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ active }) }),
  registerDoctor: (input) =>
    request("/auth/doctor/register", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  login: (input) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(input) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  updateOwnDoctor: (id, input) =>
    request(`/doctor/profile`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  listDoctorAppointments: () => request("/doctor/appointments"),
  updateAppointmentStatus: (id, status) =>
    request(`/doctor/appointments/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  updateAdminAppointmentStatus: (id, status) => request(`/admin/appointments/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  listAvailability: (id, admin = false) => request(`${admin ? "/admin" : "/doctor"}/availability${admin ? queryString({ doctorId: id }) : ""}`),
  saveAvailability: (id, input, admin = false) =>
    request(`${admin ? "/admin" : "/doctor"}/availability`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateAvailability: (id, input, admin = false) => request(`${admin ? "/admin" : "/doctor"}/availability/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) }),
  removeAvailability: (id, admin = false) => request(`${admin ? "/admin" : "/doctor"}/availability/${encodeURIComponent(id)}`, { method: "DELETE" }),
  requestAccountDeactivation: (id, reason) => request("/doctor/account/deactivation-requests", { method: "POST", body: JSON.stringify({ reason }) }),
  updateDoctor: (id, input) => request(`/admin/doctors/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) }),
  deactivateDoctor: (id) => request(`/admin/doctors/${encodeURIComponent(id)}/deactivation`, { method: "POST" }),
};
export const careService = new Proxy(
  {},
  { get: (_, key) => (apiMode ? api : demo)[key] },
);
export const serviceMode = apiMode ? "api" : "demo";
