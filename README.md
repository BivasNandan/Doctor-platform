# Carewell 

A healthcare discovery and care coordination prototype. The frontend supports an explicitly selected in-memory demo mode and a replaceable API adapter. No API server, persistence, authentication, messaging transport, or file storage is included. See [frontend integration notes](FRONTEND_INTEGRATION.md) for environment setup, proposed (not existing) API contracts, and limitations.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Create a production bundle with `npm run build`.

## Frontend structure

- `src/App.jsx` contains the application shell, reusable interface pieces, hash-based views, and simulated user/admin interactions.
- `src/data/contracts.js` documents the information shapes consumed by the UI.
- `src/data/mockData.js` contains the demo fixtures.
- `src/data/careService.js` selects the demo or API adapter behind one async service boundary. API errors do not fall back to demo data.
- `src/PortalPages.jsx` contains doctor registration/sign-in and the doctor workspace preview.
- `.env.example` documents the non-secret API configuration.
- `PRD_TRACEABILITY.md` maps every functional requirement to current status and verification evidence.
- `src/styles.css` defines semantic light/dark tokens and responsive shared components.

## Included views

Discovery, doctor directory and profile, clinics, simulated appointment requests, patient appointments, messages, doctor registration/sign-in and workspace, assistance, and admin previews.

Demo mutations are simulated in browser memory and reset on refresh. A demo booking is a pending request with a clearly simulated identifier, never a confirmed appointment. Demo sign-in is not identity verification or security. See the traceability matrix for incomplete frontend and backend-dependent requirements. Theme preference is stored locally; System follows the OS theme.
