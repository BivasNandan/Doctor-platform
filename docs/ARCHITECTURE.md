# Client architecture

React 19 + Vite 8 single-page app, JavaScript with JSDoc types, `react-router-dom` (hash routing), plain CSS with
design tokens. Tested with Vitest + Testing Library; linted with ESLint; formatted with Prettier.

The project is deliberately **small in file count** (about 40 source files) so a newcomer can learn the layout in a
day. The rule of thumb: **one screen = one file**, and everything shared lives in a handful of well-named files.

## Folder map (`client/src`)

```text
main.jsx                 entry point: mounts <App/> in the router and loads the 4 stylesheets
App.jsx                  the route table, app-wide providers, the route guard (RequireRole), not-found page
constants.js             roles, status vocabularies, every URL (PATHS), booking/attachment limits, env config
utils.js                 pure helpers: dates, money, validation, form readers, placeholder images
hooks.js                 useResource (load data), useDebouncedValue, useDocumentTitle, useModalBehavior
context.jsx              Auth, Catalog (clinics + specialties), Theme, Toast, Confirm providers + useAction
types.js                 JSDoc typedefs for every API shape (no runtime code)

services/                the ONLY layer that touches data
  index.js                 picks the real API or the demo from VITE_CAREWELL_DATA_MODE
  httpClient.js            fetch wrapper, ApiError, 401 handling
  api.js                   every real HTTP call, one section per resource
  demoBackend.js           in-memory backend with the business rules (delete when the real API is done)
  demoData.js              fictional fixtures for the demo

components/
  ui.jsx                   reusable, feature-agnostic pieces (Button, Field, Modal, DataTable, Tabs, …)
  Layout.jsx               app chrome: AppShell, Topbar, Sidebar, mobile drawer, account menu, navigation config

features/                one folder per product area, one file per screen
  discovery/               DiscoverPage, DirectoryPage, DoctorProfilePage, FacilitiesPage, Cards (doctor/clinic cards)
  booking/                 Booking.jsx: the provider that opens the wizard + the 4-step wizard
  appointments/            AppointmentsPage
  messaging/               MessagesPage (conversation list, thread and composer inside)
  support/                 AssistancePage
  account/                 ProfilePage
  auth/                    LoginPage, SignUpPage, VerifyEmailPage, PasswordResetPages, DoctorRegisterPage
  doctors/                 DoctorProfileFields (shared by registration, doctor workspace, admin)
  availability/            AvailabilityManager (shared by doctor workspace and admin) + the admin availability page
  doctor-portal/           DoctorDashboardPage (profile and requests tabs inside)
  admin/                   AdminOverview, DoctorManagement, Verification, FacilityManagement,
                           AppointmentManagement, Specialties

styles/                  base.css (tokens, reset, layout) · components.css · pages.css · responsive.css
*.test.js(x)             tests sit next to what they test; test/setup.js configures them
```

A screen's file starts with the page component, followed by the small pieces only that screen uses (forms, cards,
tabs), so one file reads top to bottom. Files are marked with `// ─── Name ───` separators.

## Rules of the road

1. **Data access only through `services/`.** Components never call `fetch`. They import `xxxService` from
   `services/index.js`, which resolves to the API or the demo. Both expose identical methods and return identical
   shapes, so switching is a single env var.
2. **Errors are `ApiError`s** with `status`, `code`, `message` and optional `details`. UI shows `error.message`.
3. **Pages fetch their own data** with `useResource(loader, deps)`; mutations go through `useAction` (toast on result)
   or a form's own try/catch. Shared reference data (clinics, specialties) comes from `useCatalog()`.
4. **Reusable means feature-agnostic.** `components/ui.jsx` knows nothing about doctors or appointments. Pieces shared
   by several screens (`DoctorProfileFields`, `AvailabilityManager`, `Cards`) live in their feature folder.
5. **Status strings and URLs come from `constants.js`.** Do not type `"pending"` or `"/admin/doctors"` inline.
6. **The UI is not a security boundary.** `RequireRole` only chooses what to show; the server authorises.
7. **Server state is authoritative.** After a mutation, use the record the API returns.
8. **When to split a file:** only if it is used by two or more screens, or it grows past about 400–500 lines.

## Data flow

```text
Screen ──useResource──▶ services/index.js ──▶ api.js ──▶ httpClient.js ──▶ Express
                                 └──(demo mode)──▶ demoBackend.js (memory)
```

Routing: `HashRouter` (works on static hosts). Doctor-directory filters live in the URL query string
(`#/doctors?specialty=cardiology`), so searches are shareable and survive refresh. Role-restricted routes are
lazy-loaded, so patients never download admin code.

Sessions: `AuthProvider` calls `GET /auth/me` on load. Any protected request that returns 401 clears the local user
(`setUnauthorizedHandler`).

## Adding a feature

1. Add the endpoint to `docs/API_CONTRACT.md` and a method to the matching section of `services/api.js`.
2. Mirror it in `services/demoBackend.js` (including validation and role checks) and add a test in
   `services/demoBackend.test.js`.
3. Create `features/<area>/XPage.jsx`, reuse `components/ui.jsx`, register the route in `App.jsx` and the URL in
   `constants.js`. Add navigation in the config at the bottom of `components/Layout.jsx` if needed.
4. Add an integration test in `App.test.jsx`.

## Quality gates

`npm run check` = ESLint (React, hooks, a11y) → Prettier check → Vitest → production build. CI runs it on every pull
request ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)).

## Known limitations and placeholders

- Several visuals are static placeholders pending real data: hero/testimonial stats and photos (top of
  `features/discovery/DiscoverPage.jsx`), the clinics "Map" toggle, the disabled notifications bell.
- Images are hot-linked from Unsplash; host them in `client/public/images` before launch.
- No i18n, no analytics, no error-reporting hook beyond `ErrorBoundary.componentDidCatch`.
- JavaScript with JSDoc; migrating to TypeScript would be a natural next step (`types.js` is the seed).
