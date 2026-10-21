# Carewell API contract (v1, proposed)

This is the REST interface the React client expects. It is derived from the code in
[`client/src/services/api.js`](../client/src/services/api.js), which is the executable source of truth: if the two ever
disagree, the code wins and this file needs updating. Response shapes are documented as JSDoc typedefs in
[`client/src/types.js`](../client/src/types.js).

> Status: **proposed**. No server exists yet. Anything marked _open decision_ should be agreed between
> frontend and backend before it is built.

## Conventions

| Topic | Rule |
| --- | --- |
| Base URL | `/api/v1` (set by `VITE_API_BASE_URL`). In development Vite proxies `/api` to `http://localhost:3000`. |
| Format | JSON in and out (`Content-Type: application/json`), except attachment upload (`multipart/form-data`). |
| IDs | Opaque strings (UUIDs recommended). The client never parses them. |
| Dates / times | Dates `YYYY-MM-DD`, slot times `HH:mm` (24 h, clinic local time, Asia/Dhaka). Timestamps ISO-8601 UTC. |
| Money | Integer BDT (taka), e.g. `1500`. |
| Auth | Cookie session, `HttpOnly; Secure; SameSite=Lax`. The client sends `credentials: "include"`. |
| CSRF | State-changing requests need a CSRF defence (SameSite + `Origin` check, or a double-submit token). _Open decision._ |
| Lists | Plain arrays today. Pagination (`?page&limit` + `{data, meta}` envelope) is an _open decision_; add it before any list can grow large (doctors, appointments, messages). |
| Unknown fields | The client ignores fields it does not know, so adding fields is safe. |

### Errors

Every non-2xx response must be:

```json
{ "code": "APPOINTMENT_CONFLICT", "message": "This time is no longer available.", "details": { "email": "Invalid" } }
```

`message` is shown to users verbatim: keep it friendly and free of internals. `details` (field → message) is
optional and used for 422.

| Status | Meaning | Examples of `code` |
| --- | --- | --- |
| 401 | Not signed in / session expired | `UNAUTHENTICATED`, `INVALID_CREDENTIALS` |
| 403 | Signed in but not allowed | `FORBIDDEN`, `ACCOUNT_RESTRICTED`, `MESSAGING_NOT_ELIGIBLE` |
| 404 | Record missing **or not visible to the caller** | `NOT_FOUND` |
| 409 | Conflicts with current state | `APPOINTMENT_CONFLICT`, `INVALID_TRANSITION`, `SLOT_OVERLAP`, `NOT_VERIFIED`, `DUPLICATE_SPECIALTY` |
| 422 | Validation failed | `VALIDATION_FAILED` |
| 429 | Rate limited | `RATE_LIMITED` |

A 401 on any protected request makes the client drop the local session and show the sign-in page. A 401 from
`/auth/login`, `/auth/me` and `/auth/doctor/register` is treated as a normal answer.

## Endpoints

Legend: 🌐 public · 👤 any signed-in user · 🩺 doctor · 🛡️ admin.

### Authentication

| | Endpoint | Request | Success | Notes |
| --- | --- | --- | --- | --- |
| 🌐 | `POST /auth/login` | `{ email, password, portal: "doctor"\|"admin" }` | `200 { user }` | `portal` is only the sign-in page used. Decide the role from the account and reject a mismatch (the client also checks `user.role`). Never reveal whether the email exists. Rate-limit. |
| 👤 | `POST /auth/logout` | – | `204` | Destroy the session server-side. |
| 🌐 | `GET /auth/me` | – | `200 { user }` or `401` | Called on every page load to restore the session. |
| 🌐 | `POST /auth/doctor/register` | `{ email, password, phone, name, specialtyId, qualifications[], experienceYears, fee, location, facilityIds[] }` | `201 { user, doctor }` | Creates the account and a profile with `verificationStatus: "pending"`, `publicationStatus: "unpublished"`, and signs the doctor in. |

Patient accounts and password handling (all built and covered by `server/tests/accounts.test.js`):

