# Backend guide (Express + PostgreSQL)

Welcome. The React client in [`../client`](../client) is finished and runs against an in-memory demo. Your job is to
replace that demo with a real, secure, persistent API. This page is the shortest path from `git clone` to a working
integration.

## 1. What to read, in order

1. [`API_CONTRACT.md`](API_CONTRACT.md) – every endpoint, payload, status code and business rule the client expects.
2. [`DATA_MODEL.md`](DATA_MODEL.md) – the Prisma schema explained: relationships, the rules the database enforces, and how API fields map to columns.
3. [`client/src/services/demoBackend.js`](../client/src/services/demoBackend.js) – a **working reference implementation** of the rules in
   plain JavaScript (validation, transitions, scoping). Port the behaviour, not the code.
4. [`client/src/services/api.js`](../client/src/services/api.js) – the exact HTTP calls the client makes.
5. [`client/src/types.js`](../client/src/types.js) – response shapes.

The demo tests ([`demoBackend.test.js`](../client/src/services/demoBackend.test.js)) double as an executable
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

First run only: put `SEED_ADMIN_PASSWORD` in the root `.env.local` and run `npm run seed` in `server/`. It creates the
administrator (`SEED_ADMIN_EMAIL`), the specialties and the first clinics. `npm test` in `server/` runs the API tests
in a temporary schema inside Neon, so real data is never touched.

**Status:** every endpoint of the API contract is built and tested: administrator tools, accounts (sign-up, email
verification, password reset, profile), patient booking, the doctor workspace, doctor registration with certificates,
messaging (patient↔doctor, doctor↔administration) with attachments, support requests, deactivation requests and
**notifications for all three roles**.

Adding a feature: create `controllers/<name>.js` (the handlers) and `routes/<name>.js` (the URLs), add one line to
`routes/index.js`, and write `tests/<name>.test.js`. Shared pieces: `services/mail.js` (email), `middleware/upload.js` + `services/files.js` (uploads and storage),
`utils/errors.js` (errors and validation), `middleware/authenticate.js` + `middleware/rateLimit.js` (roles, sessions,
limits) and `services/notifications.js`.

**Notifying people.** When something happens that another person should know about, call
`notify(userId, { kind, title, body, link, groupKey })`, `notifyDoctor(doctorId, …)` or `notifyAdmins(…)` after the
action succeeded (see `services/appointments.js` for a full example). It never throws, so a notification cannot break the
action. Give repeated events about one thing the same `groupKey` (for example `message:<conversationId>`) so they stay
a single unread line; clear it with `markGroupRead` when the person looks at it. Add a test that checks who is
told, and who is not (never the person who acted).

The Vite dev server forwards `/api/*` to `VITE_DEV_PROXY_TARGET` (default `http://localhost:3000`), so the browser sees
one origin: no CORS configuration is needed in development and cookies stay same-site. In production serve the client
and API under the same site (e.g. `carewell.example` and `api.carewell.example`) and configure CORS for the exact
client origin with `credentials: true`.

## 3. Server layout

The API uses the classic layers. Dependencies point one way: `routes → middleware → controllers → services → models`.

```text
server/
├─ src/
│  ├─ app.js                 # express() setup: helmet, cors, json, routes, error handler
│  ├─ server.js              # listen()
│  ├─ config/                # env.js (validated environment), prisma.js, pool.js (database clients)
│  ├─ routes/                # URL -> controller, plus which middleware guards it (one file per feature, index.js mounts them)
│  ├─ controllers/           # the request handlers: read the request, call services, send the response
│  ├─ middleware/            # authenticate (sessions, roles, CSRF origin check), rateLimit, upload, errorHandler
│  ├─ services/              # business rules: auth/sessions, appointments, availability, doctorProfile, notifications,
│  │                         #   mail, files + storage (object storage)
│  ├─ models/                # database access and row -> API shape mapping (user, doctor, catalog, appointment)
│  └─ utils/                 # errors.js (ApiError, validation, uuid check), time.js (Dhaka dates and times)
├─ prisma/                   # schema.prisma + SQL migrations (the database design and its rules)
├─ scripts/                  # seed.js (first administrator), verify-services.js
└─ tests/                    # API tests; they run in a temporary schema of the real database
```

Keep layers thin: a route only maps a URL; a controller only translates HTTP; business rules live in services; shaping
database rows for the API lives in models. Libraries in use: `express`, `helmet`, `cors`, `zod`, `@prisma/client`,
`bcryptjs`, `multer`, `nodemailer`.

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
| 4 | ~~Real-time messaging~~ **Done with Server-Sent Events** (messages, read receipts, notifications). Left: presence ("online"), and a shared channel such as Redis if more than one server process is ever run | `services/realtime.js`, `context/RealtimeContext.jsx` |
| 5 | **Pagination envelope** – `{ data, meta }` vs plain arrays | all list endpoints, client services |
| 6 | ~~Time zones / slot generation~~ **Done**: availability windows are cut into 10-minute slots (`SLOT_MINUTES` in `server/src/services/availability.js`), in Asia/Dhaka local time | `/doctors/:id/slots`, "next available" |
| 7 | **Public stats** (`250+ specialists`) – real endpoint or remove. (Doctor ratings are now real, from patient reviews.) | discovery home page |
| 8 | **Hosting** – client on static hosting, API on its own domain (cookies, CORS) | deployment |

## 8. Definition of done for the first release

- All endpoints in the contract implemented, with integration tests (including the 401/403/404/409/422 paths).
- Every screen has been clicked through in `VITE_CAREWELL_DATA_MODE=api`, and `npm run check` in `client/` still passes
  (the demo tests document the rules and must keep passing).
- Migrations run from an empty database; a seed script creates reference data and one admin.
- No secrets in the repository; `.env.example` is current.
