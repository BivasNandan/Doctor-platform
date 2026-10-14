# Carewell frontend/backend integration

This React/Vite repository contains only the browser frontend. No API server, database, authentication provider, scheduler, upload store, or realtime messaging server is included.

## Local setup and mode selection

```sh
npm install
cp .env.example .env.local
npm run dev
```

Set `VITE_CAREWELL_DATA_MODE=demo` for fictional, in-memory service responses. Set `VITE_CAREWELL_DATA_MODE=api` and `VITE_API_BASE_URL=https://<backend-host>` to select the HTTP adapter. API failures are surfaced and never fall back to demo mode. Vite variables ship to the browser; do not place secrets in them. Use HTTPS in deployed environments.

The UI calls `src/data/careService.js`; shapes/statuses are described in `src/data/contracts.js`; fixtures are isolated in `src/data/mockData.js`. Replace or adapt the adapters without moving data operations into view components. Demo changes reset on reload and are explicitly labeled simulated. They are not persisted, identity-verified, securely authorized, or delivered to another user.

## Proposed frontend contracts (not existing backend endpoints)

These route names and payloads document current adapter expectations only. Agree response fields, authentication transport, pagination, and error codes with the backend team before connecting production. JSON errors should be `{ "code": "...", "message": "..." }`. 401 means expired/absent session; 403 means authenticated but forbidden; 404 means unavailable record; 409 means stale slot or invalid/conflicting transition; 422 means validation failure. No client action is authoritative until the response returns the resulting server record.

| Domain/operation | Proposed request | Expected response |
| --- | --- | --- |
| Public doctors: `GET /doctors` | query: `query`, `specialty`, `location`, `clinic`, `maxFee`, `language`, `available`, `verified` | Published, eligible `Doctor[]`, matching combined filters; include `verificationStatus`, `publicationStatus`, `facilityIds`, `specialtyId`, optional clinic-specific `feesByFacility`. |
| Public doctor: `GET /doctors/:id` | path doctor id | Published profile or 404/unavailable. Only authoritative verified status can render verified badge. |
| Own doctor: `GET /doctor/profile`, `PATCH /doctor/profile` | Auth session; PATCH allowed profile fields, clinic identifiers, qualifications/specialty/languages/fees | Own `Doctor`, account/publication/verification status, and `reviewRequired`; server decides ownership and review rules. |
| Admin doctors: `GET /admin/doctors`, `POST /admin/doctors`, `PATCH /admin/doctors/:id`, `POST /admin/doctors/:id/deactivation` | Profile fields/clinic identifiers or deactivation action | Created/updated authoritative `Doctor`, status and errors. Deactivation hides profile per PRD rules. |
| Verification/publication | `PATCH /admin/doctors/:id/verification` `{status: pending\|verified\|rejected\|suspended}`; `PATCH /admin/doctors/:id/publication` `{status: published\|unpublished}` | Updated authoritative profile; server validates decision and only permits publication when requirements are met. Certificate metadata/files are supplied by the admin review service; current fixtures contain none. |
| Clinics | `GET /clinics?type=clinic\|hospital`, `POST /admin/clinics`, `PATCH /admin/clinics/:id`, `POST /admin/clinics/:id/deactivation` | `Facility` with status/association information. Deactivation relationship policy must be agreed. |
| Specialties | `GET /specialties`, `POST /admin/specialties`, `PATCH /admin/specialties/:id` `{active:boolean}` | `Specialty` list/record and authoritative active state. |
| Availability | `GET /doctor/availability`; `GET /admin/availability?doctorId=...`; POST collection with `{doctorId?,facilityId,date,startTime,endTime,status}`; PATCH/DELETE `/:id` | Slot list/record with `id`, `doctorId`, `facilityId`, ISO date, times, `available\|booked\|unavailable`. Server checks ownership, conflicts, dates, clinic association, and existing appointments. |
| Patient appointment request | `POST /appointment-requests` `{doctorId,facilityId,date,slotId or time,patientName,phone,email,reason}`; `GET /appointments` | Server-issued `id`, doctor/clinic/date/time details and status. Submission is pending unless the backend returns another valid status; no UI success on error. List is caller-scoped. |
| Patient cancel/admin manage | `PATCH /appointment-requests/:id` `{status:"cancelled"}`; `GET /appointments`; `PATCH /admin/appointments/:id` `{status}` | Updated `AppointmentRequest` or 409 invalid transition; scope/permissions enforced by server. |
| Doctor appointments | `GET /doctor/appointments`; `PATCH /doctor/appointments/:id` `{status:"accepted"|"rejected"}` | Doctor-owned list and updated request; server enforces ownership, transition, and acceptance conflict validation. History includes permitted terminal statuses. |
| Doctor auth/account | `POST /auth/doctor/register` personal/account/professional fields; `POST /auth/login` credentials/role; `POST /auth/logout`; `POST /doctor/account/deactivation-requests` `{reason}` | Authenticated user/profile/status or deactivation request state; password handling, session invalidation, retention, and blocking deactivated/suspended accounts belong to backend. Never trust local role flags. |
| Messaging | `GET /conversations`, `GET /conversations/:id/messages`, `POST /conversations/:id/messages` `{body}` | Authorized participant list/history and accepted message. Conversation includes participant identity, eligibility, optional `online`; message includes sender identity, timestamp and optional `readAt`/receipt. Patients are eligible only after accepted appointment; doctors/admin messaging follows PRD. |
| Realtime messaging | backend-selected authenticated socket/event transport | Events for new messages, presence changes, read receipts, connection state, and resync after reconnect. The current API adapter is request/response only; it does not claim realtime delivery. |
| Attachments | multipart `POST /conversations/:id/attachments` with file | Validated attachment metadata and authorized download reference. Server enforces size/type/content scanning and participant access. Demo mode always returns an explicit unavailable error. |

## Frontend vs backend responsibilities

The frontend implements interface states, local validation, requested service operations, and clear simulated/API errors. Backend work remains for secure authentication and session expiry; role/ownership/privacy enforcement; published-profile filtering; authoritative verification and publication decisions; schedule persistence and booking conflict prevention; request state transitions; retention/deactivation policy; clinic/specialty consistency; messaging eligibility enforcement; realtime transport; attachment validation/storage; read/presence events; anti-abuse safeguards; backups; and performance/data correctness.

Admin and doctor route guards only shape the UI. They are not security boundaries. Avoid persisting private appointment/message records in browser storage. Demo fixtures contain only fictional labels and test-domain contacts; demo identities do not prove who the user is.

## Verification

Run `npm run build`. `package.json` currently defines only `dev`, `build`, and `preview`; there is no configured lint, type-check, or automated test command. The browser verification and specifically untested journeys are recorded in `PRD_TRACEABILITY.md`.
