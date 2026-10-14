# Carewell backend starter guide

This repository contains the Carewell React frontend. The backend should replace the current in-memory demo service with secure, persistent API functionality.

## Start here

- Frontend service boundary: `src/data/careService.js`
- Shared response shapes: `src/data/contracts.js`
- Full proposed API contract: `FRONTEND_INTEGRATION.md`
- Demo fixtures only: `src/data/mockData.js`

The frontend selects the backend adapter with:

```env
VITE_CAREWELL_DATA_MODE=api
VITE_API_BASE_URL=https://your-api.example.com
```

These variables are public browser configuration. Never put secrets in them.

## First milestone

Build these areas in roughly this order:

1. Authentication, sessions, roles, and account status
2. Doctors, clinics, and specialties
3. Availability and appointment requests
4. Admin verification and management actions
5. Doctor workspace actions
6. Conversations, messages, and attachments

## API surface expected by the frontend

| Area | Endpoints |
| --- | --- |
| Public discovery | `GET /doctors`, `GET /doctors/:id`, `GET /clinics`, `GET /specialties` |
| Authentication | `POST /auth/doctor/register`, `POST /auth/login`, `POST /auth/logout` |
| Patient appointments | `GET /appointments`, `POST /appointment-requests`, `PATCH /appointment-requests/:id` |
| Doctor workspace | `GET/PATCH /doctor/profile`, `GET /doctor/appointments`, `PATCH /doctor/appointments/:id`, `GET/POST /doctor/availability`, `PATCH/DELETE /doctor/availability/:id` |
| Admin doctors | `GET /admin/doctors`, `POST /admin/doctors`, `PATCH /admin/doctors/:id`, `POST /admin/doctors/:id/deactivation` |
| Admin review | `PATCH /admin/doctors/:id/verification`, `PATCH /admin/doctors/:id/publication` |
| Admin facilities | `POST /admin/clinics`, `PATCH /admin/clinics/:id`, `POST /admin/clinics/:id/deactivation` |
| Admin specialties | `POST /admin/specialties`, `PATCH /admin/specialties/:id` |
| Admin appointments | `PATCH /admin/appointments/:id` |
| Messaging | `GET /conversations`, `GET /conversations/:id/messages`, `POST /conversations/:id/messages` |
| Attachments | `POST /conversations/:id/attachments` as multipart form data |
| Account deactivation | `POST /doctor/account/deactivation-requests` |

The endpoint names are the current frontend expectations. Confirm naming, pagination, authentication transport, and versioning before releasing the production API.

## Important business rules

- Public doctor results must include only eligible profiles: verified/published, active, and not deactivated.
- A doctor may be published only after verification. Verification and publication are separate states.
- New appointment requests start as `pending`; they are not confirmed automatically.
- Allowed appointment transitions are: `pending → accepted | rejected | cancelled`, and `accepted → cancelled | completed`.
- Patients may message a doctor only after that doctor accepts an appointment request.
- Availability must reject past dates, invalid time ranges, overlapping slots, and clinics not associated with the doctor.
- Doctor, admin, and patient records must be scoped by the authenticated user. Frontend route guards are not security controls.
- Deactivated or suspended doctor accounts must be blocked from restricted actions and should not appear in public discovery.
- The server is authoritative for verification, publication, account status, appointment status, ownership, permissions, and conflicts.

## Core response shapes

Keep the response fields compatible with `src/data/contracts.js`. The most important records are:

- `Doctor`: profile, specialty, qualifications, languages, fees, facility IDs, verification/publication/account status.
- `Facility`: clinic or hospital, address, area, city, distance, phone, and active status.
- `AvailabilitySlot`: doctor, facility, ISO date, start/end time, and `available | booked | unavailable` status.
- `AppointmentRequest`: doctor, facility, patient contact, date/time, reason, and status.
- `Conversation` and `Message`: participant identity, eligibility, sender, timestamps, optional read receipt, and attachment metadata.
- Auth responses should return a user object containing at least `id`, `role`, and optional `doctorId` / `accountStatus`.

## Errors and security

Return JSON errors in this format:

```json
{ "code": "APPOINTMENT_CONFLICT", "message": "This time is no longer available." }
```

Use these status meanings consistently:

- `401` — missing or expired authentication
- `403` — authenticated but not allowed
- `404` — record is unavailable
- `409` — stale slot or invalid state transition
- `422` — invalid input

Use HTTPS, hashed passwords, secure session handling, authorization checks on every protected route, audit logs for admin decisions, and server-side validation for every browser-submitted field. Revalidate attachment type, size, content, storage, and download permissions on the server; the frontend currently limits uploads to 10 MB and PDF/JPEG/PNG/WebP/GIF types.

## Integration notes

The frontend currently uses request/response calls. Realtime messaging, presence, read receipts, reconnect behavior, file storage, backups, and retention policies still need a backend design. If sessions use cookies, update the frontend fetch adapter to send credentials; if using bearer tokens, agree on the token header and refresh behavior.

Start with the API contract and database migrations, then connect the frontend with `VITE_CAREWELL_DATA_MODE=api`. Do not treat demo-mode success as proof of persistence or authorization.