| | Endpoint | Request | Success | Notes |
| --- | --- | --- | --- | --- |
| 🌐 | `POST /auth/patient/register` | `{ name, email, phone, password }` | `201 { user }` (`emailVerified: false`) | Creates a patient, signs them in and emails a 6-digit code. `409 EMAIL_TAKEN`. The role is never taken from the request. |
| 👤 | `POST /auth/verify-email` | `{ code }` | `200 { user }` | Codes last 15 min and allow 5 wrong tries (`422 INVALID_CODE`, then `429 TOO_MANY_ATTEMPTS`). Late codes get `410 CODE_EXPIRED`. |
| 👤 | `POST /auth/verify-email/resend` | – | `200 { sent }` | Replaces the old code. `429 RATE_LIMITED` within 30 s of the last one. |
| 🌐 | `POST /auth/forgot-password` | `{ email }` | `200 { sent: true }` | Same answer whether or not the account exists. The emailed link is `<site>/#/reset-password?token=…`, valid 60 min, single use. |
| 🌐 | `POST /auth/reset-password` | `{ token, password }` | `200 { reset: true }` or `410 RESET_TOKEN_INVALID` | Signs the account out everywhere. Also how an administrator-created doctor sets a first password. |
| 👤 | `PATCH /auth/me` | `{ name, phone? }` | `200 { user }` | Email and role cannot be changed here. |
| 👤 | `POST /auth/change-password` | `{ currentPassword, newPassword }` | `200 { changed: true }` | Other devices are signed out; the current one stays signed in. |

`user` = `{ id, role: "doctor"\|"admin"\|"patient", name?, email?, doctorId?, accountStatus?, photoUrl? }` (`photoUrl` is set once the person has uploaded a profile photo).
Blocked accounts (`deactivated`, `suspended`) must get `403 ACCOUNT_RESTRICTED` at login.

### Public discovery

| | Endpoint | Query / body | Success |
| --- | --- | --- | --- |
| 🌐 | `GET /doctors` | `query`, `specialty` (id), `location`, `clinic`, `maxFee`, `available` (`Today`\|`Tomorrow`\|`This week`), `verified` (`true`) – all optional, combined with AND | `200 Doctor[]` |
| 🌐 | `GET /doctors/:id` | – | `200 Doctor` or `404` |
| 🌐 | `GET /doctors/:id/slots` | `facilityId`, `date` | `200 OpenSlot[]` (`{ id, label, status: "available"\|"booked"\|"passed" }`) |
| 🌐 | `GET /clinics` | `type=clinic\|hospital` (optional) | `200 Facility[]` – active only |
| 🌐 | `GET /specialties` | – | `200 Specialty[]` – active only |
| 🌐 | `GET /doctors/:id/reviews` | `limit` (1–50, default 20), `offset` | `200 { summary: { average, count, distribution }, items: Review[], viewer: { canReview, myReview } }` |
| 🌐 | `GET /photos/users/:id` | – | the image (see Profile photos) |
| 🌐 | `POST /support-requests` | `{ message, email? }` | `201 { id, status: "received" }` |

Rules:

- `GET /doctors*` returns only **publicly listed** doctors: `verificationStatus = verified` is **not** required, but
  `publicationStatus = published` and `accountStatus ≠ deactivated` are. A doctor can only be published when verified.
- `location` matches the doctor's `location` text **or** the name/area/city of any of their clinics.
- `OpenSlot.id` is the `availability_slots` id and `label` is its display start time (e.g. `"5:30 PM"`). The client sends the id back as `slotId`. Patients can only book slots that a doctor or admin created; the demo's fixed times exist only in demo mode.
- `Doctor.image` and `Facility.image` are an absolute URL, a server path (`/api/v1/photos/users/<id>?v=…`) or a path relative to the website (`images/doctors/nusrat.karim.jpg`, a file in `client/public`); the client resolves relative paths with the site's base URL.
- Every `Doctor` carries `rating` (average of the visible reviews, one decimal) and `reviewCount`; both are `0` until the first review, and the UI shows the rating only when `reviewCount > 0`. `Doctor.image` is the doctor's uploaded profile photo when they have one.
- `POST /support-requests` also **emails the message to the Carewell mailbox** (`SUPPORT_EMAIL`, defaulting to `SMTP_USER`) with the sender's address as `Reply-To`, so replying in the mail program answers them. The request is saved and administrators are notified even if the email cannot be sent.
- The demo derives `Doctor.availability` (`Today`/`Tomorrow`/`This week`) and `nextAvailable`; the real API should compute them from availability slots.

