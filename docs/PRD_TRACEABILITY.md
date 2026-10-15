# PRD traceability

Maps the functional (FR) and non-functional (NFR) requirements of _PRD for Project-10_ (31 pages, reviewed
2026-10-14; the PRD is authoritative) to where the **frontend** implements them and what remains for the backend.

"Frontend done" means the interface exists and works against the service boundary (demo or API adapter). It does not
mean persistence, authentication, authorisation, scheduling or messaging infrastructure exists: those are listed under
_Backend dependency_.

| PRD IDs | Frontend implementation | Backend dependency |
| --- | --- | --- |
| FR-01–03 Search by name, specialty, clinic, location; empty state | `features/discovery/pages/DirectoryPage.jsx`, `DiscoverSearch.jsx`, `useDoctorFilters.js` (filters in URL) | `GET /doctors` search semantics, relevance, performance |
| FR-04–08 Filters (specialty, area, fee, language, availability, verified) | `DoctorFilters.jsx`; combined with AND in `services/demo/catalog.js` | Same filters server-side; availability buckets derived from real slots |
| FR-09–14 Public profile: credentials, languages, clinics, fees, verification badge, directions, availability | `DoctorProfilePage.jsx`, `DoctorCard.jsx`, `FacilityCard.jsx` | Published-only filtering, per-clinic fees (`feesByFacility`), real availability |
| FR-15–18 Admin verification, approve/reject/suspend, publication | `features/admin/pages/VerificationPage.jsx`, `DoctorManagementPage.jsx` | Authoritative decisions, certificate upload/review, audit log |
| FR-19–24 Availability, slots, past-date and overlap checks, block/unblock | `features/availability/AvailabilityManager.jsx`, `booking/steps/ScheduleStep.jsx` | Slot persistence, exclusion constraint, slot generation for patients |
| FR-25–33 Appointment request: details, validation, pending status, history, cancel | `features/booking/*`, `features/appointments/*`, `utils/validation.js` | Conflict prevention (`409`), authoritative status, patient identity (open decision) |
| FR-34, FR-41–42 Admin sign-in, protected routes, 401/403 handling | `features/auth/*` (`RequireRole`, `LoginPage`), `services/http/httpClient.js` | Secure login, roles, ownership, session expiry |
| FR-35–40 Admin management of doctors, specialties, clinics, schedules, appointments | `features/admin/*` | CRUD endpoints, referential rules, deactivation policy |
| FR-43–52 Doctor registration, sign-in, own profile (review flag), deactivation request, blocked accounts | `features/auth/pages/DoctorRegisterPage.jsx`, `features/doctor-portal/*`, `features/doctors/*` | Account lifecycle, email verification, review workflow |
| FR-53–60 Doctor requests, accept/reject, availability | `doctor-portal/components/RequestsTab.jsx`, `AvailabilityManager.jsx` | Ownership, transition authority, history |
| FR-61, FR-64–71 Messaging: eligibility, history, compose, attachments, receipts/presence | `features/messaging/*`, `utils/attachments.js` | Eligibility enforcement, storage + scanning, read/presence data |
| FR-62 Real-time messaging | – (not simulated) | WebSocket/SSE transport and reconnect handling |
| NFR-01–13, 18–22 Validation, errors, privacy, security, performance | Input checks, error/loading/empty states, `ApiError`, no secrets in client | HTTPS, authoritative validation, rate limiting, backups, retention |
| NFR-14–17, 23–35 Accessibility, responsiveness, maintainability | Semantic controls, labelled fields, focus-managed dialogs, route-level code splitting, ESLint a11y rules, docs | Manual keyboard / screen-reader / device review still recommended |

## Verification status

Automated (run `npm test` in `client/`):

- `utils.test.js`, `httpClient.test.js` – helpers, URL building, error mapping, 401 handling, network failures.
- `services/demo/demoServices.test.js` – the business rules listed in [`BACKEND_GUIDE.md`](BACKEND_GUIDE.md) §5
  (visibility, publication, transitions, conflicts, availability overlaps, scoping, messaging eligibility).
- `app/App.test.jsx` – jsdom journeys: discovery and filters, the full booking wizard, appointment cancellation,
  admin sign-in with deep-link return and every admin page, adding a facility, approve/publish and deactivate a doctor,
  doctor workspace (requests, profile, availability, sign out), theme, mobile drawer, support form, messaging.

Not covered by automation: real browsers and layouts (desktop/tablet/mobile), keyboard-only and screen-reader passes,
image loading, and any behaviour that needs a real backend. Earlier manual browser checks (before this restructure)
are not repeated here; re-run a manual smoke test after changes to styles.

Demo data is fictional and resets on reload. A successful demo operation is **never** evidence of persistence or
authorisation.
