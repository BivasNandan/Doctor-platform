# Backend guide (Express + PostgreSQL)

Welcome. The React client in [`../client`](../client) is finished and runs against an in-memory demo. Your job is to
replace that demo with a real, secure, persistent API. This page is the shortest path from `git clone` to a working
integration.

## 1. What to read, in order

1. [`API_CONTRACT.md`](API_CONTRACT.md) – every endpoint, payload, status code and business rule the client expects.
2. [`DATA_MODEL.md`](DATA_MODEL.md) – a proposed PostgreSQL schema that enforces the rules with constraints.
3. [`client/src/services/demo/`](../client/src/services/demo/) – a **working reference implementation** of the rules in
   plain JavaScript (validation, transitions, scoping). Port the behaviour, not the code.
4. [`client/src/services/api/`](../client/src/services/api/) – the exact HTTP calls the client makes.
5. [`client/src/types/contracts.js`](../client/src/types/contracts.js) – response shapes.

The demo tests ([`demoServices.test.js`](../client/src/services/demo/demoServices.test.js)) double as an executable
specification: each `it(...)` is a business rule your API should also satisfy.

## 2. Run the pair locally

```sh
# terminal 1 – your API on http://localhost:3000, routes mounted under /api/v1
cd server && npm run dev

# terminal 2 – the client, talking to your API through the Vite proxy
cd client
cp .env.example .env.local        # then set VITE_CAREWELL_DATA_MODE=api
npm install
npm run dev                       # http://localhost:5173/Doctor-platform/
```

The Vite dev server forwards `/api/*` to `VITE_DEV_PROXY_TARGET` (default `http://localhost:3000`), so the browser sees
one origin: no CORS configuration is needed in development and cookies stay same-site. In production serve the client
and API under the same site (e.g. `carewell.example` and `api.carewell.example`) and configure CORS for the exact
client origin with `credentials: true`.

## 3. Suggested server layout

```text
server/
├─ src/
│  ├─ app.js                 # express() setup: helmet, cors, json, cookies, routes, error handler
│  ├─ server.js              # listen()
│  ├─ config/                # env parsing + validation (zod / envalid); fail fast on missing vars
│  ├─ db/
│  │  ├─ pool.js             # pg Pool
│  │  └─ migrations/         # SQL or node-pg-migrate files, one per change
│  ├─ middleware/            # authenticate, requireRole, validate, rateLimit, errorHandler
│  ├─ modules/               # one folder per resource, mirrors client/src/services/api
│  │  ├─ auth/               #   routes.js · controller.js · service.js · repository.js · schema.js
│  │  ├─ doctors/
│  │  ├─ facilities/
│  │  ├─ specialties/
│  │  ├─ appointments/
│  │  ├─ availability/
│  │  ├─ messaging/
│  │  └─ admin/
│  └─ utils/                 # ApiError, logger, ids, dates
├─ tests/                    # supertest integration tests against a throwaway database
├─ .env.example
└─ package.json
```

Keep layers thin and one-directional: `routes → controller → service → repository (SQL)`. Business rules live in
services; SQL lives only in repositories; controllers only translate HTTP.

Recommended libraries (all optional): `express`, `helmet`, `cors`, `cookie-parser`/`express-session` +
`connect-pg-simple`, `zod` (validation), `pg` + `node-pg-migrate`, `argon2`, `express-rate-limit`, `pino`,
`multer` (uploads), `vitest` + `supertest`.

## 4. Build order

1. **Foundations** – config, DB pool, migrations, error format, logging, health check `GET /api/v1/health`.
2. **Auth** – `login`, `logout`, `me`, doctor `register`; session cookie; `requireRole` middleware; seed one admin.
3. **Reference data + discovery** – `/specialties`, `/clinics`, `/doctors`, `/doctors/:id`, `/doctors/:id/slots`.
4. **Booking** – `/appointment-requests`, `/appointments`, cancellation, conflict constraint.
5. **Doctor workspace** – profile, requests (accept/reject), availability CRUD, deactivation request.
6. **Admin** – summary, doctors, verification/publication, clinics, specialties, appointments, availability.
7. **Messaging** – conversations, messages, then attachments (storage + scanning), then real-time.