### Patient appointments

| | Endpoint | Request | Success |
| --- | --- | --- | --- |
| 🌐/👤 | `GET /appointments` | – | `200 AppointmentRequest[]` scoped to the caller |
| 🌐/👤 | `POST /appointment-requests` | `{ doctorId, facilityId, date, time, slotId, relationship, patientName, phone, email, reason }` | `201 AppointmentRequest` (status `pending`) |
| 🌐/👤 | `PATCH /appointment-requests/:id` | `{ status: "cancelled" }` | `200 AppointmentRequest` or `409 INVALID_TRANSITION` |

- `AppointmentRequest` embeds `doctor: { id, name, specialty, image? }` and `facility: { id, name, address, area, city }`
  (a SQL join) so the client does not need unpublished doctors in the public list.
- Validation: doctor is listed, `facilityId` belongs to the doctor, `date` ≥ today, phone/email formats, `reason` ≥ 5 chars.
- `409 APPOINTMENT_CONFLICT` when the time already has an **accepted** request for that doctor and clinic.
- Patients may cancel only `pending` or `accepted` requests.
- **Open decision – patient identity.** The UI has no patient sign-in. Options: (a) patient accounts, (b) guest
  bookings tracked by a signed token/cookie plus email verification. `GET /appointments` and messaging depend on this.

### Messaging

| | Endpoint | Request | Success |
| --- | --- | --- | --- |
| 👤 | `GET /conversations` | – | `200 Conversation[]` (each with server-computed `canMessage`) |
| 👤 | `GET /conversations/:id/messages` | – | `200 Message[]` (each with `isMine` for the caller) |
| 👤 | `POST /conversations/:id/messages` | `{ body }` (1–2000 chars) | `201 Message` (`isMine: true`) |
| 👤 | `POST /conversations/:id/attachments` | multipart field `file` | `201 Message` with `attachmentUrl`, `attachmentName` |

| 👤 | `GET /conversations/unread-count` | – | `200 { count }` |
| 🛡️ | `POST /conversations` | `{ doctorId }` | `201 Conversation` (opens the administration thread with that doctor, once) |
| 👤 | `GET /attachments/:id` | – | the file (only the two people in that conversation) |

