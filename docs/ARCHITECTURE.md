# Client architecture

React 19 + Vite 8 single-page app, JavaScript with JSDoc types, `react-router-dom` (hash routing), plain CSS with
design tokens. Tested with Vitest + Testing Library; linted with ESLint; formatted with Prettier.

## Folder map (`client/src`)

```text
app/            App.jsx (route table), AppProviders.jsx, NotFoundPage.jsx
config/         env.js – the only file that reads import.meta.env
constants/      roles, statuses (API vocabularies), paths (all URLs), attachment limits
context/        Auth, Theme, Toast, Confirm, Catalog – app-wide state and the hooks that read it
hooks/          useResource, useAction, useDebouncedValue, useDocumentTitle, useModalBehavior
services/       the ONLY layer that talks to data
  ├─ http/        httpClient.js – fetch wrapper, ApiError, 401 handling
  ├─ api/         real HTTP adapters, one file per resource
  ├─ demo/        in-memory adapters + fixtures (same interface as api/)
  └─ index.js     picks api or demo from VITE_CAREWELL_DATA_MODE
components/
  ├─ ui/          reusable, feature-agnostic primitives (Button, Field, Modal, DataTable, …)
  └─ layout/      app chrome (AppShell, Sidebar, Topbar, MobileDrawer, navigation config)
features/       one folder per product area; pages + components that only that area uses
  ├─ discovery/   home, doctor directory, doctor profile, clinics
  ├─ booking/     appointment wizard (BookingProvider opens it from anywhere)
  ├─ appointments/ patient's requests
  ├─ messaging/   conversations and chat
  ├─ support/     help centre
  ├─ auth/        sign-in, doctor registration, RequireRole route guard
  ├─ doctors/     profile fields shared by registration, doctor workspace and admin
  ├─ availability/ schedule manager shared by doctor workspace and admin
  ├─ doctor-portal/ doctor workspace
  └─ admin/       admin dashboard and management pages
styles/         CSS split by area; index.css sets the cascade order
types/          JSDoc typedefs for API shapes
utils/          pure helpers (date, format, validation, forms, placeholders)
test/           Vitest setup
```

## Rules of the road

1. **Data access only through `services/`.** Components never call `fetch`. They import `xxxService` from
   `services/index.js`, which resolves to the API or the demo adapter. Both adapters expose identical methods and
   return identical shapes, so switching is a single env var.
2. **Errors are `ApiError`s** with `status`, `code`, `message` and optional `details`. UI shows `error.message`.
3. **Pages fetch their own data** with `useResource(loader, deps)`; mutations go through `useAction` (toast on
   result) or a form's own try/catch. Shared reference data (clinics, specialties) comes from `useCatalog()`.
4. **Reusable means feature-agnostic.** `components/ui` knows nothing about doctors or appointments. Domain pieces
   shared by several features (`DoctorProfileFields`, `AvailabilityManager`) live in their own feature folder.
5. **Status strings and URLs come from `constants/`.** Do not type `"pending"` or `"/admin/doctors"` inline.
6. **The UI is not a security boundary.** `RequireRole` only chooses what to show; the server authorises.
7. **Server state is authoritative.** After a mutation, use the record the API returns.
8. Keep files small and single-purpose; prefer composition over props explosions.

## Data flow

```text
Page component ──useResource──▶ services/index.js ──▶ api/<resource>.js ──▶ http/httpClient.js ──▶ Express
                                        └──(demo mode)──▶ demo/<resource>.js ──▶ demo/db.js (memory)
```

Routing: `HashRouter` (works on static hosts). Filters for the doctor directory live in the URL query string
(`#/doctors?specialty=cardiology`), so searches are shareable and survive refresh. Role-restricted routes are
lazy-loaded, so patients never download admin code.

Sessions: `AuthProvider` calls `GET /auth/me` on load. Any protected request that returns 401 clears the local user
(`setUnauthorizedHandler`).

## Adding a feature

1. Add the endpoint to `docs/API_CONTRACT.md` and a method to `services/api/<resource>.js`.
2. Mirror it in `services/demo/<resource>.js` (including validation and role checks) and add a demo test.
3. Create `features/<area>/pages/XPage.jsx`, reuse `components/ui` primitives, register the route in `app/App.jsx`
   and the URL in `constants/paths.js`. Add navigation in `components/layout/navigation.js` if needed.
4. Add an integration test in `app/App.test.jsx` (or beside the feature).

## Quality gates

`npm run check` = ESLint (React, hooks, a11y) → Prettier check → Vitest → production build. CI runs it on every pull
request ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)).

## Known limitations and placeholders

- Several visuals are static placeholders pending real data: hero/testimonial stats and photos
  (`features/discovery/content.js`), the clinics "Map" toggle, the disabled notifications bell.
- Images are hot-linked from Unsplash; host them in `client/public/images` before launch.
- No i18n, no analytics, no error-reporting hook beyond `ErrorBoundary.componentDidCatch`.
- JavaScript with JSDoc; migrating to TypeScript would be a natural next step (the typedefs in `types/` are the seed).