After each step, switch the client to `api` mode and click through the matching screens.

## 5. Business rules that must live on the server

- **Visibility** – public endpoints return only `published`, non-deactivated doctors and `active` clinics/specialties.
- **Publication** – a profile can be `published` only while `verified`; leaving `verified` un-publishes it.
- **Appointment lifecycle** – new requests are `pending` (never auto-confirmed). Allowed transitions:
  `pending → accepted | rejected | cancelled`, `accepted → cancelled | completed`. Doctors may only
  `accept`/`reject` their own `pending` requests. Patients may only cancel `pending`/`accepted`.
- **No double-booking** – at most one `accepted` request per doctor, clinic, date and time (database unique index).
- **Availability** – no past dates, `start < end`, clinic must belong to the doctor, no overlaps (exclusion constraint).
- **Messaging** – patient ↔ doctor only after an `accepted` request; doctor ↔ admin always.
- **Ownership** – a doctor's identity comes from the session. Never trust ids in bodies/URLs for authorisation.
- **Restricted accounts** – `suspended`/`deactivated` doctors are blocked from sign-in and every mutation.
- **Profile edits** – changing specialty, qualifications or clinics sets `profile_review_required` and returns
  `reviewRequired: true`.
- **Audit** – log every admin decision (verification, publication, deactivation, status changes).

## 6. Security checklist

- HTTPS everywhere; `Secure; HttpOnly; SameSite=Lax` session cookies; rotate the session id on login.
- Hash passwords with Argon2id (or bcrypt cost ≥ 12). Enforce a minimum length (the client asks for 8+).
- Rate-limit `/auth/*`, `/support-requests` and booking; add account lockout/backoff on repeated failures.
- Validate **every** body, query and param on the server (zod). The client validation is convenience only.
- Authorise on every route (`requireRole`) and scope every query by the authenticated user.
- Return `404` instead of `403` when revealing existence would leak data (another doctor's request, etc.).
- Parameterised SQL only. Never interpolate user input into queries.
- CSRF protection for cookie auth (SameSite plus `Origin` check, or a token). `helmet` for security headers.
- Uploads: allow-list MIME by content sniffing, size limit 10 MB, random storage keys, malware scan, private bucket,
  authorised downloads (short-lived signed URLs).
- Never log passwords, tokens or message bodies. Treat patient contact details and messages as sensitive health-adjacent
  data: encrypt backups, restrict access, define a retention policy.
- Pagination and `limit` caps on every list endpoint before launch.

## 7. Open decisions to settle with the product owner

| # | Question | Impact |
| --- | --- | --- |
| 1 | **Patient identity** – accounts, or guest bookings tracked by signed cookie + email verification? | `GET /appointments`, cancellation, messaging eligibility |
| 2 | **Doctor onboarding** – email verification? document upload (`doctor_certificates`) during registration? | registration endpoint, admin review screen shows "certificate metadata not supplied" today |
| 3 | **Notifications** – email/SMS for new requests and decisions? (the bell in the topbar is disabled) | new module + provider |
| 4 | **Real-time messaging** – WebSocket or SSE; presence and read receipts | messaging module, client hook |
| 5 | **Pagination envelope** – `{ data, meta }` vs plain arrays | all list endpoints, client services |
| 6 | **Time zones / slot generation** – are `availability_slots` windows split into bookable times (and at what interval)? | `/doctors/:id/slots`, "next available" |
| 7 | **Public stats** (`250+ specialists`, ratings) – real endpoint or remove | discovery home page |
| 8 | **Hosting** – client on static hosting, API on its own domain (cookies, CORS) | deployment |

## 8. Definition of done for the first release

- All endpoints in the contract implemented, with integration tests (including the 401/403/404/409/422 paths).
- Every screen has been clicked through in `VITE_CAREWELL_DATA_MODE=api`, and `npm run check` in `client/` still passes
  (the demo tests document the rules and must keep passing).
- Migrations run from an empty database; a seed script creates reference data and one admin.
- No secrets in the repository; `.env.example` is current.