- Who talks to whom: **patient ↔ doctor** (only while the doctor has an accepted or completed appointment with that patient, otherwise `403 MESSAGING_NOT_ELIGIBLE`; either side may write first) and **doctor ↔ administration** (always open; one thread per doctor, shared by every administrator, created when the doctor account is created or registers).
- Opening a conversation (`GET …/messages`) marks the other side's messages as read; `readAt` on your own messages shows when they were read.
- Attachments: PDF, JPEG, PNG, WebP, GIF, ≤ 10 MB, type checked against the file's bytes, stored in the private bucket, downloaded only by participants.
- **Live updates:** see [Live updates (Server-Sent Events)](#live-updates-server-sent-events). Polling (conversations ~8 s, the open conversation ~4 s, paused in hidden tabs) remains the fallback while the stream is down. Presence (`online`) is not implemented.

### Notifications (every role)

| | Endpoint | Request | Success |
| --- | --- | --- | --- |
| 👤 | `GET /notifications` | `limit` (1–100, default 30), `unread=true` | `200 { items: Notification[], unreadCount }`, newest first |
| 👤 | `GET /notifications/unread-count` | – | `200 { count }` |
| 👤 | `POST /notifications/:id/read` | – | `200 Notification` (someone else's → `404`) |
| 👤 | `POST /notifications/read-all` | – | `200 { updated }` |

`Notification` = `{ id, kind: "appointment" \| "message" \| "doctor" \| "account" \| "support", title, body, link?, read, createdAt }`, where `link` is an in-app route. The client polls every ~10 s and shows a toast for new items. A notification never breaks the action that caused it. It is created for the people **other than** the one who acted:

| Event | Who is notified |
| --- | --- |
| New appointment request | the doctor (and a "request sent" note to the patient) |
| Doctor accepts / rejects | the patient |
| Patient cancels | the doctor |
| Administrator accepts / rejects / cancels / completes | the patient and the doctor |
| New message (text or file) | the other side; repeated messages in one conversation stay **one unread entry**, cleared when the conversation is opened |
| Doctor registers, uploads a certificate, changes specialty / qualifications / clinics, asks to deactivate | every administrator |
| Administrator verifies, rejects, suspends, publishes or hides a profile; edits a profile or schedule; decides a deactivation request | the doctor |
| New support request | every administrator |
| Support status change or reply | the person who sent it (if signed in) |
| Email verified, password changed or reset | that user |

### Reviews and ratings

| | Endpoint | Request | Success |
| --- | --- | --- | --- |
| 🌐 | `GET /doctors/:id/reviews` | `limit`, `offset` | `200 { summary, items, viewer }` (above) |
| 👤 patient | `POST /doctors/:id/reviews` | `{ rating: 1–5, comment? (≤ 1000) }` | `201 Review` |
| 👤 patient | `PATCH /reviews/:id` | `{ rating?, comment? }` (at least one) | `200 Review` |
| 👤 patient | `DELETE /reviews/:id` | – | `204` |
| 🛡️ | `GET /admin/reviews` | `status=visible\|hidden` (optional) | `200 ModerationReview[]` (newest first, up to 500) |
| 🛡️ | `PATCH /admin/reviews/:id` | `{ status: "visible"\|"hidden" }` | `200 ModerationReview` |

`Review` = `{ id, rating, comment, author, createdAt, updatedAt, mine? }`. `author` is shown as **"First L."** (never the full name or email); `mine: true` marks the signed-in patient's own review. `ModerationReview` = `{ id, doctorId, doctorName, patientName, patientEmail, rating, comment, status, createdAt }` (administrators see the full author).

- A patient can review a doctor only after a **completed** appointment with that doctor (`403 REVIEW_NOT_ELIGIBLE`), **once** per doctor (`409 ALREADY_REVIEWED`; edit or delete the review instead). Deleting it lets them review again. `viewer.canReview` tells the page whether to show the form.
- Reviews of unpublished doctors are readable only by that doctor and administrators (`404` for everyone else).
- Hidden reviews disappear from the list and stop counting towards `rating`/`reviewCount`. Hide/restore is written to the audit log (`review.hide`, `review.restore`).
- The doctor gets a "New N-star review" notification. Creating reviews is rate-limited (20 per hour per patient).
- Someone else's review answers `404` on `PATCH`/`DELETE`, exactly like a missing one.

### Profile photos (every role)

| | Endpoint | Request | Success |
| --- | --- | --- | --- |
| 👤 | `POST /me/photo` | multipart field `file` (JPEG, PNG or WebP, ≤ 2 MB) | `200 { user }` (with `photoUrl`) |
| 👤 | `DELETE /me/photo` | – | `200 { user }` (no `photoUrl`) |
| 🌐/👤 | `GET /photos/users/:id` | – | the image, or `404` |

- The file's bytes are checked against its declared type (`422 UNSUPPORTED_FILE`); a file over 2 MB is `413 FILE_TOO_LARGE`. Files live in the private bucket; replacing or removing a photo deletes the old file.
- `photoUrl` looks like `/api/v1/photos/users/<id>?v=<timestamp>`; the `v` changes whenever the photo does, so browsers can cache it.
- Who may view: **everyone** for a published doctor (`Cache-Control: public, max-age=86400`); otherwise the owner, administrators, and a doctor who has an appointment or conversation with that patient (`private, max-age=300`). Anyone else gets `404`, the same as for a person with no photo.
- The photo appears on the doctor's card and profile, in the account menu and sidebar, in conversations, and in the administrators' patient list.

### Live updates (Server-Sent Events)

| | Endpoint | Success |
| --- | --- | --- |
| 👤 | `GET /events` | `200 text/event-stream`, kept open |

The browser opens one stream after signing in (`EventSource` with cookies). The server writes an event the moment something happens, and the page reloads just that piece of data, so messages and notifications appear **instantly** instead of on the next poll.

| Event (`event:` line) | `data` | Sent to | Page reaction |
| --- | --- | --- | --- |
| `ready` | `{ type: "ready" }` | the new connection | – |
| `message` | `{ type: "message", conversationId, message }` where `message` is a `Message` as that person sees it (`isMine` is per recipient) | everyone in that conversation (including the sender's other tabs) | append the message at once, then refresh quietly |
| `read` | `{ type: "read", conversationId, readerId, readerRole }` | everyone in that conversation | when the reader is the other side, "Sent" becomes "Read" at once |
| `conversation` | `{ type: "conversation" }` | the patient and the doctor when an appointment is accepted | refresh the list |
| `notification` | `{ type: "notification" }` | the person notified | refresh the bell |

- `retry: 3000` makes the browser reconnect after a drop; a `: ping` comment every 20 s keeps proxies from closing an idle stream; `X-Accel-Buffering: no` stops nginx from buffering it. Each person may hold at most 5 streams (the oldest closes).
- A `message` event carries the message itself so it shows immediately without another round trip; it is written only to the streams of the people in that conversation (never broadcast). `read` and `notification` events carry no content; the page fetches the details through the normal, permission-checked endpoints.
- Pages poll slowly (30–60 s) while the stream is up and fall back to the old intervals when it is down.
- Connections are registered in the memory of one server process. Running several servers needs a shared channel (for example Redis) behind `publish` in `server/src/services/realtime.js`.

### Doctor workspace (🩺)

| Endpoint | Request | Success |
| --- | --- | --- |
| `GET /doctor/profile` | – | `200 Doctor` (own, any status) |
| `PATCH /doctor/profile` | `{ name, specialtyId, qualifications[], experienceYears, fee, location, facilityIds[] }` | `200 Doctor & { reviewRequired }` |
| `GET /doctor/appointments` | – | `200 AppointmentRequest[]` (own only) |
| `PATCH /doctor/appointments/:id` | `{ status: "accepted"\|"rejected" }` | `200 AppointmentRequest` or `409` (only `pending` can change) |
| `GET /doctor/availability` | – | `200 AvailabilitySlot[]` |
| `POST /doctor/availability` | `{ facilityId, date, startTime, endTime, status? }` | `201 AvailabilitySlot` |
| `PATCH /doctor/availability/:id` | partial slot (e.g. `{ status: "unavailable" }`) | `200 AvailabilitySlot` |
| `DELETE /doctor/availability/:id` | – | `204` |
| `POST /doctor/account/deactivation-requests` | `{ reason }` | `201 { status: "deactivation_requested" }` |

- Ownership comes from the session, **never** from an id in the URL or body.
- `reviewRequired: true` when `specialtyId`, `qualifications` or `facilityIds` changed (profile returns to admin review).
- Availability: reject past dates, `startTime ≥ endTime`, clinics the doctor is not linked to, and overlaps with non-`unavailable` slots (`409 SLOT_OVERLAP`).
- A `suspended`/`deactivated` account gets `403 ACCOUNT_RESTRICTED` on every mutation.

### Administration (🛡️)

| Endpoint | Request | Success |
| --- | --- | --- |
| `GET /admin/summary` | – | `200 AdminSummary` |
| `GET /admin/doctors` | – | `200 Doctor[]` (all statuses) |
| `POST /admin/doctors` | doctor profile fields plus the doctor's login `email` (no password: the doctor sets one through password reset) | `201 Doctor` (pending, unpublished), `409 EMAIL_TAKEN` |
| `PATCH /admin/doctors/:id` | doctor profile fields | `200 Doctor` |
| `POST /admin/doctors/:id/deactivation` | – | `200 Doctor` (`accountStatus: deactivated`, `publicationStatus: inactive`) |
| `PATCH /admin/doctors/:id/verification` | `{ status: "pending"\|"verified"\|"rejected"\|"suspended" }` | `200 Doctor` |
| `PATCH /admin/doctors/:id/publication` | `{ status: "published"\|"unpublished" }` | `200 Doctor` or `409 NOT_VERIFIED` |
| `GET /admin/clinics` | – | `200 Facility[]` (including inactive) |
| `POST /admin/clinics` | `{ name, type, address, area, city, phone, openingHours? }` | `201 Facility` |
| `PATCH /admin/clinics/:id` | same fields | `200 Facility` |
| `POST /admin/clinics/:id/deactivation` | – | `200 Facility` (`active: false`) |
| `GET /admin/specialties` | – | `200 Specialty[]` (including inactive) |
| `POST /admin/specialties` | `{ name, slug, description }` | `201 Specialty` or `409 DUPLICATE_SPECIALTY` |
| `PATCH /admin/specialties/:id` | `{ active: boolean }` | `200 Specialty` |
| `GET /admin/patients` | `query` (name, email or phone), `status=active\|suspended` | `200 AdminPatient[]` (newest first, up to 500) |
| `PATCH /admin/patients/:id/status` | `{ status: "active"\|"suspended" }` | `200 AdminPatient`; `404` for ids that are not patients |
| `GET /admin/appointments` | – | `200 AppointmentRequest[]` (all) |
| `PATCH /admin/appointments/:id` | `{ status }` | `200 AppointmentRequest` or `409 INVALID_TRANSITION` |
| `GET /admin/availability` | `doctorId` | `200 AvailabilitySlot[]` |
| `POST /admin/availability` | slot fields + `doctorId` | `201 AvailabilitySlot` |
| `PATCH /admin/availability/:id` | partial slot | `200 AvailabilitySlot` |
| `DELETE /admin/availability/:id` | – | `204` |

- Unverifying (`rejected`/`suspended`/`pending`) a published doctor must also set `publicationStatus` to `unpublished`.
- Admin appointment transitions: `pending → accepted \| rejected \| cancelled`, `accepted → cancelled \| completed`.
- `AdminPatient` = `{ id, name, email, phone?, accountStatus, emailVerified, photoUrl?, appointmentCount, createdAt, lastSeenAt? }`. Suspending a patient signs them out on every device and blocks sign-in (`403 ACCOUNT_RESTRICTED`) until restored; their appointments, messages and reviews are kept. Logged as `patient.suspend` / `patient.restore`.
- Write an **audit log** row for every admin decision (who, what, when, before/after).
- `AdminSummary`: `{ pendingDoctors, verifiedDoctors, appointmentsToday, activeFacilities, activeSpecialties, monthlyAppointments: [{ month: "YYYY-MM", count }] }` (12 months, oldest first).

## Status vocabularies

Stored and returned exactly as written (see [`client/src/constants.js`](../client/src/constants.js)):

| Field | Values |
| --- | --- |
| `AppointmentRequest.status` | `pending`, `accepted`, `rejected`, `cancelled`, `completed` |
| `Doctor.verificationStatus` | `pending`, `verified`, `rejected`, `suspended` |
| `Doctor.publicationStatus` | `published`, `unpublished`, `inactive` |
| `Doctor.accountStatus` | `active`, `suspended`, `deactivated`, `deactivation_requested` |
| `AvailabilitySlot.status` | `available`, `booked`, `unavailable` |
